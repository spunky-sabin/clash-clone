// Tableview calculation and rendering logic integrated from tracker.html
// This file contains all the functions needed to process and display the tableview data

// Global variables for tableview
let processedTableData = [];
let currentTableCategory = 'Defense';
let userThLevel = 1;
let userDataTimestamp = 0; // Timestamp from user's data export

// Calculate real remaining time based on elapsed time since data export
function getRealRemainingTime(originalTimerValue) {
    if (!originalTimerValue || originalTimerValue <= 0) return 0;
    if (!userDataTimestamp) return originalTimerValue;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const elapsedSeconds = currentTimestamp - userDataTimestamp;
    const realRemaining = originalTimerValue - elapsedSeconds;

    return Math.max(0, realRemaining);
}

// Make real-time function available globally
window.getRealRemainingTime = getRealRemainingTime;
window.getUserDataTimestamp = () => userDataTimestamp;
window.setUserDataTimestamp = (ts) => { userDataTimestamp = ts; };

// Building names mapping
const buildingNames = {
    "Barracks": 1000006,
    "Dark Barracks": 1000026,
    "Spell Factory": 1000020,
    "Dark Spell Factory": 1000029,
    "Workshop": 1000059,
    "Pet House": 1000068
};

// Helper function to get building level
function getUserBuildingLevel(userData, name) {
    const id = buildingNames[name];
    if (!id) return 0;

    const allUserBuildings = [...(userData.buildings || []), ...(userData.traps || [])];
    const buildings = allUserBuildings.filter(b => b.data === id || b.name === name);
    if (!buildings.length) return 0;
    return Math.max(...buildings.map(b => b.lvl));
}

// Main processing function
function processTableData(userData, staticData, userTH) {
    processedTableData = [];
    userThLevel = userTH;

    // 1. Process all buildings and categorize by type
    const buildings = processBuildings(userData, staticData, userTH);
    buildings.forEach(b => b.category = b.type); // Use the type as category
    processedTableData.push(...buildings);

    // 2. Process traps separately
    const traps = processTraps(userData, staticData, userTH);
    traps.forEach(t => t.category = 'Trap');
    processedTableData.push(...traps);

    // 3. Process troops (Elixir troops) and spells
    const troops = processArmy(userData, staticData, userTH);
    processedTableData.push(...troops);

    // 4. Heroes
    const heroes = processSingles(userData, staticData, userTH, 'heroes', 'heroes', 'Dark Elixir');
    heroes.forEach(d => d.category = 'Heroes');
    processedTableData.push(...heroes);

    // 6. Pets (with production building logic)
    const pets = processPets(userData, staticData, userTH);
    pets.forEach(d => d.category = 'Pets');
    processedTableData.push(...pets);

    // 7. Equipment
    const equip = processEquipment(userData, staticData, userTH);
    equip.forEach(d => d.category = 'Equipment');
    processedTableData.push(...equip);

    // 8. Guardians
    const guardians = processGuardians(userData, staticData, userTH);
    guardians.forEach(g => g.category = 'Guardians');
    processedTableData.push(...guardians);

    // 9. Crafted/Seasonal Defenses
    const crafted = processCraftedDefenses(userData, staticData, userTH);
    crafted.forEach(c => c.category = 'Crafted');
    processedTableData.push(...crafted);

    // 10. Walls
    const walls = processWalls(userData, staticData, userTH);
    walls.forEach(w => w.category = 'Walls');
    processedTableData.push(...walls);

    // Update global reference
    window.processedTableData = processedTableData;

    console.log('Total tableview items processed:', processedTableData.length);
    console.log('Categories:', [...new Set(processedTableData.map(d => d.category))].sort());
}

// Helper to check if an upgrade has completed in real-time
function checkRealCompletion(lvl, timer) {
    if (!timer || timer <= 0) return { lvl, timer: 0, completed: false };

    const realRemaining = getRealRemainingTime(timer);
    if (realRemaining <= 0) {
        // Upgrade finished! Fast forward.
        return { lvl: lvl + 1, timer: 0, completed: true };
    }

    return { lvl, timer, completed: false };
}

// Helper: Get allowed quantity of a building at the user's Town Hall
function getAllowedCount(id, userTH, staticData) {
    const thId = 1000001; // Home Village TH ID
    if (Number(id) === thId) return 1;

    const thBuilding = (staticData.buildings || []).find(b => b._id === thId);
    let count = 0;

    if (thBuilding && thBuilding.levels) {
        thBuilding.levels.forEach(l => {
            if (l.level <= userTH) {
                (l.unlocks || []).forEach(u => {
                    if (Number(u._id) === Number(id)) count += u.quantity;
                });
            }
        });
    }
    return count;
}

function processBuildings(userData, staticData, userTH) {
    const rows = [];
    const allStatic = [...(staticData.buildings || []), ...(staticData.traps || [])];
    const allUser = [...(userData.buildings || []), ...(userData.traps || [])];

    // Build Name->ID helper for API data support
    const nameToId = {};
    allStatic.forEach(s => {
        if (s.name) nameToId[s.name] = s._id;
    });

    // Group User Buildings by ID and expand cnt field
    const groupedUser = {};
    allUser.forEach(b => {
        let id = b.data;
        if (!id && b.name) id = nameToId[b.name];
        if (!id) return;

        if (!groupedUser[id]) groupedUser[id] = [];

        const count = b.cnt || 1;
        for (let i = 0; i < count; i++) {
            groupedUser[id].push({
                lvl: b.lvl,
                timer: b.timer,
                gear_up: b.gear_up,
                supercharge: b.supercharge
            });
        }
    });

    // VIRTUALIZE MERGED DEFENSES
    // If user has a merged defense (e.g. Multi-Archer Tower), credit the original defenses (Archer Towers)
    (staticData.buildings || []).forEach(mergedB => {
        if (mergedB.levels && mergedB.levels[0] && mergedB.levels[0].merge_requirement) {
            const mergeReq = mergedB.levels[0].merge_requirement;

            // Check if user has this merged building (any level > 0 or upgrading)
            // Note: We need to look at groupedUser for the Merged ID
            const mergedId = mergedB._id;
            const userMergedInstances = groupedUser[mergedId] || [];

            userMergedInstances.forEach(inst => {
                // For each instance of a merged defense the user has, we credit the components
                // One Multi-Archer Tower consumes e.g. 2 Archer Towers
                mergeReq.forEach(req => {
                    const reqId = req._id;
                    const reqQty = req.quantity || 1; // It might be implied 1 in array, but usually array lists items. 
                    // Actually checking calc_structures: const requiredForMerge = mergeReq.filter(req => Number(req._id) === Number(id)); 
                    // Wait, mergeReq is an array of objects like { _id: 1000009, level: 20, quantity: 2 }?
                    // Let's check staticData structure interpretation.
                    // "unlocks" has quantity. "merge_requirement"?
                    // In calc_structures: "requiredForMerge.forEach(req => { userOwned.push(...) })"
                    // Whatever the structure, we iterate it.

                    // If mergeReq is [{_id: X, level: Y, quantity: 2}] or just [{_id:X}, {_id:X}]?
                    // Viewing static_data earlier: Unlocks has quantity. Merge requirement snippet wasn't fully shown but inferred.
                    // Let's assume consistent with calc_structures logic:
                    // calc_structures filters mergeReq by ID. 

                    /* 
                    calc_structures.js:
                    const requiredForMerge = mergeReq.filter(req => Number(req._id) === Number(id));
                    ...
                    userMergedDefenses.forEach(merged => {
                         const count = merged.cnt || 1;
                         for (let i = 0; i < count; i++) {
                             requiredForMerge.forEach(req => {
                                 userOwned.push({ level: req.level, timer: 0 });
                             });
                         }
                    });
                    */

                    // This implies requiredForMerge is an array of requirements matching the target ID.
                    // Here we are iterating the Merged Building first, so we want to process ALL requirements.

                    if (!groupedUser[reqId]) groupedUser[reqId] = [];

                    // We need to add 'quantity' copies? Or is 'req' a single instance definition?
                    // Typically structure is [{_id: X, level: Y, quantity: Z?}] or just mapped.
                    // If quantity is present, we loop.

                    const qty = req.quantity || 1;
                    for (let q = 0; q < qty; q++) {
                        groupedUser[reqId].push({
                            lvl: req.level,
                            timer: 0,
                            isMerged: true,
                            status: 'Maxed' // Virtualized implies completed/maxed for the purpose of the merge
                        });
                    }
                });
            });
        }
    });

    allStatic.forEach(sItem => {
        if (sItem.village !== 'home') return;
        if (!sItem.type) return;
        if (sItem._id === 1000097) return; // Skip Crafting Station

        let instances = groupedUser[sItem._id] || [];
        const validLevels = sItem.levels.filter(l => l.required_townhall <= userTH);

        // Calculate Allowed Quantity
        const allowedQty = getAllowedCount(sItem._id, userTH, staticData);

        // If no instances and not allowed, skip
        if (instances.length === 0 && allowedQty === 0) return;

        // If we strictly follow allowedQty, we should ensure we render 'allowedQty' rows.
        // Fill missing slots with Unbuilt (Level 0)
        const builtCount = instances.length;
        if (builtCount < allowedQty) {
            const missing = allowedQty - builtCount;
            for (let m = 0; m < missing; m++) {
                instances.push({
                    lvl: 0,
                    timer: 0,
                    isUnbuilt: true
                });
            }
        }

        if (instances.length === 0 && allowedQty === 0 && validLevels.length === 0) return;

        // Special Case: Eagle Artillery (1000031) absorbed into TH at TH17+
        // If user is TH17+, they technically still "own" it but it's merged.
        // We need to ensure it appears as (Merged).
        // If they have it (lvl > 0), mark it merged.
        // If they don't have it (lvl 0) but allowed, calc_structures marks it as Level 7.
        if (sItem._id === 1000031 && userTH >= 17) {
            instances.forEach(inst => {
                inst.isMerged = true;
                // Ensure it looks maxed
                if (inst.lvl === 0) inst.lvl = 7; // Max level for Eagle
                inst.status = 'Maxed';
            });
        }

        const maxTH = getMaxLevel(validLevels, userTH);

        if (instances.length > 0) {
            // Sort: 
            // 1. Real Active Buildings (High to Low Level?) -> usually we sort Low to High so next upgrade is first? 
            // tableview_logic original: instances.sort((a, b) => a.lvl - b.lvl);
            // We should keep this, but place Unbuilt (lvl 0) at the start or end?
            // "lvl 0" will naturally be at start with a.lvl - b.lvl.

            instances.sort((a, b) => a.lvl - b.lvl);

            // Pre-calculate species-wide totals for NORMAL upgrades
            let sectionNormalCount = 0;
            let sectionNormalCost = 0;
            let sectionNormalTime = 0;

            instances.forEach(instance => {
                // Skip unbuilt/merged for summary stats? 
                // Unbuilt should count towards upgrades needed (Level 0 -> 1 -> ...).
                // Virtual Merged (isMerged=true) should be considered Maxed and not contribute to costs.

                if (instance.isMerged) return;

                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const cLvl = completionCheck.lvl;
                const cTimer = completionCheck.timer;

                if (cTimer && cLvl < maxTH) {
                    // Currently upgrading
                    const nextLevelObj = validLevels.find(l => l.level === cLvl + 1);
                    if (nextLevelObj) {
                        sectionNormalCost += nextLevelObj.upgrade_cost || nextLevelObj.build_cost || 0;
                        sectionNormalTime += nextLevelObj.upgrade_time || nextLevelObj.build_time || 0;
                        sectionNormalCount += 1;
                    }
                    const rem = getRemainingUpgrades(validLevels, cLvl, maxTH, false, null, 0);
                    sectionNormalCost += rem.totalCost;
                    sectionNormalTime += rem.totalTime;
                    sectionNormalCount += rem.count;
                } else if (cLvl < maxTH) {
                    // Idle (including Unbuilt Level 0)
                    const rem = getAllRemainingUpgrades(validLevels, cLvl, maxTH, null, false, null, 0);
                    sectionNormalCost += rem.totalCost;
                    sectionNormalTime += rem.totalTime;
                    sectionNormalCount += rem.count;
                }
            });

            instances.forEach((instance, idx) => {
                // START Custom Logic for Status

                // 1. Virtual Merged
                if (instance.isMerged) {
                    rows.push({
                        name: sItem.name,
                        level: instance.lvl,
                        max: maxTH, // Display relative to TH max
                        cost: 0,
                        time: 0,
                        status: 'Maxed',
                        isMerged: true, // Tag for renderer
                        res: sItem.upgrade_resource || 'Gold',
                        type: sItem.type,
                        instanceIndex: idx + 1,
                        totalInstances: instances.length,
                        sectionNormalCount,
                        sectionNormalCost,
                        sectionNormalTime
                    });
                    return;
                }

                // 2. Unbuilt Logic
                if (instance.isUnbuilt || (instance.lvl === 0 && !instance.timer)) {
                    // Check if this building itself is a Merged Defense (e.g. Ricochet Cannon)
                    const isMergedType = sItem.levels && sItem.levels[0] && sItem.levels[0].merge_requirement;

                    let status = isMergedType ? 'Merge' : 'Build';

                    // Cost/Time to build (Level 1)
                    const l1 = validLevels.find(l => l.level === 1);
                    const cost = l1 ? (l1.build_cost || l1.upgrade_cost || 0) : 0;
                    const time = l1 ? (l1.build_time || l1.upgrade_time || 0) : 0;

                    // Remaining upgrades
                    const allRemaining = getAllRemainingUpgrades(validLevels, 0, maxTH, null, false, null, 0);

                    rows.push({
                        name: sItem.name,
                        level: 0,
                        max: maxTH,
                        cost: cost,
                        time: time,
                        status: status,
                        res: sItem.upgrade_resource || 'Gold',
                        type: sItem.type,
                        instanceIndex: idx + 1,
                        totalInstances: instances.length,
                        allRemainingUpgrades: allRemaining,
                        sectionNormalCount,
                        sectionNormalCost,
                        sectionNormalTime
                    });
                    return;
                }

                // END Custom Logic

                // Check for real-time completion (fast forward if needed)
                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const currentLvl = completionCheck.lvl;
                const currentTimer = completionCheck.timer;

                let status = 'Locked';
                let nextCost = 0;
                let nextTime = 0;
                let upgradeInfo = null;
                let superchargeLevel = instance.supercharge || 0;
                let isSupercharging = false;

                // Supercharge Setup
                const maxMainLevel = Math.max(...sItem.levels.map(l => l.level));
                const maxLevelObj = sItem.levels.find(l => l.level === maxMainLevel);
                const superchargeData = (sItem.superchargeable && maxLevelObj && maxLevelObj.supercharge) ? maxLevelObj.supercharge : null;
                const totalSuperchargeLevels = superchargeData ? superchargeData.levels.length : 0;

                if (currentTimer) {
                    const realRemaining = getRealRemainingTime(currentTimer);

                    if (currentLvl < maxTH) {
                        // Normal level upgrade
                        status = 'Upgrading';
                        nextTime = currentTimer;
                        const nextLevelObj = validLevels.find(l => l.level === currentLvl + 1);
                        let totalUpgradeTime = nextLevelObj ? (nextLevelObj.build_time || nextLevelObj.upgrade_time || 0) : 0;
                        if (totalUpgradeTime === 0 && currentLvl > 0) {
                            const currentLevelObj = validLevels.find(l => l.level === currentLvl);
                            totalUpgradeTime = currentLevelObj ? (currentLevelObj.build_time || currentLevelObj.upgrade_time || 0) : 0;
                        }

                        const gemCost = calculateGemCost(currentTimer);
                        const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);
                        const remaining = getRemainingUpgrades(validLevels, currentLvl, maxTH, false, superchargeData, superchargeLevel);

                        upgradeInfo = {
                            upgradingTo: currentLvl + 1,
                            remainingTime: currentTimer,
                            totalTime: totalUpgradeTime,
                            gemCost,
                            progress,
                            remaining,
                            cost: nextLevelObj ? (nextLevelObj.build_cost || nextLevelObj.upgrade_cost || 0) : 0 // Include cost for summary
                        };
                    } else if (superchargeData && superchargeLevel < totalSuperchargeLevels) {
                        // Supercharge upgrade in progress
                        if (realRemaining <= 0) {
                            superchargeLevel++;
                            status = superchargeLevel >= totalSuperchargeLevels ? 'Maxed' : 'Available';
                        } else {
                            isSupercharging = true;
                            status = 'Upgrading';
                            nextTime = currentTimer;
                            const nextSC = superchargeData.levels.find(l => l.level === superchargeLevel + 1);
                            let totalUpgradeTime = nextSC ? nextSC.build_time : 0;

                            // For supercharges, remaining upgrades only includes SC levels
                            const remaining = getRemainingUpgrades([], currentLvl, maxTH, false, superchargeData, superchargeLevel);

                            const gemCost = calculateGemCost(currentTimer);
                            const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

                            upgradeInfo = {
                                isSupercharge: true,
                                upgradingTo: superchargeLevel + 1,
                                remainingTime: currentTimer,
                                totalTime: totalUpgradeTime,
                                gemCost,
                                progress,
                                remaining
                            };
                        }
                    } else {
                        // Timer on maxed item with no SC or SC maxed? Unusual, but mark as Maxed
                        status = 'Maxed';
                    }
                } else if (currentLvl >= maxTH) {
                    if (superchargeData && superchargeLevel < totalSuperchargeLevels) {
                        status = 'Available';
                        const nxtSC = superchargeData.levels.find(l => l.level === superchargeLevel + 1);
                        if (nxtSC) {
                            nextCost = nxtSC.build_cost;
                            nextTime = nxtSC.build_time;
                        }
                    } else {
                        status = 'Maxed';
                    }
                } else {
                    status = 'Available';
                    const nxt = getNextUpgrade(validLevels, currentLvl);
                    if (nxt) {
                        nextCost = nxt.build_cost || nxt.upgrade_cost;
                        nextTime = nxt.build_time || nxt.upgrade_time;
                    }
                }

                // Get all remaining upgrades for this instance (todo: include SC in calculations)
                const allRemaining = getAllRemainingUpgrades(validLevels, currentLvl, maxTH, null, false, superchargeData, superchargeLevel);

                rows.push({
                    name: sItem.name,
                    level: currentLvl,
                    max: maxTH,
                    cost: nextCost,
                    time: nextTime,
                    status: status,
                    res: (status === 'Available' && superchargeData && currentLvl >= maxTH) ? (superchargeData.upgrade_resource || 'Gold') : (sItem.upgrade_resource || 'Gold'),
                    type: sItem.type,
                    instanceIndex: idx + 1,
                    totalInstances: instances.length,
                    upgradeInfo: upgradeInfo,
                    levels: validLevels,
                    allRemainingUpgrades: allRemaining,
                    superchargeLevel: superchargeLevel,
                    totalSuperchargeLevels: totalSuperchargeLevels,
                    isSupercharging: isSupercharging,
                    superchargeData: superchargeData,
                    sectionNormalCount,
                    sectionNormalCost,
                    sectionNormalTime
                });
            });
        } else {
            // Should not be reached if we fill unbuilt? 
            // Only if allowedQty is 0 and instances is 0.
            if (allowedQty > 0) {
                // Logic handled inside loop range above if instances was empty but allowed > 0
                // But wait, if instances array was empty initially, we filled it with unbuilt.
                // So instances.length > 0 now.
                // The 'else' block below is dead code for buildings with >0 allowed.
            }

            rows.push({
                name: sItem.name,
                level: 0,
                max: maxTH,
                cost: 0,
                time: 0,
                status: 'Locked',
                res: sItem.upgrade_resource || 'Gold',
                type: sItem.type,
                instanceIndex: 0,
                totalInstances: 0,
                allRemainingUpgrades: { upgrades: [], totalCost: 0, totalTime: 0, count: 0 },
                superchargeLevel: 0,
                totalSuperchargeLevels: 0,
                isSupercharging: false,
                superchargeData: null
            });
        }
    });
    return rows;
}

function processTraps(userData, staticData, userTH) {
    const rows = [];
    const allStatic = staticData.traps || [];
    const allUser = userData.traps || [];

    const groupedUser = {};
    allUser.forEach(t => {
        if (!groupedUser[t.data]) groupedUser[t.data] = [];

        const count = t.cnt || 1;
        for (let i = 0; i < count; i++) {
            groupedUser[t.data].push({
                lvl: t.lvl,
                timer: t.timer
            });
        }
    });

    allStatic.forEach(sItem => {
        if (sItem.village !== 'home') return;

        const instances = groupedUser[sItem._id] || [];
        const validLevels = sItem.levels.filter(l => l.required_townhall <= userTH);

        if (instances.length === 0 && sItem.required_townhall > userTH) return;
        if (validLevels.length === 0 && instances.length === 0) return;

        const maxTH = getMaxLevel(validLevels, userTH);

        if (instances.length > 0) {
            instances.sort((a, b) => a.lvl - b.lvl);

            // Pre-calculate species-wide totals for NORMAL upgrades (Traps)
            let sectionNormalCount = 0;
            let sectionNormalCost = 0;
            let sectionNormalTime = 0;

            instances.forEach(instance => {
                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const cLvl = completionCheck.lvl;
                const cTimer = completionCheck.timer;

                if (cTimer && cLvl < maxTH) {
                    // Currently upgrading
                    const nextLevelObj = validLevels.find(l => l.level === cLvl + 1);
                    if (nextLevelObj) {
                        sectionNormalCost += nextLevelObj.upgrade_cost || nextLevelObj.build_cost || 0;
                        sectionNormalTime += nextLevelObj.upgrade_time || nextLevelObj.build_time || 0;
                        sectionNormalCount += 1;
                    }
                    // Remaining upgrades are added in the loop below or here? 
                    // Let's do it cleanly inside the main loop or pre-calc.
                    // Actually, let's reset and calculate it properly inside the main loop iteration if we want to attach it to every row, 
                    // BUT for the table display, we need the TOTAL for the GROUP attached to the FIRST item (idx==0).
                    // So we must iterate TWICE or accumulate.
                } else if (cLvl < maxTH) {
                    // Idle
                    const nextLevelObj = validLevels.find(l => l.level === cLvl + 1);
                    if (nextLevelObj) {
                        // The 'allRemaining' includes the NEXT one too? 
                        // getAllRemainingUpgrades logic: starts from currentLevel + 1. Correct.
                    }
                }
            });

            // Re-calc correctly:
            sectionNormalCount = 0;
            sectionNormalCost = 0;
            sectionNormalTime = 0;

            instances.forEach(instance => {
                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const cLvl = completionCheck.lvl;
                const cTimer = completionCheck.timer;

                // If upgrading, add current upgrade
                if (cTimer && cLvl < maxTH) {
                    const nextLevelObj = validLevels.find(l => l.level === cLvl + 1);
                    if (nextLevelObj) {
                        sectionNormalCost += nextLevelObj.upgrade_cost || nextLevelObj.build_cost || 0;
                        sectionNormalTime += nextLevelObj.upgrade_time || nextLevelObj.build_time || 0;
                        sectionNormalCount += 1;
                    }
                    // Add remaining after this one
                    const rem = getRemainingUpgrades(validLevels, cLvl, maxTH);
                    sectionNormalCost += rem.totalCost;
                    sectionNormalTime += rem.totalTime;
                    sectionNormalCount += rem.count;
                } else if (cLvl < maxTH) {
                    // Idle: get all remaining from current+1 to max
                    const rem = getAllRemainingUpgrades(validLevels, cLvl, maxTH);
                    sectionNormalCost += rem.totalCost;
                    sectionNormalTime += rem.totalTime;
                    sectionNormalCount += rem.count;
                }
            });

            instances.forEach((instance, idx) => {
                // Check for real-time completion
                const completionCheck = checkRealCompletion(instance.lvl, instance.timer);
                const currentLvl = completionCheck.lvl;
                const currentTimer = completionCheck.timer;

                let status = 'Locked';
                let nextCost = 0;
                let nextTime = 0;
                let upgradeInfo = null;

                if (currentTimer) {
                    status = 'Upgrading';
                    nextTime = currentTimer; // Already set by instance.timer but use updated one

                    // Get the upgrade time for current level -> next level
                    const nextLevelObj = validLevels.find(l => l.level === currentLvl + 1);
                    let totalUpgradeTime = nextLevelObj ? (nextLevelObj.build_time || nextLevelObj.upgrade_time || 0) : 0;

                    // Fallback to current level if next level logic returns 0
                    if (totalUpgradeTime === 0 && currentLvl > 0) {
                        const currentLevelObj = validLevels.find(l => l.level === currentLvl);
                        totalUpgradeTime = currentLevelObj ? (currentLevelObj.build_time || currentLevelObj.upgrade_time || 0) : 0;
                    }

                    // Calculate gem cost and progress
                    const gemCost = calculateGemCost(currentTimer);
                    const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

                    // Get remaining upgrades after the current one completes
                    const remaining = getRemainingUpgrades(validLevels, currentLvl, maxTH);

                    if (remaining) {
                        sectionNormalCost += remaining.totalCost;
                        sectionNormalTime += remaining.totalTime;
                        sectionNormalCount += remaining.count;
                    }

                    upgradeInfo = {
                        upgradingTo: currentLvl + 1,
                        remainingTime: currentTimer,
                        totalTime: totalUpgradeTime,
                        gemCost,
                        progress,
                        remaining
                    };
                } else if (currentLvl >= maxTH) {
                    status = 'Maxed';
                } else {
                    status = 'Available';
                    const nxt = getNextUpgrade(validLevels, currentLvl);
                    if (nxt) {
                        nextCost = nxt.build_cost || nxt.upgrade_cost;
                        nextTime = nxt.build_time || nxt.upgrade_time;
                    }
                }

                // Get all remaining upgrades
                const allRemaining = getAllRemainingUpgrades(validLevels, currentLvl, maxTH);

                rows.push({
                    name: sItem.name,
                    level: currentLvl,
                    max: maxTH,
                    cost: nextCost,
                    time: nextTime,
                    status: status,
                    res: sItem.upgrade_resource || 'Gold',
                    type: 'Trap',
                    instanceIndex: idx + 1,
                    totalInstances: instances.length,
                    upgradeInfo: upgradeInfo,
                    levels: validLevels,
                    allRemainingUpgrades: allRemaining,
                    sectionNormalCount,
                    sectionNormalCost,
                    sectionNormalTime
                });
            });
        }
    });
    return rows;
}

function processArmy(userData, staticData, userTH) {
    const rows = [];

    const userUnits = userData.units || userData.troops || [];
    const userSieges = userData.siege_machines || [];
    const staticTroops = staticData.troops || [];

    staticTroops.forEach(sItem => {
        if (sItem.village !== 'home') return;
        if (sItem.is_seasonal) return;

        let category = 'Troops';
        let uList = userUnits;

        if (sItem.production_building === 'Dark Barracks') {
            category = 'Dark Troops';
        } else if (sItem.production_building === 'Workshop') {
            category = 'Siege Machines';
            uList = userSieges;
            if (uList.length === 0) uList = userUnits;
        }

        const uItem = uList.find(u => u.data === sItem._id || u.name === sItem.name);

        if (uItem && uItem.boostable) return;

        const curLvl = uItem ? uItem.lvl : 0;

        if (curLvl === 0 && sItem.production_building && sItem.production_building_level) {
            const userBuildLvl = getUserBuildingLevel(userData, sItem.production_building);
            if (userBuildLvl < sItem.production_building_level) return;
        }

        const maxTH = getMaxLevel(sItem.levels, userTH);
        if (maxTH === 0) return;

        let status = 'Locked';
        let cost = 0;
        let time = 0;
        let upgradeInfo = null;

        // Check for real-time completion
        const completionCheck = checkRealCompletion(curLvl, uItem ? uItem.timer : 0);
        const currentLvl = completionCheck.lvl;
        const currentTimer = completionCheck.timer;

        if (currentTimer) {
            status = 'Upgrading';
            time = currentTimer;

            // Get the upgrade time for current level -> next level (N-1 Logic)
            let totalUpgradeTime = 0;
            if (currentLvl === 0) {
                const nextLevelObj = sItem.levels.find(l => l.level === 1);
                totalUpgradeTime = nextLevelObj ? (nextLevelObj.upgrade_time || 0) : 0;
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                totalUpgradeTime = currentLevelObj ? (currentLevelObj.upgrade_time || 0) : 0;
            }

            // Calculate gem cost and progress
            const gemCost = calculateGemCost(currentTimer);
            const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

            // Get remaining upgrades after the current one completes
            const remaining = getRemainingUpgrades(sItem.levels, currentLvl, maxTH);

            upgradeInfo = {
                upgradingTo: currentLvl + 1,
                remainingTime: currentTimer,
                totalTime: totalUpgradeTime,
                gemCost,
                progress,
                remaining
            };
        } else if (currentLvl >= maxTH) {
            status = 'Maxed';
            if (currentLvl === 0) status = 'Locked';
        } else {
            status = currentLvl > 0 ? 'Available' : 'Locked';
            if (status === 'Locked' && maxTH > 0) status = 'Available';

            if (currentLvl === 0) {
                const l1 = sItem.levels.find(l => l.level === 1);
                if (l1) {
                    cost = l1.upgrade_cost; // Level 1 upgrade cost IS the cost to unlock/reach level 2? No, unlock cost is usually build cost?
                    // Troops don't have build cost. They have upgrade_cost to reach level 2? No.
                    // Usually unlocking is done via upgrading Barracks.
                    // If level 1 exists, it exists. Upgrade cost at level 1 is to reach level 2.
                    // Unlock cost is N/A usually.
                    // But if it's level 0, next is level 1.
                    // Level 1 cost? Usually 0 if unlocked by building.
                }
            } else {
                // N-1 Logic: Upgrade cost for Next Level (curLvl + 1) is found in Previous Level (curLvl).
                // So for curLvl, we look at curLvl object to find cost to reach curLvl + 1.
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost; // N-1 Logic: Cost located in current level object
                    time = currentLevelObj.upgrade_time;
                }
            }
        }

        // Get all remaining upgrades
        const allRemaining = getAllRemainingUpgrades(sItem.levels, currentLvl, maxTH, null, true);

        // Army items (Troops) are single entities per row.
        // We calculate section totals for this single item.
        let activeCost = 0;
        let activeTime = 0;
        if (status === 'Upgrading') {
            const nextLvlData = sItem.levels.find(l => l.level === currentLvl + 1);
            if (nextLvlData) {
                activeCost = nextLvlData.upgrade_cost || 0;
                activeTime = nextLvlData.upgrade_time || 0;
            }
        }
        const totalCount = allRemaining.count + (status === 'Upgrading' ? 1 : 0);
        const totalCost = allRemaining.totalCost + activeCost;
        const totalTime = allRemaining.totalTime + activeTime;

        rows.push({
            name: sItem.name,
            level: curLvl,
            max: maxTH,
            cost: cost,
            time: time,
            status: status,
            res: sItem.upgrade_resource || 'Elixir',
            category: category,
            production_building: sItem.production_building,
            upgradeInfo: upgradeInfo,
            levels: sItem.levels,
            allRemainingUpgrades: allRemaining,
            sectionNormalCount: totalCount,
            sectionNormalCost: totalCost,
            sectionNormalTime: totalTime
        });
    });

    // Process spells
    const userSpells = userData.spells || [];
    const staticSpells = staticData.spells || [];

    staticSpells.forEach(sItem => {
        if (sItem.village && sItem.village !== 'home') return;
        if (sItem.is_seasonal) return;

        const uItem = userSpells.find(u => u.data === sItem._id || u.name === sItem.name);
        const curLvl = uItem ? uItem.lvl : 0;

        if (curLvl === 0 && sItem.production_building && sItem.production_building_level) {
            const userBuildLvl = getUserBuildingLevel(userData, sItem.production_building);
            if (userBuildLvl < sItem.production_building_level) return;
        }

        const maxTH = getMaxLevel(sItem.levels, userTH);
        if (maxTH === 0) return;

        let status = 'Locked';
        let cost = 0;
        let time = 0;
        let upgradeInfo = null;

        // Check for real-time completion
        const completionCheck = checkRealCompletion(curLvl, uItem ? uItem.timer : 0);
        const currentLvl = completionCheck.lvl;
        const currentTimer = completionCheck.timer;

        if (currentTimer) {
            status = 'Upgrading';
            time = currentTimer;

            // Get the upgrade time for current level -> next level (N-1 Logic)
            let totalUpgradeTime = 0;
            if (currentLvl === 0) {
                const nextLevelObj = sItem.levels.find(l => l.level === 1);
                totalUpgradeTime = nextLevelObj ? (nextLevelObj.upgrade_time || 0) : 0;
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                totalUpgradeTime = currentLevelObj ? (currentLevelObj.upgrade_time || 0) : 0;
            }

            // Calculate gem cost and progress
            const gemCost = calculateGemCost(currentTimer);
            const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

            // Get remaining upgrades after the current one completes
            const remaining = getRemainingUpgrades(sItem.levels, currentLvl, maxTH);

            upgradeInfo = {
                upgradingTo: currentLvl + 1,
                remainingTime: currentTimer,
                totalTime: totalUpgradeTime,
                gemCost,
                progress,
                remaining
            };
        } else if (currentLvl >= maxTH) {
            status = 'Maxed';
            if (currentLvl === 0) status = 'Locked';
        } else {
            status = currentLvl > 0 ? 'Available' : 'Locked';
            if (status === 'Locked' && maxTH > 0) status = 'Available';

            if (currentLvl === 0) {
                const l1 = sItem.levels.find(l => l.level === 1);
                if (l1) {
                    cost = l1.upgrade_cost;
                    time = l1.upgrade_time;
                }
            } else {
                // N-1 Logic for Spells
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost;
                    time = currentLevelObj.upgrade_time;
                }
            }
        }

        // Get all remaining upgrades
        const allRemaining = getAllRemainingUpgrades(sItem.levels, currentLvl, maxTH, null, true);

        let activeCost = 0;
        let activeTime = 0;
        if (status === 'Upgrading') {
            const nextLvlData = sItem.levels.find(l => l.level === currentLvl + 1);
            if (nextLvlData) {
                activeCost = nextLvlData.upgrade_cost || 0;
                activeTime = nextLvlData.upgrade_time || 0;
            }
        }
        const totalCount = allRemaining.count + (status === 'Upgrading' ? 1 : 0);
        const totalCost = allRemaining.totalCost + activeCost;
        const totalTime = allRemaining.totalTime + activeTime;

        rows.push({
            name: sItem.name,
            level: currentLvl,
            max: maxTH,
            cost: cost,
            time: time,
            status: status,
            res: sItem.upgrade_resource || 'Elixir',
            category: 'Spells',
            production_building: sItem.production_building || 'Spell Factory',
            upgradeInfo: upgradeInfo,
            levels: sItem.levels,
            allRemainingUpgrades: allRemaining,
            sectionNormalCount: totalCount,
            sectionNormalCost: totalCost,
            sectionNormalTime: totalTime
        });
    });

    return rows;
}

function processSingles(userData, staticData, userTH, uKey, sKey, defRes) {
    const rows = [];
    const uList = userData[uKey] || [];
    const sList = staticData[sKey] || [];

    sList.forEach(sItem => {
        if (sItem.village !== 'home') return;
        if (sItem.is_seasonal) return;

        const uItem = uList.find(u => u.data === sItem._id || u.name === sItem.name);
        const curLvl = uItem ? uItem.lvl : 0;

        if (uItem && uItem.boostable) return;

        if (curLvl === 0 && sItem.production_building && sItem.production_building_level) {
            const userBuildLvl = getUserBuildingLevel(userData, sItem.production_building);
            if (userBuildLvl < sItem.production_building_level) return;
        }

        const validLevels = sItem.levels.filter(l => l.required_townhall <= userTH);
        if (validLevels.length === 0 && (userData[uKey] || []).find(u => u.data === sItem._id) === undefined) return;

        const maxTH = getMaxLevel(validLevels, userTH);
        if (maxTH === 0) return;

        let status = 'Available';
        let cost = 0;
        let time = 0;
        let upgradeInfo = null;



        // Check for real-time completion
        const completionCheck = checkRealCompletion(curLvl, uItem ? uItem.timer : 0);
        const currentLvl = completionCheck.lvl;
        const currentTimer = completionCheck.timer;

        if (currentTimer) {
            status = 'Upgrading';
            time = currentTimer;

            // Get the upgrade time for current level -> next level (N-1 Logic)
            let totalUpgradeTime = 0;
            if (currentLvl === 0) {
                const nextLevelObj = validLevels.find(l => l.level === 1);
                totalUpgradeTime = nextLevelObj ? (nextLevelObj.upgrade_time || 0) : 0;
            } else {
                const currentLevelObj = validLevels.find(l => l.level === currentLvl);
                totalUpgradeTime = currentLevelObj ? (currentLevelObj.upgrade_time || 0) : 0;
            }

            // Calculate gem cost and progress
            const gemCost = calculateGemCost(currentTimer);
            const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

            // Get remaining upgrades after the current one completes
            const remaining = getRemainingUpgrades(validLevels, currentLvl, maxTH);

            upgradeInfo = {
                upgradingTo: currentLvl + 1,
                remainingTime: currentTimer,
                totalTime: totalUpgradeTime,
                gemCost,
                progress,
                remaining
            };
        } else if (currentLvl >= maxTH) {
            status = 'Maxed';
        } else {
            if (currentLvl > 0) {
                // N-1 Logic for Heroes/Pets
                const currentLevelObj = validLevels.find(l => l.level === currentLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost;
                    time = currentLevelObj.upgrade_time;
                }
            } else if (uItem && maxTH > 0) {
                // Equipment unlock logic would go here
            }
        }

        // Get all remaining upgrades
        const allRemaining = getAllRemainingUpgrades(validLevels, currentLvl, maxTH, null, true);

        let activeCost = 0;
        let activeTime = 0;
        if (status === 'Upgrading') {
            const nextLvlData = validLevels.find(l => l.level === currentLvl + 1);
            if (nextLvlData) {
                activeCost = nextLvlData.upgrade_cost || 0;
                activeTime = nextLvlData.upgrade_time || 0;
            }
        }
        const totalCount = allRemaining.count + (status === 'Upgrading' ? 1 : 0);
        const totalCost = allRemaining.totalCost + activeCost;
        const totalTime = allRemaining.totalTime + activeTime;

        rows.push({
            name: sItem.name,
            level: currentLvl,
            max: maxTH,
            cost: cost,
            time: time,
            status: status,
            res: sItem.upgrade_resource || defRes,
            upgradeInfo: upgradeInfo,
            levels: validLevels,
            allRemainingUpgrades: allRemaining,
            sectionNormalCount: totalCount,
            sectionNormalCost: totalCost,
            sectionNormalTime: totalTime
        });
    });
    return rows;
}

function processEquipment(userData, staticData, userTH) {
    const rows = [];
    if (!staticData.equipment) return rows;
    const uList = userData.equipment || [];

    staticData.equipment.forEach(sItem => {
        if (sItem.village && sItem.village !== 'home') return;

        const uItem = uList.find(u => u.data === sItem._id);
        const curLvl = uItem ? uItem.lvl : 0;
        const isOwned = curLvl > 0;
        const isEpic = sItem.rarity === 'Epic';
        const requiredTH = sItem.required_townhall || 1;

        if (!isOwned && !isEpic && userTH < requiredTH) return;

        const maxTH = getMaxLevel(sItem.levels, userTH);

        let status = 'Locked';
        let cost = 0;

        if (isOwned) {
            if (curLvl >= maxTH) {
                const nextLevelExists = sItem.levels.find(l => l.level === curLvl + 1);
                if (!nextLevelExists) {
                    status = 'Maxed';
                } else {
                    status = 'Locked';
                }
            } else {
                status = 'Available';
            }
        } else {
            if (userTH >= requiredTH) {
                status = 'Available';
            } else {
                status = 'Locked';
            }
        }

        if (status === 'Available') {
            if (curLvl === 0) {
                const l1 = sItem.levels.find(l => l.level === 1);
                if (l1) {
                    cost = l1.cost || l1.upgrade_cost;
                }
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === curLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost;
                } else {
                    status = 'Maxed';
                }

                const nextLvl = curLvl + 1;
                const nextLvlObj = sItem.levels.find(l => l.level === nextLvl);
                if (nextLvlObj) {
                    if (userTH < nextLvlObj.required_townhall) {
                        status = 'Locked';
                        cost = 0;
                    }
                }
            }
        }

        const hero = sItem.hero || "Unknown";

        rows.push({
            name: sItem.name,
            level: curLvl,
            max: maxTH,
            cost: cost,
            time: 0,
            status: status,
            res: 'Ores',
            rarity: sItem.rarity,
            hero: hero,
            raw: sItem,
            allRemainingUpgrades: getAllRemainingUpgrades(sItem.levels, curLvl, maxTH, null, true)
        });
    });
    return rows;
}

// Helper Functions
function getMaxLevel(levels, th) {
    if (!levels) return 0;
    const valid = levels.filter(l => (l.required_townhall || 0) <= th);
    if (valid.length === 0) return 0;
    return Math.max(...valid.map(l => l.level));
}

function getNextUpgrade(levels, curLvl) {
    if (!levels) return null;
    return levels.find(l => l.level === curLvl + 1);
}

function formatTime(sec) {
    if (!sec || sec <= 0) return '-';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    // Always show full precision: Xd Xh Xm
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
}

function formatCost(cost) {
    if (!cost) return '-';
    if (typeof cost === 'object') {
        return 'Ore';
    }
    // Show abbreviated format with precise decimals (no rounding)
    if (cost >= 1000000) {
        const val = cost / 1000000;
        return parseFloat(val.toFixed(2)) + 'M';
    }
    if (cost >= 1000) {
        const val = cost / 1000;
        return parseFloat(val.toFixed(1)) + 'K';
    }
    return cost;
}

function formatTimeExtended(sec) {
    if (!sec || sec <= 0) return '-';
    const mo = Math.floor(sec / (86400 * 30));
    const d = Math.floor((sec % (86400 * 30)) / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    // Always show full precision
    let parts = [];
    if (mo > 0) parts.push(`${mo}mo`);
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
}

function formatK(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function formatOre(costObj) {
    let parts = [];
    if (costObj.shiny_ore) parts.push(`<span class="c-shiny">${formatK(costObj.shiny_ore)}</span>`);
    if (costObj.glowy_ore) parts.push(`<span class="c-glowy">${formatK(costObj.glowy_ore)}</span>`);
    if (costObj.starry_ore) parts.push(`<span class="c-starry">${formatK(costObj.starry_ore)}</span>`);
    return parts.join(' ');
}

// Calculate gem cost to skip remaining time using specified formula
function calculateGemCost(remainingSeconds) {
    if (!remainingSeconds || remainingSeconds <= 0) return 0;

    let gems = 0;
    if (remainingSeconds <= 60) {
        gems = 1;
    } else if (remainingSeconds <= 3600) {
        // ((20-1)/(3600-60))*(time_sec-60)+1
        gems = ((20 - 1) / (3600 - 60)) * (remainingSeconds - 60) + 1;
    } else if (remainingSeconds <= 86400) {
        // ((260-20)/(86400-3600))*(time_sec-3600)+20
        gems = ((260 - 20) / (86400 - 3600)) * (remainingSeconds - 3600) + 20;
    } else {
        // ((1000-260)/(604800-86400))*(time_sec-86400)+260
        gems = ((1000 - 260) / (604800 - 86400)) * (remainingSeconds - 86400) + 260;
    }

    return Math.round(gems);
}

// Calculate upgrade progress percentage
function calculateUpgradeProgress(remainingSeconds, totalUpgradeTime) {
    if (!totalUpgradeTime || totalUpgradeTime <= 0) return 0;
    if (!remainingSeconds || remainingSeconds <= 0) return 100;

    const completed = totalUpgradeTime - remainingSeconds;
    const percentage = (completed / totalUpgradeTime) * 100;
    return Math.min(100, Math.max(0, Math.floor(percentage)));
}

// Get remaining upgrades info (for levels after current upgrade)
function getRemainingUpgrades(levels, currentLevel, maxLevel, useNMinusOne = false, superchargeData = null, currentSuperchargeLevel = 0) {
    const remaining = [];
    let totalCost = 0;
    let totalTime = 0;

    // Start from level after the one being upgraded to
    for (let lvl = currentLevel + 2; lvl <= maxLevel; lvl++) {
        const lookupLevel = useNMinusOne ? lvl - 1 : lvl;
        const levelData = levels.find(l => l.level === lookupLevel);
        if (levelData) {
            remaining.push({
                level: lvl,
                cost: levelData.upgrade_cost || levelData.build_cost || 0,
                time: levelData.upgrade_time || levelData.build_time || 0
            });
            totalCost += levelData.upgrade_cost || levelData.build_cost || 0;
            totalTime += levelData.upgrade_time || levelData.build_time || 0;
        }
    }

    // Add Supercharges if we are at/past max level
    // Add Supercharges if we are at/past max level OR if we are upgrading TO max level
    // If currentLevel+2 > maxLevel, it means we are upgrading to at least maxLevel+1? No.
    // If currentLevel = 14, max = 15. cur+2 = 16. 
    // This block runs if we are effectively finishing the normal upgrades or already done.
    if ((currentLevel + 2 > maxLevel || (currentLevel + 1 >= maxLevel && useNMinusOne)) && superchargeData) {
        let startSC = 1;

        // If we are already in supercharge territory (maxed normal)
        if (currentLevel >= maxLevel) {
            // If we are upgrading a supercharge level, skip it
            // How do we know if we are upgrading a supercharge?
            // currentSuperchargeLevel passed in is the BASE level.
            // If we are calling this, presumably we are upgrading something.
            // If it's a supercharge upgrade, calling code passes empty 'levels' array or calculation reflects SC.
            // But here we rely on the params.
            // Simplified assumption: if we are at max level, we are upgrading SC.
            startSC = currentSuperchargeLevel + 2;
        } else {
            // We are upgrading a Normal level to Max (or beyond?).
            // If we are upgrading 14->15 (Max). SC starts at 1.
            // currentSuperchargeLevel is likely 0.
            startSC = currentSuperchargeLevel + 1;
        }

        for (let scLvl = startSC; scLvl <= superchargeData.levels.length; scLvl++) {
            const scData = superchargeData.levels.find(l => l.level === scLvl);
            if (scData) {
                remaining.push({
                    level: scLvl,
                    cost: scData.build_cost,
                    time: scData.build_time,
                    resource: superchargeData.upgrade_resource,
                    isSupercharge: true
                });
                totalCost += scData.build_cost;
                totalTime += scData.build_time;
            }
        }
    }

    return {
        upgrades: remaining,
        totalCost,
        totalTime,
        count: remaining.length
    };
}

// Get ALL remaining upgrades info (for non-upgrading items showing all levels up to TH max)
// @param levels - the static level data array
// @param currentLevel - user's current level
// @param maxLevelForTH - max level allowed at user's TH
// @param useNMinusOne - if true, use (level-1) object for cost/time (Hero/Pet style)
function getAllRemainingUpgrades(levels, currentLevel, maxLevelForTH, absoluteMaxLevel = null, useNMinusOne = false, superchargeData = null, currentSuperchargeLevel = 0) {
    const remaining = [];
    let totalCost = 0;
    let totalTime = 0;

    // Start from the next level
    for (let lvl = currentLevel + 1; lvl <= maxLevelForTH; lvl++) {
        // Determine which level object holds the cost for this level
        // N Logic (Buildings): Level X object has cost for Level X upgrade (or X+1?) 
        // Wait, standard N logic: To go to Level X, we look at Level X object (build_cost).
        // OR Level X-1 object has upgrade_cost?
        // Let's re-verify Standard Logic.
        // processBuildings: nxt = getNextUpgrade(..., instance.lvl). nxt is lvl+1.
        // nextCost = nxt.upgrade_cost.
        // So for Level 6 is in Level 6 object. -> Logic: Look for `lvl`. Correct.

        // N-1 Logic (Heroes): Level X object has cost to go to X+1.
        // So for Level 5 -> 6. Current is 5. We want cost for 6.
        // Cost is in Level 5 object. 
        // So cost for `lvl` (6) is in `lvl-1` (5) object.

        const lookupLevel = useNMinusOne ? lvl - 1 : lvl;
        const levelData = levels.find(l => l.level === lookupLevel);

        if (levelData) {
            remaining.push({
                level: lvl,
                cost: levelData.upgrade_cost || levelData.build_cost || levelData.cost || 0,
                time: levelData.upgrade_time || levelData.build_time || levelData.time || 0,
                resource: levelData.upgrade_resource // Optional
            });
            totalCost += levelData.upgrade_cost || levelData.build_cost || levelData.cost || 0;
            totalTime += levelData.upgrade_time || levelData.build_time || levelData.time || 0;
        }
    }

    // Add Supercharges if superchargeData exists
    if (superchargeData) {
        // If not yet at max level, we start supercharges from 1
        // If at max level, we start from next supercharge level
        let startSC = 1;
        if (currentLevel >= maxLevelForTH) {
            startSC = currentSuperchargeLevel + 1;
        }

        for (let scLvl = startSC; scLvl <= superchargeData.levels.length; scLvl++) {
            const scData = superchargeData.levels.find(l => l.level === scLvl);
            if (scData) {
                remaining.push({
                    level: scLvl,
                    cost: scData.build_cost,
                    time: scData.build_time,
                    resource: superchargeData.upgrade_resource,
                    isSupercharge: true
                });
                totalCost += scData.build_cost;
                totalTime += scData.build_time;
            }
        }
    }

    // Check if there are higher levels beyond the TH cap
    const absMax = absoluteMaxLevel || (levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 0);
    const maxedForTH = currentLevel >= maxLevelForTH && maxLevelForTH < absMax && (currentSuperchargeLevel >= (superchargeData ? superchargeData.levels.length : 0));

    return {
        upgrades: remaining,
        totalCost,
        totalTime,
        count: remaining.length,
        maxedForTH
    };
}

// Make getAllRemainingUpgrades available globally
window.getAllRemainingUpgrades = getAllRemainingUpgrades;

// Format time for remaining display (compact format)
function formatTimeCompact(sec) {
    if (!sec || sec <= 0) return '-';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    // Always show full precision: Xd Xh Xm
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
}

// Make upgrade helper functions available globally
window.calculateGemCost = calculateGemCost;
window.calculateUpgradeProgress = calculateUpgradeProgress;
window.getRemainingUpgrades = getRemainingUpgrades;
window.formatTimeCompact = formatTimeCompact;

// Process Spells - similar to troops with production building logic
function processSpells(userData, staticData, userTH) {
    const rows = [];
    const spells = staticData.spells || [];
    const userSpells = userData.spells || [];

    // Get user's spell factory level
    const spellFactoryLvl = getUserBuildingLevel(userData, 'Spell Factory');
    const darkSpellFactoryLvl = getUserBuildingLevel(userData, 'Dark Spell Factory');

    spells.forEach(sItem => {
        if (sItem.village !== 'home' && sItem.village) return;
        if (sItem.is_seasonal) return;

        // Check production building requirement
        const prodBuilding = sItem.production_building || 'Spell Factory';
        const prodBuildingLvl = sItem.production_building_level || 1;

        let userProdLvl = 0;
        if (prodBuilding === 'Dark Spell Factory') {
            userProdLvl = darkSpellFactoryLvl;
        } else {
            userProdLvl = spellFactoryLvl;
        }

        // Skip if user doesn't have the required production building level
        if (userProdLvl < prodBuildingLvl) return;

        // Get max level for user's TH
        const maxTH = getMaxLevel(sItem.levels, userTH);
        if (maxTH === 0) return;

        // Find user's current level
        const userSpell = userSpells.find(u => u.name === sItem.name);
        const curLvl = userSpell ? userSpell.level : 0;

        // Determine status
        let status = 'Available';
        if (curLvl >= maxTH) status = 'Maxed';
        else if (curLvl === 0) status = 'Locked';

        // Get next upgrade info
        const nextUp = getNextUpgrade(sItem.levels, curLvl);
        const cost = nextUp ? nextUp.upgrade_cost : 0;
        const time = nextUp ? nextUp.upgrade_time : 0;

        rows.push({
            name: sItem.name,
            level: curLvl,
            max: maxTH,
            cost,
            time,
            status,
            res: sItem.upgrade_resource || 'Elixir',
            raw: sItem
        });
    });

    return rows;
}

// Process Pets with production building (Pet House) logic
function processPets(userData, staticData, userTH) {
    const rows = [];
    const pets = staticData.pets || [];
    const userPets = userData.pets || [];

    // Get Pet House level
    const petHouseLvl = getUserBuildingLevel(userData, 'Pet House');

    // Pet House unlocks at TH14
    if (userTH < 14) return rows;

    pets.forEach(sItem => {
        // Check production building requirement
        const prodBuildingLvl = sItem.production_building_level || 1;
        if (petHouseLvl < prodBuildingLvl) return;

        // Get max level for user's TH
        const maxTH = getMaxLevel(sItem.levels, userTH);
        if (maxTH === 0) return;

        // Find user's current level - handle both lvl and level fields
        const userPet = userPets.find(u => u.name === sItem.name || u.data === sItem._id);
        const curLvl = userPet ? (userPet.lvl || userPet.level || 0) : 0;

        // Determine status with timer handling
        let status = 'Locked';
        let cost = 0;
        let time = 0;
        let upgradeInfo = null;

        // Check for real-time completion
        const completionCheck = checkRealCompletion(curLvl, userPet ? userPet.timer : 0);
        const currentLvl = completionCheck.lvl;
        const currentTimer = completionCheck.timer;

        if (currentTimer) {
            status = 'Upgrading';
            time = currentTimer;

            // Get the upgrade time for current level -> next level (N-1 Logic)
            let totalUpgradeTime = 0;
            if (currentLvl === 0) {
                const nextLevelObj = sItem.levels.find(l => l.level === 1);
                totalUpgradeTime = nextLevelObj ? (nextLevelObj.upgrade_time || 0) : 0;
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                totalUpgradeTime = currentLevelObj ? (currentLevelObj.upgrade_time || 0) : 0;
            }

            // Calculate gem cost and progress
            const gemCost = calculateGemCost(currentTimer);
            const progress = calculateUpgradeProgress(currentTimer, totalUpgradeTime);

            // Get remaining upgrades after the current one completes
            const remaining = getRemainingUpgrades(sItem.levels, currentLvl, maxTH);

            upgradeInfo = {
                upgradingTo: currentLvl + 1,
                remainingTime: currentTimer,
                totalTime: totalUpgradeTime,
                gemCost,
                progress,
                remaining
            };
        } else if (currentLvl >= maxTH) {
            status = 'Maxed';
        } else {
            status = currentLvl > 0 ? 'Available' : 'Locked';
            if (status === 'Locked' && maxTH > 0) status = 'Available';

            // Get next upgrade cost from current level object (N-1 schema)
            if (currentLvl === 0) {
                const l1 = sItem.levels.find(l => l.level === 1);
                if (l1) {
                    cost = l1.upgrade_cost || 0;
                    time = l1.upgrade_time || 0;
                }
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === currentLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost || 0;
                    time = currentLevelObj.upgrade_time || 0;
                }
            }
        }

        // Get all remaining upgrades
        const allRemaining = getAllRemainingUpgrades(sItem.levels, currentLvl, maxTH, null, true);

        let activeCost = 0;
        let activeTime = 0;
        if (status === 'Upgrading') {
            const nextLvlData = sItem.levels.find(l => l.level === currentLvl + 1);
            if (nextLvlData) {
                activeCost = nextLvlData.upgrade_cost || 0;
                activeTime = nextLvlData.upgrade_time || 0;
            }
        }
        const totalCount = allRemaining.count + (status === 'Upgrading' ? 1 : 0);
        const totalCost = allRemaining.totalCost + activeCost;
        const totalTime = allRemaining.totalTime + activeTime;

        rows.push({
            name: sItem.name,
            level: currentLvl,
            max: maxTH,
            cost,
            time,
            status,
            res: sItem.upgrade_resource || 'Dark Elixir',
            raw: sItem,
            upgradeInfo: upgradeInfo,
            levels: sItem.levels,
            allRemainingUpgrades: allRemaining,
            sectionNormalCount: totalCount,
            sectionNormalCost: totalCost,
            sectionNormalTime: totalTime
        });
    });

    return rows;
}


// Process Guardians (TH18+)
function processGuardians(userData, staticData, userTH) {
    const rows = [];
    const guardians = staticData.guardians || [];
    const userGuardians = userData.guardians || [];

    // Guardians unlock at TH18
    if (userTH < 18) return rows;

    guardians.forEach(sItem => {
        // Get max level for user's TH
        const maxTH = getMaxLevel(sItem.levels, userTH);
        if (maxTH === 0) return;

        // Find user's current level - handle both lvl and level fields
        const userGuardian = userGuardians.find(u => u.name === sItem.name || u.data === sItem._id);
        const curLvl = userGuardian ? (userGuardian.lvl || userGuardian.level || 0) : 0;

        // Determine status with timer handling
        let status = 'Locked';
        let cost = 0;
        let time = 0;
        let upgradeInfo = null;

        if (userGuardian && userGuardian.timer) {
            status = 'Upgrading';
            time = userGuardian.timer;

            // Get the upgrade time for current level -> next level (N-1 Logic)
            let totalUpgradeTime = 0;
            if (curLvl === 0) {
                const nextLevelObj = sItem.levels.find(l => l.level === 1);
                totalUpgradeTime = nextLevelObj ? (nextLevelObj.upgrade_time || 0) : 0;
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === curLvl);
                totalUpgradeTime = currentLevelObj ? (currentLevelObj.upgrade_time || 0) : 0;
            }

            // Calculate gem cost and progress
            const gemCost = calculateGemCost(userGuardian.timer);
            const progress = calculateUpgradeProgress(userGuardian.timer, totalUpgradeTime);

            // Get remaining upgrades after the current one completes
            const remaining = getRemainingUpgrades(sItem.levels, curLvl, maxTH);

            upgradeInfo = {
                upgradingTo: curLvl + 1,
                remainingTime: userGuardian.timer,
                totalTime: totalUpgradeTime,
                gemCost,
                progress,
                remaining
            };
        } else if (curLvl >= maxTH) {
            status = 'Maxed';
        } else {
            status = curLvl > 0 ? 'Available' : 'Locked';
            if (status === 'Locked' && maxTH > 0) status = 'Available';

            // Get next upgrade cost from current level object (N-1 schema)
            if (curLvl === 0) {
                const l1 = sItem.levels.find(l => l.level === 1);
                if (l1) {
                    cost = l1.upgrade_cost || 0;
                    time = l1.upgrade_time || 0;
                }
            } else {
                const currentLevelObj = sItem.levels.find(l => l.level === curLvl);
                if (currentLevelObj) {
                    cost = currentLevelObj.upgrade_cost || 0;
                    time = currentLevelObj.upgrade_time || 0;
                }
            }
        }

        // Get all remaining upgrades
        const allRemaining = getAllRemainingUpgrades(sItem.levels, curLvl, maxTH, null, true);

        let activeCost = 0;
        let activeTime = 0;
        if (status === 'Upgrading') {
            const nextLvlData = sItem.levels.find(l => l.level === curLvl + 1);
            if (nextLvlData) {
                activeCost = nextLvlData.upgrade_cost || 0;
                activeTime = nextLvlData.upgrade_time || 0;
            }
        }
        const totalCount = allRemaining.count + (status === 'Upgrading' ? 1 : 0);
        const totalCost = allRemaining.totalCost + activeCost;
        const totalTime = allRemaining.totalTime + activeTime;

        rows.push({
            name: sItem.name,
            level: curLvl,
            max: maxTH,
            cost,
            time,
            status,
            res: sItem.upgrade_resource || 'Elixir',
            raw: sItem,
            upgradeInfo: upgradeInfo,
            levels: sItem.levels,
            allRemainingUpgrades: allRemaining,
            sectionNormalCount: totalCount,
            sectionNormalCost: totalCost,
            sectionNormalTime: totalTime
        });
    });

    return rows;
}


// Process Crafted/Seasonal Defenses
// Process Crafted/Seasonal Defenses (Updated logic)
function processCraftedDefenses(userData, staticData, userTH) {
    const rows = [];

    // 1. Find the Crafting Station in Static Data (ID 1000097)
    const craftingStationStatic = (staticData.buildings || []).find(b => b._id === 1000097);
    if (!craftingStationStatic || !craftingStationStatic.seasonal_defenses) return rows;

    // 2. Find the Crafting Station in User Data
    const userBuildings = userData.buildings || [];
    const craftingStationUser = userBuildings.find(b => b.data === 1000097);
    const userTypes = craftingStationUser ? (craftingStationUser.types || []) : [];

    // 3. Iterate through all available seasonal defenses in static data
    craftingStationStatic.seasonal_defenses.forEach(sDef => {
        // Check TH requirement
        const reqTH = sDef.required_townhall || 1;
        if (userTH < reqTH) return;

        // Find user's progress for this specific defense type ID
        const userTypeDef = userTypes.find(t => t.data === sDef._id);
        const userModules = userTypeDef ? (userTypeDef.modules || []) : [];

        // First pass: Calculate totals for parent level display AND Section Totals
        let parentLevelSum = 0;
        let maxParentLevelSum = 0;
        const moduleData = [];

        // Section Totals (Aggregate across ALL modules for this defense)
        let sectionNormalCount = 0;
        let sectionNormalCost = 0;
        let sectionNormalTime = 0;

        if (sDef.modules) {
            sDef.modules.forEach(mod => {
                const userMod = userModules.find(m => m.data === mod._id);
                let curLvl = userMod ? (userMod.lvl || 1) : 1;
                let timer = userMod ? (userMod.timer || 0) : 0;

                // Check for real-time completion
                const completionCheck = checkRealCompletion(curLvl, timer);
                curLvl = completionCheck.lvl;
                timer = completionCheck.timer;

                const modLevels = mod.levels || [];
                const maxLevel = modLevels.length;

                parentLevelSum += curLvl;
                maxParentLevelSum += maxLevel;

                // Calculate Remaining Upgrades for this MODULE
                const allRemaining = getAllRemainingUpgrades(modLevels, curLvl, maxLevel);

                // Add to section totals
                sectionNormalCount += allRemaining.count;
                sectionNormalCost += allRemaining.totalCost;
                sectionNormalTime += allRemaining.totalTime;

                // If currently upgrading, add that too (as getAllRemainingUpgrades usually counts from next available)
                // However, checkRealCompletion handles 'curLvl' updates. 
                // If timer > 0, it means we are upgrading TO curLvl+1.
                // getAllRemainingUpgrades(..., curLvl, ...) gets upgrades starting from curLvl+1 to Max. 
                // So if we are upgrading, the 'active' upgrade is NOT in allRemaining (it's the gap between curLvl and curLvl+1).
                // Wait, getAllRemainingUpgrades logic:
                // const remaining = []; ... for (let l = currentLevel + 1; l <= maxLevelForTH; l++) ...
                // So it gathers everything AFTER current level.
                // If timer > 0, we are upgrading to curLvl+1. This specific upgrade step is technically 'active'.
                // Does 'sectionNormalCount' usually include the active upgrade?
                // In processBuildings: 
                // if (cTimer) { sectionNormalCount += 1; ... sectionNormalCount += rem.count; }
                // So YES, we must add the active one.

                if (timer > 0) {
                    sectionNormalCount += 1;
                    // Cost/Time for the active upgrade? 
                    // Usually sectionNormalCost implies 'remaining cost to max'. 
                    // Do we count the cost already paid? Usually 'remaining upgrades' implies what is LEFT to do.
                    // The active upgrade is paid for. 
                    // But the prompt/rendering often shows "Upgrades: X" (Total remaining).
                    // If it's building, it says "Upgrading...".
                    // Let's align with processBuildings:
                    // sectionNormalCost += nextLevelObj.cost ... (It ADDS it).
                    // So it seems it counts the active one as part of the 'Total Remaining Work' value, even if paid?
                    // Or maybe it just sums up 'Active + Pending'.

                    // Actually, if I look at processBuildings again:
                    // if (cTimer && cLvl < maxTH) { 
                    //    sectionNormalCost += nextLevelObj.cost ... 
                    // }
                    // So yes, it adds the active upgrade cost/time.

                    const nextLvl = curLvl + 1;
                    const nextObj = modLevels.find(l => l.level === nextLvl);
                    if (nextObj) {
                        sectionNormalCost += nextObj.build_cost || nextObj.upgrade_cost || 0;
                        sectionNormalTime += nextObj.build_time || nextObj.upgrade_time || 0;
                    }
                }

                moduleData.push({
                    mod,
                    curLvl,
                    timer,
                    modLevels,
                    maxLevel,
                    allRemaining // Store for row use
                });
            });
        }

        // Second pass: Create rows with parent level info & Section Totals
        moduleData.forEach(({ mod, curLvl, timer, modLevels, maxLevel, allRemaining }) => {
            // Determine Status
            let status = 'Available';
            if (curLvl >= maxLevel) {
                status = 'Maxed';
            } else if (timer > 0) {
                status = 'Upgrading';
            }

            // Cost/Time calculation
            let cost = 0;
            let time = 0;
            let upgradeInfo = null;

            if (status === 'Upgrading') {
                const nextLvlVal = curLvl + 1;
                const nextLvlObj = modLevels.find(l => l.level === nextLvlVal);
                const totalUpgradeTime = nextLvlObj ? (nextLvlObj.build_time || nextLvlObj.upgrade_time || nextLvlObj.time || 0) : 0;

                const gemCost = calculateGemCost(timer);
                const progress = calculateUpgradeProgress(timer, totalUpgradeTime);
                const remaining = getRemainingUpgrades(modLevels, curLvl, maxLevel);

                upgradeInfo = {
                    upgradingTo: nextLvlVal,
                    remainingTime: timer,
                    totalTime: totalUpgradeTime,
                    gemCost,
                    progress,
                    remaining
                };

                time = timer;
            } else if (status === 'Available') {
                const nextLvlVal = curLvl + 1;
                const nextLvlObj = modLevels.find(l => l.level === nextLvlVal);
                if (nextLvlObj) {
                    cost = nextLvlObj.build_cost || nextLvlObj.upgrade_cost || nextLvlObj.cost || 0;
                    time = nextLvlObj.build_time || nextLvlObj.upgrade_time || nextLvlObj.time || 0;
                }
            }

            rows.push({
                name: sDef.name,           // e.g., "Light Beam"
                moduleName: mod.name,      // e.g., "Sun Beam HP Module"
                level: curLvl,
                max: maxLevel,
                parentLevel: parentLevelSum,
                maxParentLevel: maxParentLevelSum,
                cost: cost,
                time: time,
                status: status,
                res: mod.upgrade_resource || 'Dark Elixir',
                category: 'Crafted',
                upgradeInfo: upgradeInfo,
                allRemainingUpgrades: allRemaining,
                raw: mod,
                parentId: sDef._id,

                // Add Section Totals to every row (the first row of the group will be used by renderer)
                sectionNormalCount,
                sectionNormalCost,
                sectionNormalTime
            });
        });
    });

    return rows;
}

// Process Walls
function processWalls(userData, staticData, userTH) {
    const rows = [];
    const buildings = staticData.buildings || [];
    const userBuildings = userData.buildings || [];

    // Find wall definition
    const wallDef = buildings.find(b => b.type === 'Wall' && b.village === 'home');
    if (!wallDef) return rows;

    // Wall data from static
    const wallLevels = wallDef.levels || [];
    const maxTH = getMaxLevel(wallLevels, userTH);
    if (maxTH === 0) return rows;

    // Group user walls by level
    const userWalls = userBuildings.filter(b => b.name === 'Wall' || b.data === wallDef._id);

    // Count walls at each level
    const wallCounts = {};
    userWalls.forEach(w => {
        const lvl = w.lvl || 1;
        const cnt = w.cnt || 1;
        wallCounts[lvl] = (wallCounts[lvl] || 0) + cnt;
    });

    // Create rows for each wall level group
    Object.keys(wallCounts).forEach(level => {
        const lvl = parseInt(level);
        const count = wallCounts[lvl];

        let status = 'Available';
        if (lvl >= maxTH) status = 'Maxed';

        // Get next upgrade info
        const nextUp = wallLevels.find(l => l.level === lvl + 1);
        const cost = nextUp ? nextUp.build_cost : 0;

        rows.push({
            name: `Wall (Level ${lvl})`,
            level: lvl,
            max: maxTH,
            cost: cost * count, // Total cost for all walls at this level
            time: 0, // Walls have no upgrade time
            status,
            res: wallDef.upgrade_resource || 'Gold',
            count,
            raw: wallDef
        });
    });

    return rows;
}

// Make functions available globally
window.processTableData = processTableData;
window.processedTableData = processedTableData;
window.currentTableCategory = currentTableCategory;
