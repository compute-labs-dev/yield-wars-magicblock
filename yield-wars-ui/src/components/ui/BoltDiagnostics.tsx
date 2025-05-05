'use client';

import { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { 
  checkValidatorConnection, 
  checkBoltWorld, 
  checkBoltRegistry,
  listProgramAccounts, 
  tryMultipleEndpoints 
} from '@/utils/validator-check';
import { decodeAccountData } from '@/utils/bolt-decoder-enhanced';

interface ValidatorInfo {
  connected: boolean;
  slot?: number;
  error?: string;
  version?: string;
  recentBlockhash?: string;
}

interface BoltWorldInfo {
  worldExists: boolean;
  error?: string;
  registryExists?: boolean;
  registryOwner?: string;
}

interface ProgramAccountInfo {
  success: boolean;
  count?: number;
  accounts?: string[];
  error?: string;
}

interface EndpointResult {
  connected: boolean;
  error?: string;
  details?: {
    version: string;
    slot: number;
  };
}

interface RegistryInfo {
  exists: boolean;
  success: boolean;
  isInitialized?: boolean;
  error?: string;
  size?: number;
  owner?: string;
  discriminator?: string;
}

interface AccountDetails {
  type?: string;
  data?: Record<string, unknown>;
  error?: string;
}

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

// Critical Bolt System IDs 
const BOLT_SYSTEM_IDS = {
  WORLD_PROGRAM: 'WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n',
  REGISTRY: 'EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K',
};

export const BoltDiagnostics = () => {
  const [endpoint, setEndpoint] = useState('http://localhost:8899');
  const [loading, setLoading] = useState(false);
  const [validatorInfo, setValidatorInfo] = useState<ValidatorInfo | null>(null);
  const [boltWorldInfo, setBoltWorldInfo] = useState<BoltWorldInfo | null>(null);
  const [programAccounts, setProgramAccounts] = useState<Record<string, ProgramAccountInfo>>({});
  const [endpointResults, setEndpointResults] = useState<Record<string, EndpointResult> | null>(null);
  const [registryTest, setRegistryTest] = useState<RegistryInfo | null>(null);
  const [accountDetails, setAccountDetails] = useState<Record<string, AccountDetails>>({});
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [diagnosticsSummary, setDiagnosticsSummary] = useState<{
    status: 'success' | 'warning' | 'error';
    message: string;
    issues: string[];
  } | null>(null);
  
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  
  // Create a connection instance when endpoint changes
  useEffect(() => {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      setActiveConnection(connection);
    } catch (err) {
      console.error('Error creating connection:', err);
      setActiveConnection(null);
    }
  }, [endpoint]);
  
  const runValidatorCheck = async () => {
    setLoading(true);
    try {
      const info = await checkValidatorConnection(endpoint);
      setValidatorInfo(info);
      return info;
    } catch (err) {
      console.error('Error checking validator:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const runBoltWorldCheck = async () => {
    setLoading(true);
    try {
      const info = await checkBoltWorld(endpoint);
      setBoltWorldInfo(info);
      return info;
    } catch (err) {
      console.error('Error checking Bolt World:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const checkPrograms = async () => {
    setLoading(true);
    try {
      const results: Record<string, ProgramAccountInfo> = {};
      
      for (const [name, id] of Object.entries(DEFAULT_PROGRAM_IDS)) {
        try {
          const info = await listProgramAccounts(endpoint, id);
          results[name] = info;
          
          // If we have accounts, fetch detailed information for the first one
          if (info.success && info.accounts && info.accounts.length > 0 && activeConnection) {
            try {
              const firstAccount = info.accounts[0];
              const decoded = await decodeAccountData(activeConnection, firstAccount, id);
              
              setAccountDetails(prev => ({
                ...prev,
                [firstAccount]: {
                  type: decoded?.type || 'Unknown',
                  data: decoded && 'data' in decoded ? decoded.data as Record<string, unknown> : {},
                  error: decoded && 'error' in decoded ? decoded.error : undefined
                }
              }));
            } catch (decodeErr) {
              console.error(`Error decoding account for ${name}:`, decodeErr);
            }
          }
        } catch (err) {
          results[name] = { success: false, error: (err as Error).message };
        }
      }
      
      setProgramAccounts(results);
      return results;
    } catch (err) {
      console.error('Error checking programs:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const checkAllEndpoints = async () => {
    setLoading(true);
    try {
      const results = await tryMultipleEndpoints();
      setEndpointResults(results as Record<string, EndpointResult>);
      
      // Set the first working endpoint as active
      for (const [url, result] of Object.entries(results)) {
        if (result.connected) {
          setEndpoint(url);
          break;
        }
      }
      
      return results;
    } catch (err) {
      console.error('Error checking endpoints:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Special test for registry account which is critical for Bolt
  const testRegistryAccount = async () => {
    setLoading(true);
    try {
      const registryDetails = await checkBoltRegistry(endpoint);
      setRegistryTest({ ...registryDetails, success: true });
      return { ...registryDetails, success: true };
    } catch (err) {
      console.error('Error testing registry account:', err);
      setRegistryTest({
        exists: false,
        success: false,
        error: (err as Error).message
      });
      return { exists: false, success: false };
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAccountDetails = async (accountAddress: string, programId: string) => {
    if (!activeConnection) return;
    
    try {
      setLoading(true);
      const details = await decodeAccountData(activeConnection, accountAddress, programId);
      setAccountDetails(prev => ({
        ...prev,
        [accountAddress]: {
          type: details?.type || 'Unknown',
          data: details && 'data' in details ? details.data as Record<string, unknown> : {},
          error: details && 'error' in details ? details.error : undefined
        }
      }));
    } catch (err) {
      console.error('Error fetching account details:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAccountExpanded = (accountAddress: string) => {
    if (expandedAccount === accountAddress) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountAddress);
    }
  };
  
  const runAllChecks = async () => {
    setLoading(true);
    try {
      // Run all diagnostics
      const endpointTest = await checkAllEndpoints();
      await runValidatorCheck();
      const boltWorldTest = await runBoltWorldCheck();
      const programTest = await checkPrograms();
      const registryCheckResult = await testRegistryAccount();
      
      // Generate a diagnostic summary
      const issues: string[] = [];
      
      // Check if we can connect to any endpoint
      const canConnect = endpointTest && Object.values(endpointTest).some(r => r.connected);
      if (!canConnect) {
        issues.push('Cannot connect to any Solana endpoint. Check that a validator is running.');
      }
      
      // Check if Bolt World is properly initialized
      if (!boltWorldTest?.worldExists) {
        issues.push('Bolt World program not found or not initialized.');
      }
      
      // Check if Registry exists, which is critical for Bolt
      if (!registryCheckResult.exists) {
        issues.push('Bolt Registry account not found at EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K.');
      } else if ('isInitialized' in registryCheckResult && !registryCheckResult.isInitialized) {
        issues.push('Registry account exists but may not be properly initialized. Check World ownership.');
      }
      
      // Check for program accounts
      const hasAnyProgramAccounts = programTest && 
        Object.values(programTest).some(p => p.success && (p.count ?? 0) > 0);
      
      if (!hasAnyProgramAccounts) {
        issues.push('No program accounts found for any components. Check if your test has created any entities.');
      }
      
      // Determine overall status
      let status: 'success' | 'warning' | 'error' = 'success';
      let message = 'All systems operational!';
      
      if (issues.length > 0) {
        if (!canConnect || !boltWorldTest?.worldExists || !registryCheckResult.exists) {
          status = 'error';
          message = 'Critical issues detected. Bolt ECS may not function properly.';
        } else {
          status = 'warning';
          message = 'Some issues detected, but system may still function.';
        }
      }
      
      setDiagnosticsSummary({
        status,
        message,
        issues
      });
      
    } catch (err) {
      console.error('Error running all checks:', err);
      setDiagnosticsSummary({
        status: 'error',
        message: 'Error running diagnostics',
        issues: [(err as Error).message]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Bolt Framework Diagnostics</h2>
      
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
            placeholder="http://localhost:8899"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runValidatorCheck}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md"
          >
            Check Validator
          </button>
          <button
            onClick={runBoltWorldCheck}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
          >
            Check Bolt World
          </button>
          <button
            onClick={testRegistryAccount}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md"
          >
            Test Registry
          </button>
          <button
            onClick={checkPrograms}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-md"
          >
            Check Programs
          </button>
          <button
            onClick={runAllChecks}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md font-bold"
          >
            Run All Checks
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="bg-gray-700 p-4 rounded-md mb-4">
          <p className="text-center">Running diagnostics...</p>
        </div>
      )}
      
      {/* Diagnostic Summary */}
      {diagnosticsSummary && (
        <div className={`mb-6 p-4 rounded-md ${
          diagnosticsSummary.status === 'success' ? 'bg-green-900/30' :
          diagnosticsSummary.status === 'warning' ? 'bg-yellow-900/30' : 'bg-red-900/30'
        }`}>
          <h3 className="text-xl font-semibold mb-2">Diagnostic Summary</h3>
          <div className="flex items-center mb-2">
            <div className={`w-4 h-4 rounded-full mr-2 ${
              diagnosticsSummary.status === 'success' ? 'bg-green-500' :
              diagnosticsSummary.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="font-medium">{diagnosticsSummary.message}</span>
          </div>
          
          {diagnosticsSummary.issues.length > 0 && (
            <div className="mt-2">
              <h4 className="font-medium mb-1">Issues Detected:</h4>
              <ul className="list-disc list-inside space-y-1">
                {diagnosticsSummary.issues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          {diagnosticsSummary.status === 'error' && (
            <div className="mt-3 p-3 bg-red-800/30 rounded">
              <h4 className="font-medium mb-1">Recommendation:</h4>
              <p className="text-sm">
                Try running <code className="bg-gray-800 px-1 rounded">anchor test</code> in your terminal 
                to ensure the Bolt framework is properly initialized with all required genesis accounts.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Registry Test Results */}
      {registryTest && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Registry Account Test</h3>
          <div className="bg-gray-700 p-4 rounded-md">
            <div className="flex justify-between">
              <span>Registry Account:</span>
              <span className={registryTest.exists ? "text-green-400" : "text-red-400"}>
                {registryTest.exists ? "✓ Found" : "✗ Not Found"}
              </span>
            </div>
            <div className="mt-1 text-sm font-mono break-all">
              {BOLT_SYSTEM_IDS.REGISTRY}
            </div>
            
            {registryTest.exists && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Account Size:</span>
                  <span>{registryTest.size} bytes</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="font-mono">{registryTest.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Initialized:</span>
                  <span className={registryTest.isInitialized ? "text-green-400" : "text-yellow-400"}>
                    {registryTest.isInitialized ? "Yes" : "Possibly not"}
                  </span>
                </div>
                {registryTest.discriminator && (
                  <div className="flex justify-between">
                    <span>Discriminator:</span>
                    <span className="font-mono">{registryTest.discriminator}</span>
                  </div>
                )}
              </div>
            )}
            
            {registryTest.error && (
              <div className="mt-2 p-2 bg-red-800/30 rounded text-sm">
                <span className="font-medium">Error:</span> {registryTest.error}
              </div>
            )}
            
            {!registryTest.exists && (
              <div className="mt-2 p-2 bg-yellow-800/30 rounded text-sm">
                <p>
                  The Bolt Registry account is <strong>required</strong> for the Bolt ECS framework to function properly.
                  This account is typically created during validator genesis when running Anchor tests.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {endpointResults && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Endpoint Tests</h3>
          <div className="bg-gray-700 p-4 rounded-md">
            {Object.entries(endpointResults).map(([url, result]: [string, EndpointResult]) => (
              <div key={url} className="mb-2 last:mb-0 p-2 rounded-md bg-gray-800">
                <div className="flex justify-between">
                  <span className="font-mono">{url}</span>
                  <span className={result.connected ? "text-green-400" : "text-red-400"}>
                    {result.connected ? "✓ Connected" : "✗ Failed"}
                  </span>
                </div>
                {result.connected && result.details && (
                  <div className="mt-1 text-sm">
                    <div>Version: {result.details.version}</div>
                    <div>Slot: {result.details.slot}</div>
                  </div>
                )}
                {!result.connected && result.error && (
                  <div className="mt-1 text-sm text-red-300">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {validatorInfo && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Validator Information</h3>
          <div className="bg-gray-700 p-4 rounded-md">
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <span className={validatorInfo.connected ? "text-green-400" : "text-red-400"}>
                {validatorInfo.connected ? "✓ Connected" : "✗ Failed"}
              </span>
            </div>
            {validatorInfo.connected && (
              <>
                <div className="flex justify-between">
                  <span>Solana Version:</span>
                  <span>{validatorInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Slot:</span>
                  <span>{validatorInfo.slot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Blockhash:</span>
                  <span className="font-mono text-sm">{validatorInfo.recentBlockhash}</span>
                </div>
              </>
            )}
            {!validatorInfo.connected && validatorInfo.error && (
              <div className="mt-2 text-red-300">
                Error: {validatorInfo.error}
              </div>
            )}
          </div>
        </div>
      )}
      
      {boltWorldInfo && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Bolt World Information</h3>
          <div className="bg-gray-700 p-4 rounded-md">
            <div className="flex justify-between">
              <span>World Program:</span>
              <span className={boltWorldInfo.worldExists ? "text-green-400" : "text-red-400"}>
                {boltWorldInfo.worldExists ? "✓ Found" : "✗ Not Found"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Registry Account:</span>
              <span className={boltWorldInfo.registryExists ? "text-green-400" : "text-red-400"}>
                {boltWorldInfo.registryExists ? "✓ Found" : "✗ Not Found"}
              </span>
            </div>
            {boltWorldInfo.registryExists && boltWorldInfo.registryOwner && (
              <div className="flex justify-between">
                <span>Registry Owner:</span>
                <span className="font-mono text-xs">
                  {boltWorldInfo.registryOwner}
                </span>
              </div>
            )}
            {boltWorldInfo.error && (
              <div className="mt-2 text-red-300">
                Error: {boltWorldInfo.error}
              </div>
            )}
          </div>
        </div>
      )}
      
      {Object.keys(programAccounts).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Program Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(programAccounts).map(([name, info]: [string, ProgramAccountInfo]) => (
              <div key={name} className="bg-gray-700 p-4 rounded-md">
                <div className="flex justify-between">
                  <span className="font-semibold">{name}</span>
                  <span className={info.success ? "text-green-400" : "text-red-400"}>
                    {info.success ? `✓ ${info.count || 0} accounts` : "✗ Failed"}
                  </span>
                </div>
                {info.success && (info.count ?? 0) > 0 && (
                  <div className="mt-2 text-sm max-h-40 overflow-y-auto">
                    <div className="font-medium mb-1">Account Addresses:</div>
                    {info.accounts?.map((address: string, idx: number) => (
                      <div key={idx} className="font-mono text-xs">
                        <div 
                          className="flex justify-between items-center cursor-pointer hover:bg-gray-600 p-1 rounded"
                          onClick={() => {
                            toggleAccountExpanded(address);
                            if (!accountDetails[address] && activeConnection) {
                              fetchAccountDetails(address, DEFAULT_PROGRAM_IDS[name]);
                            }
                          }}
                        >
                          <span className="truncate">{address}</span>
                          <span>{expandedAccount === address ? '▼' : '▶'}</span>
                        </div>
                        
                        {expandedAccount === address && (
                          <div className="p-2 bg-gray-800 rounded mt-1">
                            {accountDetails[address] ? (
                              <div>
                                <div className="font-medium text-blue-300">
                                  {accountDetails[address].type || 'Unknown'} Details:
                                </div>
                                <pre className="text-xs mt-1 overflow-x-auto">
                                  {JSON.stringify(accountDetails[address].data || accountDetails[address], null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">
                                Loading account details...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!info.success && info.error && (
                  <div className="mt-2 text-sm text-red-300">
                    Error: {info.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 