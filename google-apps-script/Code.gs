/**
 * Badminton Activity Logger - Google Apps Script Macros
 * 
 * Deploy as a web app at: https://script.google.com/macros/
 * 
 * Macros:
 * 1. getTrainerNames() - Returns array of all unique trainer names
 * 2. getActivityByTrainerAndDate(trainerName, date) - Returns activity for trainer on specific date
 * 
 * How to deploy:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete default Code.gs
 * 4. Paste this entire code
 * 5. Run > Deploy > New deployment > Type: Web app
 * 6. Execute as: Your email
 * 7. Who has access: Anyone
 * 8. Copy the deployment URL
 * 9. Use URL in frontend for API calls
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Update this with your Google Sheet ID
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAME = "Activities";

// Column mapping (adjust if your columns are different)
const COLUMNS = {
  TRAINER_NAME: "Trainer Name",
  DATE: "Date",
  ACTIVITY: "Activity",
  START_TIME: "Start Time",
  END_TIME: "End Time",
  NOTE: "Note"
};

// ============================================================================
// MACRO 1: Get All Trainer Names
// ============================================================================

/**
 * Returns all unique trainer names from the sheet
 * @return {Object} JSON response with trainer names array
 */
function getTrainerNames() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Get header row to find trainer name column
    const headers = data[0];
    const trainerIndex = headers.indexOf(COLUMNS.TRAINER_NAME);
    
    if (trainerIndex === -1) {
      return createErrorResponse("Trainer Name column not found");
    }
    
    // Extract unique trainer names (skip header)
    const trainers = new Set();
    for (let i = 1; i < data.length; i++) {
      const trainerName = data[i][trainerIndex];
      if (trainerName && trainerName.trim() !== "") {
        trainers.add(trainerName.trim());
      }
    }
    
    return createSuccessResponse(
      Array.from(trainers).sort(),
      "Trainer names retrieved successfully"
    );
  } catch (error) {
    return createErrorResponse("Error retrieving trainer names: " + error.toString());
  }
}

// ============================================================================
// MACRO 2: Get Activity by Trainer and Date
// ============================================================================

/**
 * Returns activity for a specific trainer on a specific date
 * @param {string} trainerName - Name of the trainer
 * @param {string} date - Date in YYYY-MM-DD format
 * @return {Object} JSON response with activity details
 */
function getActivityByTrainerAndDate(trainerName, date) {
  try {
    // Validate inputs
    if (!trainerName || !date) {
      return createErrorResponse("Missing required parameters: trainerName and date");
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Get header row to find column indices
    const headers = data[0];
    const trainerIndex = headers.indexOf(COLUMNS.TRAINER_NAME);
    const dateIndex = headers.indexOf(COLUMNS.DATE);
    const activityIndex = headers.indexOf(COLUMNS.ACTIVITY);
    const startTimeIndex = headers.indexOf(COLUMNS.START_TIME);
    const endTimeIndex = headers.indexOf(COLUMNS.END_TIME);
    const noteIndex = headers.indexOf(COLUMNS.NOTE);
    
    // Check if all required columns exist
    if (trainerIndex === -1 || dateIndex === -1) {
      return createErrorResponse("Required columns not found in sheet");
    }
    
    // Find matching rows
    const activities = [];
    for (let i = 1; i < data.length; i++) {
      const rowTrainer = data[i][trainerIndex];
      const rowDate = data[i][dateIndex];
      
      // Format date for comparison (handle both Date objects and strings)
      const formattedRowDate = formatDate(rowDate);
      
      if (rowTrainer && rowTrainer.trim() === trainerName.trim() && 
          formattedRowDate === date) {
        
        // Calculate duration from start and end times
        const startTime = data[i][startTimeIndex] || "";
        const endTime = data[i][endTimeIndex] || "";
        const duration = calculateDuration(startTime, endTime);
        
        activities.push({
          activity: data[i][activityIndex] || "",
          start: formatTime(startTime),
          end: formatTime(endTime),
          duration: duration,
          note: data[i][noteIndex] || ""
        });
      }
    }
    
    if (activities.length === 0) {
      return createSuccessResponse(
        [],
        "No activities found for trainer on this date"
      );
    }
    
    return createSuccessResponse(
      activities,
      `Found ${activities.length} activity(ies) for ${trainerName} on ${date}`
    );
  } catch (error) {
    return createErrorResponse("Error retrieving activity: " + error.toString());
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a date to YYYY-MM-DD string
 * @param {*} date - Date value from sheet (could be Date object or string)
 * @return {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return "";
  
  // If it's already a string in YYYY-MM-DD format, return as is
  if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date;
  }
  
  // If it's a Date object
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse as date string
  try {
    const dateObj = new Date(date);
    if (!isNaN(dateObj)) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // If parsing fails, return empty string
  }
  
  return "";
}

/**
 * Formats time to HH:MM string
 * @param {*} time - Time value from sheet
 * @return {string} Formatted time string
 */
function formatTime(time) {
  if (!time) return "";
  
  // If it's already a string in HH:MM format
  if (typeof time === "string") {
    const trimmed = time.trim();
    if (trimmed.match(/^\d{2}:\d{2}/)) {
      return trimmed.substring(0, 5); // Return only HH:MM
    }
    return trimmed;
  }
  
  return String(time);
}

/**
 * Calculates duration in minutes between start and end times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @return {string} Duration in minutes
 */
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return "";
  
  try {
    // Extract hours and minutes
    const [startHour, startMin] = String(startTime).split(":").map(Number);
    const [endHour, endMin] = String(endTime).split(":").map(Number);
    
    // Calculate difference in minutes
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    
    return String(duration > 0 ? duration : 0);
  } catch (error) {
    return "";
  }
}

/**
 * Creates a success response object
 * @param {*} data - Data to return
 * @param {string} message - Success message
 * @return {Object} Response object
 */
function createSuccessResponse(data, message) {
  return {
    success: true,
    message: message,
    data: data
  };
}

/**
 * Creates an error response object
 * @param {string} message - Error message
 * @return {Object} Response object
 */
function createErrorResponse(message) {
  return {
    success: false,
    message: message,
    data: null
  };
}

// ============================================================================
// WEB APP ENTRY POINT
// ============================================================================

/**
 * Handles HTTP GET requests to the web app
 * Query parameters:
 * - action=getTrainerNames
 * - action=getActivityByTrainerAndDate&trainer=Name&date=2024-08-05
 * 
 * @param {Object} e - Event object containing query parameters
 * @return {TextOutput} JSON response
 */
function doGet(e) {
  const action = e.parameter.action;
  let response;
  
  try {
    switch (action) {
      case "getTrainerNames":
        response = getTrainerNames();
        break;
      
      case "getActivityByTrainerAndDate":
        const trainerName = e.parameter.trainer;
        const date = e.parameter.date;
        response = getActivityByTrainerAndDate(trainerName, date);
        break;
      
      default:
        response = createErrorResponse(
          `Unknown action: ${action}. ` +
          "Available actions: getTrainerNames, getActivityByTrainerAndDate"
        );
    }
  } catch (error) {
    response = createErrorResponse("Server error: " + error.toString());
  }
  
  // Return as JSON with CORS headers
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests to the web app
 * POST body (JSON):
 * {
 *   "action": "getActivityByTrainerAndDate",
 *   "trainer": "Coach Name",
 *   "date": "2024-08-05"
 * }
 * 
 * @param {Object} e - Event object containing request body
 * @return {TextOutput} JSON response
 */
function doPost(e) {
  let response;
  
  try {
    const requestBody = JSON.parse(e.postData.contents);
    const action = requestBody.action;
    
    switch (action) {
      case "getTrainerNames":
        response = getTrainerNames();
        break;
      
      case "getActivityByTrainerAndDate":
        const trainerName = requestBody.trainer;
        const date = requestBody.date;
        response = getActivityByTrainerAndDate(trainerName, date);
        break;
      
      default:
        response = createErrorResponse(
          `Unknown action: ${action}. ` +
          "Available actions: getTrainerNames, getActivityByTrainerAndDate"
        );
    }
  } catch (error) {
    response = createErrorResponse("Server error: " + error.toString());
  }
  
  // Return as JSON
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// TEST FUNCTIONS (Remove or comment out in production)
// ============================================================================

/**
 * Test function - run this to see if your macros work
 * Click Run > Execute function > myFunction
 */
function testMacros() {
  Logger.log("Testing getTrainerNames...");
  Logger.log(getTrainerNames());
  
  Logger.log("\nTesting getActivityByTrainerAndDate...");
  // Replace with actual trainer name and date from your sheet
  Logger.log(getActivityByTrainerAndDate("Coach John", "2024-08-05"));
}
