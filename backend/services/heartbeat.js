import supabase from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import env from '../config/env.js';

const NODE_PATHS = {
  nodeA: env.NODE_A_PATH,
  nodeB: env.NODE_B_PATH,
};

/**
 * Check health of all nodes
 */
export async function checkAllNodes() {
  const results = [];

  // Check local nodes
  for (const [nodeId, nodePath] of Object.entries(NODE_PATHS)) {
    try {
      const resolved = path.resolve(nodePath);
      await fs.access(resolved);
      const files = await fs.readdir(resolved);
      let totalSize = 0;
      for (const f of files) {
        const stat = await fs.stat(path.join(resolved, f));
        totalSize += stat.size;
      }
      results.push({ nodeId, healthy: true, fileCount: files.length, usedSpace: totalSize });
      await supabase.from('nodes').update({
        health_status: 'healthy',
        used_space: totalSize,
        last_heartbeat: new Date().toISOString(),
      }).eq('node_id', nodeId);
    } catch {
      results.push({ nodeId, healthy: false, error: 'Node inaccessible' });
      await supabase.from('nodes').update({
        health_status: 'offline',
        last_heartbeat: new Date().toISOString(),
      }).eq('node_id', nodeId);
    }
  }

  // Check Supabase node
  try {
    const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).list('', { limit: 1 });
    if (error) throw error;
    results.push({ nodeId: 'nodeC', healthy: true, fileCount: data?.length || 0 });
    await supabase.from('nodes').update({
      health_status: 'healthy',
      last_heartbeat: new Date().toISOString(),
    }).eq('node_id', 'nodeC');
  } catch {
    results.push({ nodeId: 'nodeC', healthy: false, error: 'Supabase unreachable' });
    await supabase.from('nodes').update({
      health_status: 'offline',
      last_heartbeat: new Date().toISOString(),
    }).eq('node_id', 'nodeC');
  }

  return results;
}

/**
 * Start periodic heartbeat (call once on server start)
 */
export function startHeartbeat(intervalMs = 30000) {
  checkAllNodes().catch(() => {});
  return setInterval(() => checkAllNodes().catch(() => {}), intervalMs);
}
