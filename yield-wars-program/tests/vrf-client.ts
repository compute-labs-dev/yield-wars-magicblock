import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VrfClient } from "../target/types/vrf_client";
import { PublicKey } from "@solana/web3.js";

describe("vrf-client", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.VrfClient as Program<VrfClient>;

    let userRandomnessPda: PublicKey;
    let userRandomnessBump: number;

    // Find the user randomness PDA
    before(async () => {
        const [pda, bump] = await PublicKey.findProgramAddressSync(
            [
                Buffer.from("randomness"),
                provider.wallet.publicKey.toBuffer(),
            ],
            program.programId
        );
        userRandomnessPda = pda;
        userRandomnessBump = bump;
        console.log("\tUser randomness PDA:", userRandomnessPda.toBase58());
    });

    it("Request randomness", async () => {
        const randomSeed = Math.floor(Math.random() * 256);
        const tx = await program.methods.requestRandomness(randomSeed).rpc();
        console.log("\tRequest randomness", tx);
    });

    it("Simpler request randomness", async () => {
        const randomSeed = Math.floor(Math.random() * 256);
        const tx = await program.methods.simplerRequestRandomness(randomSeed).rpc();
        console.log("\tSimpler request randomness", tx);
    })
});
