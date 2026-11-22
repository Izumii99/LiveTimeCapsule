import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { getExtensionForMimeType, isAllowedFolder } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAuth();
  if (unauthorized) {
    return unauthorized;
  }

  let body: { contentType?: unknown; folder?: unknown };
  try {
    body = (await request.json()) as { contentType?: unknown; folder?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const extension = getExtensionForMimeType(body.contentType);
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image type. Use WebP, JPEG, PNG, or GIF." },
      { status: 400 }
    );
  }

  if (!isAllowedFolder(body.folder)) {
    return NextResponse.json(
      { error: "Invalid upload folder." },
      { status: 400 }
    );
  }

  const storagePath = `${body.folder}/${randomUUID()}.${extension}`;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: "Could not create a signed upload URL." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json(
      {
        signedUrl: data.signedUrl,
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Storage service is not configured yet." },
      { status: 503 }
    );
  }
}
