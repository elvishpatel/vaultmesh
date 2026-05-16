import { Router } from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/db.js';
import upload from '../middleware/upload.js';
import { splitFile } from '../services/chunker.js';
import { encryptAllChunks } from '../services/encryptor.js';
import { distributeChunks } from '../services/distributor.js';
import { generateRetrievalKey } from '../services/keyGenerator.js';

const router = Router();

// POST /api/upload — Full upload pipeline
router.post('/', upload.single('file'), async (req, res) => {
  let fileId = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { secretPhrase } = req.body;
    if (!secretPhrase || secretPhrase.length < 4) {
      return res.status(400).json({ error: 'Secret phrase required (min 4 chars)' });
    }

    const userId = req.user.id;
    const { originalname, mimetype, buffer, size } = req.file;

    // 1. Create vault file record
    const { data: vaultFile, error: insertErr } = await supabase
      .from('vault_files')
      .insert({
        user_id: userId,
        original_name: originalname,
        mime_type: mimetype,
        size,
        status: 'uploading',
      })
      .select('file_id')
      .single();

    if (insertErr) throw insertErr;
    fileId = vaultFile.file_id;

    // 2. Split file into chunks
    await supabase.from('vault_files').update({ status: 'chunking' }).eq('file_id', fileId);
    const { chunks, totalChunks } = splitFile(buffer);

    // 3. Encrypt all chunks
    await supabase.from('vault_files').update({ status: 'encrypting' }).eq('file_id', fileId);
    const { encryptedChunks, encryptedDataKey, salt } = encryptAllChunks(chunks, secretPhrase);

    // 4. Get healthy nodes
    const { data: healthyNodes } = await supabase
      .from('nodes')
      .select('node_id')
      .eq('health_status', 'healthy');
    const nodeIds = healthyNodes?.map(n => n.node_id) || ['nodeA', 'nodeB', 'nodeC'];

    // 5. Distribute chunks
    await supabase.from('vault_files').update({ status: 'distributing' }).eq('file_id', fileId);
    const distributionMap = await distributeChunks(encryptedChunks, fileId, nodeIds);

    // 6. Store chunk records
    for (const ec of encryptedChunks) {
      const dist = distributionMap.find(d => d.chunkIndex === ec.index);
      const { data: chunkRecord } = await supabase
        .from('chunks')
        .insert({
          file_id: fileId,
          sequence_order: ec.index,
          original_size: ec.originalSize,
          encrypted_size: ec.encryptedSize,
          checksum: ec.checksum,
          encryption_iv: ec.iv,
          auth_tag: ec.authTag,
          status: 'healthy',
        })
        .select('chunk_id')
        .single();

      // 7. Store manifest
      await supabase.from('file_manifest').insert({
        file_id: fileId,
        chunk_id: chunkRecord.chunk_id,
        node_id: dist.primaryNode,
        replica_node_id: dist.replicaNode,
        sequence_order: ec.index,
        checksum: ec.checksum,
      });
    }

    // 8. Generate retrieval key
    const retrievalKey = generateRetrievalKey();
    const secretPhraseHash = await bcrypt.hash(secretPhrase, 12);

    await supabase.from('vault_files').update({
      status: 'distributed',
      num_chunks: totalChunks,
      retrieval_key: retrievalKey,
      secret_phrase_hash: secretPhraseHash,
      encrypted_data_key: encryptedDataKey,
      data_key_salt: salt,
    }).eq('file_id', fileId);

    res.status(201).json({
      fileId,
      fileName: originalname,
      size,
      numChunks: totalChunks,
      retrievalKey,
      distributionMap: distributionMap.map(d => ({
        chunk: d.chunkIndex,
        primary: d.primaryNode,
        replica: d.replicaNode,
      })),
      message: 'File securely distributed. Save your retrieval key!',
    });

  } catch (err) {
    if (fileId) {
      await supabase.from('vault_files').update({ status: 'failed' }).eq('file_id', fileId);
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
