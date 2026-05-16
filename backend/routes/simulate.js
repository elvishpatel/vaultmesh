import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import supabase from '../config/db.js';
import env from '../config/env.js';

const router = Router();

// POST /api/simulate-failure
router.post('/', async (req, res) => {
  try {
    const { nodeId, failureType, fileId, chunkIndex } = req.body;

    if (!nodeId || !failureType) {
      return res.status(400).json({ error: 'nodeId and failureType required' });
    }

    const NODE_PATHS = { nodeA: env.NODE_A_PATH, nodeB: env.NODE_B_PATH };

    if (failureType === 'node_offline') {
      // Rename the node directory to simulate offline
      if (NODE_PATHS[nodeId]) {
        const nodePath = path.resolve(NODE_PATHS[nodeId]);
        const disabledPath = nodePath + '_disabled';
        try {
          await fs.rename(nodePath, disabledPath);
        } catch {}
      }
      await supabase.from('nodes').update({ health_status: 'offline' }).eq('node_id', nodeId);
      return res.json({ message: `Node ${nodeId} taken offline`, nodeId, failureType });
    }

    if (failureType === 'node_restore') {
      // Restore a disabled node
      if (NODE_PATHS[nodeId]) {
        const nodePath = path.resolve(NODE_PATHS[nodeId]);
        const disabledPath = nodePath + '_disabled';
        try {
          await fs.rename(disabledPath, nodePath);
        } catch {}
      }
      await supabase.from('nodes').update({ health_status: 'healthy' }).eq('node_id', nodeId);
      return res.json({ message: `Node ${nodeId} restored`, nodeId });
    }

    if (failureType === 'missing_chunk') {
      if (!fileId || chunkIndex === undefined) {
        return res.status(400).json({ error: 'fileId and chunkIndex required for missing_chunk' });
      }
      const chunkFile = `${fileId}_chunk_${String(chunkIndex).padStart(4, '0')}.enc`;
      if (NODE_PATHS[nodeId]) {
        const filePath = path.join(path.resolve(NODE_PATHS[nodeId]), chunkFile);
        try { await fs.unlink(filePath); } catch {}
      }
      await supabase.from('recovery_logs').insert({
        file_id: fileId, failure_type: 'missing',
        recovery_action: 'manual_recovery',
        source_node: nodeId,
        details: `Simulated missing chunk ${chunkIndex}`,
      });
      return res.json({ message: `Chunk ${chunkIndex} deleted from ${nodeId}`, fileId, nodeId });
    }

    if (failureType === 'corrupt_chunk') {
      if (!fileId || chunkIndex === undefined) {
        return res.status(400).json({ error: 'fileId and chunkIndex required for corrupt_chunk' });
      }
      const chunkFile = `${fileId}_chunk_${String(chunkIndex).padStart(4, '0')}.enc`;
      if (NODE_PATHS[nodeId]) {
        const filePath = path.join(path.resolve(NODE_PATHS[nodeId]), chunkFile);
        try {
          const randomData = crypto.randomBytes(1024);
          await fs.writeFile(filePath, randomData);
        } catch {}
      }
      await supabase.from('recovery_logs').insert({
        file_id: fileId, failure_type: 'corrupt',
        recovery_action: 'manual_recovery',
        source_node: nodeId,
        details: `Simulated corrupt chunk ${chunkIndex}`,
      });
      return res.json({ message: `Chunk ${chunkIndex} corrupted on ${nodeId}`, fileId, nodeId });
    }

    res.status(400).json({ error: 'Invalid failureType' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/simulate-failure/logs — Recovery logs
router.get('/logs', async (req, res) => {
  try {
    const { data: logs } = await supabase
      .from('recovery_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
