import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Download, AlertCircle, CheckCircle, Search } from 'lucide-react';
import api from '../lib/api';

export default function RetrievePage() {
  const [files, setFiles] = useState([]);
  const [fileId, setFileId] = useState('');
  const [retrievalKey, setRetrievalKey] = useState('');
  const [secretPhrase, setSecretPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('retrieve'); // 'retrieve' | 'decoy'
  const [decoyKeys, setDecoyKeys] = useState([]);
  const [selectedDecoy, setSelectedDecoy] = useState('');
  const [decoyResult, setDecoyResult] = useState(null);

  useEffect(() => {
    api.get('/files').then(res => setFiles(res.data.files || [])).catch(() => {});
  }, []);

  const handleRetrieve = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const response = await api.post('/retrieve', { fileId, retrievalKey, secretPhrase }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'];
      const filename = disposition ? disposition.split('filename="')[1]?.replace('"', '') : 'recovered_file';
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('File reconstructed and downloaded!');
    } catch (err) {
      setError(err.response?.data?.error || 'Retrieval failed');
    }
    setLoading(false);
  };

  const startDecoyRecovery = async () => {
    if (!fileId) return setError('Select a file first');
    setDecoyResult(null); setSelectedDecoy(''); setError('');
    try {
      const res = await api.post('/retrieve/verify-decoy', { fileId, action: 'generate' });
      setDecoyKeys(res.data.keys);
      setMode('decoy');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate decoy keys');
    }
  };

  const verifyDecoy = async () => {
    if (!selectedDecoy || !secretPhrase) return setError('Select a key and enter your secret phrase');
    setError('');
    try {
      const res = await api.post('/retrieve/verify-decoy', { fileId, action: 'verify', selectedKey: selectedDecoy, secretPhrase });
      setDecoyResult({ success: true, key: res.data.retrievalKey });
      setRetrievalKey(res.data.retrievalKey);
    } catch (err) {
      setDecoyResult({ success: false, message: err.response?.data?.error, remaining: err.response?.data?.attemptsRemaining });
      if (err.response?.status === 429) setDecoyKeys([]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
          <KeyRound size={28} className="inline mr-3" style={{ color: 'var(--color-amber)' }} />
          File Retrieval
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Reconstruct and download your encrypted files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retrieve Form */}
        <div className="vault-card">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('retrieve')} className={mode === 'retrieve' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', flex: 1 }}>
              <Download size={16} className="inline mr-1" /> Direct Retrieve
            </button>
            <button onClick={() => startDecoyRecovery()} className={mode === 'decoy' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', flex: 1 }}>
              <Search size={16} className="inline mr-1" /> Lost Key Recovery
            </button>
          </div>

          {mode === 'retrieve' && (
            <form onSubmit={handleRetrieve} className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem', fontWeight: 500 }}>Select File</label>
                <select className="vault-input" value={fileId} onChange={e => setFileId(e.target.value)} required style={{ cursor: 'pointer' }}>
                  <option value="">Choose a file...</option>
                  {files.filter(f => f.status === 'distributed').map(f => (
                    <option key={f.file_id} value={f.file_id}>{f.original_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem', fontWeight: 500 }}>
                  <KeyRound size={14} className="inline mr-1" /> Retrieval Key
                </label>
                <input className="vault-input" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }} placeholder="VM-XXXX-XXXX" value={retrievalKey} onChange={e => setRetrievalKey(e.target.value.toUpperCase())} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem', fontWeight: 500 }}>
                  <Lock size={14} className="inline mr-1" /> Secret Phrase
                </label>
                <input type="password" className="vault-input" placeholder="Your secret phrase" value={secretPhrase} onChange={e => setSecretPhrase(e.target.value)} required />
              </div>

              {error && <div className="flex items-center gap-2" style={{ color: 'var(--color-threat)', fontSize: '0.85rem' }}><AlertCircle size={16} />{error}</div>}
              {success && <div className="flex items-center gap-2" style={{ color: 'var(--color-matrix)', fontSize: '0.85rem' }}><CheckCircle size={16} />{success}</div>}

              <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={loading}>
                {loading ? 'Reconstructing...' : <><Download size={18} /> Retrieve & Download</>}
              </button>
            </form>
          )}

          {mode === 'decoy' && decoyKeys.length > 0 && (
            <div>
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                One of these keys is your real retrieval key. Choose wisely — you have 3 attempts.
              </p>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {decoyKeys.map(key => (
                  <button key={key} onClick={() => setSelectedDecoy(key)}
                    className={`decoy-card ${selectedDecoy === key ? 'selected' : ''} ${decoyResult && !decoyResult.success && selectedDecoy === key ? 'wrong' : ''}`}>
                    {key}
                  </button>
                ))}
              </div>

              <input type="password" className="vault-input mb-4" placeholder="Enter your secret phrase" value={secretPhrase} onChange={e => setSecretPhrase(e.target.value)} />

              {decoyResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 rounded-lg"
                  style={{ background: decoyResult.success ? 'var(--color-matrix-glow)' : 'var(--color-threat-glow)', color: decoyResult.success ? 'var(--color-matrix)' : 'var(--color-threat)', fontSize: '0.9rem' }}>
                  {decoyResult.success ? `Key recovered: ${decoyResult.key}` : `${decoyResult.message}${decoyResult.remaining !== undefined ? ` (${decoyResult.remaining} attempts left)` : ''}`}
                </motion.div>
              )}

              {error && <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-threat)', fontSize: '0.85rem' }}><AlertCircle size={16} />{error}</div>}

              <button onClick={verifyDecoy} className="btn-primary w-full" disabled={!selectedDecoy || !secretPhrase}>
                Verify Selected Key
              </button>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="vault-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Retrieval Process
          </h3>
          <div className="flex flex-col gap-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {['Verify retrieval key', 'Verify secret phrase', 'Fetch chunk locations', 'Load chunks from nodes', 'Verify SHA-256 checksums', 'Decrypt with AES-256-GCM', 'Reconstruct original file', 'Stream download'].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded" style={{ background: 'var(--color-void-surface)' }}>
                <span style={{ color: 'var(--color-data)', fontWeight: 600, width: '1.2rem' }}>{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
