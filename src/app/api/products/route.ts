import { NextResponse } from "next/server";
import { getProducts } from "@/services/products";

export async function GET() {
  try {
    // Return all products (both active and archived)
    const products = await getProducts({ isArchived: undefined });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 }
    );
  }
}
