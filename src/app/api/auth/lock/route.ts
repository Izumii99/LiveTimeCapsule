import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ unlocked: false }, { status: 200 });
  return clearSessionCookie(response);
}
