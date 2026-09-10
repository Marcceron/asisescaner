import { readCatalog } from "@/server/catalog-store";

export async function GET() {
  return Response.json(await readCatalog(), { headers: { "Cache-Control": "no-store" } });
}
