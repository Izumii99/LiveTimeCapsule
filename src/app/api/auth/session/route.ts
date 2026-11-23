import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const role = await getSessionRole();
  return NextResponse.json(
    { unlocked: role !== null, role },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
