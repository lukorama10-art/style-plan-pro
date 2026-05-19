## Mudanças

### 1. Agenda — remover botão "Finalizar"
- Em `src/pages/Agenda.tsx`: remover o botão "Finalizar", o estado do `FinalizeServiceDialog`, a importação e o uso do componente.
- Manter `FinalizeServiceDialog.tsx` no projeto (sem uso) para reaproveitar depois.

### 2. Estoque — adicionar saída manual
- Criar `src/components/stock/StockExitDialog.tsx` espelhando `StockEntryDialog.tsx` (campos: produto, quantidade, observações), com validação extra de que `quantity <= product.quantity` para impedir estoque negativo.
- Em `src/hooks/useProducts.tsx`: adicionar mutation `addStockExit` análoga a `addStockEntry`, inserindo em `stock_movements` com `movement_type: "exit"` e decrementando `products.quantity`. Validar saldo antes.
- Em `src/pages/Estoque.tsx`: adicionar botão "Registrar Saída" ao lado de "Registrar Entrada" abrindo o novo diálogo.

Sem alterações de banco — as tabelas já suportam saídas manuais (`appointment_id` e `professional_id` são nullable em `stock_movements`).
