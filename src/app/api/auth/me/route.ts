import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/utils/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        publicKeyJwk: JSON.parse(user.publicKey),
      },
    });
  } catch (err) {
    console.error("Session check endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
