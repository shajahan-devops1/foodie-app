import React, { useEffect, useState } from 'react';
import client from '../api/client';
import RestaurantCard from '../components/RestaurantCard.jsx';

const CUISINES = ['All', 'Italian', 'Chinese', 'Indian'];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (query) params.q = query;
    if (cuisine !== 'All') params.cuisine = cuisine;

    client
      .get('/restaurants', { params })
      .then((res) => setRestaurants(res.data.restaurants))
      .catch(() => setError('We could not load restaurants right now. Please try again.'))
      .finally(() => setLoading(false));
  }, [query, cuisine]);

  return (
    <div>
      <section className="bg-pine-dark text-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="max-w-xl font-display text-4xl leading-tight md:text-5xl">
            Good food, from the kitchens down your street.
          </h1>
          <p className="mt-4 max-w-lg text-paper/80">
            Order from neighborhood restaurants and track every order from the kitchen to your door.
          </p>
          <div className="mt-8 max-w-md">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants"
              className="input !bg-paper/95"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCuisine(c)}
              className={`rounded-sm border px-4 py-1.5 text-sm transition-colors ${
                cuisine === c
                  ? 'border-pine bg-pine text-paper'
                  : 'border-ink/15 text-ink hover:border-ink/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && <p className="text-stone">Loading restaurants…</p>}
        {error && <p className="text-brick">{error}</p>}
        {!loading && !error && restaurants.length === 0 && (
          <p className="text-stone">No restaurants match your search yet. Try another term.</p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
