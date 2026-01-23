
const fs = require('fs');

// Mock window
const window = {
    getRealRemainingTime: (val) => val, // Pass through for simplicity or implement mock
    formatK: (num) => num
};

function checkRealCompletion(lvl, timer) {
    if (!timer || timer <= 0) return { lvl, timer: 0, completed: false };
    // Simplified: assume not completed for now to test calculation
    return { lvl, timer, completed: false };
}

function calculateUpgradeProgress(remainingSeconds, totalUpgradeTime) {
    if (!totalUpgradeTime || totalUpgradeTime <= 0) return 0;
    if (!remainingSeconds || remainingSeconds <= 0) return 100;

    const completed = totalUpgradeTime - remainingSeconds;
    const percentage = (completed / totalUpgradeTime) * 100;
    return Math.min(100, Math.max(0, Math.round(percentage)));
}

function getMaxLevel(levels, th) {
    if (!levels) return 0;
    const valid = levels.filter(l => (l.required_townhall || 0) <= th);
    if (valid.length === 0) return 0;
    return Math.max(...valid.map(l => l.level));
}

function calculateGemCost(time) { return 0; }
function getRemainingUpgrades() { return {}; }
function getAllRemainingUpgrades() { return {}; }
function getNextUpgrade(levels, curLvl) { return levels.find(l => l.level === curLvl + 1); }

// Simplified processBuildings from tableview_logic.js (with my previous verified changes? No, processBuildings wasn't changed)
// I will paste the CURRENT implementation of processBuildings from the file.
// Since I can't require it easily, I'll copy the logic logic relevant to the bug.

function processBuildings(userData, staticData, userTH) {
    console.log(`Processing Buildings with TH: ${userTH}`);
    const rows = [];
    const allStatic = [...(staticData.buildings || []), ...(staticData.traps || [])];
    const allUser = [...(userData.buildings || []), ...(userData.traps || [])];

    // Simple Name->ID map
    const nameToId = {};
    allStatic.forEach(s => { if (s.name) nameToId[s.name] = s._id; });

    // Group User
    const groupedUser = {};
    allUser.forEach(b => {
        let id = b.data;
        if (!id && b.name) id = nameToId[b.name];
        if (!id) return;
        if (!groupedUser[id]) groupedUser[id] = [];
        const count = b.cnt || 1;
        for (let i = 0; i < count; i++) {
            groupedUser[id].push({ lvl: b.lvl, timer: b.timer });
        }
    });

    allStatic.forEach(sItem => {
        if (sItem.name !== 'Elixir Collector') return; // Filter for specific item

        console.log(`\nProcessing Item ID: ${sItem._id}, Type: ${sItem.type}, Village: ${sItem.village}`);
        console.log(`Total Levels in Data: ${sItem.levels ? sItem.levels.length : 0}`);
        if (sItem.levels) {
            sItem.levels.forEach(l => {
                if (l.level >= 17) console.log(`  - Level ${l.level}, Req TH: ${l.required_townhall}, Build Time: ${l.build_time}`);
            });
        }

        const validLevels = sItem.levels.filter(l => l.required_townhall <= userTH);
        console.log(`Valid Levels Count (TH<=${userTH}): ${validLevels.length}`);

        if (instances.length > 0) {
            instances.forEach((instance, idx) => {
                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const currentLvl = completionCheck.lvl;
                const currentTimer = completionCheck.timer;

                if (currentTimer) {
                    // Get the upgrade time for current level -> next level
                    const nextLevelObj = validLevels.find(l => l.level === currentLvl + 1);

                    console.log(`Instance ${idx}: Level ${currentLvl}, Timer ${currentTimer}`);
                    console.log(`Next Level Target: ${currentLvl + 1}`);
                    console.log(`Next Level Obj Found? ${!!nextLevelObj}`);

                    const totalUpgradeTime = nextLevelObj ? (nextLevelObj.build_time || nextLevelObj.upgrade_time || 0) : 0;
                    console.log(`Total Upgrade Time: ${totalUpgradeTime}`);

                    const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);
                    console.log(`Calculated Progress: ${progress}%`);
                }
            });
        }
    });
}

// Load Data
const staticData = JSON.parse(fs.readFileSync('static_data.json', 'utf8'));
const userData = JSON.parse(fs.readFileSync('test_data/user_main.json', 'utf8'));

// Run Test
// processBuildings(userData, staticData, 18);

// Manual Verification for Wizard Tower 14 -> 15 (1 min remaining)
const verifyWizardTower = () => {
    const wt = staticData.buildings.find(b => b.name === 'Wizard Tower');
    if (wt) {
        console.log('\n--- Wizard Tower Progress Test ---');
        // Level 14 -> 15
        const nextTarget = wt.levels.find(l => l.level === 15);
        if (nextTarget) {
            const totalTime = nextTarget.build_time || nextTarget.upgrade_time;
            const remaining = 60; // 1 minute
            console.log(`WT Lv 14 -> 15.`);
            console.log(`Total Time: ${totalTime}s`);
            console.log(`Remaining: ${remaining}s`);

            // Calc logic based on tableview_logic.js CURRENT STATE (Simulated)
            const completed = totalTime - remaining;
            const percentage = (completed / totalTime) * 100;
            console.log(`Raw Percentage: ${percentage}`);
            const rounded = Math.round(percentage); // Old way
            const floored = Math.floor(percentage); // New way

            console.log(`Math.round: ${rounded}%`);
            console.log(`Math.floor: ${floored}%`);
            console.log(`Result using floor: ${Math.min(100, Math.max(0, floored))}%`);
        } else {
            console.log('Wizard Tower Level 15 not found in static data');
        }
    }
};

verifyWizardTower();
