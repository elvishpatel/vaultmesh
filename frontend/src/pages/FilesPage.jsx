import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, FileStack, Search, Trash2, Eye, Download } from 'lucide-react';
import api from '../lib/api';
import { formatBytes, formatDate, getStatusColor } from '../lib/utils';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFiles = () => {
    api.get('/files')
      .then(res => setFiles(res.data.files || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, []);

  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file and all chunks permanently?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(f => f.filter(x => x.file_id !== fileId));
    } catch {}
  };

  const filtered = files.filter(f =>
    f.original_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="data-flow-bar" style={{ width: 200 }} /></div>;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
            <FolderOpen size={28} className="inline mr-3" style={{ color: 'var(--color-data)' }} />
            Vault Files
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} secured in the mesh
          </p>
        </div>
        <div className="relative" style={{ minWidth: 240 }}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            className="vault-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="vault-card text-center py-16">
          <FileStack size={56} className="mx-auto mb-4" style={{ opacity: 0.2 }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
            {search ? 'No files match your search' : 'Your vault is empty'}
          </p>
          {!search && (
            <Link to="/upload" className="btn-primary inline-block mt-4" style={{ textDecoration: 'none' }}>Upload Your First File</Link>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((file) => (
            <motion.div key={file.file_id} variants={fadeUp} className="vault-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-data-glow)' }}>
                    <FileStack size={20} style={{ color: 'var(--color-data)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {file.original_name}
                    </h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {formatBytes(file.size)}
                    </span>
                  </div>
                </div>
                <span className={`badge ${getStatusColor(file.status)}`}>{file.status}</span>
              </div>

              <div className="flex gap-4 mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <span>Chunks: <strong style={{ color: 'var(--color-matrix)' }}>{file.num_chunks}</strong></span>
                <span>Key: <strong style={{ color: 'var(--color-data)' }}>{file.retrieval_key}</strong></span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                {formatDate(file.created_at)}
              </div>

              <div className="flex gap-2">
                <Link to={`/files/${file.file_id}`} className="btn-secondary flex-1 flex items-center justify-center gap-1" style={{ textDecoration: 'none', padding: '0.5rem', fontSize: '0.8rem' }}>
                  <Eye size={14} /> Details
                </Link>
                <button onClick={() => deleteFile(file.file_id)} className="btn-danger flex items-center justify-center gap-1" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
