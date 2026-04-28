const anchor = require("@coral-xyz/anchor");
const fs = require("fs");

async function init() {
  process.env.ANCHOR_PROVIDER_URL = "http://localhost:8899";
  process.env.ANCHOR_WALLET = "/home/ibrahim/.config/solana/id.json";
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const idl = JSON.parse(fs.readFileSync("/home/ibrahim/Desktop/quantum_solana_project/q_scl_ledger/target/idl/q_scl_ledger.json", "utf8"));
  const programId = new anchor.web3.PublicKey("GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51");
  const program = new anchor.Program(idl, programId, provider);

  const [ledgerStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ledger_state")],
    program.programId
  );

  console.log("Initializing LedgerState PDA:", ledgerStatePda.toBase58());

  try {
    const tx = await program.methods.initializeLedger()
      .accounts({
        authority: provider.wallet.publicKey,
        ledgerState: ledgerStatePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Success! Transaction signature:", tx);
  } catch(e) {
    console.error("Error:", e.message);
  }
}

init();
