window.calculateLabCostBased = function (userVillage, staticData, userTH) {
    const result = {
        completed: 0,
        total: 0,
        percent: 0,
        timeCompleted: 0,  // Track time separately
        timeTotal: 0,      // Track time separately
        resources: {
            // "Mixed" helps align with walls/heroes structure if UI expects it
            // but we'll essentially store the Weighted Total here.
            Mixed: { total: 0, completed: 0 },
            // Keep specific buckets for detail views if needed
            Gold: { total: 0, completed: 0 },
            Elixir: { total: 0, completed: 0 },
            DarkElixir: { total: 0, completed: 0 }
        }
    };

    // Track detailed breakdown
    let troopsCount = 0;
    let spellsCount = 0;
    let siegeMachinesCount = 0;

    const DARK_TO_ELIXIR_RATIO = 150;

    // Helper: Get cost object { cost, resource } for a specific level step
    // User verified: Cost/Time to reach Level N is stored in Level N-1 object.
    function getStepData(item, targetLevel) {
        if (targetLevel <= 1) return null; // Unlocking (Level 1) is free/instant in this schema

        const levelData = item.levels.find(l => l.level === (targetLevel - 1));
        if (!levelData) return null;

        const cost = levelData.upgrade_cost || 0;
        let resource = item.upgrade_resource || 'Elixir';
        if (resource === 'Dark Elixir') resource = 'DarkElixir';

        return { cost, resource, time: levelData.upgrade_time || 0 };
    }

    // Helper: Convert to Weighted Cost
    function getWeightedCost(cost, resource) {
        if (resource === 'DarkElixir') return cost * DARK_TO_ELIXIR_RATIO;
        return cost; // Elixir/Gold = 1
    }

    // Helper: Find item in multiple user arrays
    function findUserItem(itemId, arrays) {
        for (const arr of arrays) {
            if (!arr) continue;
            const found = arr.find(u => Number(u.data) === Number(itemId));
            if (found) return found;
        }
        return null;
    }

    // Helper: Check if item is unlocked based on Production Building level
    function isItemUnlocked(item, th) {
        if (!item.production_building) return true; // Default to unlocked if no requirement

        // Find the production building definition
        const prodBuilding = staticData.buildings.find(b => b.name === item.production_building);
        if (!prodBuilding) return true; // Should not happen if data is consistent

        // Get max level of the production building allowed at userTH
        let maxBuildingLvl = 0;
        prodBuilding.levels.forEach(l => {
            if (l.required_townhall <= th && l.level > maxBuildingLvl) maxBuildingLvl = l.level;
        });

        // Item requires a specific level of that building
        return maxBuildingLvl >= item.production_building_level;
    }

    // Process Troops (includes Siege Machines in static_data)
    if (staticData.troops) {
        staticData.troops.forEach(item => {
            if (item.village && item.village !== 'home') return;

            // Check if item is unlocked by production building
            if (!isItemUnlocked(item, userTH)) return;

            // Check if it's a siege machine
            const isSiegeMachine = item.name && (
                item.name.includes('Siege') ||
                item.name.includes('Wall Wrecker') ||
                item.name.includes('Battle Blimp') ||
                item.name.includes('Stone Slammer') ||
                item.name.includes('Barracks') ||
                item.name.includes('Log Launcher') ||
                item.name.includes('Flame Flinger') ||
                item.name.includes('Battle Drill')
            );

            // 1. Max Level at this TH (Town Hall Capped)
            let maxLvl = 0;
            item.levels.forEach(l => {
                if (l.required_townhall <= userTH && l.level > maxLvl) maxLvl = l.level;
            });
            if (maxLvl === 0) return;

            // 2. Calculate TOTAL (cost-based with DE weighting)
            // Iterate from level 1 to maxLvl
            for (let l = 1; l <= maxLvl; l++) {
                const step = getStepData(item, l);
                if (step) {
                    const wCost = getWeightedCost(step.cost, step.resource);

                    // Update Main Weighted Stats
                    result.resources.Mixed.total += wCost;
                    result.total += wCost;

                    // Track time
                    result.timeTotal += step.time;

                    // Update granular stats
                    if (result.resources[step.resource]) {
                        result.resources[step.resource].total += step.cost;
                    }
                }
            }

            // 3. Calculate COMPLETED
            const uItem = findUserItem(item._id, [userVillage.units, userVillage.siege_machines]);

            if (uItem) {
                const currentLvl = uItem.lvl || 1;
                const effectiveLvl = Math.min(currentLvl, maxLvl);

                // Count this item
                if (isSiegeMachine) {
                    siegeMachinesCount++;
                } else {
                    troopsCount++;
                }

                // Sum levels 1..effectiveLvl
                for (let l = 1; l <= effectiveLvl; l++) {
                    const step = getStepData(item, l);
                    if (step) {
                        const wCost = getWeightedCost(step.cost, step.resource);
                        result.resources.Mixed.completed += wCost;
                        result.completed += wCost;

                        // Track time
                        result.timeCompleted += step.time;

                        if (result.resources[step.resource]) {
                            result.resources[step.resource].completed += step.cost;
                        }
                    }
                }

                // Active Upgrade (Cost Logic: Paid Upfront -> Counted)
                if (uItem.timer && uItem.timer > 0) {
                    const nextLvl = currentLvl + 1;
                    if (nextLvl <= maxLvl) {
                        const step = getStepData(item, nextLvl);
                        if (step) {
                            const wCost = getWeightedCost(step.cost, step.resource);
                            result.resources.Mixed.completed += wCost;
                            result.completed += wCost;

                            // Track time
                            result.timeCompleted += step.time;

                            if (result.resources[step.resource]) {
                                result.resources[step.resource].completed += step.cost;
                            }
                        }
                    }
                }
            }
        });
    }

    // Process Spells
    if (staticData.spells) {
        staticData.spells.forEach(item => {
            if (item.village && item.village !== 'home') return;

            // Check if item is unlocked by production building
            if (!isItemUnlocked(item, userTH)) return;

            // 1. Max Level at this TH (Town Hall Capped)
            let maxLvl = 0;
            item.levels.forEach(l => {
                if (l.required_townhall <= userTH && l.level > maxLvl) maxLvl = l.level;
            });
            if (maxLvl === 0) return;

            // 2. Calculate TOTAL (cost-based with DE weighting)
            for (let l = 1; l <= maxLvl; l++) {
                const step = getStepData(item, l);
                if (step) {
                    const wCost = getWeightedCost(step.cost, step.resource);

                    // Update Main Weighted Stats
                    result.resources.Mixed.total += wCost;
                    result.total += wCost;

                    // Update granular stats
                    if (result.resources[step.resource]) {
                        result.resources[step.resource].total += step.cost;
                    }
                }
            }

            // 3. Calculate COMPLETED
            const uItem = findUserItem(item._id, [userVillage.spells]);
            if (uItem) {
                const currentLvl = uItem.lvl || 1;
                const effectiveLvl = Math.min(currentLvl, maxLvl);

                // Count this spell
                spellsCount++;

                // Sum levels 1..effectiveLvl
                for (let l = 1; l <= effectiveLvl; l++) {
                    const step = getStepData(item, l);
                    if (step) {
                        const wCost = getWeightedCost(step.cost, step.resource);
                        result.resources.Mixed.completed += wCost;
                        result.completed += wCost;

                        if (result.resources[step.resource]) {
                            result.resources[step.resource].completed += step.cost;
                        }
                    }
                }

                // Active Upgrade (Cost Logic: Paid Upfront -> Counted)
                if (uItem.timer && uItem.timer > 0) {
                    const nextLvl = currentLvl + 1;
                    if (nextLvl <= maxLvl) {
                        const step = getStepData(item, nextLvl);
                        if (step) {
                            const wCost = getWeightedCost(step.cost, step.resource);
                            result.resources.Mixed.completed += wCost;
                            result.completed += wCost;

                            if (result.resources[step.resource]) {
                                result.resources[step.resource].completed += step.cost;
                            }
                        }
                    }
                }
            }
        });
    }

    if (result.total > 0) {
        result.percent = Math.floor((result.completed / result.total) * 100);
    }

    // Add detailed breakdown
    result.details = {
        troops: troopsCount,
        spells: spellsCount,
        siegeMachines: siegeMachinesCount,
        totalItems: troopsCount + spellsCount + siegeMachinesCount
    };

    return result;
};
