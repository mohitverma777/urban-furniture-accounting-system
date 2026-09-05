"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  archiveProduct,
  unarchiveProduct,
  type ProductFormValues,
} from "@/services/products";

export async function createProductAction(data: ProductFormValues) {
  try {
    const product = await createProduct(data);
    revalidatePath("/products");
    return { success: true, product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

export async function updateProductAction(
  id: string,
  data: Partial<ProductFormValues>
) {
  try {
    const product = await updateProduct(id, data);
    revalidatePath("/products");
    return { success: true, product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

export async function archiveProductAction(id: string) {
  try {
    const product = await archiveProduct(id);
    revalidatePath("/products");
    return { success: true, product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive product",
    };
  }
}

export async function unarchiveProductAction(id: string) {
  try {
    const product = await unarchiveProduct(id);
    revalidatePath("/products");
    return { success: true, product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore product",
    };
  }
}
