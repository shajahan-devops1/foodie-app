import React from 'react';
import { Link } from 'react-router-dom';

export default function RestaurantCard({ restaurant }) {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="ticket group block overflow-hidden"
    >
      <div className="flex h-36 items-center justify-center bg-pine/5 border-b border-ink/10">
        <span className="font-display text-3xl text-pine/30">
          {restaurant.name.charAt(0)}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight group-hover:text-pine">
            {restaurant.name}
          </h3>
          <span className="shrink-0 text-sm font-medium text-pine">
            {Number(restaurant.rating).toFixed(1)}★
          </span>
        </div>
        <p className="mt-1 text-sm text-stone">{restaurant.cuisine}</p>
        {restaurant.description && (
          <p className="mt-2 text-sm text-ink/70 line-clamp-2">{restaurant.description}</p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 text-sm text-stone">
          <span>{restaurant.eta_minutes} min</span>
          <span>${Number(restaurant.delivery_fee).toFixed(2)} delivery</span>
          <span>${Number(restaurant.min_order).toFixed(2)} min</span>
        </div>
        {!restaurant.is_open && (
          <p className="mt-2 text-sm font-medium text-brick">Closed right now</p>
        )}
      </div>
    </Link>
  );
}
