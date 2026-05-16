import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileUp, Lock, Boxes, CheckCircle, AlertCircle, Copy, Shield } from 'lucide-react';
import api from '../lib/api';
import { formatBytes } from '../lib/utils';

const stages = [
  { key: 'uploading', label: 'Uploading', icon: FileUp },
  { key: 'chunking', label: 'Splitting into Chunks', icon: Boxes },
  { key: 'encrypting', label: 'Encrypting Chunks', icon: Lock },
  { key: 'distributing', label: 'Distributing to Nodes', icon: Shield },
  { key: 'complete', label: 'Vault Secured', icon: CheckCircle },
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [secretPhrase, setSecretPhrase] = useState('');
  const [currentStage, setCurrentStage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setError('');
      setResult(null);
      setCurrentStage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      setError(err?.code === 'file-too-large' ? 'File exceeds 50MB limit' : err?.message || 'Invalid file');
    },
  });

  const handleUpload = async () => {
    if (!file || !secretPhrase) return;
    if (secretPhrase.length < 4) return setError('Secret phrase must be at least 4 characters');

    setUploading(true);
    setError('');
    setCurrentStage('uploading');

    try {
      // Simulate pipeline stages
      const formData = new FormData();
      formData.append('file', file);
      formData.append('secretPhrase', secretPhrase);

      // Animate through stages
      setTimeout(() => setCurrentStage('chunking'), 500);
      setTimeout(() => setCurrentStage('encrypting'), 1200);
      setTimeout(() => setCurrentStage('distributing'), 2000);

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCurrentStage('complete');
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setCurrentStage(null);
    } finally {
      setUploading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(result.retrievalKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stageIdx = stages.findIndex(s => s.key === currentStage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
          <Upload size={28} className="inline mr-3" style={{ color: 'var(--color-matrix)' }} />
          Secure Upload
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          Split, encrypt, and distribute your file across the mesh
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="vault-card">
          {!result ? (
            <>
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <FileUp size={48} className="mx-auto mb-4" style={{ color: isDragActive ? 'var(--color-matrix)' : 'var(--color-text-muted)' }} />
                {file ? (
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '1rem' }}>{file.name}</p>
                    <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {formatBytes(file.size)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600 }}>Drop file here or click to browse</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Max 50MB</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                  <Lock size={14} className="inline mr-1" /> Secret Phrase
                </label>
                <input
                  type="password"
                  className="vault-input"
                  placeholder="Enter a memorable secret phrase"
                  value={secretPhrase}
                  onChange={e => setSecretPhrase(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                  Required for file retrieval. Do not forget this phrase.
                </p>
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2" style={{ color: 'var(--color-threat)', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                onClick={handleUpload}
                disabled={!file || !secretPhrase || uploading}
              >
                {uploading ? 'Processing...' : 'Encrypt & Distribute'}
              </button>
            </>
          ) : (
            /* Success Result */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-center mb-6">
                <CheckCircle size={56} className="mx-auto mb-3" style={{ color: 'var(--color-matrix)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>
                  File Secured
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {result.fileName} distributed across {result.distributionMap?.length || 0} nodes
                </p>
              </div>

              <div className="mb-4">
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                  Retrieval Key — Save this!
                </label>
                <div className="retrieval-key flex items-center justify-center gap-3">
                  {result.retrievalKey}
                  <button onClick={copyKey} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-matrix)' : 'var(--color-text-muted)' }}>
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              {result.distributionMap && (
                <div className="mt-4">
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                    Chunk Distribution
                  </label>
                  <div className="flex flex-col gap-1">
                    {result.distributionMap.map((d) => (
                      <div key={d.chunk} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--color-void-surface)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--color-data)' }}>chunk_{String(d.chunk).padStart(2,'0')}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                        <span className="badge badge-healthy">{d.primary}</span>
                        {d.replica && <><span style={{ color: 'var(--color-text-muted)' }}>+</span><span className="badge badge-data">{d.replica}</span></>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn-secondary w-full mt-4" onClick={() => { setFile(null); setResult(null); setSecretPhrase(''); setCurrentStage(null); }}>
                Upload Another File
              </button>
            </motion.div>
          )}
        </div>

        {/* Pipeline Animation */}
        <div className="vault-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            Processing Pipeline
          </h3>
          <div className="flex flex-col gap-2">
            {stages.map((stage, i) => {
              const Icon = stage.icon;
              let state = 'pending';
              if (i < stageIdx) state = 'complete';
              else if (i === stageIdx) state = 'active';

              return (
                <motion.div
                  key={stage.key}
                  className={`pipeline-stage ${state}`}
                  animate={state === 'active' ? { x: [0, 4, 0] } : {}}
                  transition={{ repeat: state === 'active' ? Infinity : 0, duration: 1.5 }}
                >
                  <Icon size={20} />
                  <span>{stage.label}</span>
                  {state === 'complete' && <CheckCircle size={16} className="ml-auto" />}
                  {state === 'active' && <div className="data-flow-bar ml-auto" style={{ width: 60 }} />}
                </motion.div>
              );
            })}
          </div>

          {/* File info */}
          {file && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--color-void-surface)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <div>File: <span style={{ color: 'var(--color-text-primary)' }}>{file.name}</span></div>
                <div>Size: <span style={{ color: 'var(--color-text-primary)' }}>{formatBytes(file.size)}</span></div>
                <div>Chunks: <span style={{ color: 'var(--color-matrix)' }}>~{Math.max(1, Math.ceil(file.size / (4 * 1024 * 1024)))}</span></div>
                <div>Encryption: <span style={{ color: 'var(--color-data)' }}>AES-256-GCM</span></div>
                <div>Replication: <span style={{ color: 'var(--color-amber)' }}>Factor 2</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
