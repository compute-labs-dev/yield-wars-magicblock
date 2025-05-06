'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Trophy, 
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Default values for pagination
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * Cyberpunk-themed Leaderboard Component
 * Displays the referral leaderboard with pagination and rank lookup
 */
export default function Leaderboard() {
  // State for pagination
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const entriesPerPage = DEFAULT_LIMIT;
  const [totalPages, setTotalPages] = useState(1);
  
  // State for leaderboard data - initialize as empty array to avoid undefined
  const [leaderboardData, setLeaderboardData] = useState<Array<{rank: number, ref_code: string, referrals: number}>>([]);
  
  // State for referral code lookup
  const [searchRefCode, setSearchRefCode] = useState("");
  const [searchedRank, setSearchedRank] = useState<{rank?: number, ref_code?: string, referrals?: number} | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Get the waitlist hook functions
  const { 
    getLeaderboard, 
    getUserRank, 
    leaderboardLoading, 
    leaderboardError, 
    userRankLoading, 
    userRankError 
  } = useWaitlist();

  // Function to fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      console.log(`Fetching leaderboard page ${currentPage} with limit ${entriesPerPage}`);
      const response = await getLeaderboard(currentPage, entriesPerPage);
      
      console.log("Leaderboard response in component:", response);
      
      if (response.success && Array.isArray(response.entries)) {
        setLeaderboardData(response.entries);
        if (response.totalPages) {
          setTotalPages(response.totalPages);
        }
      } else {
        // If not successful or entries is not an array, set to empty array
        console.error("Invalid leaderboard response:", response);
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setLeaderboardData([]);
    }
  }, [getLeaderboard, currentPage, entriesPerPage]);

  // Function to handle referral code search
  const handleSearchRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRefCode.trim()) return;
    
    setHasSearched(true);
    try {
      const response = await getUserRank(searchRefCode);
      console.log("User rank search response:", response);
      
      if (response.success && response.rank !== undefined) {
        setSearchedRank({
          rank: response.rank,
          ref_code: response.ref_code,
          referrals: response.referrals
        });
      } else {
        setSearchedRank(null);
      }
    } catch (error) {
      console.error("Error searching for rank:", error);
      setSearchedRank(null);
    }
  };

  // Load leaderboard data on component mount and when page changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Function to handle page changes
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 font-mono">
      <div className="bg-gray-compute border-2 border-primary-fog-light rounded-lg p-6 shadow-lg backdrop-blur-sm mb-6">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-primary-light to-primary-fog-light bg-clip-text text-transparent animate-gradient-flow">
          REFERRAL LEADERBOARD
        </h2>
        
        {/* Search Form */}
        <div className="mb-8">
          <form onSubmit={handleSearchRank} className="relative flex items-center mb-2">
            <input
              type="text"
              placeholder="Enter Referral Code"
              value={searchRefCode}
              onChange={(e) => setSearchRefCode(e.target.value)}
              className="w-full bg-black/30 border border-primary-fog-light rounded-md px-4 py-2 pr-10 text-gray-light focus:outline-none focus:ring-2 focus:ring-primary-fog-light"
            />
            <button
              type="submit"
              className="absolute right-2 bg-primary-DEFAULT hover:bg-primary-dark text-white p-1 rounded-md"
              disabled={userRankLoading}
            >
              {userRankLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </form>
          
          {/* Display searched rank result */}
          {hasSearched && (
            <div className="mt-4 p-4 border border-primary-DEFAULT bg-black/50 rounded-md">
              {userRankError && (
                <div className="flex items-center text-error">
                  <AlertCircle size={18} className="mr-2" />
                  <span>Error: {userRankError}</span>
                </div>
              )}
              
              {!userRankError && !searchedRank && (
                <div className="flex items-center text-gray-light">
                  <AlertCircle size={18} className="mr-2" />
                  <span>No results found for code: {searchRefCode}</span>
                </div>
              )}
              
              {searchedRank && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Trophy className="mr-2 text-yellow-400" size={24} />
                    <div>
                      <p className="text-primary-light font-bold">{searchedRank.ref_code}</p>
                      <p className="text-sm text-gray-light">Rank: #{searchedRank.rank}</p>
                    </div>
                  </div>
                  <div className="bg-primary-DEFAULT px-3 py-1 rounded-md">
                    <span className="text-white font-bold">{searchedRank.referrals} referrals</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Leaderboard Table */}
        <div className="overflow-hidden rounded-lg border border-primary-fog-light">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-primary-light uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-primary-light uppercase tracking-wider">Referral Code</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-primary-light uppercase tracking-wider">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-compute">
                {leaderboardLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center">
                      <Loader2 className="animate-spin mx-auto" size={32} />
                      <p className="mt-2 text-gray-light">Loading leaderboard data...</p>
                    </td>
                  </tr>
                ) : leaderboardError ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center">
                      <AlertCircle className="mx-auto text-error" size={32} />
                      <p className="mt-2 text-error">{leaderboardError}</p>
                      <button 
                        onClick={fetchLeaderboard}
                        className="mt-2 flex items-center mx-auto text-gray-light hover:text-white"
                      >
                        <RefreshCw size={16} className="mr-1" /> Retry
                      </button>
                    </td>
                  </tr>
                ) : !leaderboardData || leaderboardData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-light">
                      No data available
                    </td>
                  </tr>
                ) : (
                  leaderboardData.map((entry, index) => (
                    <tr 
                      key={index} 
                      className={`
                        ${index % 2 === 0 ? 'bg-black/30' : 'bg-black/10'}
                        ${entry.rank <= 3 ? 'border-l-4' : ''}
                        ${entry.rank === 1 ? 'border-yellow-500' : entry.rank === 2 ? 'border-gray-300' : entry.rank === 3 ? 'border-amber-700' : ''}
                        hover:bg-primary-dark/20 transition-colors
                      `}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {entry.rank <= 3 && (
                            <Trophy 
                              size={16} 
                              className={`mr-2 ${
                                entry.rank === 1 
                                  ? 'text-yellow-400' 
                                  : entry.rank === 2 
                                  ? 'text-gray-300' 
                                  : 'text-amber-700'
                              }`} 
                            />
                          )}
                          <span className={entry.rank <= 3 ? 'font-bold' : ''}>{entry.rank}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-primary-light">
                        {entry.ref_code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        <span className="bg-black/30 px-2 py-1 rounded">{entry.referrals}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-black/30 px-4 py-3 flex items-center justify-between border-t border-primary-fog/30">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1 || leaderboardLoading}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-light text-sm font-medium rounded-md ${
                  currentPage === 1 || leaderboardLoading
                    ? 'bg-gray-compute/50 text-gray-light cursor-not-allowed'
                    : 'bg-black/30 text-gray-light hover:bg-primary-DEFAULT hover:text-white'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages || leaderboardLoading}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-light text-sm font-medium rounded-md ${
                  currentPage === totalPages || leaderboardLoading
                    ? 'bg-gray-compute/50 text-gray-light cursor-not-allowed'
                    : 'bg-black/30 text-gray-light hover:bg-primary-DEFAULT hover:text-white'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-light">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1 || leaderboardLoading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-light text-sm font-medium ${
                      currentPage === 1 || leaderboardLoading
                        ? 'bg-gray-compute/50 text-gray-light cursor-not-allowed'
                        : 'bg-black/30 text-gray-light hover:bg-primary-DEFAULT hover:text-white'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Calculate page numbers to show
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => changePage(pageNum)}
                          disabled={leaderboardLoading}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-primary-DEFAULT border-primary-DEFAULT text-white'
                              : 'bg-black/30 border-gray-light text-gray-light hover:bg-primary-dark/20'
                          } ${leaderboardLoading ? 'cursor-not-allowed' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages || leaderboardLoading}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-light text-sm font-medium ${
                      currentPage === totalPages || leaderboardLoading
                        ? 'bg-gray-compute/50 text-gray-light cursor-not-allowed'
                        : 'bg-black/30 text-gray-light hover:bg-primary-DEFAULT hover:text-white'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 bg-black/20 p-4 rounded-md border border-primary-fog/30">
          <h3 className="text-sm font-bold text-primary-light mb-2">Leaderboard Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 mr-2"></div>
              <span className="text-xs text-gray-light">1st Place</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 mr-2"></div>
              <span className="text-xs text-gray-light">2nd Place</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-amber-700 mr-2"></div>
              <span className="text-xs text-gray-light">3rd Place</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
