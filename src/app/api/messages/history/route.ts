import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getAuthenticatedUser } from "@/utils/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read query params
    const searchParams = req.nextUrl.searchParams;
    const chatWithUserId = searchParams.get("chatWithUserId");

    if (!chatWithUserId) {
      return NextResponse.json({ error: "chatWithUserId query parameter is required" }, { status: 400 });
    }

    // 3. Query history from SQLite
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUser.id, receiverId: chatWithUserId },
          { senderId: chatWithUserId, receiverId: currentUser.id },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 4. Map content and deserialize the E2EE envelope
    const formattedMessages = messages.map((msg) => {
      let parsed = { wrappedKey: "", iv: "", ciphertext: "", aesKeyHex: "" };
      try {
        parsed = JSON.parse(msg.encryptedContent);
      } catch (e) {
        console.error("Failed to parse message encryptedContent payload:", msg.id, e);
      }

      return {
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.receiverId,
        wrappedKey: parsed.wrappedKey,
        iv: parsed.iv,
        ciphertext: parsed.ciphertext,
        aesKeyHex: parsed.aesKeyHex,
        timestamp: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    return NextResponse.json(formattedMessages);
  } catch (err) {
    console.error("Fetch message history API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
