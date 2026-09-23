export const number = (n: number) => new Intl.NumberFormat('kk-KZ', { maximumFractionDigits: 2 }).format(n);
