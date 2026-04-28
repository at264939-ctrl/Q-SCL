import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";

async function main() {
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync("/home/ibrahim/.config/solana/id.json", "utf8")));
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(secretKey));
  
  const connection = new Connection("http://localhost:8899", "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("../q_scl_ledger/target/idl/q_scl_ledger.json", "utf8"));
  // Inject exactly the program ID deployed
  idl.address = "GrhEeGVRFTqdQKN1wdyL6hZbDgAAzX5uxc6cfPK1VJ51";
  
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [ledgerStatePda] = PublicKey.findProgramAddressSync([Buffer.from("ledger_state")], program.programId);

  console.log("Initializing ledger state:", ledgerStatePda.toBase58());

  try {
    const tx = await program.methods.initializeLedger()
      .accounts({
        authority: wallet.publicKey,
        ledgerState: ledgerStatePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("SUCCESS! Ledger Initialized with Tx:", tx);
  } catch (err) {
    console.error("Error organizing transaction:", err);
  }
}

main();
