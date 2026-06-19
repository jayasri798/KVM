import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/utils/auth";

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout endpoint error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
