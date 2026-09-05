import { NextResponse } from "next/server";
import { logout } from "@/auth/service";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auth Logout Error]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
