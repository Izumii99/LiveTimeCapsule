import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { mergeChatMessages } from "@/lib/chat-parser";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ChatMessageLine } from "@/lib/types";
import { isValidUuid, parseChatMessages } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_TOTAL_MESSAGES = 3000;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const unauthorized = await requireOwner();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid chat ID." }, { status: 400 });
  }

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const incoming = parseChatMessages(body.messages);
  if (!incoming) {
    return NextResponse.json(
      { error: "Provide at least one valid chat message to append." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from("chat_highlights")
      .select("id, title, messages, created_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to look up chat highlight." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Chat highlight not found." },
        { status: 404 }
      );
    }

    const existingMessages = Array.isArray(existing.messages)
      ? (existing.messages as ChatMessageLine[])
      : [];

    const { merged, addedCount, duplicatesSkipped } = mergeChatMessages(
      existingMessages,
      incoming
    );

    if (merged.length > MAX_TOTAL_MESSAGES) {
      return NextResponse.json(
        {
          error: `A single chat archive can hold up to ${MAX_TOTAL_MESSAGES} messages. Create a new archive for the next log.`,
        },
        { status: 400 }
      );
    }

    if (addedCount === 0) {
      return NextResponse.json(
        { chat: existing, addedCount: 0, duplicatesSkipped },
        { status: 200 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("chat_highlights")
      .update({ messages: merged })
      .eq("id", id)
      .select("id, title, messages, created_at")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Could not append messages to this chat." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { chat: updated, addedCount, duplicatesSkipped },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Database connection is not configured yet." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const unauthorized = await requireOwner();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid chat ID." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("chat_highlights")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete chat highlight." },
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
