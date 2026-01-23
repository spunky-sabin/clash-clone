/**
 * Cost-Based Progress Calculation using API Metadata + Static Data Costs
 * 
 * This refactored version uses:
 * - API metadata for: current level, hallMaxLevel, unlockHallLevel
 * - Static data for: upgrade costs (using n-1 logic)
 * - Dark Elixir weighting: 1 DE = 150 Elixir
 */

const DARK_TO_ELIXIR_RATIO = 150;

/**
 * Helper: Find Static Data item by name match
 */
function findStaticItemByName(staticArray, apiName) {
    if (!staticArray || !apiName) return null;

    const normalizedApiName = apiName.toLowerCase().trim();
    return staticArray.find(item => {
        if (!item.name) return false;
        const itemName = item.name.toLowerCase().trim();
        return itemName === normalizedApiName;
    });
}

/**
 * Helper: Get cumulative cost from level 0 to targetLevel using n-1 logic
 * N-1 Logic: Cost/Time to reach Level N is stored in Level N-1 object
 */
function getCumulativeCost(staticItem, targetLevel, applyWeighting = true) {
    if (!staticItem || !staticItem.levels || targetLevel <= 0) {
        return 0;
    }

    let totalCost = 0;

    // Loop from level 1 to targetLevel
    // Cost to reach level L is in levels[L-1].upgrade_cost
    for (let level = 1; level <= targetLevel; level++) {
        const levelIndex = level - 1; // n-1 index

        if (levelIndex >= 0 && levelIndex < staticItem.levels.length) {
            const levelData = staticItem.levels[levelIndex];
            let cost = levelData.upgrade_cost || 0;

            // Apply DE weighting if needed
            if (applyWeighting) {
                const resourceType = staticItem.upgrade_resource || staticItem.resource || '';
                if (resourceType.toLowerCase().includes('dark')) {
                    cost *= DARK_TO_ELIXIR_RATIO;
                }
            }

            totalCost += cost;
        }
    }

    return totalCost;
}

/**
 * Calculate hero progress using API metadata + Static Data costs
 * @param {Array} apiHeroes - Heroes from API with _apiData metadata
 * @param {number} currentTH - Current Town Hall level
 * @param {Object} staticData - Static game data with costs
 * @returns {Object} Progress result with percent
 */
function calculateHeroProgressFromAPI(apiHeroes, currentTH, staticData) {
    if (!apiHeroes || apiHeroes.length === 0 || !staticData || !staticData.heroes) {
        return { percent: 0, completed: 0, total: 0 };
    }

    let totalCost = 0;
    let completedCost = 0;

    apiHeroes.forEach(apiHero => {
        // Extract API metadata
        const apiData = apiHero._apiData || {};
        const heroName = apiData.name || '';
        const currentLevel = apiHero.lvl || 1;
        const hallMaxLevel = apiData.hallMaxLevel || apiData.maxLevel || 0;
        const unlockHallLevel = apiData.unlockHallLevel || 0;

        // Skip if not unlocked yet at this TH
        if (unlockHallLevel && unlockHallLevel > currentTH) {
            return;
        }

        // Find matching static data
        const staticHero = findStaticItemByName(staticData.heroes, heroName);
        if (!staticHero) {
            console.warn(`⚠️ Hero "${heroName}" not found in static data`);
            return;
        }

        // Determine max level achievable at this TH (from static data)
        let maxLevelAtTH = 0;
        staticHero.levels.forEach(lvl => {
            if (lvl.required_townhall && lvl.required_townhall <= currentTH && lvl.level > maxLevelAtTH) {
                maxLevelAtTH = lvl.level;
            }
        });

        // Use hallMaxLevel from API if available, otherwise fallback to staticData
        const effectiveMaxLevel = hallMaxLevel || maxLevelAtTH;

        // Calculate total cost (0 to max level at TH)
        const costToMax = getCumulativeCost(staticHero, effectiveMaxLevel, true);
        totalCost += costToMax;

        // Calculate completed cost (0 to current level)
        const effectiveCurrentLevel = Math.min(currentLevel, effectiveMaxLevel);
        const costCompleted = getCumulativeCost(staticHero, effectiveCurrentLevel, true);
        completedCost += costCompleted;

        console.log(`Hero: ${heroName} | Current: ${effectiveCurrentLevel}/${effectiveMaxLevel} | Cost: ${costCompleted.toLocaleString()}/${costToMax.toLocaleString()}`);
    });

    const percent = totalCost > 0 ? (completedCost / totalCost) * 100 : 0;

    return {
        percent: Math.floor(percent), // Floor to match hero calculation behavior
        completed: completedCost,
        total: totalCost,
        details: `${completedCost.toLocaleString()}/${totalCost.toLocaleString()} weighted cost`
    };
}

/**
 * Calculate lab progress (troops/spells) using API metadata + Static Data costs
 * @param {Array} apiUnits - Troops from API with _apiData metadata
 * @param {Array} apiSpells - Spells from API with _apiData metadata
 * @param {number} currentTH - Current Town Hall level
 * @param {Object} staticData - Static game data with costs
 * @returns {Object} Progress result with percent
 */
function calculateLabProgressFromAPI(apiUnits, apiSpells, currentTH, staticData) {
    if (!staticData || (!staticData.units && !staticData.spells)) {
        return { percent: 0, completed: 0, total: 0 };
    }

    const allLabItems = [...(apiUnits || []), ...(apiSpells || [])];

    if (allLabItems.length === 0) {
        return { percent: 0, completed: 0, total: 0 };
    }

    let totalCost = 0;
    let completedCost = 0;

    allLabItems.forEach(apiItem => {
        const apiData = apiItem._apiData || {};
        const itemName = apiData.name || '';
        const currentLevel = apiItem.lvl || 1;
        const hallMaxLevel = apiData.hallMaxLevel || apiData.maxLevel || 0;
        const unlockHallLevel = apiData.unlockHallLevel || 0;
        const isBoostable = apiData.boostable || false;
        const isSeasonal = apiData.seasonal || false;

        // Skip super troops and seasonal troops
        if (isBoostable || isSeasonal) {
            return;
        }

        // Skip if not unlocked yet at this TH
        if (unlockHallLevel && unlockHallLevel > currentTH) {
            return;
        }

        // Try to find in units first, then spells
        let staticItem = findStaticItemByName(staticData.units, itemName);
        if (!staticItem) {
            staticItem = findStaticItemByName(staticData.spells, itemName);
        }
        if (!staticItem) {
            staticItem = findStaticItemByName(staticData.siege_machines, itemName);
        }

        if (!staticItem) {
            console.warn(`⚠️ Lab item "${itemName}" not found in static data`);
            return;
        }

        // Determine max level achievable at this TH
        let maxLevelAtTH = 0;
        staticItem.levels.forEach(lvl => {
            if (lvl.required_townhall && lvl.required_townhall <= currentTH && lvl.level > maxLevelAtTH) {
                maxLevelAtTH = lvl.level;
            }
        });

        const effectiveMaxLevel = hallMaxLevel || maxLevelAtTH;

        // Calculate total cost (0 to max level at TH)
        const costToMax = getCumulativeCost(staticItem, effectiveMaxLevel, true);
        totalCost += costToMax;

        // Calculate completed cost (0 to current level)
        const effectiveCurrentLevel = Math.min(currentLevel, effectiveMaxLevel);
        const costCompleted = getCumulativeCost(staticItem, effectiveCurrentLevel, true);
        completedCost += costCompleted;
    });

    const percent = totalCost > 0 ? (completedCost / totalCost) * 100 : 0;

    return {
        percent: Math.floor(percent),
        completed: completedCost,
        total: totalCost,
        details: `${completedCost.toLocaleString()}/${totalCost.toLocaleString()} weighted cost`
    };
}

/**
 * Calculate pets progress using API metadata + Static Data costs
 * @param {Array} apiPets - Pets from API with _apiData metadata
 * @param {number} currentTH - Current Town Hall level
 * @param {Object} staticData - Static game data with costs
 * @returns {Object} Progress result with percent
 */
function calculatePetsProgressFromAPI(apiPets, currentTH, staticData) {
    if (!apiPets || apiPets.length === 0 || !staticData || !staticData.pets) {
        return { percent: 0, completed: 0, total: 0 };
    }

    let totalCost = 0;
    let completedCost = 0;

    apiPets.forEach(apiPet => {
        const apiData = apiPet._apiData || {};
        const petName = apiData.name || '';
        const currentLevel = apiPet.lvl || 1;
        const hallMaxLevel = apiData.hallMaxLevel || apiData.maxLevel || 0;
        const unlockHallLevel = apiData.unlockHallLevel || 0;

        // Skip if not unlocked yet at this TH
        if (unlockHallLevel && unlockHallLevel > currentTH) {
            return;
        }

        // Find matching static data
        const staticPet = findStaticItemByName(staticData.pets, petName);
        if (!staticPet) {
            console.warn(`⚠️ Pet "${petName}" not found in static data`);
            return;
        }

        // Determine max level achievable at this TH
        let maxLevelAtTH = 0;
        staticPet.levels.forEach(lvl => {
            if (lvl.required_townhall && lvl.required_townhall <= currentTH && lvl.level > maxLevelAtTH) {
                maxLevelAtTH = lvl.level;
            }
        });

        const effectiveMaxLevel = hallMaxLevel || maxLevelAtTH;

        // Calculate total cost (0 to max level at TH)
        const costToMax = getCumulativeCost(staticPet, effectiveMaxLevel, true);
        totalCost += costToMax;

        // Calculate completed cost (0 to current level)
        const effectiveCurrentLevel = Math.min(currentLevel, effectiveMaxLevel);
        const costCompleted = getCumulativeCost(staticPet, effectiveCurrentLevel, true);
        completedCost += costCompleted;

        console.log(`Pet: ${petName} | Current: ${effectiveCurrentLevel}/${effectiveMaxLevel} | Cost: ${costCompleted.toLocaleString()}/${costToMax.toLocaleString()}`);
    });

    const percent = totalCost > 0 ? (completedCost / totalCost) * 100 : 0;

    return {
        percent: Math.floor(percent),
        completed: completedCost,
        total: totalCost,
        details: `${completedCost.toLocaleString()}/${totalCost.toLocaleString()} weighted cost`
    };
}

// Export functions
window.calculateHeroProgressFromAPI = calculateHeroProgressFromAPI;
window.calculateLabProgressFromAPI = calculateLabProgressFromAPI;
window.calculatePetsProgressFromAPI = calculatePetsProgressFromAPI;
