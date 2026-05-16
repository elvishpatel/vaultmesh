import { Router } from 'express';
import { retrieveFile } from '../services/retriever.js';
import { generateDecoyKeys } from '../services/keyGenerator.js';
import supabase from '../config/db.js';
import bcrypt from 'bcryptjs';

const router = Router();

// In-memory rate limiter for decoy attempts
const decoyAttempts = new Map();

// POST /api/retrieve — Retrieve and reconstruct a file
router.post('/', async (req, res) => {
  try {
    const { fileId, retrievalKey, secretPhrase } = req.body;
    if (!fileId || !retrievalKey || !secretPhrase) {
      return res.status(400).json({ error: 'fileId, retrievalKey, and secretPhrase required' });
    }

    // Verify user owns the file
    const { data: file } = await supabase
      .from('vault_files')
      .select('file_id')
      .eq('file_id', fileId)
      .eq('user_id', req.user.id)
      .single();
    if (!file) return res.status(404).json({ error: 'File not found' });

    const result = await retrieveFile(fileId, retrievalKey, secretPhrase);

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', result.size);
    res.send(result.buffer);
  } catch (err) {
    const status = err.message.includes('Invalid') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/verify-decoy — Decoy key recovery system
router.post('/verify-decoy', async (req, res) => {
  try {
    const { fileId, action } = req.body;

    // Verify user owns the file
    const { data: file } = await supabase
      .from('vault_files')
      .select('file_id, retrieval_key, secret_phrase_hash')
      .eq('file_id', fileId)
      .eq('user_id', req.user.id)
      .single();
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (action === 'generate') {
      // Generate decoy keys
      const keys = generateDecoyKeys(file.retrieval_key, 5);
      decoyAttempts.set(`${req.user.id}:${fileId}`, { attempts: 0, generated: true });
      return res.json({ keys, message: 'Select the correct retrieval key' });
    }

    if (action === 'verify') {
      const { selectedKey, secretPhrase } = req.body;
      const attemptKey = `${req.user.id}:${fileId}`;
      const state = decoyAttempts.get(attemptKey) || { attempts: 0 };

      if (state.attempts >= 3) {
        decoyAttempts.delete(attemptKey);
        return res.status(429).json({ error: 'Max attempts exceeded. Try again later.' });
      }

      state.attempts++;
      decoyAttempts.set(attemptKey, state);

      if (selectedKey !== file.retrieval_key) {
        return res.status(403).json({
          error: 'Incorrect key',
          attemptsRemaining: 3 - state.attempts,
        });
      }

      // Verify secret phrase
      const phraseMatch = await bcrypt.compare(secretPhrase, file.secret_phrase_hash);
      if (!phraseMatch) {
        return res.status(403).json({ error: 'Invalid secret phrase' });
      }

      decoyAttempts.delete(attemptKey);
      return res.json({ valid: true, retrievalKey: file.retrieval_key });
    }

    res.status(400).json({ error: 'action must be "generate" or "verify"' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
