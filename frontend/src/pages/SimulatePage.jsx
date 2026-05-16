import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, HardDrive, Trash, AlertTriangle, RefreshCw, FileStack } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function SimulatePage() {
  const [nodes, setNodes] = useState([]);
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/health').catch(() => ({ data: { nodes: [] } })),
      api.get('/files').catch(() => ({ data: { files: [] } })),
      api.get('/simulate-failure/logs').catch(() => ({ data: { logs: [] } })),
    ]).then(([n, f, l]) => {
      setNodes(n.data.nodes || []);
      setFiles(f.data.files?.filter(x => x.status === 'distributed') || []);
      setLogs(l.data.logs || []);
    }).finally(() => setLoading(false));
  }, []);

  const simulate = async (nodeId, failureType, fileId = null, chunkIndex = null) => {
    setSimulating(`${nodeId}-${failureType}`);
    setResult(null);
    try {
      const res = await api.post('/simulate-failure', { nodeId, failureType, fileId, chunkIndex });
      setResult({ success: true, message: res.data.message });
      // Refresh data
      const [n, l] = await Promise.all([
        api.get('/health').catch(() => ({ data: { nodes: [] } })),
        api.get('/simulate-failure/logs').catch(() => ({ data: { logs: [] } })),
      ]);
      setNodes(n.data.nodes || []);
      setLogs(l.data.logs || []);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Simulation failed' });
    }
    setSimulating('');
  };

  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="data-flow-bar" style={{ width: 200 }} /></div>;

  const firstFile = files[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
          <ShieldAlert size={28} className="inline mr-3" style={{ color: 'var(--color-threat)' }} />
          Failure Simulation
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Test system resilience by simulating node failures
        </p>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="vault-card mb-6"
          style={{ borderColor: result.success ? 'var(--color-matrix-dim)' : 'var(--color-threat-dim)' }}>
          <div className="flex items-center gap-2" style={{ color: result.success ? 'var(--color-matrix)' : 'var(--color-threat)' }}>
            <Zap size={18} /> {result.message}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Node Controls */}
        <div className="vault-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Node Controls
          </h2>
          <div className="flex flex-col gap-3">
            {nodes.filter(n => n.node_type === 'local').map(node => (
              <div key={node.node_id} className="p-4 rounded-lg" style={{ background: 'var(--color-void-surface)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HardDrive size={18} style={{ color: node.health_status === 'healthy' ? 'var(--color-matrix)' : 'var(--color-threat)' }} />
                    <span style={{ fontWeight: 600 }}>{node.node_name}</span>
                  </div>
                  <span className={`badge ${node.health_status === 'healthy' ? 'badge-healthy' : 'badge-offline'}`}>
                    {node.health_status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {node.health_status === 'healthy' ? (
                    <button
                      onClick={() => simulate(node.node_id, 'node_offline')}
                      disabled={!!simulating}
                      className="btn-danger flex-1 flex items-center justify-center gap-1"
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      <AlertTriangle size={14} /> Take Offline
                    </button>
                  ) : (
                    <button
                      onClick={() => simulate(node.node_id, 'node_restore')}
                      disabled={!!simulating}
                      className="btn-primary flex-1 flex items-center justify-center gap-1"
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      <RefreshCw size={14} /> Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chunk Controls */}
        <div className="vault-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Chunk Failure Simulation
          </h2>
          {!firstFile ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Upload a file first to simulate chunk failures</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--color-void-surface)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                <FileStack size={16} className="inline mr-2" style={{ color: 'var(--color-data)' }} />
                Using: {firstFile.original_name}
              </div>
              {['nodeA', 'nodeB'].map(nodeId => (
                <div key={nodeId} className="flex gap-2">
                  <button
                    onClick={() => simulate(nodeId, 'missing_chunk', firstFile.file_id, 0)}
                    disabled={!!simulating}
                    className="btn-danger flex-1 flex items-center justify-center gap-1"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    <Trash size={14} /> Delete Chunk from {nodeId}
                  </button>
                  <button
                    onClick={() => simulate(nodeId, 'corrupt_chunk', firstFile.file_id, 0)}
                    disabled={!!simulating}
                    className="btn-danger flex-1 flex items-center justify-center gap-1"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    <AlertTriangle size={14} /> Corrupt on {nodeId}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recovery Logs */}
      <div className="vault-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
          Recovery Logs
        </h2>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No events logged</p>
        ) : (
          <div className="flex flex-col gap-1" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {logs.map(log => (
              <div key={log.event_id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--color-void-surface)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div className="flex items-center gap-2">
                  <span className={`badge ${log.recovery_action.includes('restored') ? 'badge-healthy' : log.recovery_action === 'failed' ? 'badge-offline' : 'badge-degraded'}`}>
                    {log.failure_type}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{log.recovery_action}</span>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>{log.timestamp ? formatDate(log.timestamp) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
