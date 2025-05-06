import { useState, useCallback } from 'react';

// Define the structure of the expected API POST response
interface WaitlistPostApiResponse {
    success: boolean;
    ref_code?: string;
    error?: string;
    email_exists?: boolean;
}

// Define the structure of the expected API GET response
interface WaitlistGetApiResponse {
    success: boolean;
    ref_code?: string;
    error?: string;
}

// Define leaderboard entry structure
interface LeaderboardEntry {
    rank: number;
    ref_code: string;
    referrals: number;
}

// Define leaderboard response structure
interface LeaderboardResponse {
    success: boolean;
    entries: LeaderboardEntry[];
    totalEntries?: number;
    totalPages?: number;
    error?: string;
}

// Define user rank response structure from Google Sheets App Script
interface UserRankResponse {
    success: boolean;
    rank?: number;
    ref_code?: string;
    referrals?: number;
    totalRanked?: number;
    error?: string;
}

// Define the structure for the hook's return value
interface UseWaitlistReturn {
    submitToWaitlist: (email: string, ref_by?: string) => Promise<void>;
    getRefCode: (email: string) => Promise<string | null>;
    getLeaderboard: (page: number, limit: number) => Promise<LeaderboardResponse>;
    getUserRank: (refCode: string) => Promise<UserRankResponse>;
    loading: boolean;
    error: string | null;
    success: boolean;
    isExistingUser: boolean;
    refCode: string | null;
    getLoading: boolean;
    getError: string | null;
    leaderboardLoading: boolean;
    leaderboardError: string | null;
    userRankLoading: boolean;
    userRankError: string | null;
}

// Define the API endpoint URL for the proxy route
const API_ENDPOINT = "/api/waitlist";

/**
 * Custom hook to handle waitlist submission and retrieval logic.
 */
export function useWaitlist(): UseWaitlistReturn {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [isExistingUser, setIsExistingUser] = useState<boolean>(false);
    const [refCode, setRefCode] = useState<string | null>(null);

    // Separate state for the GET request
    const [getLoading, setGetLoading] = useState<boolean>(false);
    const [getError, setGetError] = useState<string | null>(null);
    
    // State for leaderboard requests
    const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
    
    // State for user rank requests
    const [userRankLoading, setUserRankLoading] = useState<boolean>(false);
    const [userRankError, setUserRankError] = useState<string | null>(null);

    /**
     * Submits the email (and optional referral code) to the waitlist API.
     */
    const submitToWaitlist = useCallback(async (email: string, ref_by?: string): Promise<void> => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        setIsExistingUser(false);
        setRefCode(null);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, ref_by }),
            });

            if (!response.ok) {
                let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult && errorResult.error) {
                        errorMsg = errorResult.error;
                    }
                } catch (parseError) {
                    console.error("Waitlist submission error:", parseError);
                }
                 throw new Error(errorMsg);
            }

            // Expect WaitlistPostApiResponse
            const result: WaitlistPostApiResponse = await response.json();

            if (result.success && result.ref_code) {
                setSuccess(true);
                setRefCode(result.ref_code);
                setError(null);
                if (result.email_exists) {
                    setIsExistingUser(true);
                } else {
                    setIsExistingUser(false);
                }
            } else {
                throw new Error(result.error || 'An unknown error occurred during submission.');
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error("Waitlist submission error:", error);
            setError(error.message || 'Failed to submit email.');
            setSuccess(false);
            setRefCode(null);
            setIsExistingUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Retrieves the referral code for a given email.
     * @param email - The email to look up.
     * @returns The referral code if found, otherwise null.
     */
    const getRefCode = useCallback(async (email: string): Promise<string | null> => {
        setGetLoading(true);
        setGetError(null);
        let code: string | null = null;

        try {
            const targetUrl = `${API_ENDPOINT}?email=${encodeURIComponent(email)}`;
            const response = await fetch(targetUrl, {
                 method: 'GET',
                 headers: {
                     'Accept': 'application/json',
                 },
             });

             if (!response.ok) {
                let errorMsg = `Lookup failed: ${response.status} ${response.statusText}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult && errorResult.error) {
                        errorMsg = errorResult.error;
                    }
                } catch (parseError) {
                    console.error("Waitlist lookup error:", parseError);
                }
                 throw new Error(errorMsg);
            }

            // Expect WaitlistGetApiResponse
            const result: WaitlistGetApiResponse = await response.json();

            if (result.success && result.ref_code) {
                 code = result.ref_code;
                 setGetError(null);
            } else {
                 const errorMsg = result.error || 'Email not found or unknown lookup error.';
                 setGetError(errorMsg);
            }

        } catch (err: unknown) {
            const error = err as Error;
            console.error("Get Ref Code error:", error);
            setGetError(error.message || 'Failed to retrieve referral code.');
        } finally {
             setGetLoading(false);
        }
        return code;
    }, []);
    
    /**
     * Fetches the leaderboard data with pagination.
     * @param page - The page number to fetch (1-indexed).
     * @param limit - The number of entries per page.
     * @returns The leaderboard data response.
     */
    const getLeaderboard = useCallback(async (page: number, limit: number): Promise<LeaderboardResponse> => {
        setLeaderboardLoading(true);
        setLeaderboardError(null);
        
        try {
            const targetUrl = `${API_ENDPOINT}?action=getLeaderboard&page=${page}&limit=${limit}`;
            console.log(`Fetching leaderboard from: ${targetUrl}`);
            
            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                let errorMsg = `Leaderboard fetch failed: ${response.status} ${response.statusText}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult && errorResult.error) {
                        errorMsg = errorResult.error;
                    }
                } catch (parseError) {
                    console.error("Leaderboard fetch parse error:", parseError);
                }
                throw new Error(errorMsg);
            }
            
            const result = await response.json();
            console.log("Leaderboard response:", result);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch leaderboard data.');
            }
            
            return result as LeaderboardResponse;
        } catch (err: unknown) {
            const error = err as Error;
            console.error("Leaderboard fetch error:", error);
            setLeaderboardError(error.message || 'Failed to fetch leaderboard data.');
            return {
                success: false,
                entries: [],
                error: error.message || 'Failed to fetch leaderboard data.'
            };
        } finally {
            setLeaderboardLoading(false);
        }
    }, []);
    
    /**
     * Fetches the rank for a specific referral code.
     * @param refCode - The referral code to look up.
     * @returns The user rank data response.
     */
    const getUserRank = useCallback(async (refCode: string): Promise<UserRankResponse> => {
        setUserRankLoading(true);
        setUserRankError(null);
        
        try {
            const targetUrl = `${API_ENDPOINT}?action=getUserRank&ref_code=${encodeURIComponent(refCode)}`;
            console.log(`Looking up user rank for: ${refCode}`);
            
            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                let errorMsg = `User rank lookup failed: ${response.status} ${response.statusText}`;
                try {
                    const errorResult = await response.json();
                    if (errorResult && errorResult.error) {
                        errorMsg = errorResult.error;
                    }
                } catch (parseError) {
                    console.error("User rank lookup parse error:", parseError);
                }
                throw new Error(errorMsg);
            }
            
            const result = await response.json();
            console.log("User rank response:", result);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch user rank data.');
            }
            
            return result as UserRankResponse;
        } catch (err: unknown) {
            const error = err as Error;
            console.error("User rank lookup error:", error);
            setUserRankError(error.message || 'Failed to fetch user rank data.');
            return {
                success: false,
                error: error.message || 'Failed to fetch user rank data.'
            };
        } finally {
            setUserRankLoading(false);
        }
    }, []);

    return { 
        submitToWaitlist, 
        getRefCode, 
        getLeaderboard,
        getUserRank,
        loading, 
        error, 
        success, 
        isExistingUser, 
        refCode, 
        getLoading, 
        getError,
        leaderboardLoading,
        leaderboardError,
        userRankLoading,
        userRankError
    };
} 