-- ============================================
-- VaultMesh Database Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. VAULT FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vault_files (
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size BIGINT NOT NULL,
  num_chunks INT NOT NULL DEFAULT 0,
  retrieval_key VARCHAR(20),
  secret_phrase_hash VARCHAR(255),
  encrypted_data_key TEXT,
  data_key_salt VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'chunking', 'encrypting', 'distributing', 'distributed', 'failed', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vault_files_user ON vault_files(user_id);
CREATE INDEX idx_vault_files_retrieval_key ON vault_files(retrieval_key);

-- ============================================
-- 3. NODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nodes (
  node_id VARCHAR(20) PRIMARY KEY,
  node_name VARCHAR(100) NOT NULL,
  node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('local', 'supabase')),
  health_status VARCHAR(20) NOT NULL DEFAULT 'healthy'
    CHECK (health_status IN ('healthy', 'degraded', 'offline')),
  total_space BIGINT DEFAULT 0,
  used_space BIGINT DEFAULT 0,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CHUNKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chunks (
  chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES vault_files(file_id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  original_size INT NOT NULL,
  encrypted_size INT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  encryption_iv VARCHAR(64) NOT NULL,
  auth_tag VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy'
    CHECK (status IN ('healthy', 'degraded', 'lost', 'corrupted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_file ON chunks(file_id);
CREATE INDEX idx_chunks_file_order ON chunks(file_id, sequence_order);

-- ============================================
-- 5. FILE MANIFEST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS file_manifest (
  manifest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES vault_files(file_id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES chunks(chunk_id) ON DELETE CASCADE,
  node_id VARCHAR(20) NOT NULL REFERENCES nodes(node_id),
  replica_node_id VARCHAR(20) REFERENCES nodes(node_id),
  sequence_order INT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manifest_file ON file_manifest(file_id);
CREATE INDEX idx_manifest_chunk ON file_manifest(chunk_id);
CREATE INDEX idx_manifest_node ON file_manifest(node_id);

-- ============================================
-- 6. RECOVERY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recovery_logs (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES chunks(chunk_id) ON DELETE SET NULL,
  file_id UUID REFERENCES vault_files(file_id) ON DELETE SET NULL,
  failure_type VARCHAR(50) NOT NULL
    CHECK (failure_type IN ('missing', 'corrupt', 'node_offline', 'checksum_mismatch', 'decrypt_failure')),
  recovery_action VARCHAR(50) NOT NULL
    CHECK (recovery_action IN ('restored_from_replica', 'auto_healed', 'failed', 'manual_recovery', 'rebalanced')),
  source_node VARCHAR(20),
  target_node VARCHAR(20),
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recovery_file ON recovery_logs(file_id);
CREATE INDEX idx_recovery_timestamp ON recovery_logs(timestamp DESC);

-- ============================================
-- 7. SEED STORAGE NODES
-- ============================================
INSERT INTO nodes (node_id, node_name, node_type, health_status, total_space, used_space)
VALUES
  ('nodeA', 'Local Node Alpha', 'local', 'healthy', 5368709120, 0),
  ('nodeB', 'Local Node Beta', 'local', 'healthy', 5368709120, 0),
  ('nodeC', 'Cloud Node Gamma', 'supabase', 'healthy', 1073741824, 0)
ON CONFLICT (node_id) DO NOTHING;

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- These policies are for additional safety if anon key is ever used.

-- Users: only service role can access
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Vault files: only service role can access
CREATE POLICY "Service role full access on vault_files"
  ON vault_files FOR ALL
  USING (true)
  WITH CHECK (true);

-- Chunks: only service role can access
CREATE POLICY "Service role full access on chunks"
  ON chunks FOR ALL
  USING (true)
  WITH CHECK (true);

-- File manifest: only service role can access
CREATE POLICY "Service role full access on file_manifest"
  ON file_manifest FOR ALL
  USING (true)
  WITH CHECK (true);

-- Nodes: only service role can access
CREATE POLICY "Service role full access on nodes"
  ON nodes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Recovery logs: only service role can access
CREATE POLICY "Service role full access on recovery_logs"
  ON recovery_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 9. CREATE SUPABASE STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vaultmesh-chunks', 'vaultmesh-chunks', false, 52428800)
ON CONFLICT (id) DO NOTHING;
