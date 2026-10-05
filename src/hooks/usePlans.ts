import { useEffect, useState } from "react";
import { apiFetch, apiJson } from "../lib/api";

export type PlanId = "inicial" | "destacado" | "institucional";

// Valores de respaldo mientras carga; el precio real siempre lo define el servidor.
let cache: Record<string, number> = { inicial: 39900, destacado: 43900, institucional: 49900 };
let loaded = false;

export function usePlans() {
  const [prices, setPrices] = useState(cache);

  useEffect(() => {
    if (loaded) return;
    apiFetch("/api/plans")
      .then((res) => (res.ok ? res.json() : []))
      .then((plans: { id: string; price: number }[]) => {
        if (!plans.length) return;
        cache = Object.fromEntries(plans.map((p) => [p.id, p.price]));
        loaded = true;
        setPrices(cache);
      })
      .catch(() => {});
  }, []);

  const formatPrice = (plan: PlanId) => `$${(prices[plan] || 0).toLocaleString("es-AR")}`;
  return { prices, formatPrice };
}

// Inicia un pago y redirige a Mercado Pago. Devuelve el mensaje de error si no se pudo.
export async function startCheckout(body: Record<string, unknown>): Promise<string | null> {
  try {
    const { ok, status, data } = await apiJson("/api/payments/mercadopago", body);
    if (ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return null;
    }
    if (status === 401) return "Ingresá a tu cuenta para continuar.";
    return data.error || "No pudimos iniciar el pago. Probá de nuevo.";
  } catch {
    return "Error de conexión. Probá de nuevo.";
  }
}
