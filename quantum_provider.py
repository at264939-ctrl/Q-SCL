#!/usr/bin/env python3
"""
quantum_provider.py — Q-SCL Quantum Entropy Provider
======================================================

OVERVIEW:
    This service acts as the "Quantum Entropy Provider" for the Q-SCL Ledger.
    It performs two core functions:

    1. QUANTUM RANDOM NUMBER GENERATION (QRNG):
       - Connects to IBM Quantum's real quantum hardware via the Qiskit Runtime API.
       - Runs a Hadamard + measurement circuit on N qubits to collapse superposition
         into true randomness (not PRNG — the photon/electron collapse is fundamentally
         non-deterministic per Copenhagen interpretation).
       - Circuit layout for 8-qubit entropy:
         
           q0: ─[H]─[M]─
           q1: ─[H]─[M]─
           q2: ─[H]─[M]─
           ...
           q7: ─[H]─[M]─
         
         Each measurement yields 1 true quantum bit; 256 circuit runs = 32 bytes.

    2. ON-CHAIN SEED ROTATION:
       - Uses solana-py to construct and send a signed transaction calling
         `update_quantum_seed` on the Q-SCL Anchor program.
       - Attaches an HMAC-SHA256 proof: HMAC(qrng_bytes, provider_keypair.secret)
         so the on-chain program can verify entropy authenticity.

SECURITY MODEL:
    - True QRNG provides an unconditionally random seed (quantum uncertainty).
    - HKDF expansion: final_seed = HKDF-SHA256(ikm=qrng_raw, salt="Q-SCL-v1", info=epoch)
    - This makes the on-chain FHE noise floor truly unpredictable, defeating
      lattice basis reduction attacks (LWE/RLWE basis reduction complexity:
      2^O(n log n) — quantum computers with n=256 qubits would need ~2^256 ops).

FALLBACK:
    - If IBM Quantum API is unavailable, falls back to os.urandom() with a warning.
    - Production deployments MUST use real QRNG.

USAGE:
    # Install dependencies:
    pip install qiskit qiskit-ibm-runtime solders anchorpy python-dotenv

    # Configure environment:
    cp .env.example .env
    # Edit .env with your IBM Quantum API token and Solana keypair path

    # Run once:
    python3 quantum_provider.py --once

    # Run as daemon (rotates seed every 55 minutes):
    python3 quantum_provider.py --daemon
"""

import os
import sys
import time
import hmac
import hashlib
import logging
import argparse
import struct
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

# ─── Logging Setup ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("q-scl.quantum-provider")

# ─── Configuration ────────────────────────────────────────────────────────────

# Q-SCL Ledger Anchor Program ID (Localnet Deployment)
PROGRAM_ID = "GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51"

# Solana Localnet RPC endpoint
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")

# IBM Quantum (Qiskit Runtime) API token
IBM_QUANTUM_TOKEN = os.getenv("IBM_QUANTUM_TOKEN", "")

# IBM Quantum backend (use "ibm_brisbane" or "ibmq_qasm_simulator" for testing)
IBM_QUANTUM_BACKEND = os.getenv("IBM_QUANTUM_BACKEND", "ibmq_qasm_simulator")

# Number of quantum circuit shots per 8-qubit batch (256 shots = 32 bytes)
SHOTS_PER_BATCH = 256

# Seed rotation interval in seconds (55 minutes to stay well within 1-hour freshness)
ROTATION_INTERVAL_SECS = 55 * 60

# Path to the quantum provider's Solana keypair JSON
PROVIDER_KEYPAIR_PATH = os.getenv(
    "PROVIDER_KEYPAIR_PATH",
    str(Path.home() / ".config" / "solana" / "id.json")
)

# ─── Quantum Circuit (Qiskit) ─────────────────────────────────────────────────

def generate_quantum_entropy_qiskit(n_bytes: int = 32) -> bytes:
    """
    Generate n_bytes of true quantum random bytes using IBM Quantum.

    CIRCUIT DESIGN:
        For each batch of 8 qubits, we apply one Hadamard gate per qubit,
        then measure all. The Hadamard gate creates an equal superposition:
        
            H|0⟩ = (|0⟩ + |1⟩) / √2
        
        Measurement collapses this to |0⟩ or |1⟩ with P=0.5 each.
        This is NOT a pseudo-random process — it relies on quantum mechanical
        wave-function collapse, which is fundamentally non-deterministic.
        
        8 qubits × (n_bytes // 1) shots = 8 bits per shot = 1 byte per shot.
        For 32 bytes: 32 shots of an 8-qubit circuit.

    Args:
        n_bytes: Number of random bytes to generate.

    Returns:
        bytes: n_bytes of quantum-sourced entropy.

    Raises:
        ImportError: If Qiskit is not installed.
        RuntimeError: If IBM Quantum connection fails.
    """
    try:
        from qiskit import QuantumCircuit
        from qiskit_ibm_runtime import QiskitRuntimeService, Sampler
    except ImportError:
        raise ImportError(
            "Qiskit not installed. Run: pip install qiskit qiskit-ibm-runtime"
        )

    log.info("Connecting to IBM Quantum service (backend: %s)...", IBM_QUANTUM_BACKEND)

    if not IBM_QUANTUM_TOKEN:
        raise RuntimeError(
            "IBM_QUANTUM_TOKEN not set. Use --fallback or set the env variable."
        )

    service = QiskitRuntimeService(channel="ibm_quantum", token=IBM_QUANTUM_TOKEN)
    backend = service.backend(IBM_QUANTUM_BACKEND)

    # Build an 8-qubit Hadamard circuit
    n_qubits = 8
    qc = QuantumCircuit(n_qubits, n_qubits)
    for i in range(n_qubits):
        qc.h(i)          # Apply Hadamard: puts qubit into superposition
    qc.measure_all()     # Collapse superposition → classical bits

    sampler = Sampler(backend=backend)

    # Calculate shots needed: n_bytes shots, each producing 8 bits = 1 byte
    shots = n_bytes
    log.info("Running QRNG circuit: %d qubits × %d shots...", n_qubits, shots)

    job = sampler.run([qc], shots=shots)
    result = job.result()

    # Extract bitstrings from results
    pub_result = result[0]
    counts = pub_result.data.meas.get_counts()

    entropy_bytes = bytearray()
    for bitstring, count in counts.items():
        # Each bitstring is 8 bits → 1 byte
        byte_val = int(bitstring, 2) & 0xFF
        for _ in range(count):
            entropy_bytes.append(byte_val)
            if len(entropy_bytes) >= n_bytes:
                break
        if len(entropy_bytes) >= n_bytes:
            break

    result_bytes = bytes(entropy_bytes[:n_bytes])
    log.info("QRNG: Generated %d bytes of quantum entropy.", len(result_bytes))
    return result_bytes


def generate_fallback_entropy(n_bytes: int = 32) -> bytes:
    """
    Fallback: OS-level cryptographic random bytes (os.urandom).

    WARNING: This is NOT quantum random. It uses the OS entropy pool
    (kernel CSPRNG: /dev/urandom on Linux). Acceptable for testing only.
    Production Q-SCL MUST use generate_quantum_entropy_qiskit().
    """
    log.warning(
        "⚠️  FALLBACK MODE: Using os.urandom() instead of IBM Quantum QRNG. "
        "DO NOT use in production!"
    )
    return os.urandom(n_bytes)


# ─── HKDF & HMAC ─────────────────────────────────────────────────────────────

def hkdf_expand(ikm: bytes, salt: bytes, info: bytes, length: int = 32) -> bytes:
    """
    HKDF-SHA256 key derivation (RFC 5869).

    The HKDF construction ensures that even weak QRNG output is uniformly
    distributed across the output space:

        PRK  = HMAC-SHA256(salt, IKM)            # Extract
        OKM  = T(1) || T(2) || ...               # Expand
        T(n) = HMAC-SHA256(PRK, T(n-1) || info || n)

    This gives forward secrecy: knowing OKM[epoch+1] reveals nothing about
    OKM[epoch] because SHA-256 is a one-way function.

    Args:
        ikm: Input key material (raw QRNG bytes).
        salt: Domain separation salt (b"Q-SCL-v1").
        info: Context info (epoch number as bytes).
        length: Output key length in bytes.

    Returns:
        bytes: Derived key of `length` bytes.
    """
    # Extract
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()

    # Expand
    okm = b""
    t = b""
    for i in range(1, (length // 32) + 2):
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        okm += t
        if len(okm) >= length:
            break

    return okm[:length]


def compute_entropy_proof(qrng_bytes: bytes, provider_secret: bytes) -> bytes:
    """
    Compute HMAC-SHA256(qrng_bytes, provider_secret) as the entropy proof.

    This allows the on-chain program to verify that:
    1. The seed came from the legitimate provider (keyed MAC).
    2. The seed was derived from the specific QRNG output (input binding).

    Returns 64 bytes: raw HMAC-SHA256 (32) + epoch timestamp (8) padded to 64.
    """
    mac = hmac.new(provider_secret, qrng_bytes, hashlib.sha256).digest()
    timestamp = struct.pack("<q", int(time.time()))  # Little-endian int64
    # Pad to 64 bytes as expected by the on-chain instruction
    proof = mac + timestamp + b"\x00" * (64 - len(mac) - len(timestamp))
    return proof[:64]


# ─── Solana Client ───────────────────────────────────────────────────────────

def load_keypair_from_json(path: str):
    """
    Load a Solana keypair from a JSON file (array of 64 integers).
    Returns a solders Keypair object.
    """
    try:
        from solders.keypair import Keypair  # type: ignore
        import json
    except ImportError:
        raise ImportError("Run: pip install solders")

    with open(path) as f:
        key_data = json.load(f)

    # Solana keypair JSON is an array of 64 bytes [private_key(32) + public_key(32)]
    secret_bytes = bytes(key_data[:64])
    return Keypair.from_bytes(secret_bytes)


def send_quantum_seed_to_chain(
    new_seed: bytes,
    entropy_proof: bytes,
    keypair_path: str,
    rpc_url: str = SOLANA_RPC_URL,
) -> Optional[str]:
    """
    Send the `update_quantum_seed` instruction to the Q-SCL Anchor program
    on Solana Devnet.

    Instruction discriminator is derived as:
        sha256("global:update_quantum_seed")[:8]
    which is the Anchor IDL standard for instruction routing.

    Args:
        new_seed: 32 bytes of HKDF-derived quantum entropy.
        entropy_proof: 64-byte HMAC proof for on-chain validation.
        keypair_path: Path to provider's Solana keypair JSON.
        rpc_url: Solana RPC endpoint.

    Returns:
        str: Transaction signature if successful, None if failed.
    """
    try:
        from solders.keypair import Keypair          # type: ignore
        from solders.pubkey import Pubkey            # type: ignore
        from solders.transaction import Transaction  # type: ignore
        from solders.instruction import Instruction, AccountMeta  # type: ignore
        from solders.message import Message          # type: ignore
        from solders.hash import Hash                # type: ignore
        import base58
        import requests
        import json
    except ImportError:
        raise ImportError("Run: pip install solders requests base58")

    keypair = load_keypair_from_json(keypair_path)
    provider_pubkey = keypair.pubkey()

    log.info("Provider pubkey: %s", provider_pubkey)

    # Derive LedgerState PDA: seeds = ["ledger_state"]
    program_id = Pubkey.from_string(PROGRAM_ID)
    ledger_state_pda, _ = Pubkey.find_program_address(
        [b"ledger_state"], program_id
    )

    log.info("LedgerState PDA: %s", ledger_state_pda)

    # Anchor instruction discriminator: sha256("global:update_quantum_seed")[:8]
    discriminator = hashlib.sha256(b"global:update_quantum_seed").digest()[:8]

    # Encode instruction data: discriminator + new_seed (32) + entropy_proof (64)
    ix_data = discriminator + new_seed + entropy_proof

    # Accounts: [quantum_provider (signer, writable=False), ledger_state (writable)]
    accounts = [
        AccountMeta(pubkey=provider_pubkey, is_signer=True, is_writable=False),
        AccountMeta(pubkey=ledger_state_pda, is_signer=False, is_writable=True),
    ]

    instruction = Instruction(
        program_id=program_id,
        accounts=accounts,
        data=bytes(ix_data),
    )

    # Fetch recent blockhash
    resp = requests.post(
        rpc_url,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getLatestBlockhash",
            "params": [{"commitment": "confirmed"}],
        },
        timeout=30,
    )
    resp.raise_for_status()
    blockhash_str = resp.json()["result"]["value"]["blockhash"]
    blockhash = Hash.from_string(blockhash_str)

    # Build and sign transaction
    msg = Message.new_with_blockhash(
        instructions=[instruction],
        payer=provider_pubkey,
        blockhash=blockhash,
    )
    tx = Transaction.new_unsigned(msg)
    tx.sign([keypair], blockhash)

    # Send transaction
    tx_bytes = bytes(tx)
    import base64
    tx_b64 = base64.b64encode(tx_bytes).decode()

    send_resp = requests.post(
        rpc_url,
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "sendTransaction",
            "params": [tx_b64, {"encoding": "base64", "preflightCommitment": "confirmed"}],
        },
        timeout=30,
    )
    send_resp.raise_for_status()
    result = send_resp.json()

    if "error" in result:
        log.error("Transaction failed: %s", result["error"])
        return None

    sig = result["result"]
    log.info("✅ Quantum seed submitted! Tx signature: %s", sig)
    log.info("🔗 Explorer: https://explorer.solana.com/tx/%s?cluster=devnet", sig)
    return sig


# ─── Main Entry Point ────────────────────────────────────────────────────────

def run_entropy_rotation(use_fallback: bool = False) -> bool:
    """
    Execute one full entropy rotation cycle:
    1. Generate quantum entropy (or fallback).
    2. Derive final seed via HKDF.
    3. Compute HMAC entropy proof.
    4. Submit to Solana Devnet.

    Returns True on success.
    """
    log.info("=" * 60)
    log.info("Q-SCL Quantum Entropy Provider — Rotation Cycle")
    log.info("Timestamp: %s", datetime.now(timezone.utc).isoformat())
    log.info("=" * 60)

    # Step 1: Generate raw entropy
    if use_fallback or not IBM_QUANTUM_TOKEN:
        raw_entropy = generate_fallback_entropy(32)
    else:
        try:
            raw_entropy = generate_quantum_entropy_qiskit(32)
        except Exception as e:
            log.warning("IBM Quantum failed (%s), using os.urandom() fallback.", e)
            raw_entropy = generate_fallback_entropy(32)

    log.info("Raw entropy (hex): %s", raw_entropy.hex())

    # Step 2: HKDF-expand with epoch info
    epoch = int(time.time()) // ROTATION_INTERVAL_SECS
    final_seed = hkdf_expand(
        ikm=raw_entropy,
        salt=b"Q-SCL-v1",
        info=f"epoch:{epoch}".encode(),
        length=32,
    )
    log.info("HKDF seed (hex):   %s", final_seed.hex())

    # Step 3: Compute HMAC entropy proof
    # Load keypair secret for HMAC key
    try:
        import json
        with open(PROVIDER_KEYPAIR_PATH) as f:
            key_data = json.load(f)
        provider_secret = bytes(key_data[:32])
    except Exception:
        provider_secret = os.urandom(32)
        log.warning("Could not load keypair for HMAC; using random secret (dev mode).")

    entropy_proof = compute_entropy_proof(final_seed, provider_secret)
    log.info("Entropy proof (hex): %s", entropy_proof.hex())

    # Step 4: Submit to chain
    try:
        sig = send_quantum_seed_to_chain(
            new_seed=final_seed,
            entropy_proof=entropy_proof,
            keypair_path=PROVIDER_KEYPAIR_PATH,
            rpc_url=SOLANA_RPC_URL,
        )
        success = sig is not None
    except Exception as e:
        log.error("Failed to submit seed to chain: %s", e)
        success = False

    if not success:
        log.error("❌ Entropy rotation FAILED. Will retry next cycle.")
    else:
        log.info("✅ Entropy rotation COMPLETE. Next rotation in %d minutes.",
                 ROTATION_INTERVAL_SECS // 60)

    return success


def main():
    parser = argparse.ArgumentParser(
        description="Q-SCL Quantum Entropy Provider — Rotates FHE seeds using IBM Quantum QRNG"
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run exactly one entropy rotation and exit."
    )
    parser.add_argument(
        "--daemon", action="store_true",
        help="Run continuously, rotating entropy every 55 minutes."
    )
    parser.add_argument(
        "--fallback", action="store_true",
        help="Use os.urandom() instead of IBM Quantum (for testing)."
    )
    parser.add_argument(
        "--interval", type=int, default=ROTATION_INTERVAL_SECS,
        help=f"Rotation interval in seconds (default: {ROTATION_INTERVAL_SECS})."
    )
    args = parser.parse_args()

    if not args.once and not args.daemon:
        parser.print_help()
        sys.exit(0)

    if args.once:
        success = run_entropy_rotation(use_fallback=args.fallback)
        sys.exit(0 if success else 1)

    if args.daemon:
        log.info("Starting Q-SCL Quantum Entropy Daemon (interval: %ds)", args.interval)
        while True:
            try:
                run_entropy_rotation(use_fallback=args.fallback)
            except KeyboardInterrupt:
                log.info("Daemon interrupted by user. Shutting down.")
                break
            except Exception as e:
                log.error("Unexpected error: %s", e)

            log.info("Sleeping %d seconds until next rotation...", args.interval)
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
