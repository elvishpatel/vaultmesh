import { readFromNode, existsOnNode, deleteFromNode, distributeChunks } from './distributor.js';
import supabase from '../config/db.js';

/**
 * Check integrity of all chunks for a file
 */
export async function checkFileIntegrity(fileId) {
  const { data: manifests } = await supabase
    .from('file_manifest')
    .select('*')
    .eq('file_id', fileId)
    .order('sequence_order', { ascending: true });

  if (!manifests || manifests.length === 0) return { healthy: false, issues: ['No manifest found'] };

  const issues = [];
  for (const m of manifests) {
    const chunkFile = `${fileId}_chunk_${String(m.sequence_order).padStart(4, '0')}.enc`;
    const primaryExists = await existsOnNode(m.node_id, chunkFile);
    const replicaExists = m.replica_node_id ? await existsOnNode(m.replica_node_id, chunkFile) : false;

    if (!primaryExists && !replicaExists) {
      issues.push({ chunkId: m.chunk_id, type: 'lost', sequenceOrder: m.sequence_order });
      await supabase.from('chunks').update({ status: 'lost' }).eq('chunk_id', m.chunk_id);
    } else if (!primaryExists || !replicaExists) {
      issues.push({
        chunkId: m.chunk_id,
        type: 'degraded',
        sequenceOrder: m.sequence_order,
        missingOn: !primaryExists ? m.node_id : m.replica_node_id,
      });
      await supabase.from('chunks').update({ status: 'degraded' }).eq('chunk_id', m.chunk_id);
    }
  }

  return { healthy: issues.length === 0, issues, totalChunks: manifests.length };
}

/**
 * Heal a degraded chunk by copying from available replica
 */
export async function healChunk(fileId, chunkId) {
  const { data: manifest } = await supabase
    .from('file_manifest')
    .select('*')
    .eq('chunk_id', chunkId)
    .single();

  if (!manifest) throw new Error('Manifest entry not found');

  const chunkFile = `${fileId}_chunk_${String(manifest.sequence_order).padStart(4, '0')}.enc`;
  const primaryExists = await existsOnNode(manifest.node_id, chunkFile);
  const replicaExists = manifest.replica_node_id ? await existsOnNode(manifest.replica_node_id, chunkFile) : false;

  if (!primaryExists && !replicaExists) {
    await logRecovery(chunkId, fileId, 'missing', 'failed', null, null, 'Both copies lost');
    throw new Error('Both primary and replica lost — unrecoverable');
  }

  const sourceNode = primaryExists ? manifest.node_id : manifest.replica_node_id;
  const targetNode = primaryExists ? manifest.replica_node_id : manifest.node_id;

  // Read from healthy copy
  const buffer = await readFromNode(sourceNode, chunkFile);

  // Get available nodes
  const { data: nodes } = await supabase
    .from('nodes')
    .select('node_id')
    .eq('health_status', 'healthy');
  const healthyNodes = nodes.map(n => n.node_id).filter(id => id !== sourceNode);
  const healTarget = targetNode && healthyNodes.includes(targetNode) ? targetNode : healthyNodes[0];

  if (!healTarget) {
    await logRecovery(chunkId, fileId, 'missing', 'failed', sourceNode, null, 'No healthy target node');
    throw new Error('No healthy node available for healing');
  }

  // Write to target
  const { writeToNodeDirect } = await getWriteFn();
  await writeToNodeDirect(healTarget, chunkFile, buffer);

  // Update manifest
  if (!primaryExists) {
    await supabase.from('file_manifest').update({ node_id: healTarget }).eq('chunk_id', chunkId);
  } else {
    await supabase.from('file_manifest').update({ replica_node_id: healTarget }).eq('chunk_id', chunkId);
  }

  await supabase.from('chunks').update({ status: 'healthy' }).eq('chunk_id', chunkId);
  await logRecovery(chunkId, fileId, 'missing', 'restored_from_replica', sourceNode, healTarget);
  return { healed: true, source: sourceNode, target: healTarget };
}

async function getWriteFn() {
  const { default: fs } = await import('fs/promises');
  const { default: path } = await import('path');
  const { uploadToSupabase } = await import('../storage/supabaseNode.js');
  const env = (await import('../config/env.js')).default;

  const NODE_CONFIG = {
    nodeA: { type: 'local', path: env.NODE_A_PATH },
    nodeB: { type: 'local', path: env.NODE_B_PATH },
    nodeC: { type: 'supabase', bucket: env.SUPABASE_STORAGE_BUCKET },
  };

  return {
    writeToNodeDirect: async (nodeId, fileName, buffer) => {
      const config = NODE_CONFIG[nodeId];
      if (config.type === 'local') {
        const dir = path.resolve(config.path);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), buffer);
      } else {
        await uploadToSupabase(fileName, buffer);
      }
    }
  };
}

async function logRecovery(chunkId, fileId, failureType, action, source, target, details = null) {
  await supabase.from('recovery_logs').insert({
    chunk_id: chunkId, file_id: fileId,
    failure_type: failureType, recovery_action: action,
    source_node: source, target_node: target, details,
  });
}

/**
 * Auto-heal all degraded chunks for a file
 */
export async function autoHealFile(fileId) {
  const integrity = await checkFileIntegrity(fileId);
  if (integrity.healthy) return { healed: 0, message: 'All chunks healthy' };

  let healed = 0, failed = 0;
  for (const issue of integrity.issues) {
    if (issue.type === 'lost') { failed++; continue; }
    try {
      await healChunk(fileId, issue.chunkId);
      healed++;
    } catch { failed++; }
  }

  return { healed, failed, total: integrity.issues.length };
}
