import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Checkout() {
  const { cart, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState({ line1: '', city: '', postal_code: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-stone">Your basket is empty. Add items from a restaurant to check out.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-stone">Sign in to complete your order.</p>
        <button type="button" className="btn-primary mt-6" onClick={() => navigate('/login')}>
          Sign in
        </button>
      </div>
    );
  }

  const deliveryFee = 2.99;
  const tax = subtotal * 0.0825;
  const total = subtotal + deliveryFee + tax;

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError('');
    try {
      const res = await client.post('/orders', {
        restaurantId: cart.restaurantId,
        items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        paymentMethod,
        notes: `${address.line1}, ${address.city} ${address.postal_code}`.trim()
      });
      clearCart();
      navigate(`/orders/${res.data.order.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'We could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-lg">Delivery address</h2>
          <div className="mt-4 space-y-4">
            <input
              required
              placeholder="Street address"
              className="input"
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
            />
            <div className="flex gap-4">
              <input
                required
                placeholder="City"
                className="input"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              <input
                required
                placeholder="Postal code"
                className="input"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
              />
            </div>
          </div>

          <h2 className="mt-8 font-display text-lg">Payment</h2>
          <div className="mt-4 space-y-2">
            {[
              ['card', 'Credit or debit card'],
              ['cash', 'Cash on delivery']
            ].map(([value, label]) => (
              <label key={value} className="ticket flex items-center gap-3 px-4 py-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg">Order summary</h2>
          <div className="ticket mt-4 divide-y divide-ink/10 px-5">
            {cart.items.map((i) => (
              <div key={i.menuItemId} className="flex justify-between py-3 text-sm">
                <span>{i.quantity} × {i.name}</span>
                <span>${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 text-sm text-stone">
              <span>Delivery fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 text-sm text-stone">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 font-medium">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-brick">{error}</p>}

          <button type="submit" disabled={placing} className="btn-primary mt-6 w-full">
            {placing ? 'Placing order…' : `Place order · $${total.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
