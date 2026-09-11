import { AppShell } from "@/components/AppShell";
import { connection } from "next/server";

export default async function Home() {
  // The configurator is an interactive application. Rendering it per request keeps
  // hosting CDNs from retaining stale HTML that references an older client bundle.
  await connection();
  return <AppShell />;
}
