import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HardDrive, FileStack, Activity, Shield, TrendingUp, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { formatBytes, formatDate, getStatusColor } from '../lib/utils';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function AnimatedCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}{suffix}</>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/health/stats').catch(() => ({ data: {} })),
      api.get('/files').catch(() => ({ data: { files: [] } })),
      api.get('/health').catch(() => ({ data: { nodes: [] } })),
    ]).then(([s, f, n]) => {
      setStats(s.data);
      setFiles(f.data.files?.slice(0, 5) || []);
      setNodes(n.data.nodes || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="data-flow-bar" style={{ width: 200 }} />
      </div>
    );
  }

  const statCards = [
    { label: 'Files Stored', value: stats?.totalFiles || 0, icon: FileStack, color: 'var(--color-matrix)', bg: 'var(--color-matrix-glow)' },
    { label: 'Nodes Active', value: stats?.activeNodes || 0, suffix: `/${stats?.totalNodes || 3}`, icon: HardDrive, color: 'var(--color-data)', bg: 'var(--color-data-glow)' },
    { label: 'Redundancy Health', value: stats?.redundancyHealth || 0, suffix: '%', icon: Shield, color: 'var(--color-matrix)', bg: 'var(--color-matrix-glow)' },
    { label: 'Success Rate', value: stats?.retrievalSuccessRate || 100, suffix: '%', icon: TrendingUp, color: 'var(--color-amber)', bg: 'var(--color-amber-glow)' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
          Command Center
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Vault overview and system status
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-icon" style={{ background: card.bg }}>
              <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div className="stat-value" style={{ color: card.color }}>
              <AnimatedCounter value={card.value} />
              {card.suffix && <span style={{ fontSize: '1rem', opacity: 0.7 }}>{card.suffix}</span>}
            </div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="vault-card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>Recent Files</h2>
              <Link to="/files" className="flex items-center gap-1" style={{ color: 'var(--color-matrix)', fontSize: '0.85rem', textDecoration: 'none' }}>
                View all <ChevronRight size={16} />
              </Link>
            </div>
            {files.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                <FileStack size={40} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
                <p>No files in vault yet</p>
                <Link to="/upload" className="btn-primary inline-block mt-3" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Upload First File</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (
                  <Link key={file.file_id} to={`/files/${file.file_id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-void-surface)] transition-colors" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="flex items-center gap-3">
                      <FileStack size={18} style={{ color: 'var(--color-data)' }} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{file.original_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {formatBytes(file.size)} · {file.num_chunks} chunks
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${getStatusColor(file.status)}`}>{file.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Node Status */}
        <motion.div variants={fadeUp}>
          <div className="vault-card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Node Status</h2>
            <div className="flex flex-col gap-3">
              {nodes.map((node) => (
                <div key={node.node_id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-void-surface)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${node.health_status === 'healthy' ? 'pulse-active' : ''}`}
                      style={{
                        background: node.health_status === 'healthy' ? 'var(--color-matrix)' : node.health_status === 'degraded' ? 'var(--color-amber)' : 'var(--color-threat)',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{node.node_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{node.node_type}</div>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(node.health_status)}`}>{node.health_status}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
