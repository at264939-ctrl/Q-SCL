/**
 * Q-SCL Program Client
 * =====================
 * Provides the Anchor IDL, type definitions, and helper functions to
 * interact with the Q-SCL Anchor program on Solana Devnet.
 */

import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, web3, BN, IdlAccounts } from "@coral-xyz/anchor";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  "GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51"
);

export const SOLANA_NETWORK = "https://api.devnet.solana.com";
export const SOLANA_WS = "wss://api.devnet.solana.com/";

import IDL_JSON from "./q_scl_ledger.json";
export const IDL = IDL_JSON;

// ─── PDA Helpers ─────────────────────────────────────────────────────────────

export function getLedgerStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ledger_state")],
    PROGRAM_ID
  );
}

export function getConfidentialAccountPDA(
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("conf_account"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// ─── Utility: Encode encrypted bytes ─────────────────────────────────────────

/**
 * Generates a mock BFV ciphertext for demo purposes.
 * In production, this runs the actual BFV encryption circuit:
 *   C = (c0, c1) = (pk[0]·u + Δ·m + e0, pk[1]·u + e1) mod q
 */
export function mockEncryptAmount(amount: number): Uint8Array {
  const ct = new Uint8Array(128).fill(0);
  // Embed the amount in the first 8 bytes (little-endian) as a demo
  const view = new DataView(ct.buffer);
  view.setUint32(0, amount, true);
  // Fill rest with pseudo-random noise (simulating LWE noise e0, e1)
  for (let i = 8; i < 128; i++) {
    ct[i] = Math.floor(Math.random() * 256);
  }
  return ct;
}

export function mockEncryptedPubkey(userPubkey: PublicKey): Uint8Array {
  // H(pk[0] || pk[1]) — here we use the user's Solana pubkey as a demo
  const pk = new Uint8Array(64).fill(0);
  const pkBytes = userPubkey.toBuffer();
  pk.set(pkBytes, 0);   // First 32 bytes: copy pubkey
  pk.set(pkBytes, 32);  // Last 32 bytes: copy again (mock commitment)
  return pk;
}

export function mockZKProof(): Uint8Array {
  // In production: Bulletproof range proof (compressed 64-byte)
  // Here: 128 non-zero bytes signaling "proof present"
  const proof = new Uint8Array(128);
  crypto.getRandomValues(proof);
  return proof;
}
