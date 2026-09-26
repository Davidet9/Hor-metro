/**
 * Currency formatting utility for Colombian Pesos (COP)
 */
export const formatCOP = (amount?: number | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$ 0 COP';
  return (
    '$ ' +
    new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) +
    ' COP'
  );
};

export const formatCOPSimple = (amount?: number | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$ 0';
  return (
    '$ ' +
    new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(Math.round(amount))
  );
};
