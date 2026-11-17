-- Migration: 20261115000100_menu_item_modifiers.sql
-- Purpose: Adds JSONB modifiers column to public.menu_items for dish customizations (spice levels, add-ons, portion sizes).

begin;

alter table public.menu_items
  add column if not exists modifiers jsonb default '[]'::jsonb;

comment on column public.menu_items.modifiers is 'Array of DishModifierGroup objects representing dish customizations, choices, and paid add-ons';

commit;
