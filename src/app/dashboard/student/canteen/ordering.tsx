"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  price: number;
}

export function CanteenOrdering({ menu }: { menu: MenuItem[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  }

  const cartEntries = Object.entries(cart);
  const total = cartEntries.reduce((sum, [id, qty]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item ? Number(item.price) * qty : 0);
  }, 0);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/canteen/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartEntries.map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
      }),
    });

    const body = await res.json().catch(() => ({}));
    setPlacing(false);

    if (!res.ok) {
      setError(body.error ?? "Could not place order.");
      return;
    }

    setMessage(`Order placed! Pickup code: ${body.pickupCode}`);
    setCart({});
    router.refresh();
  }

  return (
    <Card title="Menu">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {menu.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">
                {item.category ?? "—"} · ₹{Number(item.price).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {cart[item.id] > 0 && (
                <>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="h-7 w-7 rounded-md border border-slate-300 text-sm"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm">{cart[item.id]}</span>
                </>
              )}
              <button
                onClick={() => addToCart(item.id)}
                className="h-7 w-7 rounded-md border border-slate-300 text-sm"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {cartEntries.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-800">Total: ₹{total.toLocaleString()}</p>
          <button
            onClick={placeOrder}
            disabled={placing}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
