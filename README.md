9<div align="center">

```
██████╗       ███████╗ ██████╗██╗     
██╔═══██╗      ██╔════╝██╔════╝██║     
██║   ██║█████╗███████╗██║     ██║     
██║▄▄ ██║╚════╝╚════██║██║     ██║     
╚██████╔╝      ███████║╚██████╗███████╗
 ╚══▀▀═╝       ╚══════╝ ╚═════╝╚══════╝
```

### **Quantum-Shielded Confidential Ledger**
*The world's first post-quantum, cross-chain private financial primitive*

<br/>

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana%20Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![Powered by IBM Quantum](https://img.shields.io/badge/Entropy-IBM%20Quantum-1F70C1?style=for-the-badge&logo=ibm&logoColor=white)](https://quantum.ibm.com)
[![FHE Encrypted](https://img.shields.io/badge/State-FHE%20Encrypted-00D4AA?style=for-the-badge&logo=gnuprivacyguard&logoColor=white)](https://encrypt.network)
[![Anchor](https://img.shields.io/badge/Framework-Anchor%200.31-FF6B35?style=for-the-badge)](https://anchor-lang.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> *"Privacy is not a feature. It's the foundation."*

</div>

---

## 🎬 Live Demo

<div align="center">

[![Q-SCL Demo](https://img.youtube.com/vi/RKg4SNP2JjY/maxresdefault.jpg)](https://youtu.be/RKg4SNP2JjY)

### ▶️ [Watch the Full Demo on YouTube](https://youtu.be/RKg4SNP2JjY)

*See Q-SCL in action — from quantum entropy generation to homomorphic transfer execution and bridgeless cross-chain signing.*

</div>

---

## ⚡ The Problem We Solve

Blockchain's promise of financial sovereignty has a fundamental paradox: **every transaction is public by design.** Existing privacy solutions choose two at most from:

<div align="center">

```
        ╔══════════════════════════════════════════╗
        ║          THE PRIVACY TRILEMMA            ║
        ╠══════════════════════════════════════════╣
        ║                                          ║
        ║              🔒 Privacy                  ║
        ║                  /\                      ║
        ║                 /  \                     ║
        ║                / Q  \    ← Q-SCL         ║
        ║               /  SCL \     solves all 3  ║
        ║              /________\                  ║
        ║    🌐 Cross-Chain    ⚛️ Post-Quantum      ║
        ║                                          ║
        ║    ❌ Tornado Cash  →  Privacy only      ║
        ║    ❌ Bridges       →  Cross-chain only   ║
        ║    ❌ ZCash         →  Not post-quantum   ║
        ╚══════════════════════════════════════════╝
```

</div>

**Q-SCL dissolves this trilemma entirely** by fusing three bleeding-edge cryptographic systems into a single, cohesive on-chain primitive.

---

## 🏛️ Architecture Deep Dive

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Q-SCL SYSTEM OVERVIEW                       │
│                                                                     │
│   ┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │  IBM Quantum │    │  Solana Anchor   │    │   Ika Network    │  │
│   │  ──────────  │    │  ─────────────── │    │  ─────────────── │  │
│   │  8-Qubit     │    │  q_scl_ledger   │    │  dWallet MPC     │  │
│   │  Circuit     │───▶│                  │───▶│  2PC Protocol    │  │
│   │              │    │  BFV Ciphertexts │    │                  │  │
│   │  ⚛️ True RNG  │    │  FHE Arithmetic  │    │  ECDSA / EdDSA  │  │
│   └─────────────┘    └──────────────────┘    └──────────────────┘  │
│          │                    │                        │            │
│    Quantum Entropy      Encrypted State           Intent Hash       │
│    (Noise Rotation)     (Blinded Transfers)     (Cross-Chain Auth)  │
│                                                                     │
│         ↓                    ↓                        ↓            │
│   ┌───────────────────────────────────────────────────────────┐    │
│   │               Next.js Dashboard (wallet-adapter)          │    │
│   └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 🔷 Component 1 — On-Chain FHE Engine

The Anchor program `q_scl_ledger` stores user balances as **BFV ciphertexts** — 128-byte compressed representations of encrypted integers. Transfers are computed *entirely under encryption*:

$$C_{\text{new}} = C_{\text{sender}} - C_{\text{transfer}} \pmod{q}$$

The ledger never sees raw amounts. **Not the validator. Not the RPC. Not even the program itself.**

To prevent encrypted overdrafts, a **Bulletproof Zero-Knowledge range proof** is enforced on-chain:

```
                ┌──────────────────────────────────────┐
                │         ZK Range Proof Gate           │
                │                                      │
                │  PROVE:  C_balance - C_transfer ≥ 0  │
                │  WITHOUT revealing either value       │
                │                                      │
                │  ✅ Valid   →  Transfer executes      │
                │  ❌ Invalid →  Transaction rejected   │
                └──────────────────────────────────────┘
```

---

### ⚛️ Component 2 — Quantum Entropy Rotation

Lattice-based cryptography (the mathematical backbone of FHE) is only as strong as its **noise floor entropy**. Deterministic noise is a ticking time bomb — basis reduction algorithms can unravel it given sufficient ciphertext samples.

Our solution: **real quantum waveform collapse**.

```
IBM Quantum Backend
       │
       ▼
┌─────────────────────────────────────┐
│  8-Qubit Superposition Circuit      │
│                                     │
│  |0⟩ ──[H]── [Measure] ──▶ {0,1}  │  ← Hadamard gate
│  |0⟩ ──[H]── [Measure] ──▶ {0,1}  │    creates true
│  |0⟩ ──[H]── [Measure] ──▶ {0,1}  │    superposition
│   ...                               │
│  8 bits of TRUE randomness / shot   │
└─────────────────────────────────────┘
       │
       ▼  (every 55 minutes)
  FHE Noise Matrix Re-Seeded
  on Solana Anchor state
       │
       ▼
  ♾️  Unconditional security against
      quantum indexing attacks
```

Unlike PRNG or OS-level entropy, this randomness has **no algorithmic origin** — it emerges from quantum mechanical uncertainty itself.

---

### 🌐 Component 3 — Bridgeless Ika dWallet MPC

Traditional cross-chain transfers require bridges — centralized chokepoints with a catastrophic track record ($2.5B+ lost to bridge exploits). Q-SCL eliminates bridges entirely.

```
  Solana (FHE Logic)                 Bitcoin / Ethereum
  ─────────────────                  ──────────────────
                                     
  Encrypted condition                     UTXO / Output
  evaluated on-chain                      controlled by
         │                                dWallet MPC
         │                                     │
         ▼                                     │
  ┌─────────────┐    Intent Hash    ┌──────────────────┐
  │  q_scl_ledger│ ───────────────▶ │   Ika MPC Nodes  │
  │             │                   │                  │
  │  No secrets │                   │  σ = Sign(       │
  │  stored     │                   │    s_user ⊕      │
  └─────────────┘                   │    s_ika,        │
                                    │    payload )     │
                                    └──────────────────┘
                                             │
                                             ▼
                                    Signature broadcast
                                    to target chain
                                    (no bridge required)
```

**The key insight:** Neither the user nor Ika nodes ever hold a complete signing key. The 2PC-MPC protocol ensures the signature can only be constructed when the encrypted on-chain condition is satisfied — turning smart contract logic into real-world asset control, cross-chain, trustlessly.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Solana CLI | `v1.18+` | Cluster interaction & deployments |
| Anchor CLI | `v0.31.0` | Smart contract framework |
| Node.js | `v22+` | Frontend & scripts |
| Yarn | latest | Package management |
| Python | `3.12+` | Quantum entropy provider |
| IBM Quantum Account | — | Real quantum hardware access |

---

### Step 1 — Clone & Configure

```bash
git clone https://github.com/at264939-ctrl/Q-SCL.git
cd Q-SCL
cp .env.example .env
```

Open `.env` and fill in:
```env
IBM_QUANTUM_TOKEN=your_ibm_quantum_token_here
SOLANA_KEYPAIR_PATH=~/.config/solana/id.json
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
```

---

### Step 2 — Build & Deploy the Anchor Program

```bash
# Navigate to the smart contract
cd q_scl_ledger

# Compile (this will take ~2-3 minutes)
anchor build

# Retrieve the generated program address
solana address -k target/deploy/q_scl_ledger-keypair.json
# → Copy this address

# Update program ID in THREE places:
#   1. programs/q_scl_ledger/src/lib.rs  (declare_id! macro)
#   2. Anchor.toml                        ([programs.devnet] section)
#   3. quantum_provider.py                (PROGRAM_ID constant)

# Fund your wallet on devnet
solana airdrop 2

# Deploy 🚀
anchor deploy --provider.cluster devnet
```

> ✅ **Verify deployment:** Check your program is live on [Solana Devnet Explorer](https://explorer.solana.com/?cluster=devnet)

---

### Step 3 — Launch the Quantum Entropy Provider

This daemon continuously harvests true quantum randomness from IBM's real quantum hardware and rotates the FHE noise matrix on-chain — the core of Q-SCL's post-quantum security guarantee.

```bash
# Create isolated Python environment
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch as daemon (rotates entropy every 55 minutes)
python quantum_provider.py --daemon
```

Expected output:
```
[Q-SCL Quantum Provider] Connected to IBM Quantum: ibm_brisbane
[Q-SCL Quantum Provider] Running 8-qubit entropy circuit...
[Q-SCL Quantum Provider] ✅ Entropy captured: 0xA7F3C1B8...
[Q-SCL Quantum Provider] ✅ Solana state updated @ slot 312847201
[Q-SCL Quantum Provider] Next rotation in: 55:00
```

---

### Step 4 — Launch the Dashboard

```bash
cd q_scl_frontend
yarn install
yarn dev
```

Navigate to **[http://localhost:3000](http://localhost:3000)**

```
┌────────────────────────────────────────────────┐
│           Q-SCL Dashboard v1.0                 │
│  ●  Connected: Phantom Wallet                  │
│  ⚛️  Quantum Entropy: LIVE (next: 48:23)       │
│  🔒  FHE Engine: ACTIVE                        │
│  🌐  Ika MPC: SYNCHRONIZED                     │
│                                                │
│  [ Deposit ]  [ Transfer ]  [ Cross-Chain ]    │
└────────────────────────────────────────────────┘
```

---

## 🔒 Security Model

### The REFHE Protocol

Q-SCL implements **Reduced-Error Fully Homomorphic Encryption** — a pragmatic evolution of standard BFV/BGV schemes optimized for on-chain constraints:

| Property | Standard FHE | REFHE (Q-SCL) |
|----------|-------------|---------------|
| Noise management | Bootstrapping (expensive) | Periodic compression (cheap) |
| Entropy source | PRNG / OS | IBM Quantum hardware |
| Range validation | Off-chain | Bulletproof ZK on-chain |
| Secret key storage | Client | Zero-trust (never stored) |

### Threat Model

```
Attack Vector               Q-SCL Defense
──────────────────────────────────────────────────────────────
Classical eavesdropping  →  BFV homomorphic encryption
Quantum key attacks      →  LWE lattice hardness + quantum RNG  
Bridge exploits          →  Eliminated (bridgeless MPC)
Overdraft manipulation   →  ZK range proof (on-chain enforced)
Noise prediction attacks →  True quantum randomness rotation
MPC collusion            →  2PC threshold: requires both parties
```

---

## 📁 Repository Structure

```
q-scl/
├── q_scl_ledger/               # Anchor smart contract
│   ├── programs/
│   │   └── q_scl_ledger/
│   │       └── src/
│   │           └── lib.rs      # FHE engine + ZK proof verification
│   ├── tests/
│   │   └── q_scl_ledger.ts    # Integration test suite
│   └── Anchor.toml
│
├── quantum_provider/           # Python quantum entropy daemon
│   ├── quantum_provider.py    # IBM Quantum circuit + Solana updater
│   └── requirements.txt
│
├── q_scl_frontend/             # Next.js dashboard
│   ├── pages/
│   ├── components/
│   └── package.json
│
├── .env.example
└── README.md
```

---

## 🧪 Running Tests

```bash
# Smart contract tests
cd q_scl_ledger
anchor test

# Quantum provider unit tests
cd quantum_provider
python -m pytest tests/ -v

# Frontend tests
cd q_scl_frontend
yarn test
```

---

## 🗺️ Roadmap

- [x] FHE balance storage (BFV ciphertexts)
- [x] Homomorphic transfer arithmetic
- [x] Bulletproof ZK range proofs
- [x] IBM Quantum entropy rotation daemon
- [x] Ika dWallet MPC cross-chain intent
- [x] Next.js dashboard with wallet-adapter
- [ ] Mainnet deployment
- [ ] Mobile SDK (iOS / Android)
- [ ] ZK proof batching for throughput
- [ ] Multi-asset support (SPL tokens)
- [ ] DAO governance for entropy rotation parameters

---

## 👥 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Development workflow
git checkout -b feature/your-feature-name
# ... make your changes ...
anchor test && yarn test
git commit -m "feat: your descriptive commit message"
git push origin feature/your-feature-name
# Open a PR 🎉
```

---

## 📜 License

MIT © Q-SCL Contributors

---

<div align="center">

**Built with ⚛️ quantum entropy, 🔒 homomorphic encryption, and 🌐 bridgeless MPC**

*Submitted to the [Solana Frontier Hackathon](https://solana.com)*

<br/>

*"The only truly private transaction is one that cannot be observed — even by the computer processing it."*

</div>
# Q-SCL
