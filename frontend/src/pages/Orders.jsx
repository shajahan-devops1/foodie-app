import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge.jsx';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/orders')
      .then((res) => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl">Your orders</h1>

      {loading && <p className="mt-6 text-stone">Loading…</p>}
      {!loading && orders.length === 0 && (
        <p className="mt-6 text-stone">You haven't placed any orders yet.</p>
      )}

      <ul className="mt-8 space-y-4">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="ticket flex items-center justify-between p-5">
              <div>
                <p className="font-medium">{o.restaurant_name}</p>
                <p className="mt-1 text-sm text-stone">
                  {new Date(o.created_at).toLocaleString()} · ${Number(o.total).toFixed(2)}
                </p>
              </div>
              <OrderStatusBadge status={o.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
