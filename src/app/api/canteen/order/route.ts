import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const items: { menuItemId: string; quantity: number }[] = body?.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const menuIds = items.map((i) => i.menuItemId);
  const { data: menuItems, error: menuError } = await supabase
    .from("canteen_menu")
    .select("id, price, available")
    .in("id", menuIds);

  if (menuError || !menuItems) {
    return NextResponse.json({ error: "Could not load menu" }, { status: 400 });
  }

  const priceById = new Map(menuItems.map((m) => [m.id, m]));
  let total = 0;
  for (const item of items) {
    const menuItem = priceById.get(item.menuItemId);
    if (!menuItem || !menuItem.available) {
      return NextResponse.json({ error: "One or more items are unavailable" }, { status: 400 });
    }
    total += Number(menuItem.price) * item.quantity;
  }

  const { data: order, error: orderError } = await supabase
    .from("canteen_orders")
    .insert({ student_id: user.id, total_amount: total })
    .select("id, pickup_code")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? "Could not place order" }, { status: 400 });
  }

  const { error: itemsError } = await supabase.from("canteen_order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      price_at_order: priceById.get(i.menuItemId)!.price,
    })),
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({ orderId: order.id, pickupCode: order.pickup_code, total });
}
