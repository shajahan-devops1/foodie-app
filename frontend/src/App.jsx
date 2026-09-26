import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import Home from './pages/Home.jsx';
import RestaurantDetail from './pages/RestaurantDetail.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Orders from './pages/Orders.jsx';
import OrderTracking from './pages/OrderTracking.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <CartDrawer />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderTracking />} />
        </Routes>
      </main>
      <footer className="border-t border-ink/10 py-8 text-center text-sm text-stone">
        Forkwise — delivered fresh from restaurants near you.
      </footer>
    </div>
  );
}
