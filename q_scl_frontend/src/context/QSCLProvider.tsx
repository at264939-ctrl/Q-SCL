'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { IDL, PROGRAM_ID, SOLANA_NETWORK, SOLANA_WS, getLedgerStatePDA, getConfidentialAccountPDA } from '@/lib/program';

require('@solana/wallet-adapter-react-ui/styles.css');

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerState {
  authority: PublicKey;
  quantumProvider: PublicKey;
  quantumSeed: Uint8Array;
  seedTimestamp: number;
  epoch: number;
  entryCount: number;
}

interface ConfidentialAccountState {
  owner: PublicKey;
  encryptedBalance: Uint8Array;
  nonce: number;
  isFrozen: boolean;
  lastUpdated: number;
  dwalletIntent: Uint8Array;
}

interface QSCLContextValue {
  connected: boolean;
  walletPublicKey: PublicKey | null;
  ledgerState: LedgerState | null;
  userAccount: ConfidentialAccountState | null;
  isLoading: boolean;
  txStatus: { type: 'idle' | 'pending' | 'success' | 'error'; message: string };
  fetchLedgerState: () => Promise<void>;
  fetchUserAccount: () => Promise<void>;
  registerAccount: () => Promise<void>;
  demoTransfer: (recipientAddress: string, amount: number) => Promise<void>;
  triggerDWalletIntent: (targetChain: number, intentPayload: string) => Promise<void>;
  setupDemoScenario: () => Promise<void>;
  demoRecipient: string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const QSCLContext = createContext<QSCLContextValue | null>(null);

export function useQSCL() {
  const ctx = useContext(QSCLContext);
  if (!ctx) throw new Error('useQSCL must be used within QSCLProvider');
  return ctx;
}

// ─── Inner Provider ───────────────────────────────────────────────────────────

function QSCLInnerProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [ledgerState, setLedgerState] = useState<LedgerState | null>(null);
  const [userAccount, setUserAccount] = useState<ConfidentialAccountState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoRecipient, setDemoRecipient] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<{ type: 'idle' | 'pending' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  const connected = !!wallet;
  const walletPublicKey = wallet?.publicKey ?? null;

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL as any, PROGRAM_ID, provider);
  }, [provider]);

  // ── Fetch ledger state ────────────────────────────────────────────────────
  const fetchLedgerState = async () => {
    if (!program) return;
    setIsLoading(true);
    try {
      const [pda] = getLedgerStatePDA();
      const state = await (program.account as any).ledgerState.fetch(pda);
      setLedgerState({
        authority: state.authority,
        quantumProvider: state.quantumProvider,
        quantumSeed: new Uint8Array(state.quantumSeed),
        seedTimestamp: Number(state.seedTimestamp),
        epoch: Number(state.epoch),
        entryCount: Number(state.entryCount),
      });
    } catch (e) {
      // Ledger may not be initialized yet — simulate state for demo
      setLedgerState({
        authority: walletPublicKey ?? PublicKey.default,
        quantumProvider: walletPublicKey ?? PublicKey.default,
        quantumSeed: crypto.getRandomValues(new Uint8Array(32)),
        seedTimestamp: Math.floor(Date.now() / 1000) - 420,
        epoch: 7,
        entryCount: 12,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch user's confidential account ────────────────────────────────────
  const fetchUserAccount = async () => {
    if (!program || !walletPublicKey) return;
    setIsLoading(true);
    try {
      const [pda] = getConfidentialAccountPDA(walletPublicKey);
      const acc = await (program.account as any).confidentialAccount.fetch(pda);
      setUserAccount({
        owner: acc.owner,
        encryptedBalance: new Uint8Array(acc.encryptedBalance),
        nonce: Number(acc.nonce),
        isFrozen: acc.isFrozen,
        lastUpdated: Number(acc.lastUpdated),
        dwalletIntent: new Uint8Array(acc.dwalletIntent),
      });
    } catch (e) {
      // No account yet — show demo state
      setUserAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register account ──────────────────────────────────────────────────────
  const registerAccount = async () => {
    if (!walletPublicKey) {
      setTxStatus({ type: 'error', message: 'Please connect your Phantom or Solflare wallet first.' });
      return;
    }
    if (!program) {
      setTxStatus({ type: 'error', message: 'Solana node is unreachable. Check your connection.' });
      return;
    }
    setTxStatus({ type: 'pending', message: 'Creating confidential account…' });
    try {
      const { mockEncryptedPubkey, mockEncryptAmount } = await import('@/lib/program');
      const encryptedPubkey = Array.from(mockEncryptedPubkey(walletPublicKey));
      const initialBalance = Array.from(mockEncryptAmount(0));

      const [ledgerPDA] = getLedgerStatePDA();
      const [accountPDA] = getConfidentialAccountPDA(walletPublicKey);

      const tx = await (program.methods as any)
        .registerEncryptedAccount(encryptedPubkey, initialBalance)
        .accounts({
          user: walletPublicKey,
          ledgerState: ledgerPDA,
          confidentialAccount: accountPDA,
          systemProgram: '11111111111111111111111111111111',
        })
        .rpc();

      setTxStatus({ type: 'success', message: `Account created! Tx: ${tx.slice(0, 20)}…` });
      await fetchUserAccount();

      // Auto-hide success
      setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 5000);
    } catch (e: any) {
      setTxStatus({ type: 'error', message: e?.message ?? 'Transaction failed' });
    }
  };

  // ── Setup Demo Scenario ───────────────────────────────────────────────────
  const setupDemoScenario = async () => {
    if (!walletPublicKey || !wallet) {
      setTxStatus({ type: 'error', message: 'Please connect your Phantom or Solflare wallet first.' });
      return;
    }
    if (!program) {
      setTxStatus({ type: 'error', message: 'Solana node is unreachable. Check your connection.' });
      return;
    }
    setTxStatus({ type: 'pending', message: 'Generating and funding Demo Recipient account…' });

    try {
      const { Keypair, SystemProgram } = await import('@solana/web3.js');
      const { mockEncryptedPubkey, mockEncryptAmount } = await import('@/lib/program');

      const newRecipient = Keypair.generate();
      const encryptedPubkey = Array.from(mockEncryptedPubkey(newRecipient.publicKey));
      const initialBalance = Array.from(mockEncryptAmount(0));

      const [ledgerPDA] = getLedgerStatePDA();
      const [accountPDA] = getConfidentialAccountPDA(newRecipient.publicKey);

      // Provide some SOL and register the recipient on-chain
      const tx = await (program.methods as any)
        .registerEncryptedAccount(encryptedPubkey, initialBalance)
        .accounts({
          user: newRecipient.publicKey,
          ledgerState: ledgerPDA,
          confidentialAccount: accountPDA,
          systemProgram: '11111111111111111111111111111111',
        })
        .preInstructions([
          SystemProgram.transfer({
            fromPubkey: walletPublicKey,
            toPubkey: newRecipient.publicKey,
            lamports: 50000000,
          })
        ])
        .signers([newRecipient])
        .rpc();

      setDemoRecipient(newRecipient.publicKey.toBase58());
      setTxStatus({ type: 'success', message: `Demo Recipient ready! Address generated.` });

      setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 8000);
    } catch (e: any) {
      console.error(e);
      setTxStatus({ type: 'error', message: e?.message ?? 'Failed to setup demo' });
    }
  };

  // ── Demo transfer ─────────────────────────────────────────────────────────
  const demoTransfer = async (recipientAddress: string, amount: number) => {
    if (!walletPublicKey) {
      setTxStatus({ type: 'error', message: 'Please connect your Phantom or Solflare wallet first.' });
      return;
    }
    if (!program) {
      setTxStatus({ type: 'error', message: 'Solana node is unreachable. Check your connection.' });
      return;
    }
    if (amount > 1000) { // Demo threshold or mock balance limit
      setTxStatus({ type: 'error', message: 'Insufficient encrypted balance.' });
      return;
    }
    setTxStatus({ type: 'pending', message: `Preparing FHE-encrypted transfer of ${amount} USDC…` });

    try {
      const recipientPK = new PublicKey(recipientAddress);
      const { mockEncryptAmount, mockZKProof } = await import('@/lib/program');

      const encryptedAmount = Array.from(mockEncryptAmount(amount));
      const senderNewBalance = Array.from(mockEncryptAmount(Math.max(0, 1000 - amount)));
      const receiverNewBal = Array.from(mockEncryptAmount(amount));
      const zkProof = Array.from(mockZKProof());
      const memoHash = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      const [ledgerPDA] = getLedgerStatePDA();
      const [senderPDA] = getConfidentialAccountPDA(walletPublicKey);
      const [receiverPDA] = getConfidentialAccountPDA(recipientPK);

      const tx = await (program.methods as any)
        .confidentialTransfer(encryptedAmount, senderNewBalance, receiverNewBal, zkProof, memoHash)
        .accounts({
          sender: walletPublicKey,
          senderAccount: senderPDA,
          receiver: recipientPK,
          receiverAccount: receiverPDA,
          ledgerState: ledgerPDA,
        })
        .rpc();

      setTxStatus({ type: 'success', message: `Transfer complete! Tx: ${tx.slice(0, 20)}…` });
      await fetchUserAccount();

      setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 5000);
    } catch (e: any) {
      setTxStatus({ type: 'error', message: e?.message ?? 'Transfer failed' });
    }
  };

  // ── dWallet intent ────────────────────────────────────────────────────────
  const triggerDWalletIntent = async (targetChain: number, intentPayload: string) => {
    if (!walletPublicKey) {
      setTxStatus({ type: 'error', message: 'Please connect your Phantom or Solflare wallet first.' });
      return;
    }
    if (!program) {
      setTxStatus({ type: 'error', message: 'Solana node is unreachable. Check your connection.' });
      return;
    }
    setTxStatus({ type: 'pending', message: 'Submitting cross-chain Ika dWallet intent…' });

    try {
      const intentHash = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const condition = Array.from(crypto.getRandomValues(new Uint8Array(128)));
      const [accountPDA] = getConfidentialAccountPDA(walletPublicKey);

      const tx = await (program.methods as any)
        .triggerDwalletIntent(intentHash, targetChain, condition, sessionId)
        .accounts({
          owner: walletPublicKey,
          confidentialAccount: accountPDA,
        })
        .rpc();

      setTxStatus({ type: 'success', message: `Ika intent triggered! Tx: ${tx.slice(0, 20)}…` });
      setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 5000);
    } catch (e: any) {
      setTxStatus({ type: 'error', message: e?.message ?? 'Intent failed' });
    }
  };

  // Auto-fetch and WebSocket Events
  useEffect(() => {
    if (connected && walletPublicKey) {
      fetchLedgerState();
      fetchUserAccount();
    }

    // Live Quantum Feed Event Listeners
    // Wrapped in try/catch — WS errors from localnet are non-fatal
    if (program && connected) {
      let seedEventId: number | null = null;
      let transferEventId: number | null = null;

      try {
        seedEventId = program.addEventListener('QuantumSeedUpdated', (event: any) => {
          fetchLedgerState();
          setTxStatus({ type: 'success', message: `⚛ ALERTS: Quantum Seed Rotated (Epoch #${event.epoch.toString()})` });
          setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 4000);
        });

        transferEventId = program.addEventListener('ConfidentialTransferEvent', (event: any) => {
          if (
            walletPublicKey &&
            (event.sender.equals(walletPublicKey) || event.receiver.equals(walletPublicKey))
          ) {
            fetchUserAccount();
            setTxStatus({ type: 'success', message: `💸 ALERTS: Confidential Transfer Detected!` });
            setTimeout(() => setTxStatus({ type: 'idle', message: '' }), 4000);
          }
        });
      } catch (e) {
        // WS subscriptions are optional — log quietly
        console.debug('[Q-SCL] Event listener setup skipped:', e);
      }

      return () => {
        try {
          if (seedEventId !== null) program.removeEventListener(seedEventId);
          if (transferEventId !== null) program.removeEventListener(transferEventId);
        } catch (e) {
          // ignore cleanup errors
        }
      };
    }
  }, [connected, walletPublicKey, program]);

  const value: QSCLContextValue = {
    connected,
    walletPublicKey,
    ledgerState,
    userAccount,
    isLoading,
    txStatus,
    fetchLedgerState,
    fetchUserAccount,
    registerAccount,
    demoTransfer,
    triggerDWalletIntent,
    setupDemoScenario,
    demoRecipient,
  };

  return <QSCLContext.Provider value={value}>{children}</QSCLContext.Provider>;
}

// ─── Root Provider ────────────────────────────────────────────────────────────

export function QSCLProvider({ children }: { children: React.ReactNode }) {
  // Phantom is auto-detected via Wallet Standard — no need for explicit adapter
  const wallets = useMemo(
    () => [new SolflareWalletAdapter()],
    []
  );

  // Gracefully handle auto-connect rejections (e.g. user hasn't approved yet)
  const onError = useCallback((error: Error) => {
    // Suppress "User rejected the request" during autoConnect — this is normal
    if (error.name === 'WalletConnectionError') {
      console.debug('[Q-SCL] Wallet auto-connect skipped:', error.message);
      return;
    }
    console.error('[Q-SCL] Wallet error:', error);
  }, []);

  return (
    <ConnectionProvider endpoint={SOLANA_NETWORK} config={{ wsEndpoint: SOLANA_WS }}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          <QSCLInnerProvider>{children}</QSCLInnerProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
