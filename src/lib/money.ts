/**
 * src/lib/money.ts
 *
 * Safe integer-paise money utilities.
 *
 * Rules:
 *  - All amounts are stored as integers (paise).  1 INR = 100 paise.
 *  - Never perform floating-point arithmetic on monetary values.
 *  - Use these helpers at every arithmetic boundary.
 *  - Formatting happens only at the presentation layer.
 */

import { Money, money, ZERO_MONEY } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/**
 * Convert rupees (possibly decimal, e.g. from a user input field) to paise.
 * Rounds to the nearest integer paise.
 */
export function rupeesToPaise(rupees: number): Money {
  return money(Math.round(rupees * 100));
}

/**
 * Convert paise to rupees as a floating-point number.
 * Use ONLY for display / formatting — never for arithmetic.
 */
export function paiseToRupees(paise: Money): number {
  return paise / 100;
}

// ---------------------------------------------------------------------------
// Arithmetic (all return Money — all safe integer ops)
// ---------------------------------------------------------------------------

export function add(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return money(a - b);
}

/**
 * Multiply a money amount by a scalar factor (e.g., quantity or a rate).
 * The factor may be a decimal — the result is rounded to nearest paise.
 */
export function multiply(amount: Money, factor: number): Money {
  return money(Math.round(amount * factor));
}

/**
 * Calculate a percentage of an amount.
 * Example: taxAmount = percentage(baseAmount, 18) for 18% GST.
 */
export function percentage(amount: Money, percent: number): Money {
  return money(Math.round((amount * percent) / 100));
}

/**
 * Sum an array of Money values.
 */
export function sum(amounts: Money[]): Money {
  return amounts.reduce<Money>((acc, val) => add(acc, val), ZERO_MONEY);
}

/**
 * Negate a money value (debit becomes credit, credit becomes debit).
 */
export function negate(amount: Money): Money {
  return money(-amount);
}

/**
 * Absolute value of a Money amount.
 */
export function abs(amount: Money): Money {
  return money(Math.abs(amount));
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export function isZero(amount: Money): boolean {
  return amount === 0;
}

export function isPositive(amount: Money): boolean {
  return amount > 0;
}

export function isNegative(amount: Money): boolean {
  return amount < 0;
}

export function isEqual(a: Money, b: Money): boolean {
  return a === b;
}

export function isGreaterThan(a: Money, b: Money): boolean {
  return a > b;
}

export function isLessThan(a: Money, b: Money): boolean {
  return a < b;
}

// ---------------------------------------------------------------------------
// Formatting (presentation layer only)
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE = "en-IN";
const DEFAULT_CURRENCY = "INR";

export interface FormatOptions {
  locale?: string;
  currency?: string;
  showSymbol?: boolean;
}

/**
 * Format a paise amount as a human-readable currency string.
 * Example: formatMoney(money(12345)) → "₹123.45"
 */
export function formatMoney(
  paise: Money,
  options: FormatOptions = {}
): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    showSymbol = true,
  } = options;

  const rupees = paiseToRupees(paise);

  if (!showSymbol) {
    return rupees.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format paise as a compact abbreviation for dashboards.
 * Example: 1_00_00_000 paise → "₹1 Cr"
 */
export function formatMoneyCompact(paise: Money): string {
  const rupees = paiseToRupees(paise);

  if (Math.abs(rupees) >= 10_000_000) {
    return `₹${(rupees / 10_000_000).toFixed(2)} Cr`;
  }
  if (Math.abs(rupees) >= 100_000) {
    return `₹${(rupees / 100_000).toFixed(2)} L`;
  }
  if (Math.abs(rupees) >= 1_000) {
    return `₹${(rupees / 1_000).toFixed(2)} K`;
  }
  return formatMoney(paise);
}

// ---------------------------------------------------------------------------
// Re-export Money constructor for convenience
// ---------------------------------------------------------------------------

export { money, ZERO_MONEY };
export type { Money };
