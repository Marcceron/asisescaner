import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { categoryLabels, products } from "@/data/catalog";
import { expandedProducts } from "@/data/expanded-catalog";
import type { Product } from "@/domain/types";

export type CatalogCategory = { id: string; label: string; order: number };
export type CatalogData = { categories: CatalogCategory[]; products: Product[]; accessoryCatalogVersion?: number };
const filePath = path.join(process.cwd(), "data", "admin-catalog.json");

export async function readCatalog(): Promise<CatalogData> {
  let catalog: CatalogData;
  try { catalog = JSON.parse(await readFile(filePath, "utf8")) as CatalogData; }
  catch { return { categories: Object.entries(categoryLabels).map(([id, label], order) => ({ id, label, order })), products, accessoryCatalogVersion: 2 }; }
  if ((catalog.accessoryCatalogVersion ?? 0) < 2) {
    // Import the new defaults once, preserving administrator edits and later deletions.
    const additions = catalog.accessoryCatalogVersion === 1 ? expandedProducts : products.filter((item) => item.material);
    for (const product of additions) {
      if (!catalog.products.some((item) => item.id === product.id)) catalog.products.push(product);
      if (!catalog.categories.some((item) => item.id === product.category)) {
        catalog.categories.push({ id: product.category, label: categoryLabels[product.category as keyof typeof categoryLabels], order: catalog.categories.length });
      }
    }
    catalog.accessoryCatalogVersion = 2;
    await writeCatalog(catalog);
  }
  return catalog;
}

export async function writeCatalog(catalog: CatalogData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(catalog, null, 2), "utf8");
}
