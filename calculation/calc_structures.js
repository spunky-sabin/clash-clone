window.calculateStructuresCostBased = function (userVillage, staticData, userTH) {
    const result = {
        completed: 0,
        total: 0,
        percent: 0,
        resources: {
            // "Mixed" helps align with heroes/lab structure
            Mixed: { total: 0, completed: 0 },
            Gold: { total: 0, completed: 0 },
            Elixir: { total: 0, completed: 0 },
            DarkElixir: { total: 0, completed: 0 }
        }
    };

    const isBB = userVillage.village === 'builderBase';
    const thId = isBB ? 1000034 : 1000001;
    const DARK_TO_ELIXIR_RATIO = 150;

    // Helper: Get build cost and resource type for a specific level of an item
    function getLevelCost(item, level) {
        if (!item || !item.levels) return { cost: 0, resource: 'Gold' };
        const levelData = item.levels.find(l => l.level === level);
        if (!levelData) return { cost: 0, resource: 'Gold' };

        const cost = levelData.build_cost !== undefined ? levelData.build_cost : (levelData.upgrade_cost || 0);
        const resource = item.upgrade_resource || 'Gold'; // Default to Gold for structures
        // Mapped resource names
        const resMap = {
            'Gold': 'Gold',
            'Elixir': 'Elixir',
            'Dark Elixir': 'DarkElixir',
            'Dark': 'DarkElixir'
        };
        return { cost: cost, resource: resMap[resource] || resource };
    }

    // Helper: Convert to Weighted Cost (DE weighting)
    function getWeightedCost(cost, resource) {
        if (resource === 'DarkElixir') return cost * DARK_TO_ELIXIR_RATIO;
        return cost; // Elixir/Gold = 1
    }

    // Helper: Get max level allowed at the user's Town Hall
    function getMaxLevelAtTH(item, th) {
        if (!item || !item.levels) return 0;
        return item.levels.reduce((max, l) => (l.required_townhall <= th ? Math.max(max, l.level) : max), 0);
    }

    // Helper: Get allowed quantity of a building at the user's Town Hall
    function getAllowedCount(id, th) {
        if (Number(id) === thId) return 1;
        const thBuilding = staticData.buildings.find(b => b._id === thId);
        let count = 0;
        if (thBuilding && thBuilding.levels) {
            thBuilding.levels.forEach(l => {
                if (l.level <= th) {
                    l.unlocks?.forEach(u => {
                        if (Number(u._id) === Number(id)) count += u.quantity;
                    });
                }
            });
        }
        return count;
    }

    ['buildings', 'traps'].forEach(cat => {
        (staticData[cat] || []).forEach(item => {
            const id = item._id;

            // Exclude Builder Base (only Home Village for now)
            if (item.village && item.village !== 'home') return;

            // Exclude walls (they have their own separate calculation, resource-based)
            if (id === 1000010 || id === 1000033 || item.type === 'Wall') return;

            const allowedQty = getAllowedCount(id, userTH);
            const maxLvlAtTH = getMaxLevelAtTH(item, userTH);

            if (allowedQty === 0) return;

            // 1. TOTAL COST (Cost-based with DE weighting for Levels 1 to Max for all slots)
            // Skip for Town Hall (1000001) as per user request (TH itself is excluded)
            if (Number(id) !== thId) {
                for (let l = 1; l <= maxLvlAtTH; l++) {
                    const costData = getLevelCost(item, l);
                    const wCost = getWeightedCost(costData.cost, costData.resource);

                    // Update Main Weighted Stats (per building, times quantity)
                    result.resources.Mixed.total += (wCost * allowedQty);
                    result.total += (wCost * allowedQty);

                    // Update granular stats
                    if (result.resources[costData.resource]) {
                        result.resources[costData.resource].total += (costData.cost * allowedQty);
                    }
                }
            }

            // Special Case: Town Hall Weapon (nested in TH level data)
            // TH17 upgrade includes weapon level 1, so only count levels 2-5
            if (Number(id) === thId && userTH >= 17 && item.levels) {
                const th17Level = item.levels.find(l => l.level === 17);
                if (th17Level && th17Level.weapon && th17Level.weapon.levels) {
                    th17Level.weapon.levels.forEach(wl => {
                        // Skip level 1 (included in TH17 upgrade build_time)
                        if (wl.level > 1) {
                            const cost = wl.build_cost !== undefined ? wl.build_cost : (wl.upgrade_cost || 0);
                            const wCost = getWeightedCost(cost, 'Gold'); // Weapon uses Gold

                            result.resources.Mixed.total += wCost;
                            result.total += wCost;
                            result.resources.Gold.total += cost;
                        }
                    });
                }
            }

            // 2. COMPLETED COST (Sum cost for currently completed levels)
            // Expand buildings with 'cnt' field into individual entries to handle them one by one
            const userBuildingsRaw = ((cat === 'traps' ? userVillage.traps : userVillage.buildings) || [])
                .filter(b => Number(b.data || b.id) === Number(id));

            const userOwned = [];
            userBuildingsRaw.forEach(b => {
                const lvl = (b.lvl !== undefined && b.lvl !== null) ? b.lvl : 0; // 0 for unbuilt
                const count = b.cnt || 1; // Multiple buildings in one entry
                const timer = b.timer || 0; // Remaining time in seconds if upgrading
                for (let c = 0; c < count; c++) {
                    userOwned.push({ level: lvl, timer: timer });
                }
            });

            // VIRTUALIZE MERGED DEFENSES: Add max-level originals for merged buildings
            // Check if this building type can be merged into something
            (staticData.buildings || []).forEach(mergedBuilding => {
                if (mergedBuilding.levels && mergedBuilding.levels[0] && mergedBuilding.levels[0].merge_requirement) {
                    const mergeReq = mergedBuilding.levels[0].merge_requirement;

                    // Count how many of this building type are required for one merge
                    const requiredForMerge = mergeReq.filter(req => Number(req._id) === Number(id));

                    if (requiredForMerge.length > 0) {
                        // Check how many of this merged defense the user has
                        const userMergedDefenses = (userVillage.buildings || [])
                            .filter(b => Number(b.data || b.id) === Number(mergedBuilding._id) && ((b.lvl || 0) > 0 || (b.timer || 0) > 0));

                        // For each merged defense, add the original max-level buildings to completed
                        userMergedDefenses.forEach(merged => {
                            const count = merged.cnt || 1;
                            for (let i = 0; i < count; i++) {
                                // Add the required number of max-level originals
                                requiredForMerge.forEach(req => {
                                    // Treat as completed max level original (no active timer on the original)
                                    userOwned.push({ level: req.level, timer: 0 });
                                });
                            }
                        });
                    }
                }
            });

            // SPECIAL CASE: Eagle Artillery absorbed into TH at level 17+
            // If user is TH17+ and has Eagle Artillery at level 0, virtualize it as max level 7
            const eagleArtilleryId = 1000031;
            if (Number(id) === eagleArtilleryId && userTH >= 17) {
                for (let i = 0; i < userOwned.length; i++) {
                    if (userOwned[i].level === 0) {
                        userOwned[i].level = 7; // Set to level 7 (merged into TH17 weapon)
                    }
                }
            }

            // Fill missing slots (unbuilt) with level 0
            while (userOwned.length < allowedQty) {
                userOwned.push({ level: 0, timer: 0 });
            }

            // Calculate completed cost for allowed slots
            if (Number(id) !== thId) {
                for (let i = 0; i < allowedQty; i++) {
                    const building = userOwned[i];
                    const currentLvl = building ? building.level : 0;
                    // Cap level at current TH max to ensure percent doesn't exceed 100%
                    const effectiveLvl = Math.min(currentLvl, maxLvlAtTH);

                    // Add full cost for completed levels 1 to current
                    for (let l = 1; l <= effectiveLvl; l++) {
                        const costData = getLevelCost(item, l);
                        const wCost = getWeightedCost(costData.cost, costData.resource);

                        result.resources.Mixed.completed += wCost;
                        result.completed += wCost;

                        if (result.resources[costData.resource]) {
                            result.resources[costData.resource].completed += costData.cost;
                        }
                    }

                    // Handle Active Upgrades (Cost Logic: Paid Upfront -> Counted)
                    if (building && building.timer > 0) {
                        const nextLvl = currentLvl + 1;
                        // Only count if the target level is within TH cap
                        if (nextLvl <= maxLvlAtTH) {
                            const costData = getLevelCost(item, nextLvl);
                            const wCost = getWeightedCost(costData.cost, costData.resource);

                            result.resources.Mixed.completed += wCost;
                            result.completed += wCost;

                            if (result.resources[costData.resource]) {
                                result.resources[costData.resource].completed += costData.cost;
                            }
                        }
                    }
                }
            }

            // Special Case: Town Hall Weapon (nested in TH level data)
            if (Number(id) === thId && userTH >= 17 && item.levels) {
                const th17Level = item.levels.find(l => l.level === 17);
                if (th17Level && th17Level.weapon && th17Level.weapon.levels) {
                    const weaponLvl = userVillage.villageObject?.weaponLevel || 0;
                    th17Level.weapon.levels.forEach(wl => {
                        // Skip level 1, only count 2-5
                        if (wl.level > 1 && wl.level <= weaponLvl) {
                            const cost = wl.build_cost !== undefined ? wl.build_cost : (wl.upgrade_cost || 0);
                            const wCost = getWeightedCost(cost, 'Gold');

                            result.resources.Mixed.completed += wCost;
                            result.completed += wCost;
                            result.resources.Gold.completed += cost;
                        }
                    });
                }
            }
        });
    });

    if (result.total > 0) {
        result.percent = Math.floor((result.completed / result.total) * 100);
    }
    return result;
};