import { jsPDF } from "jspdf";
import type { Customer, Measurement, Product, SelectedItem } from "@/domain/types";
import { formatMoney } from "@/lib/money";

type QuoteInput = {
  customer: Customer;
  measurement: Measurement;
  imageData: string | null;
  items: SelectedItem[];
  products: Product[];
};

export function generateQuotePdf({ customer, measurement, imageData, items, products }: QuoteInput) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const folio = `AS-${Date.now().toString().slice(-8)}`;
  const subtotal = items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.priceCents ?? 0) * item.quantity;
  }, 0);
  const tax = Math.round(subtotal * 0.16);
  const total = subtotal + tax;

  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, 210, 35, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(21);
  pdf.text("ASIS ESCÁNER", 16, 16);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Cotización de cortinas personalizadas", 16, 24);
  pdf.text(`Folio ${folio}`, 194, 16, { align: "right" });
  pdf.text(new Intl.DateTimeFormat("es-MX").format(new Date()), 194, 24, { align: "right" });

  pdf.setTextColor(35, 35, 35);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Cliente", 16, 48);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(customer.name || "Cliente general", 16, 56);
  if (customer.email) pdf.text(customer.email, 16, 62);
  if (customer.phone) pdf.text(customer.phone, 16, 68);

  pdf.setFont("helvetica", "bold");
  pdf.text("Medidas de la ventana", 110, 48);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Ancho: ${measurement.widthCm || "—"} cm`, 110, 56);
  pdf.text(`Alto: ${measurement.heightCm || "—"} cm`, 110, 62);
  pdf.text(`Margen estimado: ±${measurement.errorMarginPercent}%`, 110, 68);

  let y = 82;
  if (imageData) {
    try {
      pdf.addImage(imageData, imageData.includes("png") ? "PNG" : "JPEG", 16, y, 68, 44, undefined, "FAST");
    } catch {
      // The quote remains valid if the browser cannot decode a persisted image.
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.text("Partida", 92, y + 3);
  pdf.text("Cant.", 160, y + 3);
  pdf.text("Importe", 194, y + 3, { align: "right" });
  pdf.setDrawColor(210, 210, 210);
  pdf.line(92, y + 7, 194, y + 7);
  pdf.setFont("helvetica", "normal");
  y += 15;
  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) continue;
    pdf.text(product.name, 92, y);
    pdf.text(String(item.quantity), 164, y, { align: "center" });
    pdf.text(formatMoney(product.priceCents * item.quantity), 194, y, { align: "right" });
    y += 8;
  }

  y = Math.max(y + 10, 138);
  pdf.line(110, y, 194, y);
  pdf.text("Subtotal", 150, y + 8, { align: "right" });
  pdf.text(formatMoney(subtotal), 194, y + 8, { align: "right" });
  pdf.text("IVA 16%", 150, y + 16, { align: "right" });
  pdf.text(formatMoney(tax), 194, y + 16, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", 150, y + 26, { align: "right" });
  pdf.text(formatMoney(total), 194, y + 26, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(85, 85, 85);
  pdf.text("Medidas aproximadas, sujetas a verificación física antes de fabricar.", 16, 230);
  pdf.text("Vigencia: 15 días naturales. Los precios y disponibilidad pueden cambiar.", 16, 237);
  if (customer.notes) pdf.text(`Notas: ${customer.notes}`.slice(0, 130), 16, 248);
  pdf.setFillColor(0, 115, 255);
  pdf.rect(0, 280, 210, 17, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Asis Escáner · Diseña tu propia cortina", 105, 290, { align: "center" });

  pdf.save(`asis-cotizacion-${folio}.pdf`);
  return folio;
}
