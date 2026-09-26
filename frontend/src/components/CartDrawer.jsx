import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function CartDrawer() {
  const { cart, isOpen, setIsOpen, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close basket"
        className="absolute inset-0 bg-ink/40"
        onClick={() => setIsOpen(false)}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-display text-xl">Your basket</h2>
          <button type="button" onClick={() => setIsOpen(false)} className="text-stone hover:text-ink">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!cart || cart.items.length === 0 ? (
            <p className="mt-8 text-center text-sm text-stone">
              Your basket is empty. Add something delicious from a restaurant's menu.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone">From {cart.restaurantName}</p>
              <ul className="space-y-4">
                {cart.items.map((item) => (
                  <li key={item.menuItemId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-stone">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                        className="h-7 w-7 rounded-sm border border-ink/15 hover:border-ink/40"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                        className="h-7 w-7 rounded-sm border border-ink/15 hover:border-ink/40"
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-stone">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                setIsOpen(false);
                navigate('/checkout');
              }}
            >
              Go to checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
