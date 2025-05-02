import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">YieldWars</h1>
        
        <div className="text-center sm:text-left">
          <p className="mb-4">A Solana-based strategy game using Bolt/Anchor</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Developer Tools</h2>
          <ul className="list-disc list-inside mb-6">
            <li className="mb-2">
              <Link 
                href="/test-monitor" 
                className="text-indigo-500 hover:underline font-medium"
              >
                Enhanced Test Monitor
              </Link>
              {" - "}
              <span className="text-gray-500">Specialized test session monitor with real-time entity and component tracking</span>
            </li>
            <li className="mb-2">
              <Link 
                href="/pda-monitor" 
                className="text-blue-500 hover:underline"
              >
                Blockchain Monitor
              </Link>
              {" - "}
              <span className="text-gray-500">Complete monitoring dashboard for PDAs, transactions, and diagnostics</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-indigo-600 text-white gap-2 hover:bg-indigo-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/test-monitor"
          >
            Open Test Monitor
          </Link>
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/pda-monitor"
          >
            Open Blockchain Monitor
          </Link>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://docs.magicblock.gg/bolt/getting-started/overview"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bolt Documentation
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <Link
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/test-monitor"
        >
          Test Monitor
        </Link>
        <Link
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/pda-monitor"
        >
          Blockchain Monitor
        </Link>
      </footer>
    </div>
  );
}
