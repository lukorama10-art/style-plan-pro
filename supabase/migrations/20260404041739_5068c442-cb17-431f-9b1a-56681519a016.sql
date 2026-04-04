-- Fix 1: professionals - remove public access to contact info
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.professionals;

CREATE POLICY "Authenticated users can view professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (true);

-- Fix 2: appointment_services - restrict to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view appointment services" ON public.appointment_services;
DROP POLICY IF EXISTS "Authenticated users can manage appointment services" ON public.appointment_services;

CREATE POLICY "Authenticated users can view appointment services"
  ON public.appointment_services FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage appointment services"
  ON public.appointment_services FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Fix 3: professional_services - restrict to authenticated only  
DROP POLICY IF EXISTS "Anyone can view professional services" ON public.professional_services;
DROP POLICY IF EXISTS "Authenticated users can manage professional services" ON public.professional_services;

CREATE POLICY "Authenticated users can view professional services"
  ON public.professional_services FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage professional services"
  ON public.professional_services FOR ALL TO authenticated
  USING (true) WITH CHECK (true);