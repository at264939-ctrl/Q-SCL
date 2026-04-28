import asyncio, json, hashlib
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import Message
from solders.transaction import Transaction
from solana.rpc.async_api import AsyncClient

async def main():
    with open("/home/ibrahim/.config/solana/id.json") as f:
        kp = Keypair.from_bytes(bytes(json.load(f)))
        
    client = AsyncClient("http://localhost:8899")
    program_id = Pubkey.from_string("GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51")
    ledger_pda, _ = Pubkey.find_program_address([b"ledger_state"], program_id)
    
    disc = hashlib.sha256(b"global:initialize_ledger").digest()[:8]
    
    # quantum_provider (32 bytes), ikaMpcEndpoint (64 bytes)
    args_data = bytes(kp.pubkey()) + bytes(64)
    
    ix = Instruction(
        program_id,
        bytes(disc) + args_data,
        [
            AccountMeta(kp.pubkey(), True, True),
            AccountMeta(ledger_pda, False, True),
            AccountMeta(Pubkey.from_string("11111111111111111111111111111111"), False, False),
        ]
    )
    
    blockhash = (await client.get_latest_blockhash()).value.blockhash
    msg = Message.new_with_blockhash([ix], kp.pubkey(), blockhash)
    tx = Transaction.new_unsigned(msg)
    tx.sign([kp], blockhash)
    
    resp = await client.send_transaction(tx)
    print("Success:", resp.value)
    await client.close()

asyncio.run(main())
