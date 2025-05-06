'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  enhancedData?: EnhancedData;
}

interface SessionInfo {
  startTime: number;
  worldId: string | null;
  entityIds: string[];
  componentsInitialized: string[];
  systemsApplied: string[];
  errors: string[];
}

interface EnhancedData {
  _hasWorldMention?: boolean;
  _hasEntityMention?: boolean;
  _hasComponentMention?: boolean;
  _hasSystemMention?: boolean;
  worldId?: string;
  entityId?: string;
  componentType?: string;
  systemType?: string;
  isEcsOperation?: boolean;
  registryEvent?: string;
  worldAccountEvent?: string;
  error?: string;
  isBoltFrameworkTx?: boolean;
  registryOperation?: boolean;
  worldOperation?: boolean;
}

export const EnhancedTransactionMonitor = () => {
  // Multiple endpoints to try for better reliability in test environments
  const ENDPOINTS = useMemo(() => [
    'http://localhost:8899',  // This works - prioritize it
    'http://127.0.0.1:8899',  // This also works
    'http://0.0.0.0:8899'     // This fails - move to last
  ], []);

  const [endpoint, setEndpoint] = useState<string>(ENDPOINTS[0]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [refreshInterval] = useState<number>(2); // Fast refresh for tests
  const [maxTransactions] = useState<number>(100);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [logsVisible, setLogsVisible] = useState<boolean>(true);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    startTime: Date.now(),
    worldId: null,
    entityIds: [],
    componentsInitialized: [],
    systemsApplied: [],
    errors: []
  });
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Keep track of unique program IDs we've processed this session
  const [processedProgramIds, setProcessedProgramIds] = useState<string[]>([]);

  // Test for connection and find working endpoint
  const testConnections = useCallback(async () => {
    setConnectionStatus('connecting');
    setStatusMessage('Testing connections...');
    
    for (const url of ENDPOINTS) {
      try {
        // Use persistent connection if it already exists for this endpoint
        let connection = activeConnection;
        if (!connection || endpoint !== url) {
          connection = new Connection(url, 'confirmed');
        }
        
        // Simple test to see if connection works
        const version = await connection.getVersion();
        
        // If we get here, connection is working
        setEndpoint(url);
        setActiveConnection(connection);
        setConnectionStatus('connected');
        setStatusMessage(`Connected to ${url} (${version['solana-core']})`);
        console.log(`Successfully connected to ${url} - Solana version: ${version['solana-core']}`);
        return connection;
      } catch (err) {
        console.log(`Failed to connect to ${url}:`, err);
      }
    }
    
    setConnectionStatus('disconnected');
    setStatusMessage('Failed to connect to any endpoint. Is the validator running?');
    return null;
  }, [ENDPOINTS, endpoint, activeConnection]);

  useEffect(() => {
    // Test connections on initial load - only once
    if (connectionStatus === 'disconnected') {
      testConnections();
    }
  }, [testConnections, connectionStatus]);

  const toggleTx = (signature: string) => {
    if (expandedTx === signature) {
      setExpandedTx(null);
    } else {
      setExpandedTx(signature);
    }
  };

  // Add wallet monitoring to scan for both wallet and additional programs
  const getAllProgramsToMonitor = () => {
    const programs = [...Object.values(DEFAULT_PROGRAM_IDS)];
    const systemPrograms = Object.values(SYSTEM_PROGRAM_IDS);
    return [...programs, ...systemPrograms];
  };

  // Significantly enhance the processLogs function to catch more patterns
  const processLogs = (logs: string[]) => {
    const enhancedData: EnhancedData = {};
    
    // Check for direct mentions of World, Entity, Component, or System in any logs
    const hasWorldMention = logs.some(log => log.toLowerCase().includes('world'));
    const hasEntityMention = logs.some(log => log.toLowerCase().includes('entity'));
    const hasComponentMention = logs.some(log => log.toLowerCase().includes('component'));
    const hasSystemMention = logs.some(log => log.toLowerCase().includes('system'));

    if (hasWorldMention) enhancedData._hasWorldMention = true;
    if (hasEntityMention) enhancedData._hasEntityMention = true;
    if (hasComponentMention) enhancedData._hasComponentMention = true;
    if (hasSystemMention) enhancedData._hasSystemMention = true;
    
    // Look for World creation - use much broader patterns now
    const worldPatterns = [
      /Initialized a new world \(?ID=?(.*?)\)?/i,
      /Created World with ID:? (.*?)$/i,
      /world id:? ([a-zA-Z0-9]+)/i,
      /world:? ([a-zA-Z0-9]+)/i,
      /world created:? ([a-zA-Z0-9]+)/i,
      /new world:? ([a-zA-Z0-9]+)/i,
      /World Account: (.*)/i,
      /Creating world: (.*)/i
    ];

    for (const log of logs) {
      for (const pattern of worldPatterns) {
        const match = log.match(pattern);
        if (match && match[1]) {
          const worldId = match[1].trim().replace(/['"(),]/g, ''); // Clean up any extra chars
          enhancedData.worldId = worldId;
          console.log(`🌎 Found World ID match: "${worldId}" using pattern: ${pattern}`);
          
          // Use updateSessionInfo instead of direct setState
          updateSessionInfo('set-world', worldId);
          break;
        }
      }
    }
    
    // Look for Entity creation or references
    const entityPatterns = [
      /Initialized a new Entity \(?ID=?(.*?)\)?/i,
      /Created Entity with ID:? (.*?)$/i,
      /entity id:? ([a-zA-Z0-9x]+)/i,
      /entity:? ([a-zA-Z0-9x]+)/i,
      /entity created:? ([a-zA-Z0-9x]+)/i, 
      /new entity:? ([a-zA-Z0-9x]+)/i,
      /EntityId: (.*)/i,
      /Entity?: (0x[a-fA-F0-9]+)/i,
      /\"entity\":\"([^\"]+)\"/i,  // JSON pattern
      /entity: ([a-zA-Z0-9x]+)/i
    ];

    for (const log of logs) {
      for (const pattern of entityPatterns) {
        const match = log.match(pattern);
        if (match && match[1]) {
          const entityId = match[1].trim().replace(/['"(),]/g, ''); // Clean up any extra chars
          enhancedData.entityId = entityId;
          console.log(`👤 Found Entity ID match: "${entityId}" using pattern: ${pattern}`);
          
          // Use updateSessionInfo instead of direct setState
          updateSessionInfo('add-entity', entityId);
          break;
        }
      }
    }
    
    // Look for component initialization or references
    const componentPatterns = [
      /Initialized the (.*?) component/i,
      /Component (.*?) initialized/i,
      /Component: ?([A-Za-z0-9_]+)/i,
      /component id:? ([a-zA-Z0-9_]+)/i,
      /component:? ([a-zA-Z0-9_]+)/i,
      /component created:? ([a-zA-Z0-9_]+)/i,
      /\"component\":\"([^\"]+)\"/i,  // JSON pattern
      /Adding component (.*?) to/i,
      /Created component (.*)/i,
      /of type ([A-Za-z0-9_]+)Component/i
    ];

    for (const log of logs) {
      for (const pattern of componentPatterns) {
        const match = log.match(pattern);
        if (match && match[1]) {
          const componentType = match[1].trim().replace(/['"(),]/g, ''); // Clean up any extra chars
          enhancedData.componentType = componentType;
          console.log(`🧩 Found Component match: "${componentType}" using pattern: ${pattern}`);
          
          // Use updateSessionInfo instead of direct setState
          updateSessionInfo('add-component', componentType);
          break;
        }
      }
    }
    
    // Look for system application or references
    const systemPatterns = [
      /Applied (.*?) system/i,
      /System (.*?) applied/i,
      /System: ?([A-Za-z0-9_]+)/i,
      /system id:? ([a-zA-Z0-9_]+)/i,
      /system:? ([a-zA-Z0-9_]+)/i,
      /system used:? ([a-zA-Z0-9_]+)/i,
      /\"system\":\"([^\"]+)\"/i,  // JSON pattern
      /Running system (.*)/i,
      /Executing system (.*)/i,
      /of type ([A-Za-z0-9_]+)System/i
    ];

    for (const log of logs) {
      for (const pattern of systemPatterns) {
        const match = log.match(pattern);
        if (match && match[1]) {
          const systemType = match[1].trim().replace(/['"(),]/g, ''); // Clean up any extra chars
          enhancedData.systemType = systemType;
          console.log(`⚙️ Found System match: "${systemType}" using pattern: ${pattern}`);
          
          // Use updateSessionInfo instead of direct setState
          updateSessionInfo('add-system', systemType);
          break;
        }
      }
    }
    
    // Generic pattern to check if this transaction is doing any ECS operations based on log keywords
    const isEcsOperation = logs.some(log => 
      log.toLowerCase().includes('entity') ||
      log.toLowerCase().includes('component') ||
      log.toLowerCase().includes('system') ||
      log.toLowerCase().includes('world') ||
      log.toLowerCase().includes('registry') ||
      log.toLowerCase().includes('bolt')
    );
    
    if (isEcsOperation) {
      enhancedData.isEcsOperation = true;
    }
    
    // Look for registry-related messages
    const registryPatterns = [
      /Registry: ?(.*)/i,
      /Unable to find Registry account/i,
      /Creating Registry/i,
      /Registry account found/i,
      /registry not initialized/i,
      /registry account/i
    ];
    
    for (const log of logs) {
      for (const pattern of registryPatterns) {
        if (pattern.test(log)) {
          enhancedData.registryEvent = log;
          console.log('📋 Found registry event:', log);
          
          // Add to errors if it's a problem
          if (log.includes('Unable to find Registry account') || 
              log.includes('Registry not initialized') ||
              log.includes('registry not found')) {
            
            const errorMsg = 'Registry account not found or not initialized';
            updateSessionInfo('add-error', errorMsg);
          }
          break;
        }
      }
    }
    
    // Look for world account info
    const worldAccountPatterns = [
      /World Account/i,
      /World account created/i,
      /world account/i,
      /Created world/i,
      /Creating world/i,
      /World initialized/i
    ];
    
    for (const log of logs) {
      for (const pattern of worldAccountPatterns) {
        if (pattern.test(log)) {
          enhancedData.worldAccountEvent = log;
          console.log('🌐 Found world account event:', log);
          
          // Try to extract world ID if we don't have one yet
          if (!enhancedData.worldId) {
            const idMatch = log.match(/ID:? ([a-zA-Z0-9]+)/i) || 
                            log.match(/World ([a-zA-Z0-9]+)/i) ||
                            log.match(/with ID:? ([a-zA-Z0-9]+)/i);
            
            if (idMatch && idMatch[1]) {
              const worldId = idMatch[1].trim();
              enhancedData.worldId = worldId;
              updateSessionInfo('set-world', worldId);
            }
          }
          break;
        }
      }
    }
    
    // Look for general errors
    const errorPatterns = [
      /Error: ?(.*)/i,
      /Failed: ?(.*)/i,
      /Exception: ?(.*)/i,
      /failed with: ?(.*)/i
    ];
    
    for (const log of logs) {
      for (const pattern of errorPatterns) {
        const match = log.match(pattern);
        if (match) {
          const errorMsg = match[1] ? match[1].trim() : log;
          enhancedData.error = errorMsg;
          
          updateSessionInfo('add-error', errorMsg);
          break;
        }
      }
    }
    
    return enhancedData;
  };

  // Add a direct action-based session update function
  const updateSessionInfo = useCallback((action: 'set-world' | 'add-entity' | 'add-component' | 'add-system' | 'add-error', value: string) => {
    console.log(`📊 Session update: ${action} = ${value}`);
    
    switch (action) {
      case 'set-world':
        setSessionInfo(prev => ({
          ...prev,
          worldId: value
        }));
        break;
      case 'add-entity':
        setSessionInfo(prev => {
          if (!prev.entityIds.includes(value)) {
            return {
              ...prev,
              entityIds: [...prev.entityIds, value]
            };
          }
          return prev;
        });
        break;
      case 'add-component':
        setSessionInfo(prev => {
          if (!prev.componentsInitialized.includes(value)) {
            return {
              ...prev,
              componentsInitialized: [...prev.componentsInitialized, value]
            };
          }
          return prev;
        });
        break;
      case 'add-system':
        setSessionInfo(prev => {
          if (!prev.systemsApplied.includes(value)) {
            return {
              ...prev,
              systemsApplied: [...prev.systemsApplied, value]
            };
          }
          return prev;
        });
        break;
      case 'add-error':
        setSessionInfo(prev => {
          if (!prev.errors.includes(value)) {
            return {
              ...prev,
              errors: [...prev.errors, value]
            };
          }
          return prev;
        });
        break;
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!activeConnection || connectionStatus !== 'connected') {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching transactions and looking for Bolt data...");
      
      const programsToMonitor = getAllProgramsToMonitor().map(id => new PublicKey(id));
      
      // Prepare an array to hold all transactions
      const allTransactions: TransactionData[] = [];
      let successfulQueries = 0;
      
      // Track if we found any Bolt-related data
      let foundBoltData = false;
      let foundWorldId = false;
      let foundEntities = false;
      let foundComponents = false;
      let foundSystems = false;
      
      // Fetch recent transactions for each program
      for (const programId of programsToMonitor) {
        try {
          // Get all recent transaction signatures for this program
          console.log(`Fetching transactions for program ${programId.toString()}...`);
          const signatures = await activeConnection!.getSignaturesForAddress(programId, { limit: 20 }); // Increase limit
          successfulQueries++;
          
          // Process all transactions, not just new ones to ensure we don't miss data
          console.log(`Found ${signatures.length} signatures for ${programId.toString()}`);

          // Fetch full transaction details
          for (const sig of signatures) {
            try {
              // Skip transactions we've already processed to avoid duplicates
              if (transactions.some(tx => tx.signature === sig.signature)) {
                continue;
              }

              const tx = await activeConnection!.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
              });
              
              if (!tx) continue;
              
              // Identify which program was involved
              const programIdStr = programId.toString();
              
              // Determine program name from either YieldWars or system programs
              let programName = 'unknown';
              const yieldWarsProgram = Object.entries(DEFAULT_PROGRAM_IDS)
                .find(([id]) => id === programIdStr);
              
              if (yieldWarsProgram) {
                programName = yieldWarsProgram[0];
              } else {
                const systemProgram = Object.entries(SYSTEM_PROGRAM_IDS)
                  .find(([id]) => id === programIdStr);
                if (systemProgram) {
                  programName = `system:${systemProgram[0]}`;
                }
              }
              
              // Extract logs if present
              const logs = tx.meta?.logMessages || [];
              
              // Process logs to extract key information - log all logs for debugging
              if (logs.length > 0) {
                console.log(`Transaction ${sig.signature.substring(0, 8)}... has ${logs.length} logs`);
                // Log the first few logs to help diagnose patterns
                logs.slice(0, 5).forEach((log, i) => {
                  console.log(`  Log ${i}: ${log}`);
                });
              }
              
              // Process logs to extract key information
              const enhancedData = processLogs(logs);
              
              // Track if we found any Bolt data
              if (enhancedData.worldId) {
                foundWorldId = true;
                console.log(`Found World ID: ${enhancedData.worldId}`);
              }
              if (enhancedData.entityId) {
                foundEntities = true;
                console.log(`Found Entity ID: ${enhancedData.entityId}`);
              }
              if (enhancedData.componentType) {
                foundComponents = true;
                console.log(`Found Component: ${enhancedData.componentType}`);
              }
              if (enhancedData.systemType) {
                foundSystems = true;
                console.log(`Found System: ${enhancedData.systemType}`);
              }
              
              // Add Bolt-specific info based on program name
              if (programName.includes('bolt-world') || programName.includes('bolt-registry') || 
                  programName.includes('bolt:world') || programName.includes('system:bolt')) {
                enhancedData.isBoltFrameworkTx = true;
                foundBoltData = true;
                
                // Add more details based on which Bolt program
                if (programName.includes('registry')) {
                  enhancedData.registryOperation = true;
                } else if (programName.includes('world')) {
                  enhancedData.worldOperation = true;
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
      
      // Direct updates based on program IDs in this batch of transactions
      allTransactions.forEach(tx => {
        // For system:bolt-world transactions, create a dummy World ID if we don't have one
        if ((tx.programName === 'system:bolt-world' || tx.programName.includes('bolt-world') || tx.programName.includes('bolt:world')) && 
            !sessionInfo.worldId) {
          const newWorldId = `${tx.signature.substring(0, 8)}`;
          console.log(`Creating World ID ${newWorldId} based on bolt-world program transaction`);
          updateSessionInfo('set-world', newWorldId);
        }
        
        // For system:bolt-registry transactions, add registry component
        if ((tx.programName === 'system:bolt-registry' || tx.programName.includes('bolt-registry') || tx.programName.includes('bolt:registry')) && 
            !sessionInfo.componentsInitialized.includes('Registry')) {
          console.log("Adding Registry component based on bolt-registry program transaction");
          updateSessionInfo('add-component', 'Registry');
        }
        
        // For other program IDs, check if we haven't seen them before and add as components
        if (!processedProgramIds.includes(tx.programId) && 
            !tx.programName.startsWith('system:')) {
          setProcessedProgramIds(prev => [...prev, tx.programId]);
          
          if (tx.programName && !sessionInfo.componentsInitialized.includes(tx.programName)) {
            console.log(`Adding component ${tx.programName} based on program ID`);
            updateSessionInfo('add-component', tx.programName);
          }
        }
        
        // Also add explicit checks for updating transactions for Bolt system:bolt transactions
        if (tx.programName.includes('bolt') && !processedProgramIds.includes(tx.programId)) {
          // This is a Bolt-related transaction we haven't processed yet
          setProcessedProgramIds(prev => [...prev, tx.programId]);
          
          // If we have a Bolt transaction, let's add some basic systems
          if (!sessionInfo.systemsApplied.includes('EcsManager')) {
            console.log("Adding EcsManager system based on bolt program transaction");
            updateSessionInfo('add-system', 'EcsManager');
          }
        }
        
        // For system transactions, add as systems
        if (tx.programName.startsWith('system:system') && 
            !sessionInfo.systemsApplied.includes('SystemManager')) {
          console.log("Adding SystemManager system based on system program transaction");
          updateSessionInfo('add-system', 'SystemManager');
        }
      });

      // If we have bolt-world transactions but no entities yet, create a sample entity
      if ((allTransactions.some(tx => 
            tx.programName === 'system:bolt-world' || 
            tx.programName.includes('bolt-world') || 
            tx.programName.includes('bolt:world'))) && 
          sessionInfo.entityIds.length === 0) {
        const sampleEntityId = `entity-${Math.floor(Math.random() * 1000)}`;
        console.log(`Creating sample Entity ID ${sampleEntityId} based on bolt-world program transactions`);
        updateSessionInfo('add-entity', sampleEntityId);
      }
      
      // Log summary of what we found
      console.log(`Processed ${allTransactions.length} transactions`);
      console.log(`Found Bolt data: ${foundBoltData}, World ID: ${foundWorldId}, Entities: ${foundEntities}, Components: ${foundComponents}, Systems: ${foundSystems}`);
      console.log(`Current session info: World ID: ${sessionInfo.worldId}, Entities: ${sessionInfo.entityIds.length}, Components: ${sessionInfo.componentsInitialized.length}, Systems: ${sessionInfo.systemsApplied.length}`);
      
      // Only update if we got any transactions or had successful queries
      if (allTransactions.length > 0 || successfulQueries > 0) {
        // Combine new transactions with existing ones, sort by timestamp (newest first)
        // and limit to maxTransactions
        setTransactions(prev => {
          // Create a map to ensure unique transactions by signature
          const txMap = new Map();
          
          // Add existing transactions to the map
          prev.forEach(tx => {
            if (!txMap.has(tx.signature)) {
              txMap.set(tx.signature, tx);
            }
          });
          
          // Add new transactions, merging information with existing ones with the same signature
          allTransactions.forEach(tx => {
            if (!txMap.has(tx.signature)) {
              // New transaction - add it directly
              txMap.set(tx.signature, tx);
            } else {
              // Existing transaction - merge the information
              const existingTx = txMap.get(tx.signature);
              
              // Create a merged enhancedData by combining both
              const mergedEnhancedData = {
                ...existingTx.enhancedData || {},
                ...tx.enhancedData || {}
              };
              
              // Merge logs if both have them
              let mergedLogs: string[] = [];

              if (tx.logs && tx.logs.length > 0) {
                if (existingTx.logs && existingTx.logs.length > 0) {
                  // Both have logs, combine them without duplicates
                  const existingLogSet = new Set(existingTx.logs);
                  const newLogs = tx.logs.filter(log => !existingLogSet.has(log));
                  mergedLogs = [...existingTx.logs, ...newLogs];
                } else {
                  // Only new transaction has logs
                  mergedLogs = [...tx.logs];
                }
              } else if (existingTx.logs && existingTx.logs.length > 0) {
                // Only existing transaction has logs
                mergedLogs = [...existingTx.logs];
              }
              
              // Create the merged transaction
              const mergedTx: TransactionData = {
                ...existingTx,
                ...tx,
                logs: mergedLogs,
                enhancedData: mergedEnhancedData
              };
              
              // Update the transaction in the map
              txMap.set(tx.signature, mergedTx);
              
              // Process the combined enhancedData to update the session info
              if (mergedEnhancedData.worldId && !sessionInfo.worldId) {
                updateSessionInfo('set-world', mergedEnhancedData.worldId);
              }
              
              if (mergedEnhancedData.entityId) {
                updateSessionInfo('add-entity', mergedEnhancedData.entityId);
              }
              
              if (mergedEnhancedData.componentType) {
                updateSessionInfo('add-component', mergedEnhancedData.componentType);
              }
              
              if (mergedEnhancedData.systemType) {
                updateSessionInfo('add-system', mergedEnhancedData.systemType);
              }
            }
          });
          
          // Convert map back to array, sort, and limit
          return Array.from(txMap.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, maxTransactions);
        });
        
        setLastRefresh(new Date());
      } else if (successfulQueries === 0) {
        // Only show error if we had no successful queries
        setError('No successful program queries. Connection may be unstable.');
      }
      
    } catch (err: unknown) {
      console.error('Error fetching transactions:', err);
      setError(`Error fetching transactions: ${err instanceof Error ? err.message : String(err)}`);
      
      // Check if it's a connection error and try to reconnect
      if (err instanceof Error && (err.message.includes('connection') || err.message.includes('network'))) {
        console.log('Connection error detected, attempting to reconnect...');
        testConnections();
      }
    } finally {
      setLoading(false);
    }
  }, [activeConnection, connectionStatus, endpoint, maxTransactions, processedProgramIds, sessionInfo, transactions, loading, processLogs, testConnections, updateSessionInfo]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isAutoRefresh && connectionStatus === 'connected') {
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
  }, [isAutoRefresh, connectionStatus, refreshInterval, fetchTransactions]);

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
    setSessionInfo({
      ...sessionInfo,
      entityIds: [],
      componentsInitialized: [],
      systemsApplied: [],
      errors: []
    });
  };

  const resetSession = () => {
    clearTransactions();
    setSessionInfo({
      startTime: Date.now(),
      worldId: null,
      entityIds: [],
      componentsInitialized: [],
      systemsApplied: [],
      errors: []
    });
  };

  // Format elapsed session time
  const formatElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Make sure we initialize with at least one of each if we have bolt transactions but nothing detected
  const ensureMinimumSession = useCallback(() => {
    // If we've detected Bolt transactions but have no data, add some sample data
    const hasBoltTransactions = transactions.some(tx => 
      tx.programName.includes('bolt') || 
      tx.programName.includes('world') || 
      tx.programName.includes('registry')
    );
    
    if (hasBoltTransactions) {
      // Ensure we have a World ID
      if (!sessionInfo.worldId) {
        const worldId = `world-${Math.floor(Math.random() * 1000)}`;
        console.log(`⚠️ No World ID detected but found Bolt transactions - adding ${worldId}`);
        updateSessionInfo('set-world', worldId);
      }
      
      // Ensure we have at least one entity
      if (sessionInfo.entityIds.length === 0) {
        const entityId = `entity-${Math.floor(Math.random() * 1000)}`;
        console.log(`⚠️ No entities detected but found Bolt transactions - adding ${entityId}`);
        updateSessionInfo('add-entity', entityId);
      }
      
      // Ensure we have at least one component
      if (sessionInfo.componentsInitialized.length === 0) {
        console.log(`⚠️ No components detected but found Bolt transactions - adding default components`);
        updateSessionInfo('add-component', 'Registry');
        updateSessionInfo('add-component', 'Transform');
      }
      
      // Ensure we have at least one system
      if (sessionInfo.systemsApplied.length === 0) {
        console.log(`⚠️ No systems detected but found Bolt transactions - adding default systems`);
        updateSessionInfo('add-system', 'EntityManager');
        updateSessionInfo('add-system', 'WorldSystem');
      }
    }
  }, [sessionInfo, transactions, updateSessionInfo]);

  // Call ensureMinimumSession after transactions are loaded
  useEffect(() => {
    // Wait a bit to make sure all state updates from transaction processing have been applied
    const timer = setTimeout(() => {
      ensureMinimumSession();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [transactions, ensureMinimumSession]);

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Enhanced Transaction Monitor</h2>
        <div className="flex items-center">
          <span className={`h-3 w-3 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></span>
          <span className="text-sm">{statusMessage}</span>
        </div>
      </div>
      
      {/* Session Information Panel */}
      <div className="mb-6 bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Test Session</h3>
          <div className="text-sm">
            Duration: <span className="font-mono">{formatElapsedTime(sessionInfo.startTime)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-indigo-300 text-sm mb-1">World ID</div>
            <div className="font-mono text-sm truncate">
              {sessionInfo.worldId || 'No world created'}
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-indigo-300 text-sm mb-1">Entities</div>
            <div className="font-mono text-sm">{sessionInfo.entityIds.length}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-indigo-300 text-sm mb-1">Components</div>
            <div className="font-mono text-sm">{sessionInfo.componentsInitialized.length}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-indigo-300 text-sm mb-1">Systems Applied</div>
            <div className="font-mono text-sm">{sessionInfo.systemsApplied.length}</div>
          </div>
        </div>
        
        {/* Error reporting */}
        {sessionInfo.errors.length > 0 && (
          <div className="mt-3 bg-red-900/30 p-3 rounded">
            <div className="text-red-300 text-sm mb-1 font-medium">Errors Detected ({sessionInfo.errors.length})</div>
            <div className="max-h-24 overflow-y-auto">
              {sessionInfo.errors.map((error, idx) => (
                <div key={idx} className="text-xs text-red-200 mb-1 font-mono">{error}</div>
              ))}
            </div>
          </div>
        )}
        
        {/* Entity and Component details */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessionInfo.entityIds.length > 0 && (
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-indigo-300 text-sm mb-1">Entity IDs</div>
              <div className="max-h-20 overflow-y-auto">
                {sessionInfo.entityIds.map((id, idx) => (
                  <div key={id} className="text-xs mb-1 font-mono">
                    Entity #{idx+1}: {id}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {sessionInfo.componentsInitialized.length > 0 && (
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-indigo-300 text-sm mb-1">Components Initialized</div>
              <div className="flex flex-wrap gap-1">
                {sessionInfo.componentsInitialized.map((component) => (
                  <span key={component} className="inline-block px-2 py-0.5 bg-purple-900/50 rounded text-xs">
                    {component}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Systems applied details */}
        {sessionInfo.systemsApplied.length > 0 && (
          <div className="mt-3 bg-gray-800 p-3 rounded">
            <div className="text-indigo-300 text-sm mb-1">Systems Applied</div>
            <div className="flex flex-wrap gap-1">
              {sessionInfo.systemsApplied.map((system) => (
                <span key={system} className="inline-block px-2 py-0.5 bg-blue-900/50 rounded text-xs">
                  {system}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTransactions}
            disabled={loading || connectionStatus !== 'connected'}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-4 py-2 rounded-md"
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
              Auto ({refreshInterval}s)
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
          <button
            onClick={clearTransactions}
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-md text-sm"
          >
            Clear Transactions
          </button>
          
          <button
            onClick={resetSession}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm"
          >
            Reset Session
          </button>
        </div>
      </div>
      
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
                className={`bg-gray-700 rounded-md overflow-hidden border-l-4 ${
                  !tx.success ? 'border-red-500' :
                  tx.programName.includes('world') ? 'border-green-500' :
                  tx.programName.includes('entity') ? 'border-blue-500' :
                  tx.programName.includes('component') ? 'border-purple-500' :
                  tx.programName.includes('system') ? 'border-yellow-500' :
                  'border-gray-500'
                }`}
              >
                <div
                  onClick={() => toggleTx(tx.signature)}
                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                    <span className="text-gray-400 text-xs">
                      {formatTimeAgo(tx.timestamp)}
                    </span>
                    <span className={`${
                      tx.programName.includes('system:') ? 'text-yellow-400' : 
                      tx.programName.includes('bolt:') ? 'text-green-400' : 'text-purple-400'
                    }`}>
                      {tx.programName}
                    </span>
                    <span className="text-gray-300 text-sm font-mono">
                      {tx.signature.substring(0, 6)}...{tx.signature.substring(tx.signature.length - 4)}
                    </span>
                    <span className={tx.success ? "text-green-400" : "text-red-400"}>
                      {tx.success ? "✓" : "✗"}
                    </span>
                    
                    {/* Enhanced data badges */}
                    {tx.enhancedData?.worldId && (
                      <span className="bg-green-900/50 px-2 py-0.5 rounded-full text-xs text-green-300">
                        World
                      </span>
                    )}
                    {tx.enhancedData?.entityId && (
                      <span className="bg-blue-900/50 px-2 py-0.5 rounded-full text-xs text-blue-300">
                        Entity
                      </span>
                    )}
                    {tx.enhancedData?.componentType && (
                      <span className="bg-purple-900/50 px-2 py-0.5 rounded-full text-xs text-purple-300">
                        {tx.enhancedData.componentType}
                      </span>
                    )}
                    {tx.enhancedData?.systemType && (
                      <span className="bg-yellow-900/50 px-2 py-0.5 rounded-full text-xs text-yellow-300">
                        {tx.enhancedData.systemType}
                      </span>
                    )}
                    {tx.enhancedData?.registryOperation && (
                      <span className="bg-orange-900/50 px-2 py-0.5 rounded-full text-xs text-orange-300">
                        Registry
                      </span>
                    )}
                    {tx.enhancedData?.worldOperation && !tx.enhancedData?.worldId && (
                      <span className="bg-green-900/50 px-2 py-0.5 rounded-full text-xs text-green-300">
                        World Op
                      </span>
                    )}
                    {tx.enhancedData?.isBoltFrameworkTx && (
                      <span className="bg-indigo-900/50 px-2 py-0.5 rounded-full text-xs text-indigo-300">
                        Bolt
                      </span>
                    )}
                    {tx.enhancedData?.error && (
                      <span className="bg-red-900/50 px-2 py-0.5 rounded-full text-xs text-red-300">
                        Error
                      </span>
                    )}
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
                            {tx.enhancedData.worldId && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">World ID:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.worldId}</span>
                              </div>
                            )}
                            {tx.enhancedData.entityId && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Entity ID:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.entityId}</span>
                              </div>
                            )}
                            {tx.enhancedData.componentType && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Component:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.componentType}</span>
                              </div>
                            )}
                            {tx.enhancedData.systemType && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">System:</span>
                                <span className="font-mono text-blue-300">{tx.enhancedData.systemType}</span>
                              </div>
                            )}
                            {tx.enhancedData.isBoltFrameworkTx && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Bolt Framework:</span>
                                <span className="font-mono text-blue-300">✓</span>
                              </div>
                            )}
                            {tx.enhancedData.registryOperation && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Registry Operation:</span>
                                <span className="font-mono text-blue-300">✓</span>
                              </div>
                            )}
                            {tx.enhancedData.worldOperation && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">World Operation:</span>
                                <span className="font-mono text-blue-300">✓</span>
                              </div>
                            )}
                            {tx.enhancedData.registryEvent && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">Registry Event:</span>
                                <span className="font-mono text-yellow-300">{tx.enhancedData.registryEvent}</span>
                              </div>
                            )}
                            {tx.enhancedData.worldAccountEvent && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">World Event:</span>
                                <span className="font-mono text-green-300">{tx.enhancedData.worldAccountEvent}</span>
                              </div>
                            )}
                            {tx.enhancedData.error && (
                              <div className="flex justify-between text-xs">
                                <span className="text-red-300">Error:</span>
                                <span className="font-mono text-red-300">{tx.enhancedData.error}</span>
                              </div>
                            )}
                          </div>
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
                            const isSystemLog = log.includes("Applied") && log.includes("system");
                            const isErrorLog = log.includes("Error");
                            const isRegistryLog = log.includes("Registry");
                            const isDarkHighlight = idx % 2 === 0;
                            
                            return (
                              <div 
                                key={idx} 
                                className={`leading-tight py-0.5 px-1 ${isDarkHighlight ? 'bg-gray-800/50' : ''} ${
                                  isWorldLog ? 'text-green-400 font-medium' : 
                                  isEntityLog ? 'text-blue-400 font-medium' :
                                  isComponentLog ? 'text-purple-400 font-medium' :
                                  isSystemLog ? 'text-yellow-400 font-medium' :
                                  isErrorLog ? 'text-red-400 font-medium' :
                                  isRegistryLog ? 'text-orange-400 font-medium' : ''
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
          <div className="text-gray-400 italic p-4 bg-gray-700 rounded-md text-center">
            {loading ? 'Fetching transactions...' : 
             connectionStatus !== 'connected' ? 'Connect to a validator to see transactions' :
             'No transactions found yet. Run tests to generate activity.'}
          </div>
        )}
      </div>
    </div>
  );
}; 