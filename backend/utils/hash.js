import crypto from 'crypto';

/**
 * Generate SHA-256 hash of a buffer
 */
export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Consistent Hash Ring for chunk distribution.
 * Uses virtual nodes for even distribution across physical nodes.
 */
export class ConsistentHashRing {
  constructor(nodes = [], virtualNodesPerNode = 150) {
    this.ring = new Map();
    this.sortedKeys = [];
    this.virtualNodesPerNode = virtualNodesPerNode;

    for (const node of nodes) {
      this.addNode(node);
    }
  }

  _hash(key) {
    const hash = crypto.createHash('md5').update(key).digest();
    return hash.readUInt32BE(0);
  }

  addNode(nodeId) {
    for (let i = 0; i < this.virtualNodesPerNode; i++) {
      const virtualKey = `${nodeId}:vn${i}`;
      const hash = this._hash(virtualKey);
      this.ring.set(hash, nodeId);
      this.sortedKeys.push(hash);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  removeNode(nodeId) {
    const keysToRemove = [];
    for (const [hash, node] of this.ring) {
      if (node === nodeId) keysToRemove.push(hash);
    }
    for (const key of keysToRemove) {
      this.ring.delete(key);
    }
    this.sortedKeys = this.sortedKeys.filter(k => !keysToRemove.includes(k));
  }

  /**
   * Get the node responsible for a given key (chunk hash)
   */
  getNode(key) {
    if (this.sortedKeys.length === 0) return null;

    const hash = this._hash(key);

    // Binary search for the first ring position >= hash
    let lo = 0, hi = this.sortedKeys.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < hash) lo = mid + 1;
      else hi = mid;
    }

    // Wrap around if past the last key
    const idx = this.sortedKeys[lo] >= hash ? lo : 0;
    return this.ring.get(this.sortedKeys[idx]);
  }

  /**
   * Get N distinct nodes for replication
   */
  getNodes(key, count = 2) {
    if (this.sortedKeys.length === 0) return [];

    const hash = this._hash(key);
    const nodes = new Set();

    let lo = 0, hi = this.sortedKeys.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < hash) lo = mid + 1;
      else hi = mid;
    }

    let idx = this.sortedKeys[lo] >= hash ? lo : 0;

    // Walk the ring until we have enough unique physical nodes
    for (let i = 0; i < this.sortedKeys.length && nodes.size < count; i++) {
      const pos = (idx + i) % this.sortedKeys.length;
      nodes.add(this.ring.get(this.sortedKeys[pos]));
    }

    return Array.from(nodes);
  }
}
