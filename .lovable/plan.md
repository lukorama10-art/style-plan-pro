
# Validação de email real + Login com Google

Sem Better Auth. Vamos usar os recursos nativos do Lovable Cloud, que já cobrem 100% do que você pediu.

## 1. Verificação de email real

- Desligar `auto_confirm_email` no backend. Daí em diante, novo signup só consegue logar depois de clicar no link de confirmação que chega no inbox — emails fake nunca completam.
- Ajustar `src/pages/Auth.tsx`: hoje após `signUp` o código faz `navigate("/")` direto, o que vai dar erro silencioso com auto-confirm desligado. Vamos:
  - Mostrar mensagem clara: "Conta criada! Confira seu email e clique no link de confirmação para entrar."
  - Manter o usuário na tela de login (alternar para o modo Login).
- Adicionar botão "Reenviar email de confirmação" usando `supabase.auth.resend({ type: 'signup', email })`, visível só quando o usuário tentar logar e receber erro de email não confirmado.

**Admin atual (email fictício) continua funcionando normal** — a conta já está marcada como confirmada no banco, a mudança só afeta signups novos.

## 2. Login com Google

- Habilitar o provider Google via Lovable Cloud (credenciais gerenciadas, zero setup no Google Cloud Console).
- Adicionar botão "Continuar com Google" no `Auth.tsx`, acima do form de email/senha, com separador "ou".
- Usar `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` (padrão Lovable Cloud, não chamar `supabase.auth` direto).
- O trigger `handle_new_user` já lê `raw_user_meta_data->>'full_name'`, que o Google envia — popula `profiles` automaticamente sem mudança.

## Arquivos a alterar

- `src/pages/Auth.tsx` — botão Google, separador, tratamento pós-signup, reenvio de confirmação
- Configuração de auth no backend — desligar auto-confirm, habilitar provider Google
- Sem migrações de banco

## Fora do escopo

- Não trocar para Better Auth
- Não mexer em RLS, `profiles`, `useAuth` ou `ProtectedRoute`
- Não customizar templates de email agora (emails sairão com o template padrão, funcional mas genérico) — fica disponível como passo futuro se quiser branding AgendaPro
