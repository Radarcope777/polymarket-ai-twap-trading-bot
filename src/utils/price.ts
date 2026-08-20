/** GRVT prices are returned as strings with up to 9 decimal places. */
export function parseGrvtPrice(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

/** GRVT size fields are base-asset decimal strings. */
export function parseGrvtSize(value: string | number | null | undefined): number {
  return parseGrvtPrice(value);
}

/**
 * GRVT funding rate formats:
 * - Small ratios (e.g. 0.0003) are already decimal ratios (0.03%)
 * - Larger values (e.g. "0.01") are percentage points (0.01% → 0.0001 ratio)
 * - Very large values are centibeeps (1 centibip = 0.000001 ratio)
 */
export function parseFundingRate(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return 0;

  if (Math.abs(num) > 1) {
    return num / 1_000_000;
  }

  if (Math.abs(num) >= 0.001) {
    return num / 100;
  }

  return num;
}

export function formatGrvtPrice(price: number): string {
  return price.toFixed(9).replace(/\.?0+$/, "");
}

export function formatGrvtSize(size: number): string {
  return size.toFixed(8).replace(/\.?0+$/, "");
}

export function nanosecondsToMs(ns: string | number | null | undefined): number {
  if (ns === null || ns === undefined || ns === "") return Date.now();
  const value = typeof ns === "number" ? ns : Number.parseFloat(ns);
  if (!Number.isFinite(value)) return Date.now();
  return Math.floor(value / 1_000_000);
}
