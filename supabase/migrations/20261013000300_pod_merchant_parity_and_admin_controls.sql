-- ==============================================================================
-- Migration: 20261013000300_pod_merchant_parity_and_admin_controls.sql
-- Description:
--   1. Adds Proof of Delivery (POD) photo fields to orders.
--   2. Adds is_open operational status to stores with toggle RPC.
--   3. Adds default_barangay and delivery_address to profiles.
--   4. Creates delivery-proofs storage bucket with public read and authenticated write.
--   5. Adds admin RPC to reset customer COD strikes.
-- ==============================================================================

-- 1. Proof of Delivery (POD) columns on public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS pod_image_url text,
  ADD COLUMN IF NOT EXISTS pod_timestamp timestamptz;

COMMENT ON COLUMN public.orders.pod_image_url IS 'Public storage URL for courier proof of delivery photo';
COMMENT ON COLUMN public.orders.pod_timestamp IS 'Timestamp when delivery proof was captured and uploaded';

-- 2. Store Open/Closed operational toggle on public.stores
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.stores.is_open IS 'Real-time kitchen toggle indicating whether store is currently accepting orders';

-- RPC for store managers to update their store open status
CREATE OR REPLACE FUNCTION public.set_store_open_status(
  p_store_id uuid,
  p_is_open boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store stores%ROWTYPE;
BEGIN
  -- Verify caller is store member or platform admin
  IF NOT EXISTS (
    SELECT 1 FROM public.store_memberships 
    WHERE store_id = p_store_id 
      AND user_id = auth.uid() 
      AND is_active = true
  ) AND NOT EXISTS (
    SELECT 1 FROM private.platform_roles 
    WHERE user_id = auth.uid() 
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to toggle store status' USING errcode = '42501';
  END IF;

  UPDATE public.stores
  SET is_open = p_is_open,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_store_id
  RETURNING * INTO v_store;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store.id,
    'is_open', v_store.is_open
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_store_open_status(uuid, boolean) TO authenticated;

-- 3. Default delivery address preferences on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_barangay text,
  ADD COLUMN IF NOT EXISTS delivery_address text;

COMMENT ON COLUMN public.profiles.default_barangay IS 'Customer default delivery barangay in Mati City';
COMMENT ON COLUMN public.profiles.delivery_address IS 'Customer saved default street/landmark delivery address';

-- 4. Admin RPC to reset customer COD strikes (for dispute resolution)
CREATE OR REPLACE FUNCTION public.admin_reset_customer_cod_strikes(
  target_user uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM private.platform_roles 
    WHERE user_id = auth.uid() 
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only system admins can reset COD strikes' USING errcode = '42501';
  END IF;

  UPDATE public.profiles
  SET cod_strikes = 0,
      cod_eligible = true,
      updated_at = timezone('utc'::text, now())
  WHERE id = target_user;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user,
    'cod_strikes', 0,
    'cod_eligible', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_customer_cod_strikes(uuid) TO authenticated;

-- 5. Delivery proofs storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for delivery-proofs storage objects
DROP POLICY IF EXISTS "Public read delivery proofs" ON storage.objects;
CREATE POLICY "Public read delivery proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');

DROP POLICY IF EXISTS "Authenticated users can upload delivery proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload delivery proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'delivery-proofs');
