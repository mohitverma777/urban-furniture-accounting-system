import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/auth/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await signup(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[Auth Signup Error]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
