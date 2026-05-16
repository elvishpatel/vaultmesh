import supabase from '../config/db.js';
import { readFromNode } from './distributor.js';
import { decryptChunk, recoverDataKey } from './encryptor.js';
import { sha256 } from '../utils/hash.js';
import bcrypt from 'bcryptjs';

/**
 * Full retrieval pipeline:
 * 1. Verify retrieval key
 * 2. Verify secret phrase
 * 3. Fetch manifest
 * 4. Load chunks in order
 * 5. Verify checksums
 * 6. Decrypt chunks
 * 7. Reconstruct file
 */
export async function retrieveFile(fileId, retrievalKey, secretPhrase) {
  // 1. Get file record
  const { data: file, error } = await supabase
    .from('vault_files')
    .select('*')
    .eq('file_id', fileId)
    .single();

  if (error || !file) throw new Error('File not found');
  if (file.status !== 'distributed') throw new Error('File not available for retrieval');

  // 2. Verify retrieval key
  if (file.retrieval_key !== retrievalKey) {
    throw new Error('Invalid retrieval key');
  }

  // 3. Verify secret phrase
  const phraseMatch = await bcrypt.compare(secretPhrase, file.secret_phrase_hash);
  if (!phraseMatch) throw new Error('Invalid secret phrase');

  // 4. Recover data key
  const dataKey = recoverDataKey(file.encrypted_data_key, secretPhrase, file.data_key_salt);

  // 5. Fetch manifest ordered by sequence
  const { data: manifests } = await supabase
    .from('file_manifest')
    .select('*, chunks(*)')
    .eq('file_id', fileId)
    .order('sequence_order', { ascending: true });

  if (!manifests || manifests.length === 0) throw new Error('File manifest not found');

  // 6. Load, verify, and decrypt each chunk
  const decryptedChunks = [];

  for (const m of manifests) {
    const chunkFile = `${fileId}_chunk_${String(m.sequence_order).padStart(4, '0')}.enc`;
    let encryptedBuffer;

    // Try primary node first, then replica
    try {
      encryptedBuffer = await readFromNode(m.node_id, chunkFile);
    } catch {
      if (m.replica_node_id) {
        try {
          encryptedBuffer = await readFromNode(m.replica_node_id, chunkFile);
        } catch {
          throw new Error(`Chunk ${m.sequence_order} unavailable on all nodes`);
        }
      } else {
        throw new Error(`Chunk ${m.sequence_order} unavailable`);
      }
    }

    // Decrypt the chunk
    const chunk = m.chunks;
    const decrypted = decryptChunk(encryptedBuffer, chunk.encryption_iv, chunk.auth_tag, dataKey);

    // Verify checksum of decrypted data
    const checksum = sha256(decrypted);
    if (checksum !== chunk.checksum) {
      throw new Error(`Chunk ${m.sequence_order} integrity check failed`);
    }

    decryptedChunks.push({ order: m.sequence_order, buffer: decrypted });
  }

  // 7. Sort and reconstruct
  decryptedChunks.sort((a, b) => a.order - b.order);
  const reconstructed = Buffer.concat(decryptedChunks.map(c => c.buffer));

  return {
    buffer: reconstructed,
    fileName: file.original_name,
    mimeType: file.mime_type,
    size: file.size,
  };
}
