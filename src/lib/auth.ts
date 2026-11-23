import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  parseSessionToken,
  resolvePasscodeRole,
  type SessionRole,
} from "./auth-core";

export type { SessionRole };

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "";
}

function getExpectedPasscode(): string {
  return process.env.CAPSULE_PASSCODE ?? "";
}

function getGuestPasscode(): string {
  return (process.env.GUEST_PASSCODE ?? "").trim();
}

export function isAuthConfigured(): boolean {
  return getAuthSecret().length >= 16 && getExpectedPasscode().length > 0;
}

export function resolvePasscode(candidate: string): SessionRole | null {
  return resolvePasscodeRole(
    candidate,
    getExpectedPasscode(),
    getGuestPasscode()
  );
}

export async function getSessionRole(): Promise<SessionRole | null> {
  const secret = getAuthSecret();
  if (secret.length < 16) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token, secret);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionRole()) !== null;
}

export async function requireAuth(): Promise<NextResponse | null> {
  const role = await getSessionRole();
  if (role !== null) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized. Please unlock the capsule first." },
    { status: 401 }
  );
}

export async function requireOwner(): Promise<NextResponse | null> {
  const role = await getSessionRole();
  if (role === null) {
    return NextResponse.json(
      { error: "Unauthorized. Please unlock the capsule first." },
      { status: 401 }
    );
  }

  if (role !== "owner") {
    return NextResponse.json(
      { error: "Forbidden. This section is restricted." },
      { status: 403 }
    );
  }

  return null;
}

export function attachSessionCookie(
  response: NextResponse,
  role: SessionRole
): NextResponse {
  const token = createSessionToken(getAuthSecret(), role);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "local";
}
