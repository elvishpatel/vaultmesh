import { Router } from 'express';
import supabase from '../config/db.js';
import { deleteFromNode } from '../services/distributor.js';

const router = Router();

// GET /api/files — List user's vault files
router.get('/', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('vault_files')
      .select('file_id, original_name, mime_type, size, num_chunks, status, created_at, retrieval_key')
      .eq('user_id', req.user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/:fileId — File detail with chunks and distribution
router.get('/:fileId', async (req, res) => {
  try {
    const { data: file } = await supabase
      .from('vault_files')
      .select('*')
      .eq('file_id', req.params.fileId)
      .eq('user_id', req.user.id)
      .single();

    if (!file) return res.status(404).json({ error: 'File not found' });

    const { data: chunks } = await supabase
      .from('chunks')
      .select('chunk_id, sequence_order, original_size, encrypted_size, checksum, status')
      .eq('file_id', file.file_id)
      .order('sequence_order', { ascending: true });

    const { data: manifest } = await supabase
      .from('file_manifest')
      .select('chunk_id, node_id, replica_node_id, sequence_order')
      .eq('file_id', file.file_id)
      .order('sequence_order', { ascending: true });

    res.json({
      file: {
        file_id: file.file_id,
        original_name: file.original_name,
        mime_type: file.mime_type,
        size: file.size,
        num_chunks: file.num_chunks,
        status: file.status,
        created_at: file.created_at,
        retrieval_key: file.retrieval_key,
      },
      chunks,
      distribution: manifest,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files/:fileId
router.delete('/:fileId', async (req, res) => {
  try {
    const { data: file } = await supabase
      .from('vault_files')
      .select('file_id')
      .eq('file_id', req.params.fileId)
      .eq('user_id', req.user.id)
      .single();

    if (!file) return res.status(404).json({ error: 'File not found' });

    // Get manifest to find chunk locations
    const { data: manifest } = await supabase
      .from('file_manifest')
      .select('*')
      .eq('file_id', file.file_id);

    // Delete chunks from storage nodes
    for (const m of (manifest || [])) {
      const chunkFile = `${file.file_id}_chunk_${String(m.sequence_order).padStart(4, '0')}.enc`;
      try { await deleteFromNode(m.node_id, chunkFile); } catch {}
      if (m.replica_node_id) {
        try { await deleteFromNode(m.replica_node_id, chunkFile); } catch {}
      }
    }

    // Mark as deleted (cascading deletes will clean chunks + manifest)
    await supabase.from('vault_files').update({ status: 'deleted' }).eq('file_id', file.file_id);

    res.json({ message: 'File and all chunks deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
