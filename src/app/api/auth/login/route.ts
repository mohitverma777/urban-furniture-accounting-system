import { NextRequest, NextResponse } from "next/server";
import { login } from "@/auth/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await login(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Auth Login Error]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
