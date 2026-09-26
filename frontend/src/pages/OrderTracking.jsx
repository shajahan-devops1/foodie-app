import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge.jsx';

const STAGES = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STAGE_LABELS = {
  placed: 'Order placed',
  confirmed: 'Confirmed by kitchen',
  preparing: 'Preparing your food',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered'
};

export default function OrderTracking() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(() => {
    client.get(`/orders/${id}`).then((res) => setData(res.data));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <p className="mx-auto max-w-2xl px-6 py-16 text-stone">Loading order…</p>;

  const { order, items } = data;
  const currentIndex = STAGES.indexOf(order.status);

  async function advance() {
    setAdvancing(true);
    try {
      await client.post(`/orders/${id}/advance`);
      load();
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Order from {order.restaurant_name}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-stone">Placed {new Date(order.created_at).toLocaleString()}</p>

      <ol className="mt-10 space-y-6">
        {STAGES.map((stage, i) => (
          <li key={stage} className="flex items-center gap-4">
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm ${
                i <= currentIndex
                  ? 'border-pine bg-pine text-paper'
                  : 'border-ink/15 text-stone'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= currentIndex ? 'font-medium text-ink' : 'text-stone'}>
              {STAGE_LABELS[stage]}
            </span>
          </li>
        ))}
      </ol>

      {order.status !== 'delivered' && (
        <button type="button" onClick={advance} disabled={advancing} className="btn-secondary mt-8">
          {advancing ? 'Updating…' : 'Simulate next step (demo)'}
        </button>
      )}

      <h2 className="mt-12 font-display text-lg">Order details</h2>
      <div className="ticket mt-4 divide-y divide-ink/10 px-5">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between py-3 text-sm">
            <span>{i.quantity} × {i.name}</span>
            <span>${Number(i.price * i.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between py-3 font-medium">
          <span>Total</span>
          <span>${Number(order.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
