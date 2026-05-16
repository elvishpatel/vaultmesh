import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, HardDrive, RefreshCw, Clock } from 'lucide-react';
import api from '../lib/api';
import { formatBytes, getStatusColor } from '../lib/utils';

export default function HealthPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchHealth = async () => {
    setChecking(true);
    try {
      const res = await api.get('/health');
      setNodes(res.data.nodes || []);
    } catch {}
    setChecking(false);
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="data-flow-bar" style={{ width: 200 }} /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
            <Activity size={28} className="inline mr-3" style={{ color: 'var(--color-matrix)' }} />
            Node Health
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Monitor storage node status and heartbeats</p>
        </div>
        <button onClick={fetchHealth} disabled={checking} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {nodes.map(node => {
          const statusColor = node.health_status === 'healthy' ? 'var(--color-matrix)' : node.health_status === 'degraded' ? 'var(--color-amber)' : 'var(--color-threat)';
          return (
            <motion.div key={node.node_id} className="vault-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`node-hex ${node.health_status}`}>
                    <HardDrive size={28} style={{ color: statusColor }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{node.node_name}</h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{node.node_id} · {node.node_type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${node.health_status === 'healthy' ? 'pulse-active' : ''}`} style={{ background: statusColor }} />
                <span className={`badge ${getStatusColor(node.health_status)}`}>{node.health_status}</span>
              </div>

              <div className="flex flex-col gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div className="flex justify-between p-2 rounded" style={{ background: 'var(--color-void-surface)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Used</span>
                  <span>{formatBytes(node.used_space || 0)}</span>
                </div>
                <div className="flex justify-between p-2 rounded" style={{ background: 'var(--color-void-surface)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
                  <span>{formatBytes(node.total_space || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--color-void-surface)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}><Clock size={12} className="inline mr-1" />Heartbeat</span>
                  <span style={{ fontSize: '0.65rem' }}>{node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleTimeString() : 'N/A'}</span>
                </div>
              </div>

              {/* Usage Bar */}
              <div className="mt-3">
                <div style={{ height: 4, background: 'var(--color-void-surface)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${node.total_space ? Math.min((node.used_space / node.total_space) * 100, 100) : 0}%` }}
                    transition={{ duration: 1 }}
                    style={{ height: '100%', background: statusColor, borderRadius: 2 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
