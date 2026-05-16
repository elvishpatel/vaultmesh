import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileStack, Shield, HardDrive, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { formatBytes, formatDate, getStatusColor } from '../lib/utils';

export default function FileDetailPage() {
  const { fileId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    api.get(`/files/${fileId}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fileId]);

  const checkIntegrity = async () => {
    try {
      const res = await api.post('/health/integrity', { fileId });
      setIntegrity(res.data);
    } catch {}
  };

  const healFile = async () => {
    setHealing(true);
    try {
      await api.post('/health/recover', { fileId });
      const res = await api.get(`/files/${fileId}`);
      setData(res.data);
      await checkIntegrity();
    } catch {}
    setHealing(false);
  };

  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="data-flow-bar" style={{ width: 200 }} /></div>;
  if (!data) return <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>File not found</div>;

  const { file, chunks, distribution } = data;
  const nodeColors = { nodeA: 'var(--color-matrix)', nodeB: 'var(--color-data)', nodeC: 'var(--color-amber)' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link to="/files" className="flex items-center gap-2 mb-6" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
        <ArrowLeft size={18} /> Back to files
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-data-glow)' }}>
            <FileStack size={28} style={{ color: 'var(--color-data)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>{file.original_name}</h1>
            <div className="flex items-center gap-3 mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>{formatBytes(file.size)}</span>
              <span>·</span>
              <span>{file.num_chunks} chunks</span>
              <span>·</span>
              <span>{formatDate(file.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={checkIntegrity} className="btn-secondary flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
            <Shield size={16} /> Check Integrity
          </button>
          <button onClick={healFile} disabled={healing} className="btn-primary flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} className={healing ? 'animate-spin' : ''} /> {healing ? 'Healing...' : 'Self-Heal'}
          </button>
        </div>
      </div>

      {/* Integrity Result */}
      {integrity && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="vault-card mb-6"
          style={{ borderColor: integrity.healthy ? 'var(--color-matrix-dim)' : 'var(--color-threat-dim)' }}>
          <div className="flex items-center gap-3">
            {integrity.healthy ? (
              <><Shield size={22} style={{ color: 'var(--color-matrix)' }} /><span style={{ color: 'var(--color-matrix)', fontWeight: 600 }}>All {integrity.totalChunks} chunks healthy</span></>
            ) : (
              <><AlertTriangle size={22} style={{ color: 'var(--color-threat)' }} /><span style={{ color: 'var(--color-threat)', fontWeight: 600 }}>{integrity.issues.length} issue(s) detected</span></>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metadata */}
        <div className="vault-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>File Metadata</h2>
          <div className="flex flex-col gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            {[
              ['Status', file.status, getStatusColor(file.status)],
              ['MIME Type', file.mime_type],
              ['Retrieval Key', file.retrieval_key, 'badge-data'],
              ['Encryption', 'AES-256-GCM'],
              ['Replication Factor', '2'],
            ].map(([label, value, badge]) => (
              <div key={label} className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--color-void-surface)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                {badge ? <span className={`badge ${badge}`}>{value}</span> : <span>{value}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Map */}
        <div className="vault-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            <HardDrive size={18} className="inline mr-2" /> Chunk Distribution
          </h2>
          <div className="flex flex-col gap-2">
            {(distribution || []).map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-void-surface)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-void-elevated)' }}>
                  <Lock size={14} style={{ color: 'var(--color-data)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    chunk_{String(d.sequence_order).padStart(2, '0')}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="badge" style={{ background: `${nodeColors[d.node_id]}20`, color: nodeColors[d.node_id] }}>
                      ● {d.node_id}
                    </span>
                    {d.replica_node_id && (
                      <span className="badge" style={{ background: `${nodeColors[d.replica_node_id]}20`, color: nodeColors[d.replica_node_id] }}>
                        ⟐ {d.replica_node_id}
                      </span>
                    )}
                  </div>
                </div>
                {chunks?.[i] && (
                  <span className={`badge ${getStatusColor(chunks[i].status)}`}>{chunks[i].status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
