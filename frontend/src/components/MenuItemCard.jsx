import React from 'react';

export default function MenuItemCard({ item, onAdd }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/10 py-4 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {item.is_veg && (
            <span
              aria-label="Vegetarian"
              className="inline-block h-3 w-3 flex-shrink-0 rounded-full border-2 border-pine"
            />
          )}
          <h4 className="font-medium text-ink">{item.name}</h4>
        </div>
        {item.description && (
          <p className="mt-1 text-sm text-stone">{item.description}</p>
        )}
        <p className="mt-2 text-sm font-medium text-ink">${Number(item.price).toFixed(2)}</p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(item)}
        className="btn-secondary shrink-0 !px-4 !py-2 text-sm"
      >
        Add
      </button>
    </div>
  );
}
