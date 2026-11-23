-- Migration: Add qrph to payment_method check constraint
-- File: supabase/migrations/20261124000100_add_qrph_to_subscription_payments_constraint.sql

begin;

alter table public.store_subscription_payments
  drop constraint if exists store_subscription_payments_payment_method_check;

alter table public.store_subscription_payments
  add constraint store_subscription_payments_payment_method_check
  check (payment_method is null or payment_method in ('gcash', 'paymaya', 'card', 'grab_pay', 'dob', 'online_banking', 'qrph', 'billease'));

commit;
