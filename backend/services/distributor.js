import fs from 'fs/promises';
import path from 'path';
import { ConsistentHashRing } from '../utils/hash.js';
import { uploadToSupabase } from '../storage/supabaseNode.js';
import env from '../config/env.js';

// Node configuration
const NODE_CONFIG = {
  nodeA: { type: 'local', path: env.NODE_A_PATH },
  nodeB: { type: 'local', path: env.NODE_B_PATH },
  nodeC: { type: 'supabase', bucket: env.SUPABASE_STORAGE_BUCKET },
};

// Initialize hash ring with all healthy nodes
let hashRing = new ConsistentHashRing(Object.keys(NODE_CONFIG));

/**
 * Ensure local storage directories exist
 */
async function ensureLocalDirs() {
  for (const [, config] of Object.entries(NODE_CONFIG)) {
    if (config.type === 'local') {
      await fs.mkdir(path.resolve(config.path), { recursive: true });
    }
  }
}

/**
 * Write a chunk to a specific node
 */
async function writeToNode(nodeId, chunkFileName, buffer) {
  const config = NODE_CONFIG[nodeId];
  if (!config) throw new Error(`Unknown node: ${nodeId}`);

  if (config.type === 'local') {
    const dirPath = path.resolve(config.path);
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, chunkFileName);
    await fs.writeFile(filePath, buffer);
    return { nodeId, path: filePath };
  }

  if (config.type === 'supabase') {
    await uploadToSupabase(chunkFileName, buffer);
    return { nodeId, path: `supabase://${config.bucket}/${chunkFileName}` };
  }
}

/**
 * Read a chunk from a specific node
 */
export async function readFromNode(nodeId, chunkFileName) {
  const config = NODE_CONFIG[nodeId];
  if (!config) throw new Error(`Unknown node: ${nodeId}`);

  if (config.type === 'local') {
    const filePath = path.join(path.resolve(config.path), chunkFileName);
    return await fs.readFile(filePath);
  }

  if (config.type === 'supabase') {
    const { downloadFromSupabase } = await import('../storage/supabaseNode.js');
    return await downloadFromSupabase(chunkFileName);
  }
}

/**
 * Delete a chunk from a specific node
 */
export async function deleteFromNode(nodeId, chunkFileName) {
  const config = NODE_CONFIG[nodeId];
  if (!config) return;

  if (config.type === 'local') {
    const filePath = path.join(path.resolve(config.path), chunkFileName);
    try { await fs.unlink(filePath); } catch { /* ignore if missing */ }
  }

  if (config.type === 'supabase') {
    const { deleteFromSupabase } = await import('../storage/supabaseNode.js');
    await deleteFromSupabase(chunkFileName);
  }
}

/**
 * Check if a chunk exists on a node
 */
export async function existsOnNode(nodeId, chunkFileName) {
  const config = NODE_CONFIG[nodeId];
  if (!config) return false;

  if (config.type === 'local') {
    const filePath = path.join(path.resolve(config.path), chunkFileName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  if (config.type === 'supabase') {
    const { existsOnSupabase } = await import('../storage/supabaseNode.js');
    return await existsOnSupabase(chunkFileName);
  }

  return false;
}

/**
 * Distribute encrypted chunks across nodes with replication.
 *
 * @param {Array} encryptedChunks - Array of { index, encrypted, iv, authTag, checksum }
 * @param {string} fileId - UUID of the vault file
 * @param {string[]} healthyNodes - List of currently healthy node IDs
 * @returns {Array} Distribution map: [{ chunkIndex, primaryNode, replicaNode, chunkFileName }]
 */
export async function distributeChunks(encryptedChunks, fileId, healthyNodes = null) {
  await ensureLocalDirs();

  const activeNodes = healthyNodes || Object.keys(NODE_CONFIG);

  // Rebuild ring if nodes changed
  hashRing = new ConsistentHashRing(activeNodes);

  const distributionMap = [];

  for (const chunk of encryptedChunks) {
    const chunkFileName = `${fileId}_chunk_${String(chunk.index).padStart(4, '0')}.enc`;

    // Use consistent hashing to determine placement
    const [primaryNode, replicaNode] = hashRing.getNodes(chunk.checksum, env.REPLICATION_FACTOR);

    // Write to primary node
    await writeToNode(primaryNode, chunkFileName, chunk.encrypted);

    // Write replica to different node
    if (replicaNode && replicaNode !== primaryNode) {
      await writeToNode(replicaNode, chunkFileName, chunk.encrypted);
    }

    distributionMap.push({
      chunkIndex: chunk.index,
      primaryNode,
      replicaNode: replicaNode !== primaryNode ? replicaNode : null,
      chunkFileName,
    });
  }

  return distributionMap;
}

/**
 * Get node configuration for external use
 */
export function getNodeConfig() {
  return NODE_CONFIG;
}

/**
 * Update hash ring (e.g., when a node goes offline)
 */
export function updateHashRing(activeNodeIds) {
  hashRing = new ConsistentHashRing(activeNodeIds);
}
