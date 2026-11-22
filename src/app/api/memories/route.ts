import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import type { MemoryItem } from "@/lib/types";
import {
  isAllowedAuthor,
  isAllowedCategory,
  isExpectedSupabasePublicUrl,
  isValidDateOnly,
  isValidStoragePath,
  parseOptionalIsoTimestamp,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RawMemoryRow extends Omit<MemoryItem, "notes_count"> {
  memory_notes?: Array<{ count: number }>;
}

function mapMemoryRow(row: RawMemoryRow): MemoryItem {
  const notesCount = row.memory_notes?.[0]?.count ?? 0;
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    image_url: row.image_url,
    storage_path: row.storage_path,
    category: row.category,
    author: row.author,
    memory_date: row.memory_date,
    unlock_at: row.unlock_at,
    created_at: row.created_at,
    notes_count: notesCount,
  };
}

function getTodayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const authorParam = searchParams.get("author");

  if (categoryParam && !isAllowedCategory(categoryParam)) {
    return NextResponse.json({ error: "Invalid category filter." }, { status: 400 });
  }

  if (authorParam && !isAllowedAuthor(authorParam)) {
    return NextResponse.json({ error: "Invalid author filter." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("memories")
      .select(
        "id, title, caption, image_url, storage_path, category, author, memory_date, unlock_at, created_at, memory_notes(count)"
      )
      .order("memory_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (categoryParam) {
      query = query.eq("category", categoryParam);
    }

    if (authorParam) {
      query = query.eq("author", authorParam);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Failed to load memories." },
        { status: 500 }
      );
    }

    const memories = ((data ?? []) as RawMemoryRow[]).map(mapMemoryRow);
    return NextResponse.json(
      { memories },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}

interface CreateMemoryBody {
  title?: unknown;
  caption?: unknown;
  image_url?: unknown;
  storage_path?: unknown;
  category?: unknown;
  author?: unknown;
  memory_date?: unknown;
  unlock_at?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateMemoryBody;
  try {
    body = (await request.json()) as CreateMemoryBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > 120) {
    return NextResponse.json(
      { error: "Title must be between 1 and 120 characters." },
      { status: 400 }
    );
  }

  const rawCaption = typeof body.caption === "string" ? body.caption.trim() : "";
  if (rawCaption.length > 2000) {
    return NextResponse.json(
      { error: "Caption cannot exceed 2000 characters." },
      { status: 400 }
    );
  }

  if (!isAllowedCategory(body.category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  if (!isAllowedAuthor(body.author)) {
    return NextResponse.json({ error: "Invalid author." }, { status: 400 });
  }

  if (!isValidStoragePath(body.storage_path, ["memories"])) {
    return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (
    !isExpectedSupabasePublicUrl(
      body.image_url,
      supabaseUrl,
      STORAGE_BUCKET,
      body.storage_path
    )
  ) {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  const memoryDate =
    body.memory_date === undefined || body.memory_date === ""
      ? getTodayDateOnly()
      : body.memory_date;

  if (!isValidDateOnly(memoryDate)) {
    return NextResponse.json(
      { error: "Memory date must be a valid YYYY-MM-DD date." },
      { status: 400 }
    );
  }

  const unlockAt = parseOptionalIsoTimestamp(body.unlock_at);
  if (unlockAt === "invalid") {
    return NextResponse.json(
      { error: "Invalid time capsule unlock date." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("memories")
      .insert({
        title,
        caption: rawCaption || null,
        image_url: body.image_url,
        storage_path: body.storage_path,
        category: body.category,
        author: body.author,
        memory_date: memoryDate,
        unlock_at: unlockAt,
      })
      .select(
        "id, title, caption, image_url, storage_path, category, author, memory_date, unlock_at, created_at"
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Could not save this memory." },
        { status: 500 }
      );
    }

    const memory: MemoryItem = {
      ...(data as Omit<MemoryItem, "notes_count">),
      notes_count: 0,
    };

    return NextResponse.json({ memory }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
