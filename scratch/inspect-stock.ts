import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";

async function main() {
  const allProds = await db.select().from(products);
  console.log("Total products count:", allProds.length);
  console.log("Products list:", JSON.stringify(allProds, null, 2));

  const allMovements = await db.select().from(stockMovements);
  console.log("Total stock movements count:", allMovements.length);
  console.log("Stock movements list:", JSON.stringify(allMovements, null, 2));
}

main();
