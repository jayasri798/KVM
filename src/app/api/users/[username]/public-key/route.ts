import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    if (!username) {
      return NextResponse.json({ error: "Username parameter is required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Fetch only the public key field for performance
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: {
        publicKey: true,
        displayName: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User identity not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: cleanUsername,
      displayName: user.displayName,
      publicKeyJwk: JSON.parse(user.publicKey),
    });
  } catch (err) {
    console.error("Fetch public key error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
