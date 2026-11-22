import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("memories").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", timestamp },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ok", timestamp },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", timestamp },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
