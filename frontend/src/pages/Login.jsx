import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-3xl">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          required
          type="email"
          placeholder="Email"
          className="input"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          type="password"
          placeholder="Password"
          className="input"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-brick">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-stone">
        New to Forkwise? <Link to="/signup" className="text-pine underline">Create an account</Link>
      </p>
    </div>
  );
}
