import type { LineItem, NormalizedLine } from "./types";

export function normalizeInvoiceLines(lines: LineItem[]): NormalizedLine[] {
  const out: NormalizedLine[] = [];
  for (const line of lines) {
    if (!line || typeof line.qty !== "number") continue;
    const qty = Number.isFinite(line.qty) ? line.qty : 0;
    const unit = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
    const gross = qty * unit;
    const discountRate = line.discountRate ?? 0;
    const discount = gross * discountRate;
    const net = gross - discount;
    const taxRate = line.taxRate ?? 0;
    const tax = net * taxRate;
    out.push({
      sku: String(line.sku ?? "").trim().toUpperCase(),
      description: String(line.description ?? "").trim(),
      qty,
      unit,
      gross,
      discount,
      net,
      tax,
      total: net + tax,
    });
  }
  return out.sort((a, b) => a.sku.localeCompare(b.sku));
}
