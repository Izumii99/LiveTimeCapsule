import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseChatMessages } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireOwner();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("chat_highlights")
      .select("id, title, messages, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load chat highlights." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { chats: data ?? [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}

interface CreateChatBody {
  title?: unknown;
  messages?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireOwner();
  if (unauthorized) {
    return unauthorized;
  }

  let body: CreateChatBody;
  try {
    body = (await request.json()) as CreateChatBody;
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

  const messages = parseChatMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "Add at least one valid chat line (max 3000 lines)." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("chat_highlights")
      .insert({
        title,
        messages,
      })
      .select("id, title, messages, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Could not save this chat highlight." },
        { status: 500 }
      );
    }

    return NextResponse.json({ chat: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}
