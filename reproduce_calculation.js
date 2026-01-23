
// Mock window object for the script
const window = {};

// --- Logic from tableview_logic.js ---

let userDataTimestamp = 0;

function getRealRemainingTime(originalTimerValue) {
    if (!originalTimerValue || originalTimerValue <= 0) return 0;
    // IF userDataTimestamp IS NOT SET, IT RETURNS originalTimerValue DIRECTLY
    if (!userDataTimestamp) return originalTimerValue;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const elapsedSeconds = currentTimestamp - userDataTimestamp;
    const realRemaining = originalTimerValue - elapsedSeconds;

    return Math.max(0, realRemaining);
}

// Logic from processBuildings (simplified for demonstration)
function calculateLogic(userTimer, userTimestamp, staticTotalTime) {
    // 1. Set the timestamp context
    userDataTimestamp = userTimestamp;

    // 2. Calculate Real Remaining Time
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log(`\n--- Test Context ---`);
    console.log(`Current Time (Now):   ${currentTimestamp}`);
    console.log(`User Data Timestamp:  ${userTimestamp}`);
    console.log(`Elapsed Seconds:      ${userTimestamp ? (currentTimestamp - userTimestamp) : 'N/A (Timestamp missing)'}`);
    console.log(`Original User Timer:  ${userTimer}`);

    const realRemaining = getRealRemainingTime(userTimer);
    console.log(`Calculated Real Remaining: ${realRemaining}`);

    // 3. Logic for Total Time (Simulator)
    // In the real code, this is looked up from static_data.json based on Level + 1
    // We will use the provided mock staticTotalTime
    const totalUpgradeTime = staticTotalTime;

    // 4. Calculate Progress
    // Table Logic
    const tableProgress = calculateUpgradeProgressTable(realRemaining, totalUpgradeTime);

    // Builder Logic (Script.js style)
    const builderProgress = calculateUpgradeProgressBuilder(realRemaining, totalUpgradeTime);

    console.log(`Total Upgrade Time (Static): ${totalUpgradeTime}`);
    console.log(`\n--- Results ---`);
    console.log(`Table Progress (Math.floor): ${tableProgress}%`);
    console.log(`Builder Progress (Math.round): ${builderProgress}%`);

    return { realRemaining, tableProgress, builderProgress };
}

function calculateUpgradeProgressTable(remainingSeconds, totalUpgradeTime) {
    if (!totalUpgradeTime || totalUpgradeTime <= 0) return 0;
    if (!remainingSeconds || remainingSeconds <= 0) return 100;

    const completed = totalUpgradeTime - remainingSeconds;
    const percentage = (completed / totalUpgradeTime) * 100;
    return Math.min(100, Math.max(0, Math.floor(percentage)));
}

function calculateUpgradeProgressBuilder(remainingSeconds, totalUpgradeTime) {
    if (!totalUpgradeTime || totalUpgradeTime <= 0) return 0;
    if (!remainingSeconds || remainingSeconds <= 0) return 100;

    const completed = totalUpgradeTime - remainingSeconds;
    const percentage = (completed / totalUpgradeTime) * 100;
    return Math.min(100, Math.max(0, Math.round(percentage)));
}


// --- RUN TEST SCENARIOS ---

const USER_TIMER = 96832; // 26 hours, 53 mins, 52 seconds
// Let's assume the TOTAL time for this upgrade is something standard, e.g., 2 days (172800s) or 3 days (259200s).
// If we don't know the total time, we can't calculate percentage. 
// However, the user asked "how does it calculate totaltime".
// Answer: It finds it in static_data.json. 
// We will test with a hypothetical Total Time of 2 days (172800s).
const MOCK_TOTAL_TIME = 172800;

// Scenario 1: User data has NO timestamp (Treats timer as absolute remaining)
console.log("\n>>> SCENARIO 1: No Timestamp in User Data");
calculateLogic(USER_TIMER, 0, MOCK_TOTAL_TIME);

// Scenario 2: User data is FRESH (0 seconds elapsed)
console.log("\n>>> SCENARIO 2: Fresh Data (Just uploaded)");
const now = Math.floor(Date.now() / 1000);
calculateLogic(USER_TIMER, now, MOCK_TOTAL_TIME);

// Scenario 3: User data is 1 Hour Old (3600s elapsed)
console.log("\n>>> SCENARIO 3: Data is 1 Hour Old");
calculateLogic(USER_TIMER, now - 3600, MOCK_TOTAL_TIME);

// Scenario 4: User data is OLDER than the timer (Upgrade should be finished)
console.log("\n>>> SCENARIO 4: Data is 30 Hours Old (Should be finished)");
calculateLogic(USER_TIMER, now - (30 * 3600), MOCK_TOTAL_TIME);
