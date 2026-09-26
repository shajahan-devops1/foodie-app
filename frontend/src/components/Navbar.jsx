import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, setIsOpen } = useCart();
  const navigate = useNavigate();

  return (
    <header className="bg-pine text-paper">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-tight">
            Forkwise
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link to="/" className="hover:text-white">Restaurants</Link>
            {user && (
              <Link to="/orders" className="hover:text-white">Your orders</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative rounded-sm border border-paper/25 px-3.5 py-1.5 text-sm hover:border-paper/60 transition-colors"
            >
              Basket
              {itemCount > 0 && (
                <span className="ml-2 rounded-full bg-marigold px-1.5 py-0.5 text-xs font-semibold text-ink">
                  {itemCount}
                </span>
              )}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-sm text-paper/80 hover:text-white"
              >
                Sign out
              </button>
            ) : (
              <Link to="/login" className="text-sm text-paper/80 hover:text-white">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
