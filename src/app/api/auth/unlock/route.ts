import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  getClientIdentifier,
  isAuthConfigured,
  validatePasscode,
} from "@/lib/auth";
import {
  checkUnlockRateLimit,
  clearFailedUnlocks,
  recordFailedUnlock,
} from "@/lib/auth-core";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        unlocked: false,
        error: "Server authentication is not configured yet. Check your .env file.",
      },
      { status: 500 }
    );
  }

  const clientKey = getClientIdentifier(request);
  const rateLimit = checkUnlockRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        unlocked: false,
        error: `Too many tries. Wait ${rateLimit.retryAfterSeconds}s and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    if (typeof body?.passcode === "string") {
      passcode = body.passcode.trim();
    }
  } catch {
    return NextResponse.json(
      { unlocked: false, error: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!passcode) {
    return NextResponse.json(
      { unlocked: false, error: "Enter our passcode first." },
      { status: 400 }
    );
  }

  if (!validatePasscode(passcode)) {
    recordFailedUnlock(clientKey);
    return NextResponse.json(
      {
        unlocked: false,
        error: "That passcode didn't match. Check the hint and try again.",
      },
      { status: 401 }
    );
  }

  clearFailedUnlocks(clientKey);
  const response = NextResponse.json({ unlocked: true }, { status: 200 });
  return attachSessionCookie(response);
}
