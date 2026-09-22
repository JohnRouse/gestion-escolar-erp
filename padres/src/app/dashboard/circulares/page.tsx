import { redirect } from "next/navigation";
import { legacyPortalComunicadosTarget } from "@/lib/comunicadosRoutes";

type LegacyCircularesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyCircularesPage({
  searchParams,
}: LegacyCircularesPageProps) {
  const values = await searchParams;
  redirect(legacyPortalComunicadosTarget(values));
}
