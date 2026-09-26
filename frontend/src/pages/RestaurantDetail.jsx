import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import MenuItemCard from '../components/MenuItemCard.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function RestaurantDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get(`/restaurants/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('This restaurant could not be loaded.'));
  }, [id]);

  if (error) return <p className="mx-auto max-w-3xl px-6 py-16 text-brick">{error}</p>;
  if (!data) return <p className="mx-auto max-w-3xl px-6 py-16 text-stone">Loading menu…</p>;

  const { restaurant, menu } = data;

  return (
    <div>
      <section className="bg-pine text-paper">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="font-display text-3xl">{restaurant.name}</h1>
          <p className="mt-2 text-paper/80">{restaurant.description}</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-paper/80">
            <span>{restaurant.cuisine}</span>
            <span>{Number(restaurant.rating).toFixed(1)}★</span>
            <span>{restaurant.eta_minutes} min delivery</span>
            <span>${Number(restaurant.delivery_fee).toFixed(2)} delivery fee</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        {menu.length === 0 && <p className="text-stone">This menu is being updated. Check back soon.</p>}
        {menu.map((category) => (
          <div key={category.id || 'more'} className="mb-10">
            <h2 className="font-display text-xl">{category.name}</h2>
            <div className="mt-2">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} item={item} onAdd={(i) => addItem(restaurant, i)} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
