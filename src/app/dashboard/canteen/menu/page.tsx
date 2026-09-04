import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/card";
import { MenuForm, MenuItemRow } from "./menu-client";

export default async function CanteenMenuPage() {
  await requireRole(["CANTEEN_STAFF", "ADMIN"]);
  const supabase = await createClient();

  const { data: items } = await supabase.from("canteen_menu").select("*").order("category");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Canteen Menu</h1>
        <p className="text-sm text-slate-500">Manage what students can order.</p>
      </div>

      <Card title="Add item">
        <MenuForm />
      </Card>

      <Card title="Menu items">
        {items && items.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No menu items yet." />
        )}
      </Card>
    </div>
  );
}
