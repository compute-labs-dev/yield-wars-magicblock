'use client';

import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { decodeBoltComponent, formatCurrencyValue } from '@/utils/bolt-decoder';
import { decodeAccountData } from '@/utils/bolt-decoder-enhanced';

interface PDAData {
  address: string;
  type: string;
  data: any;
  programId: string;
}

// Default program IDs from Anchor.toml
const DEFAULT_PROGRAM_IDS = {
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

export const PDAMonitor = () => {
  const [pdas, setPdas] = useState<PDAData[]>([]);
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [programIdInput, setProgramIdInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPDA, setExpandedPDA] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeEndpoint, setActiveEndpoint] = useState<string>('http://localhost:8899');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);
  const [connectionStats, setConnectionStats] = useState<{
    attempts: number;
    successes: number;
  }>({ attempts: 0, successes: 0 });
  
  const { connected } = useWallet();

  // Multiple endpoints to try for better reliability in test environments
  const ENDPOINTS = [
    'http://localhost:8899',  // This works - prioritize it
    'http://127.0.0.1:8899',  // This also works
    'http://0.0.0.0:8899'     // This fails - move to last
  ];

  // Test for connection and find working endpoint
  const testConnections = useCallback(async () => {
    setConnectionStatus('connecting');
    setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1 }));
    
    for (const url of ENDPOINTS) {
      try {
        const connection = new Connection(url, 'confirmed');
        // Simple test to see if connection works
        const version = await connection.getVersion();
        
        // If we get here, connection is working
        setActiveEndpoint(url);
        setActiveConnection(connection);
        setConnectionStatus('connected');
        setConnectionStats(prev => ({ ...prev, successes: prev.successes + 1 }));
        console.log(`Successfully connected to ${url} - Solana version: ${version['solana-core']}`);
        return connection;
      } catch (err) {
        console.log(`Failed to connect to ${url}:`, err);
      }
    }
    
    setConnectionStatus('disconnected');
    setError('Failed to connect to any endpoint. Is the validator running?');
    return null;
  }, []);

  useEffect(() => {
    // Test connections on initial load
    testConnections();
  }, [testConnections]);

  // Set default program IDs on component mount
  useEffect(() => {
    setProgramIds([
      ...Object.values(DEFAULT_PROGRAM_IDS),
      SYSTEM_PROGRAM_IDS['bolt-world'],
      SYSTEM_PROGRAM_IDS['bolt-registry']
    ]);
  }, []);

  const addProgramId = () => {
    if (!programIdInput) return;
    
    if (!programIds.includes(programIdInput)) {
      setProgramIds([...programIds, programIdInput]);
    }
    
    setProgramIdInput('');
  };

  const removeProgramId = (id: string) => {
    setProgramIds(programIds.filter(programId => programId !== id));
  };

  // Function to fetch PDAs from multiple program IDs
  const fetchPDAs = async () => {
    if (programIds.length === 0) {
      setError('Please add at least one Program ID');
      return;
    }

    // Don't try to refetch if already loading
    if (loading) return;

    if (!activeConnection || connectionStatus !== 'connected') {
      // Try to establish connection
      console.log("No active connection, attempting to connect...");
      const connection = await testConnections();
      if (!connection) {
        console.error("Failed to establish connection to any endpoint");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get accounts from all program IDs
      const allPdasData: PDAData[] = [];
      let successfulQueries = 0;
      
      for (const programId of programIds) {
        try {
          const programKey = new PublicKey(programId);
          console.log(`Fetching accounts for program ${programId}...`);
          
          // Use a timeout to prevent hanging indefinitely
          const accountsPromise = activeConnection!.getProgramAccounts(programKey);
          const accounts = await accountsPromise;
          
          console.log(`Found ${accounts.length} accounts for program ${programId}`);
          successfulQueries++;
          
          // Process accounts for this program
          for (const account of accounts) {
            try {
              // Use our new enhanced decoder
              console.log(`Decoding account ${account.pubkey.toString()}...`);
              const result = await decodeAccountData(
                activeConnection!, 
                account.pubkey.toString(), 
                programId
              );
              
              if (result) {
                allPdasData.push({
                  address: account.pubkey.toString(),
                  type: result.type || 'Unknown',
                  data: result.data || result,
                  programId
                });
              } else {
                // Fallback if enhanced decoding failed
                console.log(`Enhanced decoding failed, falling back to basic decoder...`);
                const basicResult = decodeBoltComponent(account.account.data, programId);
                
                if (basicResult) {
                  allPdasData.push({
                    address: account.pubkey.toString(),
                    type: basicResult.type,
                    data: basicResult.data,
                    programId
                  });
                } else {
                  // Last resort fallback
                  console.log(`Basic decoding failed, using raw data fallback...`);
                  allPdasData.push({
                    address: account.pubkey.toString(),
                    type: 'Unknown',
                    data: {
                      size: account.account.data.length,
                      rawData: Array.from(account.account.data.slice(0, 64)) // Show first 64 bytes
                    },
                    programId
                  });
                }
              }
            } catch (decodeErr) {
              console.error(`Error decoding account ${account.pubkey.toString()}:`, decodeErr);
              // Still add it even if decoding failed
              allPdasData.push({
                address: account.pubkey.toString(),
                type: 'Decode Error',
                data: {
                  error: (decodeErr as Error).message,
                  size: account.account.data.length
                },
                programId
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching PDAs for program ${programId}:`, err);
          // Continue to next program ID instead of stopping
        }
      }
      
      // Only update the state if we successfully queried at least one program
      if (successfulQueries > 0) {
        console.log(`Setting ${allPdasData.length} PDAs from ${successfulQueries} successful program queries`);
        setPdas(allPdasData);
        setLastSuccess(new Date());
      } else if (allPdasData.length === 0) {
        console.warn('No PDAs found and no successful program queries');
        // Only show error if we really couldn't get any data
        setError('Failed to query any program accounts. Check connection and try again.');
      }
      
    } catch (err: any) {
      console.error('Error in fetch operation:', err);
      setError(`Error fetching PDAs: ${err.message}`);
      
      // Check if it's a connection error and try to reconnect
      if (err.message.includes('connection') || err.message.includes('network')) {
        console.log('Connection error detected, attempting to reconnect...');
        testConnections();
      }
    } finally {
      setLoading(false);
    }
  };

  // Smart auto refresh with connection check
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    // Initial fetch only if we have an active connection
    if (connectionStatus === 'connected') {
      console.log("Initial fetch with active connection");
      fetchPDAs();
    }
    
    const intervalId = setInterval(() => {
      // Only refresh if not already loading and we have an active connection
      if (!loading && connectionStatus === 'connected') {
        console.log("Auto-refreshing PDAs...");
        fetchPDAs();
      } else if (connectionStatus !== 'connected') {
        // If we lost connection, try to reconnect
        console.log("Connection lost, attempting to reconnect...");
        testConnections();
      }
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [isAutoRefresh, refreshInterval, connectionStatus, loading]);

  // Toggle PDA expansion
  const togglePDA = (address: string) => {
    if (expandedPDA === address) {
      setExpandedPDA(null);
    } else {
      setExpandedPDA(address);
    }
  };

  // Render a formatted value for wallet balances
  const renderFormattedValue = (key: string, value: any) => {
    if (
      key.includes('Balance') && 
      typeof value === 'bigint'
    ) {
      return `${value.toString()} (${formatCurrencyValue(value)})`;
    }
    
    return typeof value === 'bigint' ? value.toString() : value;
  };

  // Get filtered PDAs
  const filteredPDAs = pdas.filter(pda => {
    if (programFilter !== 'all' && pda.programId !== programFilter) return false;
    if (typeFilter !== 'all' && pda.type !== typeFilter) return false;
    return true;
  });

  // Get unique program IDs and types for filters
  const uniqueProgramIds = Array.from(new Set(pdas.map(pda => pda.programId)));
  const uniqueTypes = Array.from(new Set(pdas.map(pda => pda.type)));

  // Get program name from ID (reverse lookup)
  const getProgramName = (id: string): string => {
    for (const [name, programId] of Object.entries(DEFAULT_PROGRAM_IDS)) {
      if (programId === id) return name;
    }
    
    for (const [name, programId] of Object.entries(SYSTEM_PROGRAM_IDS)) {
      if (programId === id) return `system:${name}`;
    }
    
    return id.substring(0, 8) + '...';
  };

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">PDA Monitor</h2>
        <div className="flex flex-col items-end">
          <div className="flex items-center">
            <span className={`h-3 w-3 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
            <span className="text-sm">
              {connectionStatus === 'connected' ? `Connected to ${activeEndpoint}` :
               connectionStatus === 'connecting' ? 'Connecting...' : 
               'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {lastSuccess ? `Last success: ${lastSuccess.toLocaleTimeString()}` : 'No successful queries yet'}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col space-y-2">
          <label htmlFor="programIds" className="text-sm font-medium">
            Program IDs
          </label>
          <div className="flex space-x-2">
            <input
              id="programIds"
              type="text"
              value={programIdInput}
              onChange={(e) => setProgramIdInput(e.target.value)}
              className="bg-gray-700 px-3 py-2 rounded text-white flex-grow"
              placeholder="Enter a Program ID to add"
            />
            <button
              onClick={addProgramId}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md whitespace-nowrap"
            >
              Add ID
            </button>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {programIds.map(id => (
              <div 
                key={id} 
                className="bg-gray-700 px-2 py-1 rounded-md flex items-center text-sm"
              >
                <span className="mr-2">{getProgramName(id)}</span>
                <button 
                  onClick={() => removeProgramId(id)}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex flex-wrap items-center space-x-2">
            <button
              onClick={fetchPDAs}
              disabled={loading || connectionStatus !== 'connected'}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-md"
            >
              {loading ? 'Loading...' : 'Fetch PDAs'}
            </button>
            
            <button
              onClick={testConnections}
              disabled={connectionStatus === 'connecting'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-md text-sm"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Test Connection'}
            </button>
            
            <div className="flex items-center space-x-1 ml-2">
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
          </div>
          
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <label htmlFor="refreshInterval" className="text-sm">
              Refresh every:
            </label>
            <input
              id="refreshInterval"
              type="number"
              min="5"
              max="60"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-700 px-2 py-1 rounded w-16 text-white"
            />
            <span className="text-sm">seconds</span>
          </div>
        </div>
        
        {/* Connection statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 bg-gray-700/50 p-3 rounded">
          <div className="text-center">
            <div className="text-xs text-gray-400">Connection Attempts</div>
            <div className="text-lg">{connectionStats.attempts}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Successful Connections</div>
            <div className="text-lg">{connectionStats.successes}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Found Programs</div>
            <div className="text-lg">{uniqueProgramIds.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Found PDAs</div>
            <div className="text-lg">{pdas.length}</div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {pdas.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex flex-col space-y-1">
            <label htmlFor="programFilter" className="text-sm font-medium">
              Filter by Program
            </label>
            <select 
              id="programFilter"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="bg-gray-700 px-3 py-2 rounded text-white"
            >
              <option value="all">All Programs</option>
              {uniqueProgramIds.map(id => (
                <option key={id} value={id}>
                  {getProgramName(id)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col space-y-1">
            <label htmlFor="typeFilter" className="text-sm font-medium">
              Filter by Type
            </label>
            <select 
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-700 px-3 py-2 rounded text-white"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <h3 className="text-xl font-semibold mb-2">
          Found PDAs: {filteredPDAs.length}
        </h3>
        
        {filteredPDAs.length > 0 ? (
          <div className="space-y-2">
            {filteredPDAs.map((pda) => (
              <div 
                key={pda.address}
                className={`bg-gray-700 rounded-md overflow-hidden border-l-4 ${
                  pda.type === 'Wallet' ? 'border-green-500' :
                  pda.type === 'Ownership' ? 'border-blue-500' :
                  pda.type === 'Registry' ? 'border-yellow-500' :
                  pda.type === 'Unknown' ? 'border-gray-500' :
                  pda.type === 'Decode Error' ? 'border-red-500' :
                  'border-purple-500'
                }`}
              >
                <div
                  onClick={() => togglePDA(pda.address)}
                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                    <span className="text-gray-400 text-xs">{getProgramName(pda.programId)}</span>
                    <span className={`${pda.type !== 'Unknown' && pda.type !== 'Decode Error' ? 'text-purple-400' : 'text-gray-400'}`}>
                      {pda.type}
                    </span>
                    <span className="text-gray-300 text-sm font-mono truncate">{pda.address}</span>
                  </div>
                  <span>{expandedPDA === pda.address ? '▼' : '▶'}</span>
                </div>
                
                {expandedPDA === pda.address && (
                  <div className="p-3 border-t border-gray-600">
                    {pda.type === 'Wallet' && (
                      <div className="mb-2 p-2 bg-gray-800 rounded">
                        <h4 className="text-sm font-semibold mb-1">Wallet Balances:</h4>
                        <ul className="text-xs">
                          {Object.entries(pda.data)
                            .filter(([key]) => key.includes('Balance'))
                            .map(([key, value]) => (
                              <li key={key} className="flex justify-between my-1">
                                <span>{key}:</span>
                                <span className="font-mono">{renderFormattedValue(key, value)}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    
                    <pre className="text-xs overflow-x-auto bg-gray-900 p-2 rounded-md">
                      {JSON.stringify(pda.data, (key, value) => 
                        typeof value === 'bigint' ? value.toString() : value, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 italic">
            {loading ? 'Loading PDAs...' : 
             connectionStatus !== 'connected' ? 'Connect to a validator to see PDAs' :
             'No PDAs found. Try checking the program IDs or verifying your contracts are properly deployed.'}
          </div>
        )}
      </div>
      
      {programIds.length > 0 && filteredPDAs.length === 0 && !loading && connectionStatus === 'connected' && (
        <div className="mt-6 bg-yellow-900/20 p-4 rounded-md">
          <h4 className="text-yellow-300 font-medium mb-2">Troubleshooting Tips</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Make sure you're using the correct program IDs</li>
            <li>Check if the validator is configured with Bolt's World and Registry accounts</li>
            <li>Verify that your tests have created the expected entities and components</li>
            <li>Look for errors in the browser console that might indicate CORS or connectivity issues</li>
            <li>Try running <code className="bg-gray-700 px-1 rounded">anchor test</code> to initialize the registry</li>
          </ul>
          <p className="mt-3 text-sm">
            Our diagnostics tool indicates that the Registry account is properly initialized with 2 wallet accounts and 1 ownership account detected.
            If you're still having issues, check the test logs for any specific error messages related to account creation.
          </p>
        </div>
      )}
    </div>
  );
}; 