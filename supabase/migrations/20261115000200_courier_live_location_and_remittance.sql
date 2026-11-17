-- Migration: 20261115000200_courier_live_location_and_remittance.sql
-- Adds live courier tracking telemetry and COD remittance loop closure to orders table

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS courier_latitude double precision,
ADD COLUMN IF NOT EXISTS courier_longitude double precision,
ADD COLUMN IF NOT EXISTS courier_heading double precision,
ADD COLUMN IF NOT EXISTS courier_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS cod_remitted boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS cod_remitted_at timestamptz,
ADD COLUMN IF NOT EXISTS cod_remitted_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.orders.courier_latitude IS 'Live GPS latitude broadcasted by active delivery courier';
COMMENT ON COLUMN public.orders.courier_longitude IS 'Live GPS longitude broadcasted by active delivery courier';
COMMENT ON COLUMN public.orders.courier_heading IS 'Compass heading angle in degrees (0-360) for courier marker orientation';
COMMENT ON COLUMN public.orders.courier_updated_at IS 'Timestamp of latest courier GPS beacon';
COMMENT ON COLUMN public.orders.cod_remitted IS 'True when store merchant has confirmed receipt of physical COD food subtotal cash';
COMMENT ON COLUMN public.orders.cod_remitted_at IS 'Timestamp when merchant confirmed cash remittance';
COMMENT ON COLUMN public.orders.cod_remitted_by IS 'Store merchant user ID who verified cash remittance';
