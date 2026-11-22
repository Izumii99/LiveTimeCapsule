import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifyPasscode,
  verifySessionToken,
} from "./auth-core";

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "";
}

function getExpectedPasscode(): string {
  return process.env.CAPSULE_PASSCODE ?? "";
}

export function isAuthConfigured(): boolean {
  return getAuthSecret().length >= 16 && getExpectedPasscode().length > 0;
}

export function validatePasscode(candidate: string): boolean {
  return verifyPasscode(candidate, getExpectedPasscode());
}

export async function isAuthenticated(): Promise<boolean> {
  const secret = getAuthSecret();
  if (secret.length < 16) {
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, secret);
}

export async function requireAuth(): Promise<NextResponse | null> {
  const unlocked = await isAuthenticated();
  if (unlocked) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized. Please unlock the capsule first." },
    { status: 401 }
  );
}

export function attachSessionCookie(response: NextResponse): NextResponse {
  const token = createSessionToken(getAuthSecret());
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
