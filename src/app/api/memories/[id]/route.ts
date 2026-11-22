import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { isValidStoragePath, isValidUuid } from "@/lib/validation";

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
    return NextResponse.json({ error: "Invalid memory ID." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("memories")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to look up memory." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete memory." },
        { status: 500 }
      );
    }

    if (isValidStoragePath(existing.storage_path, ["memories"])) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([existing.storage_path]);

      if (storageError) {
        console.error("Failed to remove storage object:", existing.storage_path);
      }
    }

    return NextResponse.json({ deleted: true, id }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
