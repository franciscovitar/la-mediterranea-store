import { createBrowserClient } from "@supabase/ssr";
import { caucePublicConfig } from "@/lib/cauce/config";

export function cauceBrowserAuth() {
  const { url, key } = caucePublicConfig();
  return createBrowserClient(url, key);
}
