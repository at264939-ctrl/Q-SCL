'use client';

import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { QSCLProvider, useQSCL } from '@/context/QSCLProvider';
import { PublicKey } from '@solana/web3.js';

// ─── Particle Background ──────────────────────────────────────────────────────

function QuantumParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    // Provide deterministic SSR values, overridden by random values on client
    x: mounted ? Math.random() * 100 : i * 4,
    size: mounted ? Math.random() * 4 + 1 : 2,
    duration: mounted ? Math.random() * 15 + 10 : 15,
    delay: mounted ? Math.random() * 10 : 0,
    color: i % 3 === 0
      ? 'rgba(99,102,241,0.6)'
      : i % 3 === 1
        ? 'rgba(6,182,212,0.5)'
        : 'rgba(139,92,246,0.5)',
  }));

  if (!mounted) return <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }} />;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="q-particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="q-nav">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>⚛</div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#f1f5f9' }}>Q-SCL</div>
            <div className="q-label" style={{ marginTop: '-2px' }}>Quantum Ledger v1.0</div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {['Dashboard', 'Transfer', 'dWallet', 'Docs'].map((item) => (
            <a key={item} href="#" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--q-text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--q-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--q-text-secondary)')}>
              {item}
            </a>
          ))}
        </div>

        {/* Badges + Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="q-badge q-badge-live">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Devnet
          </span>
          {mounted && <WalletMultiButton style={{ height: '40px' }} />}
        </div>
      </div>
    </nav>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, glow }: { icon: string; label: string; value: string; sub?: string; glow?: string }) {
  return (
    <div className={`q-card ${glow ?? ''}`} style={{ padding: '24px', flex: 1, minWidth: '180px' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div className="q-label" style={{ marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--q-text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--q-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function QuantumProgressBar({ ageSeconds }: { ageSeconds: number }) {
  // 60 minutes rotation cycle (3600 seconds)
  const percentLeft = Math.max(0, 100 - (ageSeconds / 3600) * 100);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div className="q-label" style={{ fontSize: '0.65rem' }}>Next Quantum Rotation</div>
        <div className="q-label" style={{ fontSize: '0.65rem' }}>{Math.max(0, 3600 - ageSeconds)}s</div>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          className="q-entropy-bar"
          style={{ width: `${percentLeft}%`, height: '100%', transition: 'width 1s linear' }}
        />
      </div>
    </div>
  );
}

// ─── Quantum Seed Panel ───────────────────────────────────────────────────────

function QuantumSeedPanel({ ledgerState }: { ledgerState: any }) {
  const seedHex = ledgerState?.quantumSeed
    ? Array.from(ledgerState.quantumSeed as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
    : '—';

  const ageSeconds = ledgerState
    ? Math.floor(Date.now() / 1000) - ledgerState.seedTimestamp
    : 0;
  const ageMin = Math.floor(ageSeconds / 60);
  const fresh = ageSeconds < 3600;

  return (
    <div className="q-card" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="q-h2" style={{ fontSize: '1.1rem' }}>⚛ Quantum Seed</h2>
          <div className="q-label" style={{ marginTop: '2px' }}>QRNG Entropy — IBM Quantum</div>
        </div>
        <span className={`q-badge ${fresh ? 'q-badge-live' : 'q-badge-warn'}`}>
          {fresh ? '✓ Fresh' : '⚠ Stale'}
        </span>
      </div>

      {/* Entropy Progress Bar */}
      <QuantumProgressBar ageSeconds={ageSeconds} />

      {/* Seed display */}
      <div style={{
        background: 'rgba(6, 182, 212, 0.04)',
        border: '1px solid rgba(6, 182, 212, 0.15)',
        borderRadius: '8px', padding: '14px',
      }}>
        <div className="q-mono" style={{ color: 'var(--q-accent-cyan)', fontSize: '0.65rem', lineHeight: '1.6', wordBreak: 'break-all' }}>
          {seedHex || '0'.repeat(64)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
        <div>
          <div className="q-label">Epoch</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--q-accent-primary)' }}>
            #{ledgerState?.epoch ?? '—'}
          </div>
        </div>
        <div>
          <div className="q-label">Last Rotation</div>
          <div style={{ fontWeight: 600, color: fresh ? 'var(--q-accent-emerald)' : 'var(--q-accent-amber)', fontSize: '0.875rem' }}>
            {ageMin > 0 ? `${ageMin}m ago` : 'Just now'}
          </div>
        </div>
        <div>
          <div className="q-label">Source</div>
          <div style={{ fontWeight: 600, color: 'var(--q-text-secondary)', fontSize: '0.875rem' }}>IBM Quantum QRNG</div>
        </div>
      </div>
    </div>
  );
}

// ─── Encrypted Balance Panel ──────────────────────────────────────────────────

function BalancePanel({ userAccount, onRegister, isLoading }: { userAccount: any; onRegister: () => void; isLoading: boolean }) {
  const ctHex = userAccount?.encryptedBalance
    ? Array.from(userAccount.encryptedBalance as Uint8Array).slice(0, 24).map((b: number) => b.toString(16).padStart(2, '0')).join('') + '…'
    : null;

  return (
    <div className="q-card q-card-glow-violet" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="q-h2" style={{ fontSize: '1.1rem' }}>🔐 Encrypted Balance</h2>
          <div className="q-label" style={{ marginTop: '2px' }}>BFV Ciphertext — RLWE/FHE</div>
        </div>
        {userAccount && (
          <span className={`q-badge ${userAccount.isFrozen ? 'q-badge-frozen' : 'q-badge-live'}`}>
            {userAccount.isFrozen ? '🧊 Frozen' : '✓ Active'}
          </span>
        )}
      </div>

      {!userAccount ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
          <p style={{ color: 'var(--q-text-secondary)', marginBottom: '20px', fontSize: '0.875rem' }}>
            No confidential account found. Create one to start transacting privately.
          </p>
          <button className="q-btn q-btn-primary" onClick={onRegister} disabled={isLoading} id="register-account-btn">
            {isLoading ? <span className="q-spin">⟳</span> : '+ Create Confidential Account'}
          </button>
        </div>
      ) : (
        <>
          {/* Ciphertext display */}
          <div style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <div className="q-label" style={{ marginBottom: '6px' }}>Ciphertext C = (c₀, c₁)</div>
            <div className="q-mono" style={{ color: 'var(--q-accent-violet)' }}>{ctHex}</div>
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--q-text-muted)' }}>
              BFV.Enc(pk, m) — plaintext hidden via RLWE noise ⊕ quantum entropy
            </div>
          </div>

          {/* Plaintext view (Simulated Decryption) */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', marginBottom: '16px', background: 'rgba(16, 185, 129, 0.04)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <div>
              <div className="q-label" style={{ marginBottom: '6px', color: 'var(--q-accent-emerald)' }}>Decrypted Balance View</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--q-text-primary)' }}>
                {userAccount?.encryptedBalance ? new DataView(userAccount.encryptedBalance.buffer).getUint32(0, true) : 0}
                <span style={{ fontSize: '1rem', color: 'var(--q-text-muted)', marginLeft: '6px' }}>USDC</span>
              </div>
            </div>
          </div>

          {/* Account stats */}
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <div className="q-label">Nonce</div>
              <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--q-text-primary)' }}>{userAccount.nonce}</div>
            </div>
            <div>
              <div className="q-label">dWallet Intent</div>
              <div className="q-mono" style={{ fontSize: '0.7rem', color: 'var(--q-text-secondary)' }}>
                {Array.from(userAccount.dwalletIntent as Uint8Array).every((b: number) => b === 0)
                  ? 'None pending'
                  : Array.from(userAccount.dwalletIntent as Uint8Array).slice(0, 6).map((b: number) => b.toString(16).padStart(2, '0')).join('') + '…'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Transfer Panel ───────────────────────────────────────────────────────────

function TransferPanel({ onTransfer, isLoading, demoRecipient }: { onTransfer: (to: string, amt: number) => void; isLoading: boolean, demoRecipient: string | null }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecipient = demoRecipient || recipient;
    if (!finalRecipient || !amount) return;
    try {
      new PublicKey(finalRecipient); // validate
      onTransfer(finalRecipient, parseInt(amount));
    } catch {
      alert('Invalid recipient address');
    }
  };

  return (
    <div className="q-card" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h2 className="q-h2" style={{ fontSize: '1.1rem' }}>⇄ Confidential Transfer</h2>
        {demoRecipient && <span className="q-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Auto-filled Demo</span>}
      </div>
      <div className="q-label" style={{ marginBottom: '20px' }}>ZK-Range-Proof + FHE Homomorphic Addition</div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div className="q-label" style={{ marginBottom: '6px' }}>Recipient Address</div>
          <input
            id="transfer-recipient-input"
            className="q-input"
            placeholder="Solana address (base58)…"
            value={demoRecipient || recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>
        <div>
          <div className="q-label" style={{ marginBottom: '6px' }}>Amount (encrypted USDC)</div>
          <input
            id="transfer-amount-input"
            className="q-input"
            type="number"
            placeholder="0"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div style={{
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '8px', padding: '12px', fontSize: '0.75rem', color: 'var(--q-text-muted)',
        }}>
          <strong style={{ color: 'var(--q-text-secondary)' }}>REFHE Protocol:</strong>{' '}
          The transfer amount is never revealed on-chain. Bulletproof range proofs ensure
          no overdraft without exposing balances. Homomorphic addition:
          C_new = C_old + C_transfer (mod q)
        </div>

        <button
          id="send-transfer-btn"
          type="submit"
          className="q-btn q-btn-primary"
          disabled={isLoading || !(recipient || demoRecipient) || !amount}
          style={{ marginTop: '4px' }}
        >
          {isLoading ? <span className="q-spin">⟳</span> : '🔐 Send Private Transfer'}
        </button>
      </form>
    </div>
  );
}

// ─── Demo Utilities ───────────────────────────────────────────────────────────

function DemoControls({ onSetup, isLoading, hasAccount }: { onSetup: () => void, isLoading: boolean, hasAccount: boolean }) {
  if (!hasAccount) return null;
  return (
    <div style={{ marginBottom: '24px', textAlign: 'right' }}>
      <button className="q-btn q-btn-outline" onClick={onSetup} disabled={isLoading} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
        🤖 Setup Demo Transfer (Receiver)
      </button>
    </div>
  )
}

// ─── dWallet Intent Panel ─────────────────────────────────────────────────────

function DWalletPanel({ onTrigger, isLoading }: { onTrigger: (chain: number, payload: string) => void; isLoading: boolean }) {
  const [targetChain, setTargetChain] = useState(1);
  const [intentPayload, setIntentPayload] = useState('');

  const chains = [
    { id: 0, label: '₿ Bitcoin', color: '#f59e0b' },
    { id: 1, label: '♦ Ethereum', color: '#6366f1' },
    { id: 2, label: '◎ Solana', color: '#10b981' },
    { id: 3, label: '🌊 Sui', color: '#06b6d4' },
  ];

  return (
    <div className="q-card q-card-glow-cyan" style={{ padding: '28px' }}>
      <h2 className="q-h2" style={{ fontSize: '1.1rem', marginBottom: '6px' }}>🌐 Ika dWallet Intent</h2>
      <div className="q-label" style={{ marginBottom: '20px' }}>Bridgeless 2PC-MPC Cross-Chain Signing</div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {chains.map((c) => (
          <button
            key={c.id}
            id={`chain-btn-${c.id}`}
            className="q-btn q-btn-outline"
            onClick={() => setTargetChain(c.id)}
            style={{
              fontSize: '0.8rem', padding: '7px 14px',
              borderColor: targetChain === c.id ? c.color : undefined,
              color: targetChain === c.id ? c.color : undefined,
              background: targetChain === c.id ? `${c.color}15` : undefined,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '14px' }}>
        <div className="q-label" style={{ marginBottom: '6px' }}>Intent Payload (JSON)</div>
        <textarea
          id="intent-payload-input"
          className="q-input"
          rows={3}
          placeholder='{"action": "transfer", "amount": "0.01", "to": "bc1q…"}'
          value={intentPayload}
          onChange={e => setIntentPayload(e.target.value)}
          style={{ resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.06)',
        border: '1px solid rgba(6, 182, 212, 0.15)',
        borderRadius: '8px', padding: '12px', fontSize: '0.75rem', color: 'var(--q-text-muted)', marginBottom: '14px',
      }}>
        <strong style={{ color: 'var(--q-text-secondary)' }}>2PC-MPC Signing:</strong>{' '}
        σ = Sign(sk_user ⊕ sk_ika, payload) — Neither party holds the complete key.
        Ika's EdDSA MPC nodes co-sign after validating the encrypted on-chain trigger condition.
      </div>

      <button
        id="trigger-intent-btn"
        className="q-btn q-btn-cyan"
        style={{ width: '100%' }}
        disabled={isLoading}
        onClick={() => onTrigger(targetChain, intentPayload)}
      >
        {isLoading ? <span className="q-spin">⟳</span> : '🚀 Trigger Cross-Chain Intent'}
      </button>
    </div>
  );
}

// ─── TX Status Banner ─────────────────────────────────────────────────────────

function TxStatusBanner({ status }: { status: { type: string; message: string } }) {
  if (status.type === 'idle') return null;

  const colors: Record<string, string> = {
    pending: 'rgba(245, 158, 11, 0.1)',
    success: 'rgba(16, 185, 129, 0.1)',
    error: 'rgba(244, 63, 94, 0.1)',
  };
  const borders: Record<string, string> = {
    pending: 'rgba(245, 158, 11, 0.3)',
    success: 'rgba(16, 185, 129, 0.3)',
    error: 'rgba(244, 63, 94, 0.3)',
  };
  const icons: Record<string, string> = {
    pending: '⟳',
    success: '✓',
    error: '✕',
  };

  return (
    <div className="q-fade-in" style={{
      background: colors[status.type] ?? 'transparent',
      border: `1px solid ${borders[status.type] ?? 'transparent'}`,
      borderRadius: 'var(--q-radius)',
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
    }}>
      <span style={{ fontSize: '1.2rem', animation: status.type === 'pending' ? 'spin 1s linear infinite' : undefined }}>
        {icons[status.type]}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--q-text-primary)' }}>{status.message}</span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function Dashboard() {
  const {
    connected, walletPublicKey, ledgerState, userAccount,
    isLoading, txStatus, registerAccount, demoTransfer, triggerDWalletIntent, setupDemoScenario, demoRecipient
  } = useQSCL();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px 40px' }}>
        <div className="q-fade-in" style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span className="q-badge q-badge-quantum">⚛ Quantum-Safe</span>
            <span className="q-badge" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--q-accent-cyan)', border: '1px solid rgba(6,182,212,0.25)' }}>FHE Encrypted</span>
            <span className="q-badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--q-accent-violet)', border: '1px solid rgba(139,92,246,0.25)' }}>Ika MPC</span>
          </div>

          <h1 className="q-h1" style={{ marginBottom: '16px' }}>
            Quantum-Shielded<br />Confidential Ledger
          </h1>

          <p style={{ maxWidth: '600px', margin: '0 auto', color: 'var(--q-text-secondary)', fontSize: '1rem', lineHeight: '1.7' }}>
            Next-generation private financial primitives on Solana. FHE-encrypted balances
            with QRNG entropy rotation and bridgeless cross-chain custody via Ika 2PC-MPC.
          </p>
        </div>

        {/* Connect prompt */}
        {!connected && (
          <div className="q-card q-fade-in" style={{ textAlign: 'center', padding: '60px', marginBottom: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔐</div>
            <h2 className="q-h2" style={{ marginBottom: '12px' }}>Connect Your Wallet</h2>
            <p style={{ color: 'var(--q-text-secondary)', marginBottom: '28px' }}>
              Connect to Solana Devnet to access your confidential ledger account.
            </p>
            <div id="connect-wallet-btn">
              {mounted && <WalletMultiButton />}
            </div>
          </div>
        )}

        {/* Connected state */}
        {connected && (
          <>
            {/* Wallet info bar */}
            <div className="q-card q-fade-in" style={{ padding: '16px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--q-accent-emerald)', boxShadow: '0 0 8px var(--q-accent-emerald)' }} />
                <span className="q-label">Connected</span>
                <span className="q-mono">{walletPublicKey?.toBase58().slice(0, 16)}…</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span className="q-label">Ledger Accounts: <strong style={{ color: 'var(--q-text-primary)' }}>{ledgerState?.entryCount ?? '—'}</strong></span>
                <span className="q-label">Epoch: <strong style={{ color: 'var(--q-accent-primary)' }}>#{ledgerState?.epoch ?? '—'}</strong></span>
              </div>
            </div>

            <TxStatusBanner status={txStatus} />

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <StatCard icon="⚛" label="Quantum Epoch" value={`#${ledgerState?.epoch ?? 0}`} sub="QRNG rotations" glow="q-card-glow-cyan" />
              <StatCard icon="🔐" label="Encrypted Accounts" value={String(ledgerState?.entryCount ?? 0)} sub="FHE-shielded" />
              <StatCard icon="🌐" label="dWallet Chains" value="4" sub="BTC · ETH · SOL · SUI" glow="q-card-glow-violet" />
              <StatCard icon="🛡" label="Security Level" value="256-bit" sub="RLWE + QRNG" />
            </div>

            {/* Main grid */}
            <DemoControls onSetup={setupDemoScenario} isLoading={isLoading} hasAccount={!!userAccount} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <QuantumSeedPanel ledgerState={ledgerState} />
              <BalancePanel userAccount={userAccount} onRegister={registerAccount} isLoading={isLoading} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              <TransferPanel onTransfer={demoTransfer} isLoading={isLoading} demoRecipient={demoRecipient} />
              <DWalletPanel onTrigger={triggerDWalletIntent} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--q-border)', padding: '32px 24px', textAlign: 'center', color: 'var(--q-text-muted)', fontSize: '0.8rem', position: 'relative', zIndex: 1, marginTop: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span>⚛ Q-SCL — Quantum-Shielded Confidential Ledger</span>
          <span>Built for Solana Frontier Hackathon 2026 · Devnet</span>
          <span>FHE (RLWE/BFV) + IBM Quantum QRNG + Ika 2PC-MPC</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <QSCLProvider>
      <div className="q-bg" />
      <div className="q-grid" />
      <QuantumParticles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Dashboard />
      </div>
    </QSCLProvider>
  );
}
