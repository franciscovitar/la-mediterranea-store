import { Storefront } from "@/components/Storefront";
import { getPublicCatalog } from "@/lib/integrations/supabase/public";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Storefront catalog={await getPublicCatalog()} />;
}
