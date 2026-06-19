import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { getAuthenticatedUser } from "@/utils/auth";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request payload
    const { recipientId, encryptedContent } = await req.json();

    if (!recipientId || !encryptedContent) {
      return NextResponse.json(
        { error: "Recipient ID and encryptedContent payload are required" },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    }

    // 3. Save message blind ciphertext to database
    const newMessage = await prisma.message.create({
      data: {
        senderId: currentUser.id,
        receiverId: recipientId,
        encryptedContent: JSON.stringify(encryptedContent),
      },
    });

    const parsedContent = JSON.parse(newMessage.encryptedContent);

    // 4. Return serialized E2EE message
    return NextResponse.json({
      id: newMessage.id,
      senderId: newMessage.senderId,
      recipientId: newMessage.receiverId,
      wrappedKey: parsedContent.wrappedKey,
      iv: parsedContent.iv,
      ciphertext: parsedContent.ciphertext,
      aesKeyHex: parsedContent.aesKeyHex,
      timestamp: "Just now",
    });
  } catch (err) {
    console.error("Send message API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
