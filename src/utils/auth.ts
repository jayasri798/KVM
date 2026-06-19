import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "./db";
import { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "kam_secure_vault_secret_key_mint_green_charcoal_2026";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "kam_session_token";

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a password with a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Signs a payload into a JWT token
 */
export async function signJWT(payload: { id: string; username: string }): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT token and returns its payload
 */
export async function verifyJWT(token: string): Promise<{ id: string; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { id: string; username: string };
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from Next.js cookies context
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload) return null;

    return await prisma.user.findUnique({
      where: { id: payload.id },
    });
  } catch (err) {
    console.error("Failed to authenticate user context:", err);
    return null;
  }
}

/**
 * Sets the authentication cookie in the response headers context
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clears the authentication cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
