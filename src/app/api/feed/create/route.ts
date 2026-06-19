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
    const { imageUrl, caption } = await req.json();

    if (!imageUrl || !caption) {
      return NextResponse.json({ error: "Image URL and caption are required" }, { status: 400 });
    }

    // 3. Create post in database
    const newPost = await prisma.post.create({
      data: {
        userId: currentUser.id,
        mediaUrl: imageUrl,
        caption: caption.trim(),
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 4. Return UI schema mapped post
    return NextResponse.json({
      id: newPost.id,
      userId: newPost.userId,
      username: newPost.user.username,
      userAvatar: newPost.user.avatarUrl,
      imageUrl: newPost.mediaUrl,
      caption: newPost.caption,
      likesCount: 0,
      hasLiked: false,
      timestamp: "Just now",
      comments: [],
    });
  } catch (err) {
    console.error("Create post endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
