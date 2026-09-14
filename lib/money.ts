/**
 * Money formatting. Prices are stored as integer minor units (pence) and are
 * only ever turned into a string here - see decision 1 in ARCHITECTURE.md.
 * Nothing outside this module should do arithmetic or formatting on prices.
 */

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

/** 1499 -> "£14.99" */
export function formatGBP(minor: number): string {
  return GBP.format(minor / 100);
}

/** Splits for Amazon-style display where the pence sit raised: 1499 -> ["14","99"] */
export function splitGBP(minor: number): [string, string] {
  const whole = Math.floor(minor / 100).toLocaleString("en-GB");
  const pence = String(minor % 100).padStart(2, "0");
  return [whole, pence];
}

/** Price of one item in a multipack, rounded to the nearest penny: 1499 for 5 -> 300 */
export function perUnitMinor(priceMinor: number, count: number): number {
  return Math.round(priceMinor / count);
}

/** Whole-number discount percentage, e.g. 6500 from 9199 -> 29 */
export function discountPercent(priceMinor: number, wasPriceMinor: number): number {
  if (wasPriceMinor <= priceMinor) return 0;
  return Math.round(((wasPriceMinor - priceMinor) / wasPriceMinor) * 100);
}
