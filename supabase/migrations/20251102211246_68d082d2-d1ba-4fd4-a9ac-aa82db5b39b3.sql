-- Remover política restritiva de insert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Criar nova política que permite usuários autenticados criarem perfis de profissionais
CREATE POLICY "Authenticated users can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Manter a política de update restrita ao próprio usuário
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);