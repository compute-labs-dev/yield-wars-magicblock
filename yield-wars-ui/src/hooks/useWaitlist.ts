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

// Define the structure for the hook's return value
interface UseWaitlistReturn {
    submitToWaitlist: (email: string, ref_by?: string) => Promise<void>;
    getRefCode: (email: string) => Promise<string | null>;
    loading: boolean;
    error: string | null;
    success: boolean;
    isExistingUser: boolean;
    refCode: string | null;
    getLoading: boolean;
    getError: string | null;
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

    return { submitToWaitlist, getRefCode, loading, error, success, isExistingUser, refCode, getLoading, getError };
} 