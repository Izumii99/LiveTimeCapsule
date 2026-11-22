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
    return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("gifted_items")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to look up gifted item." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Gifted item not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("gifted_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete gifted item." },
        { status: 500 }
      );
    }

    if (
      existing.storage_path &&
      isValidStoragePath(existing.storage_path, ["items"])
    ) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([existing.storage_path]);

      if (storageError) {
        console.error("Failed to remove item image:", existing.storage_path);
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
