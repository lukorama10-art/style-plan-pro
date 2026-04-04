CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  asaas_payment_id TEXT,
  asaas_customer_id TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  boleto_url TEXT,
  bank_slip_url TEXT,
  invoice_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view boletos"
  ON public.boletos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage boletos"
  ON public.boletos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);