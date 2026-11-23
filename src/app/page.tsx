import { getSessionRole } from "@/lib/auth";
import { CapsuleGate } from "@/components/CapsuleGate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const role = await getSessionRole();
  return <CapsuleGate initialRole={role} />;
}
