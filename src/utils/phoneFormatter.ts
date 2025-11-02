/**
 * Formata telefone brasileiro com DDD
 * Aceita: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);
  
  // Aplica a formatação
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  }
};

/**
 * Remove formatação do telefone para salvar no banco
 */
export const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Valida se o telefone tem o formato correto
 */
export const validatePhoneNumber = (value: string): boolean => {
  const numbers = value.replace(/\D/g, '');
  // Aceita telefones com 10 ou 11 dígitos (com ou sem 9 no celular)
  return numbers.length === 10 || numbers.length === 11;
};
