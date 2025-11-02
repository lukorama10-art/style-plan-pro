-- Create appointment_services junction table for many-to-many relationship
CREATE TABLE public.appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, service_id)
);

-- Enable RLS
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view appointment services"
ON public.appointment_services
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage appointment services"
ON public.appointment_services
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON public.appointment_services(service_id);