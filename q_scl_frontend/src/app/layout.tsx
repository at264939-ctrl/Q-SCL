import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Q-SCL — Quantum-Shielded Confidential Ledger',
  description:
    'Next-generation private financial primitives on Solana. FHE-encrypted balances, quantum-safe entropy, and bridgeless cross-chain custody via Ika MPC.',
  keywords: ['Solana', 'FHE', 'Quantum', 'Privacy', 'Ika', 'dWallet', 'Confidential', 'MPC'],
  openGraph: {
    title: 'Q-SCL — Quantum-Shielded Confidential Ledger',
    description: 'FHE on Solana + Quantum Entropy + Ika dWallet MPC',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
