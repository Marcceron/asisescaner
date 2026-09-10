import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { categoryLabels, products } from "@/data/catalog";
import type { Product } from "@/domain/types";

export type CatalogCategory = { id: string; label: string; order: number };
export type CatalogData = { categories: CatalogCategory[]; products: Product[] };
const filePath = path.join(process.cwd(), "data", "admin-catalog.json");

export async function readCatalog(): Promise<CatalogData> {
  try { return JSON.parse(await readFile(filePath, "utf8")) as CatalogData; }
  catch { return { categories: Object.entries(categoryLabels).map(([id, label], order) => ({ id, label, order })), products }; }
}

export async function writeCatalog(catalog: CatalogData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(catalog, null, 2), "utf8");
}
