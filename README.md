<div align="center">

# ⬡ VaultMesh

### Secure · Distributed · Encrypted Personal File Vault

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![AES-256-GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-FF6B35?style=flat-square&logo=letsencrypt&logoColor=white)](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**VaultMesh** is a full-stack secure file vault where every file is split into encrypted chunks, distributed across multiple storage nodes, and can only be reconstructed using a unique retrieval key and secret phrase.

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Reference](#-api-endpoints) · [Security Model](#-security-model) · [Roadmap](#-roadmap)

</div>

---

## 🔍 What is VaultMesh?

Traditional cloud storage trusts a single provider with your complete, unencrypted files. VaultMesh takes a fundamentally different approach:

- Your file is **shredded** into 4 MB chunks before it ever touches a network
- Each chunk is **independently encrypted** with AES-256-GCM and a unique IV — compromising one chunk reveals nothing about the others
- Chunks are **spread across multiple nodes** using consistent hashing, so no single node holds your complete file
- Reconstruction requires both a **unique retrieval key** (`VM-XXXX-XXXX` format) and a **secret phrase** known only to you

Even if an attacker gained full access to one storage node, they would have encrypted, non-contiguous fragments — completely useless without the key, phrase, and other nodes.

---

## ⚙️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UPLOAD PIPELINE                         │
│                                                                 │
│  File Input → Chunker (4MB) → AES-256-GCM Encryptor            │
│                                       ↓                         │
│              Consistent Hash Ring → Node Distributor            │
│                    ↙           ↓           ↘                    │
│              Node A         Node B        Node C (Supabase)     │
│           (local FS)      (local FS)      (object storage)      │
│                                                                 │
│  PostgreSQL ← Metadata + Chunk Map + Retrieval Key              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        RETRIEVAL PIPELINE                        │
│                                                                  │
│  Retrieval Key + Secret Phrase → Auth & Key Derivation (PBKDF2) │
│                                       ↓                          │
│              Fetch Chunks → Verify SHA-256 Checksums             │
│                                       ↓                          │
│              Decrypt Each Chunk → Reconstruct File               │
│              (Replica Fallback if Primary Node Down)             │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Detail

| Step | What Happens |
|------|-------------|
| **1. Chunking** | File split into sequential 4 MB chunks; smaller files get dynamic sizing |
| **2. IV Generation** | A cryptographically random 12-byte IV is generated per chunk |
| **3. Key Derivation** | PBKDF2 (SHA-256, 100k iterations) derives a 256-bit key from your secret phrase |
| **4. Encryption** | AES-256-GCM encrypts chunk content; auth tag stored alongside ciphertext |
| **5. Hashing** | SHA-256 checksum computed for each encrypted chunk |
| **6. Distribution** | Consistent hash ring assigns each chunk to 2 nodes (replication factor = 2) |
| **7. Metadata** | Chunk map, checksums, node assignments, and key stored in PostgreSQL |

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TailwindCSS v4, Framer Motion | UI & animations |
| **Drag & Drop** | React Dropzone | File upload UX |
| **Backend** | Node.js 18+, Express | API server |
| **Database** | PostgreSQL via Supabase | Metadata & chunk registry |
| **Storage Nodes** | Local filesystem (A, B) + Supabase Storage (C) | Chunk storage |
| **Encryption** | AES-256-GCM, PBKDF2 (Node.js `crypto`) | End-to-end chunk encryption |
| **Auth** | Custom JWT + bcrypt | Session & user management |
| **Health** | Heartbeat polling + Node health API | Resilience monitoring |

---

## ✨ Features

### 🔐 Security & Encryption
- **AES-256-GCM per chunk** — each chunk encrypted with an independent key and IV; authentication tags prevent tampering
- **PBKDF2 key derivation** — 100,000 iterations of SHA-256 converts your phrase into a hardened 256-bit key
- **Zero plaintext storage** — no unencrypted data is ever written to disk or cloud storage
- **SHA-256 integrity checks** — every chunk is verified against its stored checksum on retrieval

### 🌐 Distributed Storage
- **4 MB chunking** — files broken into fixed-size shards with dynamic sizing for small files
- **Consistent hashing** — virtual node hash ring determines deterministic, balanced chunk placement
- **Replication factor 2** — every chunk lives on two separate nodes; losing one node never loses data
- **Self-healing recovery** — if a primary chunk is missing, VaultMesh automatically fetches and restores it from its replica

### 🗝 Retrieval Key System
- **Unique `VM-XXXX-XXXX` key** — generated at upload time; required for all retrieval operations
- **Decoy key recovery** — if you lose your key, choose your real key from 5 near-identical decoys (max 3 attempts)
- **Secret phrase binding** — retrieval requires both the key AND your phrase; neither alone is sufficient

### 📊 Monitoring & Resilience
- **Real-time node health** — heartbeat system with visual status indicators (Online / Degraded / Offline)
- **Node failure simulation** — deliberately take nodes offline to test your vault's resilience
- **Dashboard statistics** — storage used, chunk distribution, node utilization, upload history
- **Distribution map** — per-file visualization of which chunks live on which nodes

### 👤 User Management
- **JWT-based sessions** — stateless authentication with configurable expiry
- **bcrypt password hashing** — industry-standard salted hashing for stored credentials
- **Per-user vaults** — file listings and retrieval keys are user-scoped

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm** 8+
- A free [Supabase](https://supabase.com) account

---

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** → paste and run the contents of `database/migration.sql`
3. Navigate to **Storage** → confirm the `vaultmesh-chunks` bucket was created automatically
4. Navigate to **Settings → API** → copy the following values:
   - `Project URL`
   - `anon` / public key
   - `service_role` / secret key

> ⚠️ The **service role key** has admin privileges. Never expose it to the browser or commit it to version control.

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-very-long-random-secret-string
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# Local Storage Nodes
NODE_A_PATH=./storage/node-a
NODE_B_PATH=./storage/node-b
```

```bash
npm install
npm run dev        # Development (nodemon)
# or
npm start          # Production
```

The API will be available at `http://localhost:3001`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

### 4. First Run Checklist

- [ ] Backend running on port 3001 (check terminal for `VaultMesh API listening on :3001`)
- [ ] All three nodes show **Online** in the dashboard
- [ ] Register an account and upload a small test file
- [ ] Copy your `VM-XXXX-XXXX` retrieval key somewhere safe
- [ ] Test retrieval using the key + your secret phrase
- [ ] Try simulating a node failure and confirm self-healing works

---

## 📡 API Endpoints

All endpoints (except auth) require `Authorization: Bearer <jwt>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT |
| `POST` | `/api/auth/refresh` | Refresh an expiring JWT |

**Register / Login body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

---

### File Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload, encrypt, and distribute a file |
| `GET` | `/api/files` | List all files in your vault |
| `GET` | `/api/files/:id` | File detail, metadata, and chunk distribution map |
| `DELETE` | `/api/files/:id` | Permanently delete a file and all its chunks |

**Upload** — `multipart/form-data`:
```
file          (binary)   The file to vault
secretPhrase  (string)   Your encryption passphrase
```

**Upload response:**
```json
{
  "fileId": "uuid",
  "retrievalKey": "VM-A3F2-9K1X",
  "chunksCreated": 7,
  "nodesUsed": ["node-a", "node-b", "node-c"],
  "replicationFactor": 2
}
```

---

### Retrieval

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/retrieve` | Reconstruct and download a file |
| `POST` | `/api/retrieve/verify-decoy` | Identify real key from decoys (lost key recovery) |

**Retrieve body:**
```json
{
  "retrievalKey": "VM-A3F2-9K1X",
  "secretPhrase": "your-passphrase"
}
```

**Decoy verification body:**
```json
{
  "fileId": "uuid",
  "selectedKey": "VM-A3F2-9K1X"
}
```
> Returns `true`/`false`. Maximum 3 attempts before lockout.

---

### Health & Administration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Live health status of all storage nodes |
| `GET` | `/api/stats` | Aggregate dashboard statistics |
| `POST` | `/api/simulate-failure` | Take a named node offline for testing |
| `POST` | `/api/recover` | Trigger manual self-healing on a node |

**Simulate failure body:**
```json
{ "nodeId": "node-a" }
```

**Node health response:**
```json
{
  "nodes": [
    { "id": "node-a", "status": "online", "chunksStored": 142, "storageUsedMB": 384 },
    { "id": "node-b", "status": "online", "chunksStored": 138, "storageUsedMB": 371 },
    { "id": "node-c", "status": "online", "chunksStored": 145, "storageUsedMB": 392 }
  ],
  "overallHealth": "healthy"
}
```

---

## 🏗 Project Structure

```
VaultMesh/
│
├── frontend/                    # React + TailwindCSS v4 UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx    # Stats overview + node health
│   │   │   ├── Dropzone.jsx     # Drag-and-drop file upload
│   │   │   ├── FileList.jsx     # Vault file browser
│   │   │   ├── RetrieveModal.jsx
│   │   │   ├── NodeMap.jsx      # Visual chunk distribution
│   │   │   └── DecoyPicker.jsx  # Lost key recovery UI
│   │   ├── hooks/
│   │   │   ├── useVault.js
│   │   │   └── useNodeHealth.js
│   │   ├── api/                 # Axios API client
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── backend/                     # Node.js + Express API
│   ├── routes/
│   │   ├── auth.js              # Register, login, JWT refresh
│   │   ├── upload.js            # Chunking + encrypt + distribute
│   │   ├── retrieve.js          # Reconstruct + decrypt
│   │   ├── files.js             # Vault file listing
│   │   └── health.js            # Node status + stats
│   │
│   ├── services/
│   │   ├── chunker.js           # File → 4MB chunk splitting
│   │   ├── encryptor.js         # AES-256-GCM per-chunk encryption
│   │   ├── distributor.js       # Consistent hash ring assignment
│   │   ├── retriever.js         # Fetch, verify, decrypt, join
│   │   ├── healer.js            # Replica-based self-healing logic
│   │   └── keyGenerator.js      # VM-XXXX-XXXX retrieval key factory
│   │
│   ├── storage/
│   │   ├── nodeA.js             # Local filesystem adapter (Node A)
│   │   ├── nodeB.js             # Local filesystem adapter (Node B)
│   │   └── nodeC.js             # Supabase Storage adapter (Node C)
│   │
│   ├── utils/
│   │   ├── crypto.js            # PBKDF2 key derivation helpers
│   │   ├── hashRing.js          # Virtual node consistent hashing
│   │   └── checksum.js          # SHA-256 chunk integrity
│   │
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   └── errorHandler.js
│   │
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
└── database/
    └── migration.sql            # Full PostgreSQL schema + storage bucket setup
```

---

## 🔒 Security Model

### Encryption

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key length | 256 bits |
| IV length | 96 bits (12 bytes), randomly generated per chunk |
| Auth tag | 128 bits — prevents undetected tampering |
| KDF | PBKDF2-SHA256, 100,000 iterations |
| KDF salt | Per-file random salt, stored in PostgreSQL |

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Node storage compromise | Attacker gets encrypted, non-contiguous fragments — useless without key + phrase |
| Database compromise | Metadata and chunk map exposed, but ciphertext is on storage nodes |
| Retrieval key theft | Useless without the secret phrase |
| Secret phrase theft | Useless without the retrieval key (and chunk locations) |
| Chunk tampering | AES-GCM auth tag + SHA-256 checksum detect any modification |
| Replay attacks | Per-upload unique IVs and salts prevent replay |
| Brute force | PBKDF2 with 100k iterations significantly slows offline attacks |

### What VaultMesh Does NOT Protect Against

- A fully compromised server with access to both the database AND storage nodes simultaneously
- An attacker who obtains **both** your retrieval key and secret phrase
- Metadata analysis (file size, upload time, and chunk count are stored in PostgreSQL)

> For maximum security, host Node A and Node B on separate machines from your database.

---

## 🔧 Configuration Reference

### Backend `.env` Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | — | Supabase public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase admin key (server-side only) |
| `JWT_SECRET` | ✅ | — | Random string ≥ 64 chars recommended |
| `JWT_EXPIRES_IN` | | `7d` | JWT token lifetime |
| `PORT` | | `3001` | Express server port |
| `NODE_ENV` | | `development` | `development` or `production` |
| `NODE_A_PATH` | | `./storage/node-a` | Local Node A storage path |
| `NODE_B_PATH` | | `./storage/node-b` | Local Node B storage path |
| `CHUNK_SIZE_BYTES` | | `4194304` | Chunk size (default 4 MB) |
| `PBKDF2_ITERATIONS` | | `100000` | Key derivation iteration count |
| `HEARTBEAT_INTERVAL_MS` | | `30000` | Node health check frequency |

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend
npm test

# Test encryption roundtrip
npm run test:crypto

# Test chunk distribution
npm run test:distributor

# Integration tests (requires running Supabase project)
npm run test:integration

# Frontend
cd frontend
npm test
```

### Manual Resilience Testing

1. Upload a multi-chunk file (> 4 MB)
2. Navigate to the file's distribution map — note which nodes hold which chunks
3. Use **Simulate Failure** to take Node A offline
4. Retrieve the file — VaultMesh should reconstruct it from Node B and Node C replicas
5. Use **Recover** to restore Node A — it will re-receive missing chunks from replicas
6. Bring Node A back online and verify all health indicators return green

---

## 🗺 Roadmap

- [ ] **Browser-side encryption** — encrypt chunks in the browser before they leave the client
- [ ] **Shamir's Secret Sharing** — split the retrieval key itself across multiple custodians
- [ ] **Additional storage nodes** — AWS S3, Google Cloud Storage, Azure Blob adapters
- [ ] **Configurable replication factor** — allow replication factor 3+ for critical files
- [ ] **File versioning** — keep encrypted snapshots of previous file versions
- [ ] **Audit log** — immutable retrieval and access event history
- [ ] **CLI client** — `vaultmesh push/pull` commands for scripted workflows
- [ ] **Mobile app** — React Native client for on-device vault access
- [ ] **Zero-knowledge proofs** — prove file ownership without revealing content

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test` in both `frontend/` and `backend/`
5. Submit a pull request describing your changes

Please follow the existing code style and include relevant test coverage for new features.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with ⬡ by the VaultMesh contributors

*Your files. Split. Encrypted. Distributed. Yours.*

</div>
