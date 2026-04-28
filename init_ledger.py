"""
Q-SCL: Initialize Ledger State on Localnet
============================================
One-shot script to call `initializeLedger` so the quantum provider can
subsequently call `updateQuantumSeed`.
"""

import json, hashlib
from pathlib import Path
from solders.keypair import Keypair          # type: ignore
from solders.pubkey import Pubkey            # type: ignore
from solders.system_program import ID as SYS_PROGRAM_ID  # type: ignore
from solders.instruction import Instruction, AccountMeta  # type: ignore
from solders.message import Message          # type: ignore
from solders.transaction import Transaction  # type: ignore
from solana.rpc.api import Client

PROGRAM_ID = "GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51"
RPC_URL = "https://api.devnet.solana.com"

# Load the same keypair used by quantum_provider.py
KEYPAIR_PATH = Path.home() / ".config" / "solana" / "id.json"

def main():
    client = Client(RPC_URL)

    # Load authority keypair
    kp_bytes = json.loads(KEYPAIR_PATH.read_text())
    authority = Keypair.from_bytes(bytes(kp_bytes))
    print(f"Authority: {authority.pubkey()}")

    program_id = Pubkey.from_string(PROGRAM_ID)
    quantum_provider = authority.pubkey()  # same key acts as provider

    # Derive LedgerState PDA
    ledger_pda, _bump = Pubkey.find_program_address([b"ledger_state"], program_id)
    print(f"LedgerState PDA: {ledger_pda}")

    # Build the initializeLedger instruction
    # Anchor discriminator = sha256("global:initialize_ledger")[:8]
    discriminator = hashlib.sha256(b"global:initialize_ledger").digest()[:8]

    # Args: quantum_provider (32 bytes) + ika_mpc_endpoint (64 bytes)
    ika_label = b"ika-mpc-devnet-endpoint-placeholder"
    ika_endpoint = ika_label + b"\x00" * (64 - len(ika_label))

    data = discriminator + bytes(quantum_provider) + ika_endpoint[:64]

    ix = Instruction(
        program_id,
        data,
        [
            AccountMeta(authority.pubkey(), is_signer=True, is_writable=True),
            AccountMeta(ledger_pda, is_signer=False, is_writable=True),
            AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
        ]
    )

    # Build and send transaction using solders
    recent_blockhash = client.get_latest_blockhash().value.blockhash
    msg = Message.new_with_blockhash([ix], authority.pubkey(), recent_blockhash)
    tx = Transaction.new_unsigned(msg)
    tx.sign([authority], recent_blockhash)

    result = client.send_transaction(tx)
    print(f"✅ Ledger initialized! Tx: {result.value}")

if __name__ == "__main__":
    main()
