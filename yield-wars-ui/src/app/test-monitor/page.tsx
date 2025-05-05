'use client';

import { EnhancedTransactionMonitor } from '@/components/ui/EnhancedTransactionMonitor';
import Link from 'next/link';

export default function TestMonitorPage() {
  return (
    <main className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-4 sm:mb-0">YieldWars Test Monitor</h1>
          <div className="flex items-center space-x-3">
            <Link 
              href="/pda-monitor"
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white"
            >
              Blockchain Monitor
            </Link>
          </div>
        </div>
        
        <div className="mb-6 bg-indigo-900/30 p-4 rounded-md text-white">
          <h2 className="text-xl font-semibold mb-2">Bolt Test Environment Monitor</h2>
          <p className="mb-2">
            This specialized monitor is designed specifically for Bolt ECS testing with Anchor. It provides real-time updates
            on test execution, tracking the entities, components, and systems being created and applied.
          </p>
          <div className="flex flex-col md:flex-row mt-4 text-sm gap-4">
            <div className="bg-indigo-900/30 p-3 rounded-md flex-1">
              <h3 className="font-medium text-indigo-300 mb-1">Troubleshooting Tips</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure Anchor tests are running (e.g., <code className="bg-gray-800 px-1 rounded">anchor test</code>)</li>
                <li>Check that Bolt World program is properly initialized</li>
                <li>Confirm the Registry account exists in your test environment</li>
                <li>Browser security may require you to use IP instead of &ldquo;localhost&rdquo;</li>
              </ul>
            </div>
            <div className="bg-indigo-900/30 p-3 rounded-md flex-1">
              <h3 className="font-medium text-indigo-300 mb-1">Common Error Patterns</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>&ldquo;Unable to find Registry account&rdquo; - Registry not initialized</li>
                <li>&ldquo;Component not initialized&rdquo; - Missing component creation</li>
                <li>&ldquo;unknown account&rdquo; - Entity or component not found</li>
                <li>&ldquo;Invalid instruction&rdquo; - System input mismatch</li>
              </ul>
            </div>
          </div>
        </div>
        
        <EnhancedTransactionMonitor />
        
        <div className="mt-6 bg-gray-800 p-4 rounded-md text-white">
          <h2 className="text-xl font-semibold mb-2">Test Session Workflow</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Start Test Environment</strong>: Run <code className="bg-gray-800 px-1 rounded">anchor test</code> in your terminal.
            </li>
            <li>
              <strong>Monitor Registry Initialization</strong>: Look for successful creation of World and Registry accounts.
            </li>
            <li>
              <strong>Watch Entity Creation</strong>: Monitor entities being created, typically at the start of test cases.
            </li>
            <li>
              <strong>Observe Component Initialization</strong>: Verify components are properly attached to entities.
            </li>
            <li>
              <strong>Track System Operations</strong>: Monitor system applications that modify components.
            </li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-900/20 rounded">
            <h3 className="font-medium text-yellow-300 mb-1">Note About Browser Security</h3>
            <p className="text-sm">
              Due to browser security policies, connections to localhost may be restricted. The monitor will
              automatically try multiple endpoint variants (0.0.0.0, localhost, 127.0.0.1) to establish a connection.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 