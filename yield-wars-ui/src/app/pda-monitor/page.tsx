'use client';

import { Suspense } from 'react';
import { PDAMonitor } from '@/components/ui/PDAMonitor';
import { BoltDiagnostics } from '@/components/ui/BoltDiagnostics';
import { EnhancedTransactionMonitor } from '@/components/ui/EnhancedTransactionMonitor';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClientOnly } from '@/components/ui/ClientOnly';
import ProfileContainer from '@/components/privy/ProfileContainer';
import ProfileIcon from '@/components/privy/ProfileIcon';
import { PrivyLogin } from '@/components/privy/PrivyLogin';
import { usePrivy } from '@privy-io/react-auth';
// Separate client component for tab handling
const TabHandler = ({ onTabChange }: { onTabChange: (tab: 'pdas' | 'transactions' | 'diagnostics') => void }) => {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pdas' || tabParam === 'transactions' || tabParam === 'diagnostics') {
      onTabChange(tabParam);
    }
  }, [searchParams, onTabChange]);

  return null;
};

export default function PDAMonitorPage() {
  const [activeTab, setActiveTab] = useState<'pdas' | 'transactions' | 'diagnostics'>('transactions');
  const { user } = usePrivy();

  return (
    <main className="min-h-screen bg-black p-4 md:p-8">
      <Suspense fallback={null}>
        <TabHandler onTabChange={setActiveTab} />
      </Suspense>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-4 sm:mb-0">YieldWars MagicBlock Monitor</h1>
          <div className="flex items-center space-x-3">
            <ClientOnly fallback={<button className="bg-indigo-600 text-white px-4 py-2 rounded-md">Wallet</button>}>
              {!user && <PrivyLogin />}
              {user && <ProfileIcon />}
              <ProfileContainer />
            </ClientOnly>
          </div>
        </div>
        
        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('pdas')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'pdas' 
                ? 'bg-gray-700 text-white' 
                : 'bg-transparent text-gray-400 hover:text-white'
            } transition-colors`}
          >
            PDA Monitor
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'transactions' 
                ? 'bg-gray-700 text-white' 
                : 'bg-transparent text-gray-400 hover:text-white'
            } transition-colors`}
          >
            Transaction Monitor
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'diagnostics' 
                ? 'bg-gray-700 text-white' 
                : 'bg-transparent text-gray-400 hover:text-white'
            } transition-colors`}
          >
            Diagnostics
          </button>
        </div>
        
        {!user && activeTab !== 'diagnostics' && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6 text-white">
            <p className="text-center">Connect your wallet to interact with the Blockchain Monitor</p>
          </div>
        )}
        
        {activeTab === 'pdas' ? (
          <PDAMonitor />
        ) : activeTab === 'transactions' ? (
          <EnhancedTransactionMonitor />
        ) : (
          <BoltDiagnostics />
        )}
        
        <div className="mt-6 bg-indigo-900/20 p-4 rounded-md">
          <h3 className="text-lg font-medium text-indigo-300 mb-2">Blockchain Monitoring Tools</h3>
          <p className="text-white text-sm mb-2">
            This dashboard provides comprehensive tools for monitoring and diagnosing your Solana blockchain application:
          </p>
          <ul className="list-disc list-inside text-white text-sm space-y-1 mb-2">
            <li><strong>PDA Monitor</strong>: Track on-chain program-derived accounts and their data</li>
            <li><strong>Transaction Monitor</strong>: Watch all blockchain transactions in real-time with enhanced details</li>
            <li><strong>Diagnostics</strong>: Check validator connectivity and Bolt framework configuration</li>
          </ul>
          <p className="text-white text-sm text-gray-400">
            For specialized Anchor test sessions, see the{' '}
            <Link href="/test-monitor" className="text-indigo-400 hover:underline">
              Test Monitor
            </Link>.
          </p>
        </div>
      </div>
    </main>
  );
} 