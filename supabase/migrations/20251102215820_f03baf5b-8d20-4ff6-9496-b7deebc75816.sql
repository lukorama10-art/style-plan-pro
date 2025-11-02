-- Remove service_id column from appointments table since we now use appointment_services
ALTER TABLE public.appointments DROP COLUMN IF EXISTS service_id;