-- Criar tabela para relacionar profissionais com serviços
CREATE TABLE IF NOT EXISTS public.professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, service_id)
);

-- Enable RLS
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view professional services"
ON public.professional_services
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage professional services"
ON public.professional_services
FOR ALL
USING (true)
WITH CHECK (true);

-- Adicionar índices para melhor performance
CREATE INDEX idx_professional_services_professional ON public.professional_services(professional_id);
CREATE INDEX idx_professional_services_service ON public.professional_services(service_id);