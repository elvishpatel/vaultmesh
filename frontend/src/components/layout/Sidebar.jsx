import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Upload, FolderOpen, KeyRound, Activity,
  ShieldAlert, LogOut, Hexagon
} from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/files', label: 'Vault Files', icon: FolderOpen },
  { to: '/retrieve', label: 'Retrieve', icon: KeyRound },
  { to: '/health', label: 'Node Health', icon: Activity },
  { to: '/simulate', label: 'Simulation', icon: ShieldAlert },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-matrix-glow)', border: '1px solid var(--color-matrix-dim)' }}>
          <Hexagon size={22} style={{ color: 'var(--color-matrix)' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>
            VAULT<span style={{ color: 'var(--color-matrix)' }}>MESH</span>
          </h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
            VOID PROTOCOL v1.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div style={{
        borderTop: '1px solid var(--color-void-border)',
        paddingTop: '1rem',
        marginTop: '1rem'
      }}>
        <div className="flex items-center gap-3 px-1 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-data-glow)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-data)' }}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            {user?.email}
          </span>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: 'var(--color-threat)' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </motion.aside>
  );
}
