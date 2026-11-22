import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAllowedAuthor, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const memoryId = searchParams.get("memoryId");
  if (!isValidUuid(memoryId)) {
    return NextResponse.json(
      { error: "A valid memoryId query parameter is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("memory_notes")
      .select("id, memory_id, author, content, created_at")
      .eq("memory_id", memoryId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load notes." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { notes: data ?? [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}

interface CreateNoteBody {
  memoryId?: unknown;
  author?: unknown;
  content?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateNoteBody;
  try {
    body = (await request.json()) as CreateNoteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!isValidUuid(body.memoryId)) {
    return NextResponse.json({ error: "Invalid memory ID." }, { status: 400 });
  }

  if (!isAllowedAuthor(body.author)) {
    return NextResponse.json({ error: "Invalid author." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length < 1 || content.length > 600) {
    return NextResponse.json(
      { error: "Note must be between 1 and 600 characters." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("memory_notes")
      .insert({
        memory_id: body.memoryId,
        author: body.author,
        content,
      })
      .select("id, memory_id, author, content, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Could not save your note." },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
