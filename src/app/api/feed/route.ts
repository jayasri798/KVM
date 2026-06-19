import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";
import { hashPassword } from "@/utils/auth";
import { INITIAL_USERS, INITIAL_POSTS } from "@/utils/mockData";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 1. Self-healing seeding: Seed the DB if it is currently empty
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("Seeding database with mock data...");
      
      const seededUsers = [];
      // Create seed users
      for (const u of INITIAL_USERS) {
        // Generate mock keys for seed users
        const mockPublicKeyJwk = {
          kty: "RSA",
          n: "u1W...mock-n-string",
          e: "AQAB",
          alg: "RSA-OAEP-256",
          ext: true,
        };
        const passwordHash = await hashPassword("password123");
        
        const createdUser = await prisma.user.create({
          data: {
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            passwordHash,
            publicKey: JSON.stringify(mockPublicKeyJwk),
          },
        });
        seededUsers.push(createdUser);
      }

      // Create seed posts
      for (const p of INITIAL_POSTS) {
        await prisma.post.create({
          data: {
            id: p.id,
            userId: p.userId,
            mediaUrl: p.imageUrl,
            caption: p.caption,
            createdAt: new Date(),
          },
        });
      }
      console.log("Seeding completed successfully.");
    }

    // 2. Query posts from SQLite
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // 3. Map to UI schema
    const uiPosts = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      username: post.user.username,
      userAvatar: post.user.avatarUrl,
      imageUrl: post.mediaUrl,
      caption: post.caption,
      likesCount: 142, // Seed default count
      hasLiked: false,
      timestamp: "Just now",
      comments: [], // Comments loaded or mockable
    }));

    return NextResponse.json(uiPosts);
  } catch (err) {
    console.error("Feed API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
