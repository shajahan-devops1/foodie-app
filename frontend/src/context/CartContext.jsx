import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // { restaurantId, restaurantName, items: [{ menuItemId, name, price, quantity }] }
  const [cart, setCart] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((restaurant, item) => {
    setCart((prev) => {
      if (prev && prev.restaurantId !== restaurant.id) {
        const confirmed = window.confirm(
          `Your basket has items from ${prev.restaurantName}. Start a new basket for ${restaurant.name}?`
        );
        if (!confirmed) return prev;
        prev = null;
      }
      const base = prev || { restaurantId: restaurant.id, restaurantName: restaurant.name, items: [] };
      const existing = base.items.find((i) => i.menuItemId === item.id);
      const items = existing
        ? base.items.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...base.items, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
      return { ...base, items };
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((menuItemId, delta) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items
        .map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0);
      return items.length ? { ...prev, items } : null;
    });
  }, []);

  const clearCart = useCallback(() => setCart(null), []);

  const subtotal = useMemo(
    () => (cart ? cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0) : 0),
    [cart]
  );
  const itemCount = useMemo(
    () => (cart ? cart.items.reduce((sum, i) => sum + i.quantity, 0) : 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{ cart, addItem, updateQuantity, clearCart, subtotal, itemCount, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
