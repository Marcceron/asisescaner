"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/domain/types";

type Category = { id: string; label: string; order: number };
type Catalog = { categories: Category[]; products: Product[] };

export function AdminDashboard() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (response.status === 401) { setRequiresLogin(true); return; }
    setCatalog(await response.json()); setRequiresLogin(false);
  };
  useEffect(() => {
    void fetch("/api/admin/catalog", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { setRequiresLogin(true); return; }
      setCatalog(await response.json());
    });
  }, []);

  async function login(form: FormData) {
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
    if (!response.ok) { const result = await response.json(); setMessage(result.error ?? "No se pudo iniciar sesión"); return; }
    setMessage(""); await load();
  }
  async function save(form: FormData) {
    setMessage("Guardando…");
    const response = await fetch("/api/admin/catalog", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "No se pudo guardar"); return; }
    setCatalog(result); setMessage("Guardado. El catálogo público ya está actualizado.");
  }
  async function remove(type: "category" | "product", id: string) {
    const response = await fetch("/api/admin/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error); return; }
    setCatalog(result); setMessage("Eliminado correctamente.");
  }

  if (requiresLogin) return <main className="adminLogin"><form action={login}><p className="eyebrow">Asis Escáner</p><h1>Super Admin</h1><label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>{message && <p className="errorMessage">{message}</p>}<button className="primaryButton">Entrar</button><Link href="/">Volver a la app</Link></form></main>;
  if (!catalog) return <main className="adminLogin"><p>Cargando administrador…</p></main>;

  return <main className="adminShell"><header><div><p className="eyebrow">Asis Escáner</p><h1>Super Admin</h1></div><Link href="/">Abrir configurador</Link></header>{message && <output>{message}</output>}<div className="adminGrid"><section className="adminCard"><h2>Nueva categoría</h2><form action={save}><input type="hidden" name="action" value="category" /><label>Nombre<input name="label" required /></label><button className="primaryButton">Crear categoría</button></form><h3>Categorías</h3><ul>{catalog.categories.map((category) => <li key={category.id}><span>{category.label}</span><button onClick={() => void remove("category", category.id)}>Eliminar</button></li>)}</ul></section><section className="adminCard"><h2>Subir asset</h2><form action={save}><input type="hidden" name="action" value="product" /><label>Nombre<input name="name" required /></label><label>Categoría<select name="category" required>{catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label>Representación 3D<select name="renderStyle"><option value="wave">Cortina con ondas</option><option value="blackout">Cortina blackout</option><option value="sheer">Cortina translúcida</option><option value="roller">Persiana enrollable</option><option value="rod">Tubo</option><option value="bracket">Soportes</option><option value="finial">Remates</option></select></label><label>Descripción<textarea name="description" rows={2} /></label><label>Precio MXN<input name="price" type="number" min="0" step="0.01" required /></label><label>Miniatura PNG/JPG/WebP<input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label><label>Modelo 3D GLB/glTF<input name="model" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" /></label><button className="primaryButton">Guardar asset</button></form></section></div><section className="adminCard adminProducts"><h2>Assets publicados</h2><div>{catalog.products.map((product) => <article key={product.id}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{catalog.categories.find((item) => item.id === product.category)?.label ?? product.category}</small></span><button onClick={() => void remove("product", product.id)}>Eliminar</button></article>)}</div></section></main>;
}
