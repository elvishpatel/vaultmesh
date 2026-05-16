import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { startHeartbeat } from './services/heartbeat.js';

// Route imports
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import filesRoutes from './routes/files.js';
import retrieveRoutes from './routes/retrieve.js';
import healthRoutes from './routes/health.js';
import simulateRoutes from './routes/simulate.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require JWT)
app.use('/api/auth/me', authMiddleware, authRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/files', authMiddleware, filesRoutes);
app.use('/api/retrieve', authMiddleware, retrieveRoutes);
app.use('/api/health', authMiddleware, healthRoutes);
app.use('/api/simulate-failure', authMiddleware, simulateRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'VaultMesh API',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/me',
      'POST /api/upload',
      'GET  /api/files',
      'GET  /api/files/:fileId',
      'DELETE /api/files/:fileId',
      'POST /api/retrieve',
      'POST /api/retrieve/verify-decoy',
      'GET  /api/health',
      'GET  /api/stats',
      'GET  /api/nodes',
      'POST /api/recover',
      'POST /api/integrity',
      'POST /api/simulate-failure',
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Max size: ${env.MAX_FILE_SIZE / 1024 / 1024}MB` });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(env.PORT, () => {
  console.log(`\n⬡ VaultMesh API running on port ${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Max file size: ${env.MAX_FILE_SIZE / 1024 / 1024}MB`);
  console.log(`  Chunk size: ${env.CHUNK_SIZE / 1024 / 1024}MB`);
  console.log(`  Replication factor: ${env.REPLICATION_FACTOR}\n`);

  // Start node heartbeat monitor
  startHeartbeat(30000);
});

export default app;
