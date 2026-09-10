export function formatMoney(cents: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function sumMoney(items: Array<{ priceCents: number; quantity: number }>) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}
