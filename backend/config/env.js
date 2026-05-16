import dotenv from 'dotenv';
dotenv.config();

const env = {
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: '7d',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'vaultmesh-chunks',
  MASTER_ENCRYPTION_KEY: process.env.MASTER_ENCRYPTION_KEY,
  NODE_A_PATH: process.env.NODE_A_PATH || './storage/node1',
  NODE_B_PATH: process.env.NODE_B_PATH || './storage/node2',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024,
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE_MB || '4') * 1024 * 1024,
  REPLICATION_FACTOR: 2,
  DECOY_KEY_COUNT: 5,
  MAX_DECOY_ATTEMPTS: 3,
};

export default env;
