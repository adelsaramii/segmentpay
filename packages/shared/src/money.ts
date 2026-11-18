// All monetary amounts are integer cents (EUR). Never use floats for money math.

export type Cents = number;

export const EURO = (cents: Cents): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.trunc(abs / 100);
  const rem = abs % 100;
  return `${sign}€${euros.toLocaleString('en-US')}.${rem.toString().padStart(2, '0')}`;
};

export const FA_EURO = (cents: Cents): string => {
  // Persian locale number formatting but still prefixed with € per design
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.trunc(abs / 100);
  const rem = abs % 100;
  const faEuros = euros.toLocaleString('en-US');
  return `${sign}€${faEuros}.${rem.toString().padStart(2, '0')}`;
};

export const toCents = (euros: number): Cents => Math.round(euros * 100);

export const sumCents = (values: Cents[]): Cents =>
  values.reduce((acc, v) => acc + v, 0);

export const clampCents = (v: Cents, min: Cents, max: Cents): Cents =>
  Math.max(min, Math.min(max, v));
