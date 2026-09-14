import { jsPDF } from "jspdf";
import type { Customer, Measurement, Product, SelectedItem } from "@/domain/types";
import { formatMoney } from "@/lib/money";

type QuoteInput = { customer: Customer; measurement: Measurement; imageData: string | null; items: SelectedItem[]; products: Product[] };

async function thumbnailAsJpeg(source: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image(); image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 240;
      const context = canvas.getContext("2d"); if (!context) return resolve(null);
      context.fillStyle = "#f2f2f2"; context.fillRect(0, 0, 240, 240);
      const scale = Math.max(240 / image.naturalWidth, 240 / image.naturalHeight);
      const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
      context.drawImage(image, (240 - width) / 2, (240 - height) / 2, width, height);
      resolve(canvas.toDataURL("image/jpeg", .86));
    };
    image.onerror = () => resolve(null); image.src = source;
  });
}

export async function generateQuotePdf({ customer, measurement, imageData, items, products }: QuoteInput) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const folio = `AS-${Date.now().toString().slice(-8)}`;
  const quoteItems = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  });
  const thumbnails = await Promise.all(quoteItems.map(({ product }) => thumbnailAsJpeg(product.image)));
  const subtotal = quoteItems.reduce((sum, { item, product }) => sum + product.priceCents * item.quantity, 0);
  const tax = Math.round(subtotal * .16); const total = subtotal + tax;

  pdf.setFillColor(20, 20, 20); pdf.rect(0, 0, 210, 35, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(21); pdf.text("ASIS ESCÁNER", 16, 16);
  pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.text("Cotización de cortinas personalizadas", 16, 24);
  pdf.text(`Folio ${folio}`, 194, 16, { align: "right" }); pdf.text(new Intl.DateTimeFormat("es-MX").format(new Date()), 194, 24, { align: "right" });

  pdf.setTextColor(35, 35, 35); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text("Cliente", 16, 48); pdf.text("Medidas de la ventana", 110, 48);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(customer.name || "Cliente general", 16, 56);
  if (customer.email) pdf.text(customer.email, 16, 62); if (customer.phone) pdf.text(customer.phone, 16, 68);
  pdf.text(`Ancho: ${measurement.widthCm || "—"} cm`, 110, 56); pdf.text(`Alto: ${measurement.heightCm || "—"} cm`, 110, 62);
  pdf.text(`Margen estimado: ±${measurement.errorMarginPercent}%`, 110, 68);

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text("Vista configurada", 16, 80);
  if (imageData) {
    try {
      const properties = pdf.getImageProperties(imageData); const maxWidth = 82; const maxHeight = 58;
      const scale = Math.min(maxWidth / properties.width, maxHeight / properties.height);
      pdf.addImage(imageData, "JPEG", 16, 85, properties.width * scale, properties.height * scale, undefined, "FAST");
    } catch { pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text("Vista no disponible", 16, 90); }
  }

  let y = 80;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text("Productos seleccionados", 108, y); y += 7;
  pdf.setFontSize(8); pdf.setTextColor(90, 90, 90); pdf.text("PRODUCTO", 126, y);
  pdf.text("CANT.", 171, y, { align: "center" }); pdf.text("IMPORTE", 194, y, { align: "right" });
  pdf.setDrawColor(215, 215, 215); pdf.line(108, y + 3, 194, y + 3); y += 7;

  quoteItems.forEach(({ item, product }, index) => {
    const thumbnail = thumbnails[index];
    if (thumbnail) pdf.addImage(thumbnail, "JPEG", 108, y - 4, 13, 13, undefined, "FAST");
    else { pdf.setFillColor(235, 235, 235); pdf.roundedRect(108, y - 4, 13, 13, 2, 2, "F"); }
    pdf.setTextColor(35, 35, 35); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(product.name, 40).slice(0, 2), 125, y);
    pdf.setFont("helvetica", "normal"); pdf.text(String(item.quantity), 171, y + 1, { align: "center" });
    pdf.text(formatMoney(product.priceCents * item.quantity), 194, y + 1, { align: "right" }); y += 16;
  });

  y = Math.max(y + 4, 188); pdf.setDrawColor(205, 205, 205); pdf.line(110, y, 194, y);
  pdf.setTextColor(35, 35, 35); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  pdf.text("Subtotal", 150, y + 8, { align: "right" }); pdf.text(formatMoney(subtotal), 194, y + 8, { align: "right" });
  pdf.text("IVA 16%", 150, y + 16, { align: "right" }); pdf.text(formatMoney(tax), 194, y + 16, { align: "right" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("Total", 150, y + 27, { align: "right" }); pdf.text(formatMoney(total), 194, y + 27, { align: "right" });

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(85, 85, 85);
  pdf.text("Medidas aproximadas, sujetas a verificación física antes de fabricar.", 16, 230);
  pdf.text("Vigencia: 15 días naturales. Los precios y disponibilidad pueden cambiar.", 16, 237);
  if (customer.notes) pdf.text(pdf.splitTextToSize(`Notas: ${customer.notes}`, 178).slice(0, 2), 16, 248);
  pdf.setFillColor(0, 115, 255); pdf.rect(0, 280, 210, 17, "F"); pdf.setTextColor(255, 255, 255);
  pdf.text("Asis Escáner · Diseña tu propia cortina", 105, 290, { align: "center" });
  pdf.save(`asis-cotizacion-${folio}.pdf`); return folio;
}
