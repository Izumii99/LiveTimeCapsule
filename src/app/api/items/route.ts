import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import {
  isExpectedSupabasePublicUrl,
  isValidDateOnly,
  isValidStoragePath,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

function getTodayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("gifted_items")
      .select("id, name, image_url, storage_path, lore_note, gifted_date, created_at")
      .order("gifted_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load gifted items." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { items: data ?? [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}

interface CreateItemBody {
  name?: unknown;
  image_url?: unknown;
  storage_path?: unknown;
  lore_note?: unknown;
  gifted_date?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateItemBody;
  try {
    body = (await request.json()) as CreateItemBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 120) {
    return NextResponse.json(
      { error: "Item name must be between 1 and 120 characters." },
      { status: 400 }
    );
  }

  const loreNote = typeof body.lore_note === "string" ? body.lore_note.trim() : "";
  if (loreNote.length < 1 || loreNote.length > 1500) {
    return NextResponse.json(
      { error: "Item lore note must be between 1 and 1500 characters." },
      { status: 400 }
    );
  }

  const giftedDate =
    body.gifted_date === undefined || body.gifted_date === ""
      ? getTodayDateOnly()
      : body.gifted_date;

  if (!isValidDateOnly(giftedDate)) {
    return NextResponse.json(
      { error: "Gifted date must be a valid YYYY-MM-DD date." },
      { status: 400 }
    );
  }

  let imageUrl: string | null = null;
  let storagePath: string | null = null;

  const hasImage = Boolean(body.image_url) || Boolean(body.storage_path);
  if (hasImage) {
    if (!isValidStoragePath(body.storage_path, ["items"])) {
      return NextResponse.json(
        { error: "Invalid storage path." },
        { status: 400 }
      );
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

    imageUrl = body.image_url;
    storagePath = body.storage_path;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("gifted_items")
      .insert({
        name,
        image_url: imageUrl,
        storage_path: storagePath,
        lore_note: loreNote,
        gifted_date: giftedDate,
      })
      .select("id, name, image_url, storage_path, lore_note, gifted_date, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Could not save this gifted item." },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
