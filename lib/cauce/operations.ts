import type { cauceServerAuth } from "@/lib/cauce/auth";

type Client = Awaited<ReturnType<typeof cauceServerAuth>>;

export type MerchantData = {
  products: Array<{ id: string; slug: string; name: string; category: string; price: number; image: string; description: string; material: string; dimensions: string; care: string; badge: string | null; featured: boolean; active: boolean }>;
  inventory: Array<{ product_id: string; stock: number; version: number; updated_at: string }>;
  orders: Array<{ id: string; status: string; total_amount: number; created_at: string }>;
  movements: Array<{ id: number; product_id: string; previous_stock: number; new_stock: number; reason: string; happened_at: string }>;
};

export async function getMerchantData(client: Client): Promise<MerchantData> {
  const [products, inventory, orders, movements] = await Promise.all([
    client.from("cauce_products").select("*").order("created_at", { ascending: false }),
    client.from("cauce_inventory").select("product_id,stock,version,updated_at"),
    client.from("cauce_orders").select("id,status,total_amount,created_at").order("created_at", { ascending: false }).limit(30),
    client.from("cauce_inventory_movements").select("id,product_id,previous_stock,new_stock,reason,happened_at").order("happened_at", { ascending: false }).limit(20),
  ]);
  for (const result of [products, inventory, orders, movements]) if (result.error) throw result.error;
  return { products: products.data ?? [], inventory: inventory.data ?? [], orders: orders.data ?? [], movements: movements.data ?? [] };
}
