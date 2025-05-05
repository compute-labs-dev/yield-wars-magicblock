'use client';

import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

// Default program IDs from Anchor.toml
const DEFAULT_PROGRAM_IDS: Record<string, string> = {
  wallet: 'BXYCAQBizX4Pddjq5XivVEQn9Tbc7NF9zzLd3CSUXysz',
  ownership: '4M5dU6my7BmVMoAUYmRa3ZnJRMMQzW7e4Yf32wiPh9wS',
  production: 'Hx47WJJoq9uzSRkZ8o4nRF57W1zpuYwAAc6pWHfbGQAr',
  price: 'DTtX2W21uM3oRdJCSTzmjb5ujvY7i6aA1kbEakeBbrV6',
  'price-action': '6e4kZsL68kwjW1Qagd9su8vYQPZGPyS3Mkg4n8Lt5FZU',
  upgradeable: 'dXEvE23Lv9XX5f6ssDbzbGNQmeomC1Mi4U16EoHA3pY',
  stakeable: '6ewq3Rkx3c2kLu9qq46fCNS9ZhBshzskCEAgX7WspkVQ',
  economy: 'CqPDvk7AJ7hVYsEvuFUDkZgYjnn5zy5YWEyinkRdFGb1',
  movement: 'FUj6R1Pbh7LcKMvP6CLQVuHV5ctpDC99pL5bjHGitjSZ',
  position: 'FG3FpqgB61FFDAjHa9N1Q2cpGqSnYypcaJL6cTK7MtfV',
  'yield-wars': 'Gk8azmvjHvYJVJtJfEBSSrnMPsmxSYVwHzdEWRv5aWvf',
};

// Add Bolt/Anchor system program IDs
const SYSTEM_PROGRAM_IDS: Record<string, string> = {
  'system': '11111111111111111111111111111111',
  'token': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'associated-token': 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'spl-memo': 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'compute-budget': 'ComputeBudget111111111111111111111111111111',
  'anchor-rent-sysvar': 'Sysvar1111111111111111111111111111111111111',
  'bolt-world': 'WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n',
  'bolt-registry': 'EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K',
};

interface TransactionData {
  signature: string;
  timestamp: number;
  programId: string;
  programName: string;
  success: boolean;
  logs?: string[];
  walletTransaction?: boolean;
  enhancedData?: Record<string, unknown>;
}

interface EnhancedData {
  worldId?: string;
  entityId?: string;
  [key: string]: unknown;
}

export const TransactionLogger = () => {
  const [endpoint, setEndpoint] = useState<string>('http://localhost:8899');
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [maxTransactions] = useState<number>(50);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [logsVisible, setLogsVisible] = useState<boolean>(true);
  const [testMode, setTestMode] = useState<boolean>(true);
  const [worldId, setWorldId] = useState<string>('');
  const [entityIds, setEntityIds] = useState<string[]>([]);

  // Add wallet address monitoring specifically for the provider wallet shown in the test
  const [monitorWallet, setMonitorWallet] = useState<string>('9CY2wJfRViUotLbtBD67HAAXbyVvktEyfBmuinUxTBsh');
  const [includeWalletTxs, setIncludeWalletTxs] = useState<boolean>(true);

  const toggleTx = useCallback((signature: string) => {
    setExpandedTx(prev => prev === signature ? null : signature);
  }, []);

  // Add wallet monitoring to scan for both wallet and additional programs
  const getAllProgramsToMonitor = useCallback(() => {
    const programs = [...Object.values(DEFAULT_PROGRAM_IDS)];
    const systemPrograms = Object.values(SYSTEM_PROGRAM_IDS);
    return [...programs, ...systemPrograms];
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const connection = new Connection(endpoint);
      const programsToMonitor = getAllProgramsToMonitor().map(id => new PublicKey(id));
      
      // Prepare an array to hold all transactions
      const allTransactions: TransactionData[] = [];
      
      // Fetch recent transactions for each program
      for (const programId of programsToMonitor) {
        try {
          // Get all recent transaction signatures for this program
          const signatures = await connection.getSignaturesForAddress(programId, { limit: 5 });
          
          // Only process transactions we haven't seen yet
          const newSignatures = signatures.filter(sig => 
            !transactions.some(tx => tx.signature === sig.signature)
          );
          
          if (newSignatures.length === 0) continue;
          
          // Fetch full transaction details
          for (const sig of newSignatures) {
            try {
              const tx = await connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
              });
              
              if (!tx) continue;
              
              // Identify which program was involved
              const programIdStr = programId.toString();
              
              // Determine program name from either YieldWars or system programs
              let programName = 'unknown';
              const yieldWarsProgram = Object.entries(DEFAULT_PROGRAM_IDS)
                .find(([, id]) => id === programIdStr);
              
              if (yieldWarsProgram) {
                programName = yieldWarsProgram[0];
              } else {
                const systemProgram = Object.entries(SYSTEM_PROGRAM_IDS)
                  .find(([, id]) => id === programIdStr);
                if (systemProgram) {
                  programName = `system:${systemProgram[0]}`;
                }
              }
              
              // Extract logs if present
              const logs = tx.meta?.logMessages || [];
              
              // Look for World creation in logs
              const worldCreationPattern = /Initialized a new world \(ID=(.*?)\)/;
              let worldId = '';
              for (const log of logs) {
                const match = log.match(worldCreationPattern);
                if (match && match[1]) {
                  worldId = match[1];
                  setWorldId(match[1]); // Store world ID globally
                  break;
                }
              }
              
              // Look for Entity creation in logs
              const entityCreationPattern = /Initialized a new Entity \(ID=(.*?)\)/;
              let entityId = '';
              for (const log of logs) {
                const match = log.match(entityCreationPattern);
                if (match && match[1]) {
                  entityId = match[1];
                  // Add to global entity list
                  setEntityIds(prev => {
                    if (!prev.includes(match[1])) {
                      return [...prev, match[1]];
                    }
                    return prev;
                  });
                  break;
                }
              }
              
              // Enhance transaction data with any found IDs
              const enhancedData: EnhancedData = {};
              if (worldId) enhancedData.worldId = worldId;
              if (entityId) enhancedData.entityId = entityId;
              
              // Add to transaction list
              allTransactions.push({
                signature: sig.signature,
                timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                programId: programIdStr,
                programName,
                success: tx.meta?.err === null,
                logs,
                enhancedData
              });
            } catch (err) {
              console.error('Error fetching transaction details:', err);
            }
          }
        } catch (err) {
          console.error(`Error fetching signatures for program ${programId.toString()}:`, err);
        }
      }
      
      // If wallet monitoring is enabled, also fetch transactions for the specified wallet
      if (includeWalletTxs && monitorWallet) {
        try {
          const walletPubkey = new PublicKey(monitorWallet);
          const walletSignatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 10 });
          
          // Only process transactions we haven't seen yet
          const newWalletSignatures = walletSignatures.filter(sig => 
            !transactions.some(tx => tx.signature === sig.signature) &&
            !allTransactions.some(tx => tx.signature === sig.signature)
          );
          
          // Fetch full transaction details for wallet transactions
          for (const sig of newWalletSignatures) {
            try {
              const tx = await connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
              });
              
              if (!tx) continue;
              
              // Try to identify which program was involved in this wallet transaction
              let programName = 'wallet-transaction';
              let programIdStr = '';
              
              // Look through instructions to find program IDs
              if (tx.transaction?.message?.instructions) {
                for (const ix of tx.transaction.message.instructions) {
                  if ('programId' in ix) {
                    const programId = ix.programId.toString();
                    
                    // Check in YieldWars programs first
                    const knownProgram = Object.entries(DEFAULT_PROGRAM_IDS)
                      .find(([, id]) => id === programId);
                    
                    if (knownProgram) {
                      programName = knownProgram[0];
                      programIdStr = knownProgram[1];
                      break;
                    } 
                    
                    // Then check in system programs
                    const systemProgram = Object.entries(SYSTEM_PROGRAM_IDS)
                      .find(([, id]) => id === programId);
                    
                    if (systemProgram) {
                      programName = `system:${systemProgram[0]}`;
                      programIdStr = systemProgram[1];
                      break;
                    } else {
                      programIdStr = programId;
                    }
                  }
                }
              }
              
              // Extract and shorten logs if present
              const logs = tx.meta?.logMessages || [];
              
              // Look for specific log patterns in test output
              const enhancedData: EnhancedData = {};
              
              // Look for World creation in logs
              const worldCreationPattern = /Initialized a new world \(ID=(.*?)\)/;
              for (const log of logs) {
                const match = log.match(worldCreationPattern);
                if (match && match[1]) {
                  enhancedData.worldId = match[1];
                  setWorldId(match[1]); // Store world ID globally
                  break;
                }
              }
              
              // Add to transaction list
              allTransactions.push({
                signature: sig.signature,
                timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                programId: programIdStr,
                programName,
                success: tx.meta?.err === null,
                logs,
                walletTransaction: true,
                enhancedData
              });
            } catch (err) {
              console.error('Error fetching wallet transaction details:', err);
            }
          }
        } catch (err) {
          console.error('Error fetching wallet transactions:', err);
        }
      }
      
      // Combine new transactions with existing ones, sort by timestamp (newest first)
      // and limit to maxTransactions
      setTransactions(prev => {
        const combined = [...prev, ...allTransactions]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, maxTransactions);
        return combined;
      });
      
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(`Error fetching transactions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, getAllProgramsToMonitor, includeWalletTxs, maxTransactions, monitorWallet, transactions]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isAutoRefresh) {
      // Initial fetch
      fetchTransactions();
      
      // Set up interval for subsequent fetches
      intervalId = setInterval(() => {
        fetchTransactions();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefresh, refreshInterval, fetchTransactions]);

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return new Date(timestamp).toLocaleString();
  };

  const clearTransactions = () => {
    setTransactions([]);
    setEntityIds([]);
  };

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Transaction Monitor</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Test Mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
      
      {/* Test Mode Info Panel */}
      {testMode && (
        <div className="mb-4 bg-indigo-900/30 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <h3 className="text-indigo-300 font-medium">Test Session Information</h3>
            <span className="text-xs text-indigo-300">Auto-refreshing every 2 seconds</span>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-indigo-950/50 p-2 rounded">
              <div className="text-xs text-indigo-300 mb-1">World ID</div>
              <div className="font-mono text-sm truncate">
                {worldId || 'No world created yet'}
              </div>
            </div>
            <div className="bg-indigo-950/50 p-2 rounded">
              <div className="text-xs text-indigo-300 mb-1">Entity Count</div>
              <div className="font-mono text-sm">{entityIds.length}</div>
            </div>
            {entityIds.length > 0 && (
              <div className="md:col-span-2 bg-indigo-950/50 p-2 rounded">
                <div className="text-xs text-indigo-300 mb-1">Entities</div>
                <div className="flex flex-wrap gap-1">
                  {entityIds.map((id, idx) => (
                    <span key={id} className="inline-block px-2 py-0.5 bg-indigo-900/50 rounded text-xs font-mono">
                      Entity #{idx+1}: {id.slice(0, 6)}...{id.slice(-4)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!testMode && (
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col space-y-2">
            <label htmlFor="endpoint" className="text-sm font-medium">
              Solana Endpoint
            </label>
            <input
              id="endpoint"
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="bg-gray-700 px-3 py-2 rounded text-white"
              placeholder="http://0.0.0.0:8899"
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="walletAddress" className="text-sm font-medium">
                Monitor Wallet Address
              </label>
              <div className="flex items-center space-x-1">
                <input
                  id="includeWalletTxs"
                  type="checkbox"
                  checked={includeWalletTxs}
                  onChange={(e) => setIncludeWalletTxs(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="includeWalletTxs" className="text-sm">
                  Include Wallet Transactions
                </label>
              </div>
            </div>
            <input
              id="walletAddress"
              type="text"
              value={monitorWallet}
              onChange={(e) => setMonitorWallet(e.target.value)}
              className="bg-gray-700 px-3 py-2 rounded text-white font-mono text-sm"
              placeholder="Enter wallet address to monitor"
            />
            <p className="text-xs text-gray-400">Default: Test Wallet Address (from anchor tests)</p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md"
              >
                {loading ? 'Loading...' : 'Refresh Now'}
              </button>
              
              <div className="flex items-center space-x-1">
                <input
                  id="autoRefresh"
                  type="checkbox"
                  checked={isAutoRefresh}
                  onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="autoRefresh" className="text-sm">
                  Auto Refresh
                </label>
              </div>
              
              <div className="flex items-center space-x-1 ml-4">
                <input
                  id="showLogs"
                  type="checkbox"
                  checked={logsVisible}
                  onChange={(e) => setLogsVisible(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="showLogs" className="text-sm">
                  Show Logs
                </label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="refreshInterval" className="text-sm">
                Refresh every:
              </label>
              <input
                id="refreshInterval"
                type="number"
                min="1"
                max="60"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-gray-700 px-2 py-1 rounded w-16 text-white"
              />
              <span className="text-sm">seconds</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Simplified controls for test mode */}
      {testMode && (
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md"
            >
              {loading ? 'Loading...' : 'Refresh Now'}
            </button>
            
            <div className="flex items-center space-x-1">
              <input
                id="autoRefresh"
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="autoRefresh" className="text-sm">
                Auto Refresh
              </label>
            </div>
            
            <div className="flex items-center space-x-1 ml-4">
              <input
                id="showLogs"
                type="checkbox"
                checked={logsVisible}
                onChange={(e) => setLogsVisible(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="showLogs" className="text-sm">
                Show Logs
              </label>
            </div>
          </div>
          
          <button
            onClick={clearTransactions}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
          >
            Clear All
          </button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {lastRefresh && (
        <div className="text-gray-400 text-sm mb-2">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
      
      <div className="mt-4">
        <h3 className="text-xl font-semibold mb-2">
          Recent Transactions: {transactions.length}
        </h3>
        
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div 
                key={tx.signature}
                className={`bg-gray-700 rounded-md overflow-hidden ${tx.walletTransaction ? 'border border-yellow-500' : ''}`}
              >
                <div
                  onClick={() => toggleTx(tx.signature)}
                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                    <span className="text-gray-400 text-xs">
                      {formatTimeAgo(tx.timestamp)}
                    </span>
                    <span className={`${tx.walletTransaction ? 'text-yellow-400' : 'text-purple-400'}`}>
                      {tx.walletTransaction ? `👤 ${tx.programName}` : tx.programName}
                    </span>
                    <span className="text-gray-300 text-sm font-mono">
                      {tx.signature.substring(0, 8)}...{tx.signature.substring(tx.signature.length - 8)}
                    </span>
                    <span className={tx.success ? "text-green-400" : "text-red-400"}>
                      {tx.success ? "✓ Success" : "✗ Failed"}
                    </span>
                  </div>
                  <span>{expandedTx === tx.signature ? '▼' : '▶'}</span>
                </div>
                
                {expandedTx === tx.signature && (
                  <div className="p-3 border-t border-gray-600">
                    <div className="mb-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Signature:</span>
                        <a 
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=custom&customUrl=${encodeURIComponent(endpoint)}`}
                          target="_blank"
                          className="text-blue-400 hover:underline font-mono text-sm"
                        >
                          {tx.signature}
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Program:</span>
                        <span className="font-mono text-sm">{tx.programId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Time:</span>
                        <span className="font-mono text-sm">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      
                      {/* Enhanced information from logs */}
                      {tx.enhancedData && Object.keys(tx.enhancedData).length > 0 && (
                        <div className="mt-2 p-2 bg-blue-900/30 rounded">
                          <h5 className="text-blue-300 text-sm font-medium mb-1">Extracted Information:</h5>
                          <div className="space-y-1">
                            {(tx.enhancedData?.worldId as string) && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">World ID:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.worldId as string}</span>
                              </div>
                            )}
                            {(tx.enhancedData?.entityId as string) && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Entity ID:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.entityId as string}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {tx.walletTransaction && (
                        <div className="mt-2 p-2 bg-yellow-900/30 rounded">
                          <span className="text-yellow-300 text-sm">Wallet Transaction</span>
                        </div>
                      )}
                    </div>
                    
                    {logsVisible && tx.logs && tx.logs.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold mb-1">Logs:</h4>
                        <pre className="text-xs bg-gray-900 p-2 rounded-md overflow-x-auto max-h-40 overflow-y-auto">
                          {tx.logs.map((log, idx) => {
                            // Highlight key patterns in logs
                            const isWorldLog = log.includes("Initialized a new world");
                            const isEntityLog = log.includes("Initialized a new Entity");
                            const isComponentLog = log.includes("Initialized the") && log.includes("component");
                            const isEconomyLog = log.includes("Applied economy system");
                            const isDarkHighlight = idx % 2 === 0;
                            
                            return (
                              <div 
                                key={idx} 
                                className={`leading-tight py-0.5 px-1 ${isDarkHighlight ? 'bg-gray-800/50' : ''} ${
                                  isWorldLog ? 'text-green-400 font-medium' : 
                                  isEntityLog ? 'text-blue-400 font-medium' :
                                  isComponentLog ? 'text-purple-400 font-medium' :
                                  isEconomyLog ? 'text-yellow-400 font-medium' : ''
                                }`}
                              >
                                {log}
                              </div>
                            );
                          })}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 italic">
            {loading ? 'Fetching transactions...' : 'No transactions found'}
          </div>
        )}
      </div>
    </div>
  );
}; 