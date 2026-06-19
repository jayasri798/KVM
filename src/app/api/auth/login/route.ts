import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { verifyPassword, signJWT, setAuthCookie } from "@/utils/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // 1. Validation
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // 4. Issue session token
    const token = await signJWT({ id: user.id, username: user.username });
    await setAuthCookie(token);

    // 5. Return user profile (omit passwordHash)
    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      publicKeyJwk: JSON.parse(user.publicKey),
    });
  } catch (err) {
    console.error("Login endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
