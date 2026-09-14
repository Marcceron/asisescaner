"use client";

import { useState } from "react";
import { z } from "zod";
import type { Customer, Measurement, Product, SelectedItem } from "@/domain/types";
import { generateQuotePdf } from "@/services/quotation/generate-quote";

const schema = z.object({
  name: z.string().trim().min(2, "Escribe un nombre"),
  email: z.string().trim().email("Correo no válido").or(z.literal("")),
  phone: z.string().trim().max(30),
  notes: z.string().trim().max(300),
});

type Props = {
  open: boolean;
  onClose: () => void;
  imageData: string | null;
  captureScene: () => Promise<string | null>;
  measurement: Measurement;
  selectedItems: SelectedItem[];
  products: Product[];
};

export function QuoteDialog({ open, onClose, imageData, captureScene, measurement, selectedItems, products }: Props) {
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = schema.safeParse(customer);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    if (!measurement.widthCm || !measurement.heightCm) {
      setError("Confirma las medidas antes de generar la cotización.");
      return;
    }
    if (!selectedItems.length) {
      setError("Selecciona al menos un producto.");
      return;
    }
    setGenerating(true);
    try {
      const configuredScene = await captureScene();
      await generateQuotePdf({ customer: result.data, measurement, imageData: configuredScene ?? imageData, items: selectedItems, products });
      onClose();
    } catch {
      setError("No fue posible generar el PDF. Inténtalo de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="quote-title">
      <form className="quoteDialog" onSubmit={submit}>
        <header className="dialogHeader">
          <div>
            <p className="eyebrow">Último paso</p>
            <h2 id="quote-title">Generar cotización</h2>
          </div>
          <button type="button" className="iconTextButton" onClick={onClose}>Cerrar</button>
        </header>
        <label>Nombre del cliente<input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required /></label>
        <div className="formRow">
          <label>Correo<input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label>
          <label>Teléfono<input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label>
        </div>
        <label>Notas<textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} rows={3} /></label>
        <p className="quoteNotice">El PDF indicará que las medidas son aproximadas y requieren verificación física.</p>
        {error && <p className="errorMessage" role="alert">{error}</p>}
        <button className="primaryButton" type="submit" disabled={generating}>{generating ? "Preparando PDF…" : "Descargar PDF"}</button>
      </form>
    </div>
  );
}
