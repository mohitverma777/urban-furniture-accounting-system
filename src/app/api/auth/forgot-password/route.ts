import { NextRequest, NextResponse } from "next/server";
import { forgotPassword } from "@/auth/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await forgotPassword(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to process request" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Auth Forgot Password Route Error]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
