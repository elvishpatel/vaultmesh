import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Hexagon, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container scanlines">
      <div className="noise-overlay" />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-matrix-glow)', border: '1px solid var(--color-matrix-dim)' }}>
            <Hexagon size={26} style={{ color: 'var(--color-matrix)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>
              VAULT<span style={{ color: 'var(--color-matrix)' }}>MESH</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>
              SECURE VAULT ACCESS
            </p>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome back
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Enter your credentials to access the vault
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--color-threat-glow)',
              border: '1px solid var(--color-threat-dim)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: 'var(--color-threat)',
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              className="vault-input"
              placeholder="agent@vaultmesh.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="vault-input"
                style={{ paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary flex items-center justify-center gap-2 mt-2" disabled={loading}>
            {loading ? (
              <span style={{ fontFamily: 'var(--font-mono)' }}>AUTHENTICATING...</span>
            ) : (
              <>Access Vault <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--color-matrix)', textDecoration: 'none', fontWeight: 600 }}>
            Create Vault
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
