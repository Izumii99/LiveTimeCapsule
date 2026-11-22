import { isAuthenticated } from "@/lib/auth";
import { CapsuleGate } from "@/components/CapsuleGate";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const unlocked = await isAuthenticated();
  return <CapsuleGate initialUnlocked={unlocked} />;
}
