import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { hashPassword, signJWT, setAuthCookie } from "@/utils/auth";

export async function POST(req: Request) {
  try {
    const { username, password, displayName, avatarUrl, publicKey } = await req.json();

    // 1. Input validation
    if (!username || !password || !displayName || !avatarUrl || !publicKey) {
      return NextResponse.json(
        { error: "All fields are required (username, password, displayName, avatarUrl, publicKey)" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username is already registered" }, { status: 400 });
    }

    // 3. Hash password and insert user
    const passwordHash = await hashPassword(password);
    
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: displayName.trim(),
        avatarUrl,
        passwordHash,
        publicKey, // Public key string (JWK)
      },
    });

    // 4. Issue session token
    const token = await signJWT({ id: newUser.id, username: newUser.username });
    await setAuthCookie(token);

    // 5. Return user profile info (omit passwordHash)
    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      avatarUrl: newUser.avatarUrl,
      publicKeyJwk: JSON.parse(newUser.publicKey),
    });
  } catch (err) {
    console.error("Register endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
