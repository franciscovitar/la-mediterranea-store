import { notFound } from "next/navigation";
import { CauceAccessError, requireCauceStaff } from "@/lib/cauce/auth";
import { cauceMerchantEnabled } from "@/lib/cauce/config";
import { getMerchantData } from "@/lib/cauce/operations";
import { MerchantConsole } from "@/components/cauce/MerchantConsole";
import { MerchantLogin } from "@/components/cauce/MerchantLogin";
import "../cauce.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestión | Cauce", robots: { index: false, follow: false } };

export default async function MerchantPage() {
  if (!cauceMerchantEnabled()) notFound();
  let state;
  try { state = await getMerchantData(await requireCauceStaff()); }
  catch (error) {
    if (!(error instanceof CauceAccessError)) throw error;
    return <main className="c-site c-merchant"><div className="c-merchant-wrap">
      <div className="c-merchant-head"><a href="/cauce" className="c-logo">cauce<span>.</span></a><span>Acceso del equipo</span></div>
      <MerchantLogin />
    </div></main>;
  }
  return <main className="c-site c-merchant"><MerchantConsole initial={state} /></main>;
}
