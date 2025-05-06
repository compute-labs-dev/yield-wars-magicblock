import { NextRequest, NextResponse } from 'next/server';

// The URL of your Google Apps Script Web App
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// Check if the URL is defined (can be done once outside handlers)
if (!GOOGLE_SCRIPT_URL) {
    console.error('FATAL: Google Script URL is not defined in environment variables.');
    // Optionally, you could throw an error here during build/startup
    // throw new Error('Missing GOOGLE_SCRIPT_URL environment variable');
}

export async function POST(req: NextRequest) {
    if (!GOOGLE_SCRIPT_URL) {
        // This check might be redundant if checked/thrown above, but keeps handlers self-contained
        console.error('Google Script URL is not defined in environment variables.');
        return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    try {
        // 1. Get the data from the incoming request from the frontend
        const body = await req.json();
        const { email, ref_by } = body;

        // Basic validation (optional, but good practice)
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ success: false, error: 'Invalid email provided.' }, { status: 400 });
        }

        // 2. Forward the request to the Google Apps Script
        const scriptResponse = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Often required by Apps Script
            },
            body: JSON.stringify({ email, ref_by }), // Send the same payload
            // No 'mode: cors' needed here - this is a server-to-server request
            // Add a timeout to prevent hanging requests (optional but recommended)
             signal: AbortSignal.timeout(10000) // 10 seconds timeout
        });

        // 3. Handle the response from Google Apps Script
        if (!scriptResponse.ok) {
            // Log the error response from the script if possible
            const errorText = await scriptResponse.text().catch(() => 'Could not read error response.');
            console.error(`Google Script request failed: ${scriptResponse.status} ${scriptResponse.statusText}`, errorText);
            throw new Error(`Google Script request failed with status ${scriptResponse.status}`);
        }

        // Assuming the script always returns JSON, even on handled errors within the script
        const scriptResult = await scriptResponse.json();

        // 4. Return the result from the Google Script back to the frontend
        // Add caching headers if appropriate (e.g., no-cache for dynamic data)
        return NextResponse.json(scriptResult, {
             headers: {
                 'Cache-Control': 'no-store, max-age=0',
             }
         });

    } catch (error: unknown) {
        console.error('API route POST error:', error);
        // Handle specific errors like timeout
        if (error instanceof Error && error.name === 'TimeoutError') {
             return NextResponse.json({ success: false, error: 'Request to waitlist service timed out.' }, { status: 504 }); // Gateway Timeout
        }
         // Handle JSON parsing errors from the request
         if (error instanceof SyntaxError) {
            return NextResponse.json({ success: false, error: 'Invalid request format.' }, { status: 400 });
         }
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}

// --- NEW GET HANDLER ---
export async function GET(req: NextRequest) {
    if (!GOOGLE_SCRIPT_URL) {
        console.error('Google Script URL is not defined in environment variables.');
        return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    try {
        // 1. Get email from query parameters
        const email = req.nextUrl.searchParams.get('email');

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ success: false, error: 'Missing or invalid email query parameter.' }, { status: 400 });
        }

        // 2. Construct the target URL for Google Apps Script GET request
        const targetUrl = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}`;

        // 3. Forward the GET request to Google Apps Script
        const scriptResponse = await fetch(targetUrl, {
            method: 'GET',
            // Add a timeout
            signal: AbortSignal.timeout(10000), // 10 seconds timeout
            // Apps Script doGet redirects by default if not handled correctly,
            // redirect: 'follow' is usually fetch's default but being explicit is fine.
            redirect: 'follow'
        });

        // 4. Handle the response
        if (!scriptResponse.ok) {
            const errorText = await scriptResponse.text().catch(() => 'Could not read error response.');
            console.error(`Google Script GET request failed: ${scriptResponse.status} ${scriptResponse.statusText}`, errorText);
            // Don't expose raw script errors directly unless intended
            throw new Error(`Failed to retrieve data from waitlist service.`);
        }

        // Assuming the script returns JSON
        const scriptResult = await scriptResponse.json();

        // 5. Return the result to the frontend
        return NextResponse.json(scriptResult, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            }
        });

    } catch (error: unknown) {
        console.error('API route GET error:', error);
         if (error instanceof Error && error.name === 'TimeoutError') {
             return NextResponse.json({ success: false, error: 'Request to waitlist service timed out.' }, { status: 504 });
         }
        // Return a generic error message
        return NextResponse.json({ success: false, error: 'Internal Server Error processing your request.' }, { status: 500 });
    }
} 