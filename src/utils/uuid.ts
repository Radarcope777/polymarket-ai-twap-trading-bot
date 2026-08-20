import { randomBytes } from "node:crypto";

export function generateClOrdId(prefix = "grvt"): string {
  const suffix = randomBytes(6).toString("hex");
  return `${prefix}_${Date.now()}_${suffix}`;
}

export function generateNonce(): string {
  return Date.now().toString();
}
