import { findReference, FindReferenceError } from "@solana/pay"
import { Keypair, PublicKey, Connection } from "@solana/web3.js"

const connection = new Connection("https://api.devnet.solana.com");

export const checkTransaction = async (
  reference: PublicKey,
  setReference: (newReference: PublicKey) => void
) => {
  try {
    // Check for confirmed transactions including the reference public key
    await findReference(connection, reference, {
      finality: "confirmed",
    })

    // If a transaction is confirmed, generate a new reference and display an alert
    setReference(Keypair.generate().publicKey)
  } catch (e) {
    // If current reference not found, ignore error
    if (e instanceof FindReferenceError) {
      return
    }

    // Log any other errors
    console.error("Unknown error", e)
  }
}