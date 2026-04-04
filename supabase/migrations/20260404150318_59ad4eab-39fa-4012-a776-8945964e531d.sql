ALTER TABLE public.boletos ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'BOLETO';
ALTER TABLE public.boletos ADD COLUMN IF NOT EXISTS pix_qr_code_url text;
ALTER TABLE public.boletos ADD COLUMN IF NOT EXISTS pix_copia_e_cola text;