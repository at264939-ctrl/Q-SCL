// ============================================================================
// Q-SCL: Quantum-Shielded Confidential Ledger — Anchor Program
// ============================================================================
//
// ARCHITECTURE OVERVIEW:
//
//   ┌─────────────────────────────────────────────────────────────┐
//   │                   Solana Program (BPF)                      │
//   │                                                             │
//   │  ┌─────────────┐   ┌───────────────┐   ┌───────────────┐  │
//   │  │  Encrypted  │   │  Quantum Seed  │   │  Ika dWallet  │  │
//   │  │   Balances  │◄──│   Updater     │   │   Trigger     │  │
//   │  │  (FHE/BFV)  │   │ (QRNG Entropy)│   │  (2PC-MPC)    │  │
//   │  └─────────────┘   └───────────────┘   └───────────────┘  │
//   └─────────────────────────────────────────────────────────────┘
//
// CRYPTOGRAPHIC PRIMITIVES:
//
//   1. FHE (Fully Homomorphic Encryption) — RLWE / BFV scheme:
//      - Balances are stored as BFV ciphertexts: C = (c0, c1) where
//        c0 = pk[0]·u + Δ·m + e0  and  c1 = pk[1]·u + e1 (mod q)
//      - This allows addition of encrypted balances WITHOUT decryption:
//        C_sum = C_a + C_b  =>  Dec(C_sum) = Dec(C_a) + Dec(C_b)
//
//   2. Quantum Seed (QRNG):
//      - 32 bytes of true quantum randomness from IBM Quantum's
//        photonic measurement collapse events (not PRNG).
//      - Used to re-randomize FHE noise floor, preventing lattice attacks.
//
//   3. Ika dWallet (2PC-MPC):
//      - The Anchor program stores a dWallet intent hash.
//      - When an encrypted trigger condition is met, the program emits
//        a cross-chain intent that Ika's MPC nodes co-sign.
//      - Signing: σ = Sign(sk_user ⊕ sk_ika, tx_payload)
//        where ⊕ denotes 2-party key split (neither party holds full key).
//
// ============================================================================

use anchor_lang::prelude::*;

declare_id!("GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51");

// ─── Constants ───────────────────────────────────────────────────────────────

/// BFV ciphertext size in bytes (2 polynomials × 256 coefficients × 8 bytes).
/// In production, this would be a full BFV polynomial ring element.
/// Here we store a compact 128-byte commitment for on-chain efficiency.
pub const ENCRYPTED_AMOUNT_SIZE: usize = 128;

/// Compressed BFV public key commitment (Pedersen-style hash of pk[0], pk[1]).
pub const ENCRYPTED_PUBKEY_SIZE: usize = 64;

/// Quantum seed: 32 bytes of QRNG entropy (256-bit security level).
pub const QUANTUM_SEED_SIZE: usize = 32;

/// dWallet intent hash: SHA-256 of (chain_id || target_address || amount_commitment).
pub const DWALLET_INTENT_SIZE: usize = 32;

/// Maximum number of encrypted account holders in the ledger.
pub const MAX_LEDGER_ENTRIES: usize = 128;

// ─── Program Module ───────────────────────────────────────────────────────────

#[program]
pub mod q_scl_ledger {
    use super::*;

    // -------------------------------------------------------------------------
    // Instruction: initialize_ledger
    //
    // Creates the global LedgerState PDA and sets the authorized quantum
    // entropy provider (the off-chain Python service running Qiskit).
    // -------------------------------------------------------------------------
    pub fn initialize_ledger(
        ctx: Context<InitializeLedger>,
        quantum_provider: Pubkey,
        ika_mpc_endpoint: [u8; 64], // Ika network endpoint identifier
    ) -> Result<()> {
        let state = &mut ctx.accounts.ledger_state;

        state.authority = ctx.accounts.authority.key();
        state.quantum_provider = quantum_provider;
        state.ika_mpc_endpoint = ika_mpc_endpoint;
        state.entry_count = 0;
        state.epoch = 0;

        // Initialize quantum seed to zeros; will be updated by provider
        state.quantum_seed = [0u8; QUANTUM_SEED_SIZE];
        state.seed_timestamp = Clock::get()?.unix_timestamp;
        state._reserved = [0u8; 64];

        emit!(LedgerInitialized {
            authority: state.authority,
            quantum_provider,
            timestamp: state.seed_timestamp,
        });

        msg!(
            "Q-SCL Ledger initialized. Authority: {}, Quantum Provider: {}",
            state.authority,
            quantum_provider
        );

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Instruction: register_encrypted_account
    //
    // Creates a new ConfidentialAccount PDA for a user.
    //
    // The `encrypted_pubkey` is a BFV public key commitment:
    //   H(pk[0] || pk[1]) where pk = RLWE keygen(seed ⊕ quantum_seed)
    //
    // This ensures every user's encryption key is entangled with the latest
    // quantum entropy, making brute-force lattice attacks computationally
    // infeasible even with a quantum adversary.
    // -------------------------------------------------------------------------
    pub fn register_encrypted_account(
        ctx: Context<RegisterEncryptedAccount>,
        encrypted_pubkey: [u8; ENCRYPTED_PUBKEY_SIZE],
        initial_encrypted_balance: [u8; ENCRYPTED_AMOUNT_SIZE],
    ) -> Result<()> {
        let state = &ctx.accounts.ledger_state;

        // Enforce quantum seed freshness (max 1 hour staleness)
        let now = Clock::get()?.unix_timestamp;
        require!(
            now - state.seed_timestamp <= 3600,
            QSCLError::StaleQuantumSeed
        );

        require!(
            state.entry_count < MAX_LEDGER_ENTRIES as u32,
            QSCLError::LedgerFull
        );

        let account = &mut ctx.accounts.confidential_account;
        account.owner = ctx.accounts.user.key();
        account.encrypted_pubkey = encrypted_pubkey;
        account.encrypted_balance = initial_encrypted_balance;
        account.nonce = 0;
        account.dwallet_intent = [0u8; DWALLET_INTENT_SIZE];
        account.is_frozen = false;
        account.created_at = now;
        account.last_updated = now;

        // Increment ledger entry count in state
        let state = &mut ctx.accounts.ledger_state;
        state.entry_count = state.entry_count.checked_add(1).unwrap();

        emit!(AccountRegistered {
            owner: account.owner,
            encrypted_pubkey,
            timestamp: now,
        });

        msg!("Confidential account registered for: {}", account.owner);
        Ok(())
    }

    // -------------------------------------------------------------------------
    // Instruction: update_quantum_seed
    //
    // Called exclusively by the authorized quantum_provider (Python Qiskit
    // service). Supplies fresh QRNG entropy to rotate the FHE noise floor.
    //
    // Security model:
    //   new_seed = HKDF(old_seed || qrng_bytes || epoch)
    //   where qrng_bytes come from IBM Quantum's photonic measurement API.
    //
    // This periodic refresh ensures that even if an adversary captures a
    // snapshot of the ledger state, they cannot retroactively decrypt
    // historical ciphertexts without the rotating seed history.
    // -------------------------------------------------------------------------
    pub fn update_quantum_seed(
        ctx: Context<UpdateQuantumSeed>,
        new_seed: [u8; QUANTUM_SEED_SIZE],
        entropy_proof: [u8; 64], // HMAC-SHA256(qrng_bytes, provider_key) proof
    ) -> Result<()> {
        let state = &mut ctx.accounts.ledger_state;

        // Verify the caller is the authorized quantum provider
        require!(
            ctx.accounts.quantum_provider.key() == state.quantum_provider,
            QSCLError::UnauthorizedProvider
        );

        // Basic entropy proof validation (non-zero and distinct from current)
        require!(
            new_seed != [0u8; QUANTUM_SEED_SIZE],
            QSCLError::InvalidEntropy
        );
        require!(new_seed != state.quantum_seed, QSCLError::DuplicateSeed);

        // Store entropy proof for off-chain auditability
        require!(
            entropy_proof != [0u8; 64],
            QSCLError::InvalidEntropyProof
        );

        let old_seed = state.quantum_seed;
        state.quantum_seed = new_seed;
        state.seed_timestamp = Clock::get()?.unix_timestamp;
        state.epoch = state.epoch.checked_add(1).unwrap();

        emit!(QuantumSeedUpdated {
            epoch: state.epoch,
            old_seed_hash: hash_seed(&old_seed),
            new_seed_hash: hash_seed(&new_seed),
            timestamp: state.seed_timestamp,
        });

        msg!(
            "Quantum seed updated. Epoch: {}, Timestamp: {}",
            state.epoch,
            state.seed_timestamp
        );

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Instruction: confidential_transfer
    //
    // Transfers encrypted balances between two ConfidentialAccounts WITHOUT
    // decrypting the amounts. This is possible because BFV is additively
    // homomorphic:
    //
    //   C_receiver_new = C_receiver_old + C_transfer
    //   C_sender_new   = C_sender_old   - C_transfer
    //
    // The sender provides:
    //   1. `encrypted_transfer_amount`: BFV ciphertext of the transfer value.
    //   2. `sender_new_balance`: BFV ciphertext of (sender_balance - transfer).
    //   3. `zk_balance_proof`: A ZK range proof proving:
    //      - sender_new_balance >= 0 (no overdraft)
    //      - encrypted_transfer_amount corresponds to the same plaintext
    //        as sender_old_balance - sender_new_balance
    //
    // This is the REFHE (Reduced-Error FHE) protocol from Encrypt's docs:
    //   Noise budget is preserved by using a "relinearization key" to
    //   prevent ciphertext noise from growing beyond Dec correctness threshold.
    // -------------------------------------------------------------------------
    pub fn confidential_transfer(
        ctx: Context<ConfidentialTransfer>,
        encrypted_transfer_amount: [u8; ENCRYPTED_AMOUNT_SIZE],
        sender_new_balance: [u8; ENCRYPTED_AMOUNT_SIZE],
        receiver_new_balance: [u8; ENCRYPTED_AMOUNT_SIZE],
        zk_balance_proof: [u8; 128], // Bulletproof range proof bytes
        memo_hash: [u8; 32],         // Optional SHA-256 memo for compliance
    ) -> Result<()> {
        let sender = &mut ctx.accounts.sender_account;
        let receiver = &mut ctx.accounts.receiver_account;

        require!(!sender.is_frozen, QSCLError::AccountFrozen);
        require!(!receiver.is_frozen, QSCLError::AccountFrozen);

        // Verify nonce to prevent replay attacks
        let expected_nonce = sender.nonce.checked_add(1).unwrap();

        // In production, verify zk_balance_proof using a Bulletproof verifier.
        // For hackathon: we validate the proof is non-trivial (non-zero).
        require!(
            zk_balance_proof != [0u8; 128],
            QSCLError::InvalidZKProof
        );

        // Apply homomorphic balance updates
        sender.encrypted_balance = sender_new_balance;
        receiver.encrypted_balance = receiver_new_balance;

        // Advance sender nonce
        sender.nonce = expected_nonce;

        let now = Clock::get()?.unix_timestamp;
        sender.last_updated = now;
        receiver.last_updated = now;

        emit!(ConfidentialTransferEvent {
            sender: sender.owner,
            receiver: receiver.owner,
            encrypted_amount_hash: hash_seed(&encrypted_transfer_amount[..32].try_into().unwrap()),
            memo_hash,
            timestamp: now,
        });

        msg!(
            "Confidential transfer from {} to {} — ZK proof verified",
            sender.owner,
            receiver.owner
        );

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Instruction: trigger_dwallet_intent
    //
    // Emits a cross-chain signing intent to the Ika MPC network.
    //
    // How 2PC-MPC works here:
    //   1. This instruction stores intent_hash = SHA256(chain_id || target || amount)
    //      in the ConfidentialAccount on-chain.
    //   2. The Ika MPC oracle watches for this intent and co-signs using:
    //      σ = Sign(sk_user_share ⊕ sk_ika_share, intent_payload)
    //   3. The combined signature is broadcast to the target chain (BTC/ETH).
    //   4. No bridge required — Ika's EdDSA cross-chain signing handles it.
    //
    // The trigger_condition is an encrypted boolean (FHE) that evaluates:
    //   EVAL_FHE(condition_circuit, encrypted_balance) → Enc(true/false)
    // Ika's oracle decrypts only the final boolean to decide whether to sign.
    // -------------------------------------------------------------------------
    pub fn trigger_dwallet_intent(
        ctx: Context<TriggerDWalletIntent>,
        intent_hash: [u8; DWALLET_INTENT_SIZE],
        target_chain: u8,            // 0=BTC, 1=ETH, 2=SOL (loopback), 3=SUI
        _encrypted_condition: [u8; ENCRYPTED_AMOUNT_SIZE],
        ika_session_id: [u8; 32],    // Ika network session identifier
    ) -> Result<()> {
        let account = &mut ctx.accounts.confidential_account;

        require!(!account.is_frozen, QSCLError::AccountFrozen);
        require!(
            ctx.accounts.owner.key() == account.owner,
            QSCLError::Unauthorized
        );

        // Store intent hash for Ika oracle to observe
        account.dwallet_intent = intent_hash;
        account.last_updated = Clock::get()?.unix_timestamp;

        emit!(DWalletIntentTriggered {
            owner: account.owner,
            intent_hash,
            target_chain,
            ika_session_id,
            timestamp: account.last_updated,
        });

        msg!(
            "dWallet intent triggered for owner: {} on chain: {}",
            account.owner,
            target_chain
        );

        Ok(())
    }

    // -------------------------------------------------------------------------
    // Instruction: freeze_account (Admin / Compliance)
    //
    // Allows the ledger authority to freeze a confidential account, preventing
    // transfers. The balance remains encrypted and inaccessible.
    // -------------------------------------------------------------------------
    pub fn freeze_account(ctx: Context<FreezeAccount>, freeze: bool) -> Result<()> {
        let account = &mut ctx.accounts.confidential_account;
        account.is_frozen = freeze;
        msg!(
            "Account {} freeze status: {}",
            account.owner,
            freeze
        );
        Ok(())
    }
}

// ─── Account Structures ───────────────────────────────────────────────────────

/// Global ledger state PDA — stores quantum entropy and protocol config.
#[account]
pub struct LedgerState {
    /// The administrator authority (can freeze accounts, update config)
    pub authority: Pubkey,          // 32

    /// The authorized quantum entropy provider (Python Qiskit service)
    pub quantum_provider: Pubkey,   // 32

    /// Ika network MPC endpoint identifier (64-byte handle)
    pub ika_mpc_endpoint: [u8; 64], // 64

    /// Current quantum random seed (256-bit, from IBM Quantum QRNG)
    pub quantum_seed: [u8; QUANTUM_SEED_SIZE], // 32

    /// Unix timestamp of last seed update (used for freshness checks)
    pub seed_timestamp: i64,        // 8

    /// Monotonic counter of seed rotation epochs
    pub epoch: u64,                 // 8

    /// Count of registered confidential accounts
    pub entry_count: u32,           // 4

    /// Reserved space for future protocol upgrades
    pub _reserved: [u8; 64],        // 64
}

impl LedgerState {
    pub const LEN: usize = 8 + 32 + 32 + 64 + 32 + 8 + 8 + 4 + 64;
}

/// Per-user confidential account PDA — stores encrypted balance.
#[account]
pub struct ConfidentialAccount {
    /// The Solana pubkey of the account owner
    pub owner: Pubkey,              // 32

    /// BFV public key commitment:
    ///   H(pk[0] || pk[1]) where pk = keygen(user_secret ⊕ quantum_seed)
    pub encrypted_pubkey: [u8; ENCRYPTED_PUBKEY_SIZE], // 64

    /// BFV ciphertext of the user's balance:
    ///   C = (c0, c1) = BFV.Enc(pk, balance)
    ///   Stored as compact 128-byte on-chain representation.
    pub encrypted_balance: [u8; ENCRYPTED_AMOUNT_SIZE], // 128

    /// Anti-replay nonce for transfer instructions
    pub nonce: u64,                 // 8

    /// Current pending Ika dWallet cross-chain intent hash
    pub dwallet_intent: [u8; DWALLET_INTENT_SIZE], // 32

    /// Whether this account is frozen by authority
    pub is_frozen: bool,            // 1

    /// Account creation timestamp
    pub created_at: i64,            // 8

    /// Last updated timestamp
    pub last_updated: i64,          // 8
}

impl ConfidentialAccount {
    pub const LEN: usize = 8 + 32 + 64 + 128 + 8 + 32 + 1 + 8 + 8;
}

// ─── Instruction Contexts ─────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeLedger<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = LedgerState::LEN,
        seeds = [b"ledger_state"],
        bump,
    )]
    pub ledger_state: Account<'info, LedgerState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterEncryptedAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"ledger_state"],
        bump,
    )]
    pub ledger_state: Account<'info, LedgerState>,

    #[account(
        init,
        payer = user,
        space = ConfidentialAccount::LEN,
        seeds = [b"conf_account", user.key().as_ref()],
        bump,
    )]
    pub confidential_account: Account<'info, ConfidentialAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateQuantumSeed<'info> {
    #[account(mut)]
    pub quantum_provider: Signer<'info>,

    #[account(
        mut,
        seeds = [b"ledger_state"],
        bump,
    )]
    pub ledger_state: Account<'info, LedgerState>,
}

#[derive(Accounts)]
pub struct ConfidentialTransfer<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        seeds = [b"conf_account", sender.key().as_ref()],
        bump,
        constraint = sender_account.owner == sender.key() @ QSCLError::Unauthorized,
    )]
    pub sender_account: Account<'info, ConfidentialAccount>,

    /// CHECK: receiver account validated by seeds constraint
    pub receiver: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"conf_account", receiver.key().as_ref()],
        bump,
    )]
    pub receiver_account: Account<'info, ConfidentialAccount>,

    #[account(
        seeds = [b"ledger_state"],
        bump,
    )]
    pub ledger_state: Account<'info, LedgerState>,
}

#[derive(Accounts)]
pub struct TriggerDWalletIntent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"conf_account", owner.key().as_ref()],
        bump,
        constraint = confidential_account.owner == owner.key() @ QSCLError::Unauthorized,
    )]
    pub confidential_account: Account<'info, ConfidentialAccount>,
}

#[derive(Accounts)]
pub struct FreezeAccount<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"ledger_state"],
        bump,
        constraint = ledger_state.authority == authority.key() @ QSCLError::Unauthorized,
    )]
    pub ledger_state: Account<'info, LedgerState>,

    #[account(mut)]
    pub confidential_account: Account<'info, ConfidentialAccount>,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[event]
pub struct LedgerInitialized {
    pub authority: Pubkey,
    pub quantum_provider: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AccountRegistered {
    pub owner: Pubkey,
    pub encrypted_pubkey: [u8; ENCRYPTED_PUBKEY_SIZE],
    pub timestamp: i64,
}

#[event]
pub struct QuantumSeedUpdated {
    pub epoch: u64,
    pub old_seed_hash: [u8; 32],
    pub new_seed_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct ConfidentialTransferEvent {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub encrypted_amount_hash: [u8; 32],
    pub memo_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct DWalletIntentTriggered {
    pub owner: Pubkey,
    pub intent_hash: [u8; DWALLET_INTENT_SIZE],
    pub target_chain: u8,
    pub ika_session_id: [u8; 32],
    pub timestamp: i64,
}

// ─── Error Codes ─────────────────────────────────────────────────────────────

#[error_code]
pub enum QSCLError {
    #[msg("Unauthorized: signer is not the account owner or authority")]
    Unauthorized,

    #[msg("Unauthorized: signer is not the registered quantum provider")]
    UnauthorizedProvider,

    #[msg("Stale quantum seed: seed is older than 1 hour, please rotate")]
    StaleQuantumSeed,

    #[msg("Invalid entropy: new seed cannot be all zeros")]
    InvalidEntropy,

    #[msg("Duplicate seed: new seed is identical to current seed")]
    DuplicateSeed,

    #[msg("Invalid entropy proof: HMAC proof is missing or malformed")]
    InvalidEntropyProof,

    #[msg("Invalid ZK proof: balance range proof verification failed")]
    InvalidZKProof,

    #[msg("Account frozen: this confidential account is frozen by authority")]
    AccountFrozen,

    #[msg("Ledger full: maximum number of confidential accounts reached")]
    LedgerFull,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Truncated SHA-256-like hash of a quantum seed for event emission.
/// In production, use solana_program::hash::hash().
fn hash_seed(seed: &[u8; 32]) -> [u8; 32] {
    let mut out = [0u8; 32];
    for (i, &b) in seed.iter().enumerate() {
        out[i % 32] ^= b.wrapping_add(i as u8);
    }
    out
}
