import { materialPresets, fabricPatterns, type MaterialKind, type FabricPattern } from "@/data/materials";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminToken } from "@/server/admin-auth";
import { readCatalog, writeCatalog } from "@/server/catalog-store";

async function authorized() { return validAdminToken((await cookies()).get(ADMIN_COOKIE)?.value); }
const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function GET() {
  if (!await authorized()) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(await readCatalog(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await authorized()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const catalog = await readCatalog();
  if (action === "category") {
    const label = String(form.get("label") ?? "").trim();
    if (!label) return Response.json({ error: "Nombre requerido" }, { status: 400 });
    const id = `${slug(label)}-${Date.now().toString(36)}`;
    catalog.categories.push({ id, label, order: catalog.categories.length });
  } else if (action === "product") {
    const name = String(form.get("name") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const image = form.get("image"); const model = form.get("model");
    if (!name || !catalog.categories.some((item) => item.id === category)) return Response.json({ error: "Producto o categoría inválidos" }, { status: 400 });
    const save = async (file: File, allowed: string[]) => {
      const extension = path.extname(file.name).toLowerCase();
      if (!allowed.includes(extension) || file.size > 15_000_000) throw new Error("Archivo inválido o mayor a 15 MB");
      const filename = `${randomUUID()}${extension}`; const directory = path.join(process.cwd(), "public", "uploads");
      await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
      return `/uploads/${filename}`;
    };
    try {
      const imageUrl = image instanceof File && image.size ? await save(image, [".png", ".jpg", ".jpeg", ".webp"]) : "/assets/product-white.png";
      const modelUrl = model instanceof File && model.size ? await save(model, [".glb", ".gltf"]) : undefined;
      const renderStyle = String(form.get("renderStyle") ?? "wave") as "wave" | "blackout" | "sheer" | "roller" | "rod" | "bracket" | "finial" | "hook" | "wand";
      const rawMaterial = String(form.get("material") ?? "metal");
      if (!Object.hasOwn(materialPresets, rawMaterial)) return Response.json({ error: "Material inválido" }, { status: 400 });
      const material = rawMaterial as MaterialKind;
      const tone = materialPresets[material].color;
      const rawPattern = String(form.get("pattern") ?? "");
      if (rawPattern && !Object.hasOwn(fabricPatterns, rawPattern)) return Response.json({ error: "Patrón inválido" }, { status: 400 });
      const isFabric = ["wave", "blackout", "sheer", "roller"].includes(renderStyle);
      const pattern = isFabric && rawPattern ? rawPattern as FabricPattern : undefined;
      catalog.products.push({ id: `${slug(name)}-${Date.now().toString(36)}`, category, name, description: String(form.get("description") ?? ""), priceCents: Math.round(Number(form.get("price") ?? 0) * 100), currency: "MXN", image: imageUrl, modelUrl, renderStyle, material, tone, pattern, compatibleWith: [], active: true, order: catalog.products.length });
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar" }, { status: 400 }); }
  } else return Response.json({ error: "Acción inválida" }, { status: 400 });
  await writeCatalog(catalog); return Response.json(catalog);
}

export async function DELETE(request: Request) {
  if (!await authorized()) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { type, id } = await request.json() as { type: "category" | "product"; id: string };
  const catalog = await readCatalog();
  if (type === "category") {
    if (catalog.products.some((product) => product.category === id)) return Response.json({ error: "La categoría todavía contiene productos" }, { status: 409 });
    catalog.categories = catalog.categories.filter((item) => item.id !== id);
  } else catalog.products = catalog.products.filter((item) => item.id !== id);
  await writeCatalog(catalog); return Response.json(catalog);
}
