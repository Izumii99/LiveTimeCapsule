import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("memory_notes").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete note." },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true, id }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
