import { sha256 } from '../utils/hash.js';
import env from '../config/env.js';

/**
 * Split a file buffer into chunks.
 * Uses fixed chunk size (default 4MB), dynamic if file is smaller.
 */
export function splitFile(fileBuffer, chunkSize = env.CHUNK_SIZE) {
  const totalSize = fileBuffer.length;

  // Dynamic chunk sizing for small files
  let effectiveChunkSize = chunkSize;
  if (totalSize <= chunkSize) {
    effectiveChunkSize = totalSize; // Single chunk for tiny files
  } else if (totalSize <= chunkSize * 2) {
    effectiveChunkSize = Math.ceil(totalSize / 2); // At least 2 chunks
  }

  const chunks = [];
  let offset = 0;
  let index = 0;

  while (offset < totalSize) {
    const end = Math.min(offset + effectiveChunkSize, totalSize);
    const chunkBuffer = fileBuffer.slice(offset, end);
    const checksum = sha256(chunkBuffer);

    chunks.push({
      index,
      buffer: chunkBuffer,
      size: chunkBuffer.length,
      checksum,
      offset,
    });

    offset = end;
    index++;
  }

  return {
    chunks,
    totalChunks: chunks.length,
    totalSize,
    chunkSize: effectiveChunkSize,
  };
}

/**
 * Verify a chunk against its checksum
 */
export function verifyChunk(chunkBuffer, expectedChecksum) {
  const actual = sha256(chunkBuffer);
  return actual === expectedChecksum;
}
