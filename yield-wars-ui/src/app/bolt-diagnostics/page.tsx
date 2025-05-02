'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BoltDiagnosticsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main monitor with diagnostics tab
    router.push('/pda-monitor?tab=diagnostics');
  }, [router]);

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 flex items-center justify-center">
      <div className="text-white text-center">
        <p className="mb-4">Redirecting to the Blockchain Monitor...</p>
        <p>
          The Diagnostics tool is now integrated into the 
          <a href="/pda-monitor" className="text-blue-400 hover:underline px-1">
            Blockchain Monitor
          </a>
          as a tab.
        </p>
      </div>
    </div>
  );
} 