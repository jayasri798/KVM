import { NextResponse } from "next/server";
import prisma from "@/utils/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        publicKey: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      publicKeyJwk: JSON.parse(user.publicKey),
    }));

    return NextResponse.json(formattedUsers);
  } catch (err) {
    console.error("List users endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
