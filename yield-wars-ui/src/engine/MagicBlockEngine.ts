import { Idl, Program } from "@coral-xyz/anchor";
import {
  AccountInfo,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { PrivyInterface } from '@privy-io/react-auth';
import { 
  useSolanaWallets, 
  useSignTransaction, 
  type ConnectedSolanaWallet
} from '@privy-io/react-auth/solana';

const ENDPOINT_CHAIN_RPC = "https://api.devnet.solana.com";
const ENDPOINT_CHAIN_WS = "wss://api.devnet.solana.com";

// const _ENDPOINT_CHAIN_RPC = "http://127.0.0.1:7899";
// const _ENDPOINT_CHAIN_WS = "ws://127.0.0.1:7900";

const ENDPOINT_EPHEM_RPC = "https://devnet.magicblock.app";
const ENDPOINT_EPHEM_WS = "wss://devnet.magicblock.app:8900";

// const _ENDPOINT_EPHEM_RPC = "http://localhost:8899";
// const _ENDPOINT_EPHEM_WS = "ws://localhost:8900";

const TRANSACTION_COST_LAMPORTS = 5000;

const connectionChain = new Connection(ENDPOINT_CHAIN_RPC, {
  wsEndpoint: ENDPOINT_CHAIN_WS,
});
const connectionEphem = new Connection(ENDPOINT_EPHEM_RPC, {
  wsEndpoint: ENDPOINT_EPHEM_WS,
});

interface SessionConfig {
  minLamports: number;
  maxLamports: number;
}

interface WalletAdapter {
  name: string;
  icon: string;
}

export class MagicBlockEngine {
  private sessionKey: Keypair;
  private sessionConfig: SessionConfig;
  private signTransaction: ReturnType<typeof useSignTransaction>;
  private privy: PrivyInterface;
  private solanaWallets: ReturnType<typeof useSolanaWallets>;
  private connection: Connection;
  private endpoint: string;

  constructor(
    signTransaction: ReturnType<typeof useSignTransaction>,
    privy: PrivyInterface,
    solanaWallets: ReturnType<typeof useSolanaWallets>,
    sessionKey: Keypair,
    sessionConfig: SessionConfig,
    endpoint: string
  ) {
    this.signTransaction = signTransaction;
    this.privy = privy;
    this.solanaWallets = solanaWallets;
    this.sessionKey = sessionKey;
    this.sessionConfig = sessionConfig;
    this.endpoint = endpoint;
    this.connection = new Connection(endpoint);
  }

  getProgramOnChain<T extends Idl>(idl: Record<string, unknown>): Program<T> {
    return new Program<T>(idl as T, { connection: connectionChain });
  }

  getProgramOnEphem<T extends Idl>(idl: Record<string, unknown>): Program<T> {
    return new Program<T>(idl as T, { connection: connectionEphem });
  }

  getConnectionChain(): Connection {
    return connectionChain;
  }
  getConnectionEphem(): Connection {
    return connectionEphem;
  }

  getWalletConnected() {
    return this.privy.authenticated && this.solanaWallets.wallets.length > 0;
  }
  getWalletConnecting() {
    return !this.privy.ready;
  }

  getWalletPayer(): PublicKey {
    const solanaWallet = this.solanaWallets.wallets[0];
    if (!solanaWallet?.address) {
      throw new Error("Solana wallet not connected");
    }
    return new PublicKey(solanaWallet.address);
  }

  getSessionPayer(): PublicKey {
    return this.sessionKey.publicKey;
  }

  async processWalletTransaction(
    name: string,
    transaction: Transaction | VersionedTransaction
  ): Promise<string> {
    console.log(name, "sending");
    
    // Get the first connected wallet
    const wallet = this.solanaWallets.wallets[0];
    if (!wallet) {
      throw new Error("No Solana wallet connected");
    }

    // Sign the transaction using the wallet's signTransaction method
    const signedTx = await wallet.signTransaction(transaction);

    if (!signedTx) {
      throw new Error("Failed to sign transaction");
    }

    // Send the signed transaction
    const signature = await connectionChain.sendRawTransaction(
      signedTx instanceof VersionedTransaction 
        ? signedTx.serialize() 
        : signedTx.serialize()
    );

    await this.waitSignatureConfirmation(
      name,
      signature,
      connectionChain,
      "confirmed"
    );
    return signature;
  }

  async processSessionChainTransaction(
    name: string,
    transaction: Transaction
  ): Promise<string> {
    console.log(name, "sending");
    const signature = await connectionChain.sendTransaction(
      transaction,
      [this.sessionKey],
      { skipPreflight: true }
    );
    await this.waitSignatureConfirmation(
      name,
      signature,
      connectionChain,
      "confirmed"
    );
    return signature;
  }

  async processSessionEphemTransaction(
    name: string,
    transaction: Transaction
  ): Promise<string> {
    console.log(name, "sending");
    transaction.compileMessage();
    const signature = await connectionEphem.sendTransaction(
      transaction,
      [this.sessionKey],
      { skipPreflight: true }
    );
    await this.waitSignatureConfirmation(
      name,
      signature,
      connectionEphem,
      "finalized"
    );
    return signature;
  }

  async waitSignatureConfirmation(
    name: string,
    signature: string,
    connection: Connection,
    commitment: Commitment
  ): Promise<void> {
    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      },
      commitment
    );
  }

  async debugError(name: string, signature: string, connection: Connection) {
    const transaction = await connection.getParsedTransaction(signature);
    console.log("debugError", name, signature, transaction);
  }

  async getSessionFundingMissingLamports() {
    const accountInfo = await connectionChain.getAccountInfo(
      this.getSessionPayer()
    );
    const currentLamports = accountInfo?.lamports ?? 0;
    if (currentLamports < this.sessionConfig.minLamports) {
      return this.sessionConfig.maxLamports - currentLamports;
    }
    return 0;
  }

  async fundSessionFromAirdrop() {
    const missingLamports = await this.getSessionFundingMissingLamports();
    if (missingLamports > 0) {
      await connectionChain.requestAirdrop(
        this.sessionKey.publicKey,
        missingLamports
      );
    }
  }

  async fundSessionFromWallet() {
    const missingLamports = await this.getSessionFundingMissingLamports();
    if (missingLamports > 0) {
      await this.processWalletTransaction(
        "FundSessionFromWallet",
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.getWalletPayer(),
            toPubkey: this.getSessionPayer(),
            lamports: missingLamports,
          })
        )
      );
    }
  }

  async defundSessionBackToWallet() {
    const accountInfo = await connectionChain.getAccountInfo(
      this.getSessionPayer()
    );
    if (accountInfo && accountInfo.lamports > 0) {
      const transferableLamports =
        accountInfo.lamports - TRANSACTION_COST_LAMPORTS;
      await this.processSessionChainTransaction(
        "DefundSessionBackToWallet",
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.getSessionPayer(),
            toPubkey: this.getWalletPayer(),
            lamports: transferableLamports,
          })
        )
      );
    }
  }

  async getChainAccountInfo(address: PublicKey): Promise<{ owner: PublicKey } | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(address);
      if (!accountInfo) return null;
      return { owner: accountInfo.owner };
    } catch (error) {
      console.error('Failed to get chain account info:', error);
      return null;
    }
  }

  async getEphemeralAccountInfo(address: PublicKey): Promise<{ owner: PublicKey } | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(address);
      if (!accountInfo) return null;
      return { owner: accountInfo.owner };
    } catch (error) {
      console.error('Failed to get ephemeral account info:', error);
      return null;
    }
  }

  subscribeToChainAccountInfo(
    address: PublicKey,
    onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void
  ) {
    return this.subscribeToAccountInfo(
      connectionChain,
      address,
      onAccountChange
    );
  }

  subscribeToEphemAccountInfo(
    address: PublicKey,
    onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void
  ) {
    return this.subscribeToAccountInfo(
      connectionEphem,
      address,
      onAccountChange
    );
  }

  subscribeToAccountInfo(
    connection: Connection,
    address: PublicKey,
    onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void
  ) {
    let ignoreFetch = false;
    connection.getAccountInfo(address).then(
      (accountInfo) => {
        if (ignoreFetch || !accountInfo) {
          return;
        }
        onAccountChange(accountInfo);
      },
      (error) => {
        console.log("Error fetching accountInfo", error);
        onAccountChange(undefined);
      }
    );
    const subscription = connection.onAccountChange(address, (accountInfo) => {
      ignoreFetch = true;
      onAccountChange(accountInfo);
    });
    return () => {
      ignoreFetch = true;
      connection.removeAccountChangeListener(subscription);
    };
  }

  listWalletAdapters(): WalletAdapter[] {
    return this.solanaWallets.wallets.map((wallet: ConnectedSolanaWallet) => {
      return {
        name: wallet.address,
        icon: '',
      };
    });
  }

  selectWalletAdapter(wallet: WalletAdapter | null) {
    if (wallet) {
      return this.privy.connectWallet();
    } else {
      return this.privy.logout();
    }
  }

  getSessionMinLamports(): number {
    return this.sessionConfig.minLamports;
  }

  getSessionMaximalLamports(): number {
    return this.sessionConfig.maxLamports;
  }
}