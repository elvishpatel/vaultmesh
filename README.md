# ⬡ VaultMesh — Secure Personal Decentralized File Vault

A full-stack secure file vault where files are **split into chunks**, **individually encrypted** with AES-256-GCM, **distributed across multiple storage nodes**, and can only be **reconstructed through a controlled retrieval engine** using a unique retrieval key + secret phrase.

## Architecture

```
User uploads file → Split into chunks → Encrypt each chunk → Distribute across nodes
                                                                    ↓
User provides key + secret → Fetch chunks → Verify checksums → Decrypt → Reconstruct
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TailwindCSS v4, Framer Motion, React Dropzone |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase free tier) |
| Storage Nodes | Local filesystem (Node A, B) + Supabase Storage (Node C) |
| Encryption | AES-256-GCM with PBKDF2 key derivation |
| Auth | Custom JWT with bcrypt |

## Quick Start

### 1. Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `database/migration.sql`
3. Go to **Storage** → verify the `vaultmesh-chunks` bucket was created
4. Go to **Settings > API** → copy your URL, anon key, and service role key

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open in Browser

Navigate to `http://localhost:5173`

## Features

- **File Chunking**: 4MB chunks with dynamic sizing for small files
- **AES-256-GCM Encryption**: Each chunk encrypted independently with unique IV
- **Consistent Hashing**: Chunk placement using virtual node hash ring
- **Replication Factor 2**: Every chunk stored on 2 different nodes
- **Self-Healing**: Automatic recovery from replica when primary chunk is lost
- **Retrieval Key System**: Unique `VM-XXXX-XXXX` key required for file retrieval
- **Decoy Key Recovery**: Lost key? Select from 5 near-identical keys (3 attempts max)
- **Node Failure Simulation**: Test resilience by taking nodes offline
- **Real-time Health Monitoring**: Heartbeat system with visual status indicators

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/upload` | Upload + encrypt + distribute |
| GET | `/api/files` | List vault files |
| GET | `/api/files/:id` | File detail + distribution map |
| POST | `/api/retrieve` | Retrieve + reconstruct file |
| POST | `/api/retrieve/verify-decoy` | Decoy key recovery |
| GET | `/api/health` | Node health status |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/simulate-failure` | Simulate node failure |
| POST | `/api/recover` | Trigger self-healing |

## Project Structure

```
VaultMesh/
├── frontend/          # React + TailwindCSS
├── backend/           # Node.js + Express
│   ├── services/      # Core engines (chunker, encryptor, distributor, etc.)
│   ├── routes/        # API endpoints
│   ├── storage/       # Node storage adapters
│   └── utils/         # Crypto & hashing utilities
└── database/          # SQL migration
```
