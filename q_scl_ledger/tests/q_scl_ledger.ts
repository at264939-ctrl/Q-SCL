import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QSclLedger } from "../target/types/q_scl_ledger";

describe("q_scl_ledger", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.QSclLedger as Program<QSclLedger>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
