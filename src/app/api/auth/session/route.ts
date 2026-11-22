import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unlocked = await isAuthenticated();
  return NextResponse.json(
    { unlocked },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
