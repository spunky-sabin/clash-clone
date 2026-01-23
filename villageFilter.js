/**
 * Village Filter Utilities
 * 
 * Filters game data by village type (home or builderBase)
 * and provides village-specific calculations
 */

/**
 * Filter items by village
 * @param {Array} items - Array of items (heroes, troops, spells, buildings, etc.)
 * @param {string} village - Village type ('home' or 'builderBase')
 * @returns {Array} Filtered items
 */
function filterByVillage(items, village = 'home') {
    if (!items || !Array.isArray(items)) return [];

    return items.filter(item => {
        // If item has village property, use it
        if (item.village) {
            return item.village === village;
        }

        // If item has _apiData with village, use that
        if (item._apiData && item._apiData.village) {
            return item._apiData.village === village;
        }

        // If no village specified, assume home village (default)
        return village === 'home';
    });
}

/**
 * Get village-specific data from user data
 * Builder Base uses separate fields with "2" suffix (buildings2, heroes2, etc.)
 * @param {Object} userData - Complete user data
 * @param {string} village - Village type ('home' or 'builderBase')
 * @returns {Object} Village-specific data
 */
function getVillageData(userData, village = 'home') {
    if (village === 'home') {
        // Home village uses main fields
        return {
            village: 'home',
            heroes: userData.heroes || [],
            troops: userData.units || [],
            spells: userData.spells || [],
            siegeMachines: userData.siege_machines || [],
            buildings: userData.buildings || [],
            traps: userData.traps || [],
            walls: (userData.buildings || []).filter(b => Number(b.data) === 1000010),
            pets: userData.pets || [],
            equipment: userData.equipment || []
        };
    } else {
        // Builder base uses fields with "2" suffix
        return {
            village: 'builderBase',
            heroes: userData.heroes2 || [],
            troops: userData.units2 || [],
            spells: userData.spells2 || [],
            siegeMachines: [],
            buildings: userData.buildings2 || [],
            traps: userData.traps2 || [],
            walls: [],
            pets: [],
            equipment: []
        };
    }
}

/**
 * Get village display name
 * @param {string} village - Village type
 * @returns {string} Display name
 */
function getVillageDisplayName(village) {
    const names = {
        'home': 'Home Village',
        'builderBase': 'Builder Base'
    };
    return names[village] || village;
}

/**
 * Get opposite village
 * @param {string} village - Current village
 * @returns {string} Opposite village
 */
function getOppositeVillage(village) {
    return village === 'home' ? 'builderBase' : 'home';
}

/**
 * Check if static data has village-specific items
 * @param {Object} staticData - Static game data
 * @param {string} itemType - Type of item (heroes, troops, etc.)
 * @param {string} village - Village type
 * @returns {Array} Village-specific static items
 */
function getVillageStaticItems(staticData, itemType, village = 'home') {
    const items = staticData[itemType] || [];
    return items.filter(item => {
        if (!item.village) return village === 'home'; // Default to home
        return item.village === village;
    });
}

/**
 * Get village-specific Town Hall or Builder Hall level
 * @param {Object} userData - User data
 * @param {string} village - Village type
 * @returns {number} TH or BH level
 */
function getVillageHallLevel(userData, village = 'home') {
    if (village === 'home') {
        // Town Hall ID: 1000001
        const th = (userData.buildings || []).find(b => Number(b.data) === 1000001);
        return th ? th.lvl : 13; // Default TH13
    }
}

/**
 * Get structured village data from static data and user data
 * Returns hierarchical structure: Village -> Item Type -> (Grouped Items)
 * @param {Object} staticData - Static game data
 * @param {Object} userData - User data
 * @param {string} village - Village type ('home' or 'builderBase')
 * @returns {Object} Structured data
 */
function getStructuredVillageData(staticData, userData, village = 'home') {
    const structure = {};
    const categories = [
        'buildings', 'heroes', 'troops', 'spells',
        'pets', 'equipment', 'siege_machines'
    ];

    // Get Village Specific User Data and TH/BH Level
    const userVillageData = getVillageData(userData, village);
    const userHallLevel = getVillageHallLevel(userData, village);

    // Helper to determine item type/category
    const getType = (item, cat) => {
        if (item.type) return item.type;
        if (cat === 'heroes') return 'Hero';
        if (cat === 'pets') return 'Pet';
        if (cat === 'equipment') return 'Equipment';
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    // Helper to calculate total cumulative cost to reach a level
    // Logic Split:
    // 1. TargetLevel Logic (Buildings): Cost to reach Level N is in Level N object ('build_cost').
    // 2. SourceLevel Logic (Heroes): Cost to reach Level N+1 is in Level N object ('upgrade_cost').
    const calculateCumulativeCost = (levels, targetLevel, logicType) => {
        let total = 0;
        if (logicType === 'TargetLevel') {
            // Sum 'build_cost' of all levels <= targetLevel
            for (let i = 0; i < levels.length; i++) {
                const lvlData = levels[i];
                if (lvlData.level <= targetLevel) {
                    total += (lvlData.build_cost || 0);
                }
            }
        } else {
            // SourceLevel Logic (e.g. Heroes)
            // Cost to reach Level K is found in Level K-1 'upgrade_cost'
            // So we sum 'upgrade_cost' of all levels < targetLevel
            for (let i = 0; i < levels.length; i++) {
                const lvlData = levels[i];
                if (lvlData.level < targetLevel) {
                    total += (lvlData.upgrade_cost || 0);
                }
            }
        }
        return total;
    };

    categories.forEach(category => {
        let staticItems = staticData[category] || [];

        // Filter Static Items by Village
        staticItems = staticItems.filter(item => {
            const v = item.village || 'home';
            return v === village;
        });

        staticItems.forEach(staticItem => {
            const typeName = getType(staticItem, category);

            // Initialize type array
            if (!structure[typeName]) {
                structure[typeName] = [];
            }

            // Calculate unlock TH level
            let unlockLevel = 0;
            if (staticItem.levels && staticItem.levels.length > 0) {
                const lvl1 = staticItem.levels.find(l => l.level === 1);
                if (lvl1) unlockLevel = lvl1.required_townhall;
            }

            // Determine Cost Logic Type based on fields present in Level 2 (if exists) or Level 1
            // Buildings usually have 'build_cost'. Heroes have 'upgrade_cost'.
            let logicType = 'TargetLevel'; // Default
            if (staticItem.levels && staticItem.levels.length > 0) {
                const sample = staticItem.levels.find(l => l.level > 1) || staticItem.levels[0];
                if (sample.upgrade_cost !== undefined && sample.build_cost === undefined) {
                    logicType = 'SourceLevel';
                }
            }

            // Determine Max Level allowed for current User's Town Hall
            let maxLevelForTH = 0;
            if (staticItem.levels) {
                staticItem.levels.forEach(lvl => {
                    if (lvl.required_townhall <= userHallLevel && lvl.level > maxLevelForTH) {
                        maxLevelForTH = lvl.level;
                    }
                });
            }

            // FIND USER INSTANCES
            let userInstances = [];
            if (category === 'buildings') {
                userInstances = userVillageData.buildings.filter(b => b.data === staticItem._id);
            } else if (category === 'heroes') {
                userInstances = userVillageData.heroes.filter(h => h.data === staticItem._id);
            } else if (category === 'pets') {
                userInstances = userVillageData.pets.filter(p => p.data === staticItem._id);
            } else if (category === 'equipment') {
                userInstances = userVillageData.equipment.filter(e => e.data === staticItem._id);
            } else if (category === 'spells') {
                userInstances = userVillageData.spells.filter(s => s.data === staticItem._id);
            } else if (category === 'troops') {
                userInstances = userVillageData.troops.filter(t => t.data === staticItem._id);
            } else if (category === 'siege_machines') {
                userInstances = userVillageData.siegeMachines.filter(s => s.data === staticItem._id);
                if (userInstances.length === 0) {
                    userInstances = userVillageData.troops.filter(t => t.data === staticItem._id);
                }
            }

            // Group by Level
            // Map: Level -> Count
            const levelCounts = {};
            userInstances.forEach(instance => {
                const lvl = instance.lvl || 0;
                const cnt = instance.cnt || 1;
                levelCounts[lvl] = (levelCounts[lvl] || 0) + cnt;
            });

            const levelsOutput = [];
            Object.keys(levelCounts).forEach(lvlKey => {
                const currentLvl = parseInt(lvlKey, 10);
                const count = levelCounts[lvlKey];

                // 1. Total Cost Till (Sunk Cost)
                const sunkCost = calculateCumulativeCost(staticItem.levels || [], currentLvl, logicType);

                // 2. Next Costs
                // Map future levels up to maxLevelForTH
                const nextCosts = {};
                if (staticItem.levels) {
                    if (logicType === 'TargetLevel') {
                        // Logic 1: Cost to go N -> N+1 is in Level N+1 'build_cost'
                        staticItem.levels.forEach(l => {
                            if (l.level > currentLvl && l.level <= maxLevelForTH) {
                                const c = l.build_cost || 0;
                                nextCosts[`${l.level - 1} -> ${l.level}`] = c;
                            }
                        });
                    } else {
                        // Logic 2: Cost to go N -> N+1 is in Level N 'upgrade_cost'
                        // We iterate levels starting from currentLvl up to maxLevelForTH - 1
                        staticItem.levels.forEach(l => {
                            // If user is at 86, cost to go 86->87 is in level 86 object.
                            // We need to list costs for steps: current -> current+1, current+1 -> current+2 ...
                            if (l.level >= currentLvl && l.level < maxLevelForTH) {
                                // Double check if this level step is allowed by TH?
                                // l.level is the 'Source' level here. 
                                // We need to check if Target (l.level + 1) is allowed.
                                // Actually maxLevelForTH is the max attainable level.
                                // So if L86 upgrade cost -> L87. L87 must be <= maxLevelForTH.
                                if ((l.level + 1) <= maxLevelForTH) {
                                    const c = l.upgrade_cost || 0;
                                    nextCosts[`${l.level} -> ${l.level + 1}`] = c;
                                }
                            }
                        });
                    }
                }

                // If no future levels available (maxed for TH), nextCosts is empty.

                levelsOutput.push({
                    level: currentLvl,
                    count: count,
                    totalcosttill: sunkCost * count, // Multiply by count
                    nextcost: nextCosts
                });
            });

            // If there are instances, add to structure
            if (levelsOutput.length > 0) {
                structure[typeName].push({
                    name: staticItem.name,
                    id: staticItem._id,
                    unlock: unlockLevel,
                    superchargeable: staticItem.superchargeable || false,
                    upgrade_resource: staticItem.upgrade_resource || 'Gold',
                    levels: levelsOutput
                });
            }
        });
    });

    return structure;
}

// Export for Node.js (testing) or Browser (global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        filterByVillage,
        getVillageData,
        getVillageDisplayName,
        getOppositeVillage,
        getVillageStaticItems,
        getVillageHallLevel,
        getStructuredVillageData
    };
} else {
    // Browser global
    window.filterByVillage = filterByVillage;
    window.getVillageData = getVillageData;
    window.getVillageDisplayName = getVillageDisplayName;
    window.getOppositeVillage = getOppositeVillage;
    window.getVillageStaticItems = getVillageStaticItems;
    window.getVillageHallLevel = getVillageHallLevel;
    window.getStructuredVillageData = getStructuredVillageData;
}
