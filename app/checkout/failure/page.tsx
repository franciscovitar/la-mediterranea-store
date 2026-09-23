import { CheckoutResultClient } from "@/components/CheckoutResultClient";

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <CheckoutResultClient mode="failure" orderId={orderId} />
      </div>
    </main>
  );
}
