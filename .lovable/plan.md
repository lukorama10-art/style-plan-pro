## Toggle Light/Dark Mode

Simples de adicionar — o sistema já está preparado: o `tailwind.config.ts` usa `darkMode: ["class"]` e o `index.css` já define todas as variáveis HSL no bloco `.dark`. Falta apenas o controle e o botão.

### Etapas

1. **Provider de tema** (`src/contexts/ThemeContext.tsx`)
   - Estado `theme: "light" | "dark"`, default `"light"`.
   - Persistência em `sessionStorage` (zera ao fechar o navegador, mantém entre telas — exatamente o que foi pedido).
   - Aplica/remove a classe `dark` no `document.documentElement` via `useEffect`.
   - Expõe `toggleTheme()`.

2. **Envolver a aplicação** (`src/App.tsx`)
   - Embrulhar tudo no `<ThemeProvider>` para que login, agenda, financeiro, etc. compartilhem o estado.

3. **Componente de toggle** (`src/components/ThemeToggle.tsx`)
   - Botão pequeno com ícones `Sun`/`Moon` (lucide-react), usando tokens do design system.

4. **Posicionamento** — visível em todas as telas:
   - **Telas autenticadas:** adicionar no header/sidebar do `src/components/Layout.tsx` (canto superior direito).
   - **Tela de login (`src/pages/Auth.tsx`):** botão fixo no canto superior direito da página, já que ela não usa `Layout`.

### Observações

- Os tokens dark já existem no `index.css`, então todos os componentes shadcn herdam automaticamente — não precisa tocar em componentes individuais.
- Pode haver pequenos ajustes visuais pontuais (ex.: linhas pretas hardcoded da agenda, ícones de status) se algum lugar usar cor literal em vez de token semântico. Se aparecer algo estranho após implementar, corrigimos sob demanda.
- Esforço: ~3 arquivos novos + 2 edições pequenas. Baixa complexidade.
