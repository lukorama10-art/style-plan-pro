-- Criar tabela professionals
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Policies para professionals
CREATE POLICY "Anyone can view active professionals" 
ON public.professionals 
FOR SELECT 
USING (active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage professionals" 
ON public.professionals 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_professionals_updated_at
BEFORE UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Atualizar foreign keys em professional_services
ALTER TABLE public.professional_services
DROP CONSTRAINT IF EXISTS professional_services_professional_id_fkey,
ADD CONSTRAINT professional_services_professional_id_fkey 
FOREIGN KEY (professional_id) 
REFERENCES public.professionals(id) 
ON DELETE CASCADE;

-- Atualizar foreign keys em availability
ALTER TABLE public.availability
DROP CONSTRAINT IF EXISTS availability_professional_id_fkey,
ADD CONSTRAINT availability_professional_id_fkey 
FOREIGN KEY (professional_id) 
REFERENCES public.professionals(id) 
ON DELETE CASCADE;

-- Atualizar foreign keys em appointments
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey,
ADD CONSTRAINT appointments_professional_id_fkey 
FOREIGN KEY (professional_id) 
REFERENCES public.professionals(id) 
ON DELETE CASCADE;