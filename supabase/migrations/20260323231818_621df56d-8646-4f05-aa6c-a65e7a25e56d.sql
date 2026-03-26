
-- Step 1: Expand app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agendamento';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leitura';
