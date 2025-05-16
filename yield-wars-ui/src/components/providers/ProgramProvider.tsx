'use client';

import { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import {
  useAnchorWallet,
  useConnection,
  AnchorWallet,
} from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';

// Import your program's IDL and types
import * as YieldWarsIdl from '@/lib/program/idl/yield_wars_program.json';
import { YieldWars } from '@/lib/program/types/yield_wars';

// Constants from your Anchor.toml
export const YIELD_WARS_PROGRAM_ID = new PublicKey(YieldWarsIdl.address);

type ProgramContextProps = {
  program?: Program<YieldWars>;
  connection: Connection;
};

const ProgramContext = createContext<ProgramContextProps | null>(null);

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider');
  }
  return context;
}

export function ProgramProvider({ children }: PropsWithChildren<object>) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const program = useMemo<ProgramContextProps['program']>(() => {
    const readOnlyWallet: AnchorWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (transaction) => transaction,
      signAllTransactions: async (transactions) => transactions,
    };

    const anchorWallet = wallet ?? readOnlyWallet;

    const anchorProvider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });

    // Set the provider globally
    if (typeof window !== 'undefined') {
      (window as any).ANCHOR_PROVIDER = anchorProvider;
    }

    const program = new Program(
      YieldWarsIdl as any,
      YIELD_WARS_PROGRAM_ID,
      anchorProvider
    ) as Program<YieldWars>;

    return program;
  }, [connection, wallet]);

  const context = useMemo(
    () => ({
      program,
      connection,
    }),
    [program, connection]
  );

  return (
    <ProgramContext.Provider value={context}>
      {children}
    </ProgramContext.Provider>
  );
} 