/**
 * Handles POST requests to add a user to the waitlist or retrieve existing info.
 * Expects a JSON payload with 'email' and optionally 'ref_by'.
 * Validates email format, checks for existing email, validates ref_by code.
 * Generates a unique referral code if user is new. Appends timestamp.
 * Appends new data or returns existing data.
 * Returns a JSON response.
 */

// --- Word lists for referral code generation ---
var ADJECTIVES = ["Happy", "Clever", "Sunny", "Brave", "Lucky", "Epic", "Wise", "Swift", "Cool", "Magic", "Bold", "Calm", "Eager", "Fancy", "Grand", "Jolly", "Keen", "Merry", "Noble", "Proud"];
var NOUNS = ["Panda", "Fox", "Tiger", "Eagle", "Robot", "Wizard", "Ninja", "Ghost", "Star", "Moon", "Dragon", "Lion", "Bear", "Wolf", "Hawk", "Giant", "Spark", "Comet", "Planet", "Storm"];

/**
 * Generates a unique, memorable referral code.
 * Tries to generate "AdjectiveNounNumber" (e.g., HappyPanda7).
 * Checks against existing codes to ensure uniqueness.
 *
 * @param {Array<string>} existingRefCodes An array of existing referral codes from the 'ref_code' column.
 * @return {string|null} A unique referral code or null if one couldn't be generated after several tries.
 */
function generateReferralCode(existingRefCodes) {
  var MAX_TRIES = 10; // Max attempts to find a unique code
  for (var i = 0; i < MAX_TRIES; i++) {
    var adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    var noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    var num = Math.floor(Math.random() * 100); // Number from 0 to 99
    var potentialCode = adj + noun + num;

    var codeExists = false;
    if (existingRefCodes) {
        for (var j = 0; j < existingRefCodes.length; j++) {
            if (existingRefCodes[j] && existingRefCodes[j].toString().toLowerCase() === potentialCode.toLowerCase()) {
                codeExists = true;
                break;
            }
        }
    }

    if (!codeExists) {
      return potentialCode;
    }
    Logger.log("Generated referral code '" + potentialCode + "' already exists. Retrying...");
  }
  Logger.log("Error: Could not generate a unique referral code after " + MAX_TRIES + " attempts.");
  return null;
}

// --- Helper function to get all referrers sorted by referral count ---
/**
 * Calculates referral counts for all users and returns a sorted list.
 * Ensures all users with a ref_code are included, even with 0 referrals.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The spreadsheet sheet object.
 * @return {Array<Object>} An array of objects, e.g., [{ref_code: "CODE_A", referrals: 5}, ...],
 *                           sorted by referrals (desc) and then ref_code (asc).
 *                           Returns an empty array if sheet is misconfigured or empty.
 */
function getSortedReferrers(sheet) {
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  if (values.length <= 1) { // No data beyond headers or empty sheet
    Logger.log("Info in getSortedReferrers: Sheet is empty or contains only headers.");
    return [];
  }

  var headers = values[0];
  var refCodeColumnIndex = headers.indexOf("ref_code");
  var refByColumnIndex = headers.indexOf("ref_by");

  if (refCodeColumnIndex === -1 || refByColumnIndex === -1) {
    Logger.log("Error in getSortedReferrers: Could not find 'ref_code' or 'ref_by' column headers.");
    return []; // Indicate error or misconfiguration
  }

  var referralCounts = {}; // Stores { "user_ref_code": count }
  var validRefCodes = new Set(); // Stores all unique, assigned ref_codes

  // Pass 1: Initialize all users with a ref_code to 0 referrals and populate validRefCodes
  for (var i = 1; i < values.length; i++) { // Start from row 2 (index 1), skipping header
    var userRefCode = values[i][refCodeColumnIndex] ? values[i][refCodeColumnIndex].toString().trim() : "";
    if (userRefCode !== "") {
      validRefCodes.add(userRefCode);
      if (!referralCounts.hasOwnProperty(userRefCode)) {
        referralCounts[userRefCode] = 0;
      }
    }
  }

  // Pass 2: Count actual referrals
  for (var i = 1; i < values.length; i++) { // Start from row 2 (index 1), skipping header
    var referredByCode = values[i][refByColumnIndex] ? values[i][refByColumnIndex].toString().trim() : "";
    // A referredByCode is only valid if it corresponds to an actual user's ref_code (i.e., it's a key in referralCounts)
    if (referredByCode !== "" && referralCounts.hasOwnProperty(referredByCode)) {
      referralCounts[referredByCode]++;
    }
  }

  // Format for sorting: ensure all users from validRefCodes are included
  var sortedReferrers = [];
  validRefCodes.forEach(function(code) {
    sortedReferrers.push({ ref_code: code, referrals: referralCounts[code] || 0 });
  });

  // Sort: Primary by referrals (descending), secondary by ref_code (ascending for tie-breaking)
  sortedReferrers.sort(function(a, b) {
    if (b.referrals !== a.referrals) {
      return b.referrals - a.referrals; // Sort by referrals descending
    }
    return a.ref_code.localeCompare(b.ref_code); // Sort by ref_code ascending for ties
  });

  return sortedReferrers;
}

function doPost(e) {
    var response = { success: false };
    var sheetName = "Sheet1"; // Make sure this matches your sheet name
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    var lock = LockService.getScriptLock(); // Prevent race conditions
  
    // Wait for lock for up to 30 seconds.
    lock.waitLock(30000);
  
    if (!sheet) {
      Logger.log("Error: Sheet '" + sheetName + "' not found.");
      response.error = "Sheet not found. Check script configuration.";
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }
  
    try {
      var requestData = JSON.parse(e.postData.contents);
      var email = requestData.email;
      var refBy = requestData.ref_by || "";
  
      // --- 1. Validate Email Format ---
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
         Logger.log("Error: Invalid or missing email format: " + email);
         response.error = "Invalid email format provided.";
         lock.releaseLock();
         return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
      }
      email = email.toLowerCase().trim(); // Normalize email
  
      // --- 2. Check if Email Already Exists ---
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var emailColumnIndex = -1;
      var refCodeColumnIndex = -1;
      var existingRefCodesForGeneration = [];

      if (values.length > 0) {
          var headers = values[0];
          emailColumnIndex = headers.indexOf("email");
          refCodeColumnIndex = headers.indexOf("ref_code");
          if (refCodeColumnIndex !== -1) {
              for (var k = 1; k < values.length; k++) {
                  if (values[k][refCodeColumnIndex]) {
                      existingRefCodesForGeneration.push(values[k][refCodeColumnIndex].toString());
                  }
              }
          }
      }
  
      if (emailColumnIndex === -1 || refCodeColumnIndex === -1) {
           Logger.log("Error: Could not find 'email' or 'ref_code' column headers in Sheet1.");
           response.error = "Sheet configuration error (missing columns).";
           lock.releaseLock();
           return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
      }
  
      for (var i = 1; i < values.length; i++) { // Start from row 2 (index 1)
        if (values[i][emailColumnIndex] && values[i][emailColumnIndex].toString().toLowerCase() === email) {
          Logger.log("Email already exists: " + email + ". Returning existing ref code.");
          response.success = true;
          response.email_exists = true;
          response.ref_code = values[i][refCodeColumnIndex] ? values[i][refCodeColumnIndex].toString() : null;
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
        }
      }
  
      // --- 3. Validate ref_by code (if provided) ---
      var isRefByValid = false;
      if (refBy) {
          refBy = refBy.trim(); // Normalize refBy
          for (var i = 1; i < values.length; i++) {
             if (values[i][refCodeColumnIndex] && values[i][refCodeColumnIndex].toString() === refBy) {
                 isRefByValid = true;
                 break;
             }
          }
          if (!isRefByValid) {
              Logger.log("Warning: Provided ref_by code '" + refBy + "' for email '" + email + "' does not exist in ref_code column. Storing it anyway.");
          }
      }
  
      // --- 4. Add New User ---
      var newRefCode = generateReferralCode(existingRefCodesForGeneration);
      if (!newRefCode) {
        Logger.log("Warning: Custom referral code generation failed. Falling back to UUID.");
        newRefCode = Utilities.getUuid();
      }
      var timestamp = new Date();
      // Ensure the order matches your sheet columns: email, ref_code, ref_by, timestamp
      sheet.appendRow([email, newRefCode, refBy, timestamp]);
      Logger.log("Appended new row: Email=" + email + ", RefCode=" + newRefCode + ", RefBy=" + refBy + ", Timestamp=" + timestamp);
  
      response.success = true;
      response.ref_code = newRefCode;
  
    } catch (error) {
      Logger.log("Error processing POST request: " + error.toString() + " Stack: " + error.stack);
      Logger.log("Request Data: " + e.postData.contents);
      response.error = "Failed to process request: " + error.toString();
    } finally {
        lock.releaseLock(); // Ensure lock is always released
    }
  
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }

// --- doGet function for retrieving ref_code by email, leaderboard, and user rank ---
/**
 * Handles GET requests.
 * - If 'email' param is provided: retrieves the user's referral code.
 * - If 'action=getLeaderboard' param is provided: retrieves a paginated list of top referrers.
 * - If 'action=getUserRank' and 'ref_code' params are provided: retrieves the rank of a specific referral code.
 */
function doGet(e) {
  var response = { success: false };
  var sheetName = "Sheet1"; // Make sure this matches your sheet name
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000); // Wait for lock for up to 30 seconds.

    if (!sheet) {
      Logger.log("Error: Sheet '" + sheetName + "' not found.");
      response.error = "Sheet not found. Check script configuration.";
      return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }

    var params = e.parameter; // Simplified access to parameters

    // Action: Get user's ref_code by email
    if (params.email && !params.action) { // Only if email is present and no other action specified
      var emailToFind = params.email.toLowerCase().trim();
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var emailColumnIndex = -1;
      var refCodeColumnIndex = -1;

      if (values.length > 0) {
        var headers = values[0];
        emailColumnIndex = headers.indexOf("email");
        refCodeColumnIndex = headers.indexOf("ref_code");
      }

      if (emailColumnIndex === -1 || refCodeColumnIndex === -1) {
        Logger.log("Error: Could not find 'email' or 'ref_code' column headers in " + sheetName + " for email lookup.");
        response.error = "Sheet configuration error (missing columns for email lookup).";
      } else {
        var found = false;
        for (var i = 1; i < values.length; i++) {
          if (values[i][emailColumnIndex] && values[i][emailColumnIndex].toString().toLowerCase() === emailToFind) {
            response.success = true;
            response.email_exists = true;
            response.ref_code = values[i][refCodeColumnIndex] ? values[i][refCodeColumnIndex].toString() : null;
            found = true;
            break;
          }
        }
        if (!found) {
          response.email_exists = false;
          response.error = "Email not found in the waitlist.";
        }
      }
    } else if (params.action === 'getLeaderboard') {
      var sortedReferrers = getSortedReferrers(sheet);
      if (!sortedReferrers || sortedReferrers.length === 0) {
        response.success = true; // Successfully processed, but no data
        response.leaderboard = [];
        response.totalEntries = 0;
        response.page = 1;
        response.limit = parseInt(params.limit, 10) || 20;
        response.totalPages = 0;
      } else {
        var page = parseInt(params.page, 10) || 1;
        var limit = parseInt(params.limit, 10) || 20;

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 20;

        var totalEntries = sortedReferrers.length;
        var totalPages = Math.ceil(totalEntries / limit);
        if (page > totalPages && totalPages > 0) page = totalPages; // Adjust if page is out of bounds

        var startIndex = (page - 1) * limit;
        // endIndex is exclusive for slice, but we want to make sure it doesn't exceed array bounds
        var paginatedResults = sortedReferrers.slice(startIndex, startIndex + limit);

        response.success = true;
        response.leaderboard = paginatedResults;
        response.totalEntries = totalEntries;
        response.page = page;
        response.limit = limit;
        response.totalPages = totalPages;
      }
    } else if (params.action === 'getUserRank' && params.ref_code) {
      var refCodeToFind = params.ref_code.trim();
      if (!refCodeToFind) {
        response.error = "Missing ref_code parameter for getUserRank action.";
      } else {
        var sortedReferrers = getSortedReferrers(sheet);
        var userRankData = null;
        var rank = -1;

        if (sortedReferrers && sortedReferrers.length > 0) {
          for (var i = 0; i < sortedReferrers.length; i++) {
            if (sortedReferrers[i].ref_code === refCodeToFind) {
              userRankData = sortedReferrers[i];
              rank = i + 1; // 1-based ranking
              break;
            }
          }
        }

        if (userRankData) {
          response.success = true;
          response.ref_code = userRankData.ref_code;
          response.referrals = userRankData.referrals;
          response.rank = rank;
          response.totalRanked = sortedReferrers.length;
        } else {
          response.success = false; // Keep success false if not found for clarity
          response.error = "Referral code not found or has no ranking.";
          // Optionally, you might still want to return totalRanked if the code just isn't in the list
          // response.totalRanked = sortedReferrers ? sortedReferrers.length : 0;
        }
      }
    } else {
      response.error = "Invalid request. Provide 'email' or a valid 'action' parameter (getLeaderboard, getUserRank with ref_code).";
    }

  } catch (error) {
    Logger.log("Error processing GET request: " + error.toString() + " Stack: " + error.stack);
    Logger.log("Request Parameters: " + JSON.stringify(e.parameter));
    response.error = "Failed to process GET request: " + error.toString();
  } finally {
    if (lock.hasLock()) {
        lock.releaseLock();
    }
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}