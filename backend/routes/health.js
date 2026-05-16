import { Router } from 'express';
import supabase from '../config/db.js';
import { checkAllNodes } from '../services/heartbeat.js';
import { checkFileIntegrity, autoHealFile } from '../services/healer.js';

const router = Router();

// GET /api/health — Node health dashboard
router.get('/', async (req, res) => {
  try {
    const healthResults = await checkAllNodes();
    const { data: nodes } = await supabase
      .from('nodes')
      .select('*')
      .order('node_id', { ascending: true });

    res.json({ nodes, healthCheck: healthResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes — List all nodes
router.get('/nodes', async (req, res) => {
  try {
    const { data: nodes } = await supabase.from('nodes').select('*');
    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: files } = await supabase
      .from('vault_files')
      .select('file_id, size, num_chunks, status')
      .eq('user_id', userId)
      .neq('status', 'deleted');

    const { data: nodes } = await supabase
      .from('nodes')
      .select('node_id, health_status');

    const { data: recoveryLogs } = await supabase
      .from('recovery_logs')
      .select('event_id, recovery_action')
      .in('file_id', (files || []).map(f => f.file_id));

    const totalFiles = files?.length || 0;
    const totalSize = files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;
    const totalChunks = files?.reduce((sum, f) => sum + (f.num_chunks || 0), 0) || 0;
    const activeNodes = nodes?.filter(n => n.health_status === 'healthy').length || 0;
    const totalNodes = nodes?.length || 0;
    const distributed = files?.filter(f => f.status === 'distributed').length || 0;
    const recoveries = recoveryLogs?.length || 0;
    const successfulRecoveries = recoveryLogs?.filter(r =>
      r.recovery_action === 'restored_from_replica' || r.recovery_action === 'auto_healed'
    ).length || 0;

    res.json({
      totalFiles,
      totalSize,
      totalChunks,
      activeNodes,
      totalNodes,
      distributedFiles: distributed,
      redundancyHealth: totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0,
      retrievalSuccessRate: totalFiles > 0 ? Math.round((distributed / totalFiles) * 100) : 100,
      totalRecoveries: recoveries,
      successfulRecoveries,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recover — Trigger self-healing for a file
router.post('/recover', async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    const { data: file } = await supabase
      .from('vault_files')
      .select('file_id')
      .eq('file_id', fileId)
      .eq('user_id', req.user.id)
      .single();
    if (!file) return res.status(404).json({ error: 'File not found' });

    const result = await autoHealFile(fileId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrity — Check file integrity
router.post('/integrity', async (req, res) => {
  try {
    const { fileId } = req.body;
    const { data: file } = await supabase
      .from('vault_files')
      .select('file_id')
      .eq('file_id', fileId)
      .eq('user_id', req.user.id)
      .single();
    if (!file) return res.status(404).json({ error: 'File not found' });

    const result = await checkFileIntegrity(fileId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
