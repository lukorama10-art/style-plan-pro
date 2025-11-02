/**
 * Formata valor para moeda brasileira
 */
export const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Converte string de preço para número
 * Aceita: "50", "50,00", "50.00", "R$ 50,00"
 */
export const parsePrice = (value: string): number => {
  // Remove tudo que não é dígito, vírgula ou ponto
  const cleaned = value.replace(/[^\d,.]/g, '');
  // Substitui vírgula por ponto
  const normalized = cleaned.replace(',', '.');
  // Converte para número
  return parseFloat(normalized) || 0;
};

/**
 * Formata input de preço enquanto o usuário digita
 */
export const formatPriceInput = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para número e divide por 100 (centavos)
  const amount = parseInt(numbers) / 100;
  
  // Formata como moeda
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
