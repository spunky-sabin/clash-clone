/**
 * Walls Calculation Module
 * Cost-based progression with per-group max levels
 */

window.calculateWalls = function (userVillage, staticData, userTH) {
    const result = {
        completed: 0,
        total: 0,
        percent: 0,
        resources: {
            Mixed: { total: 0, completed: 0 }
        }
    };

    // Helper: Calculate cumulative cost to reach a given level
    // Wall level N's build_cost = cost to upgrade FROM (N-1) TO N
    // So to reach level 13, you pay: level1 + level2 + ... + level13 build_costs
    function getCumulativeCost(item, lvl) {
        if (!item || !item.levels) return 0;
        let cost = 0;
        item.levels.forEach(l => {
            // Sum all costs from level 1 up to and including target level
            // Each level's build_cost is the cost to upgrade TO that level
            if (l.level >= 1 && l.level <= lvl) {
                cost += (l.build_cost || l.upgrade_cost || 0);
            }
        });
        return cost;
    }

    const wallItem = staticData.buildings.find(b => b._id === 1000010);
    if (!wallItem) return result;

    // Determine max wall level at player's TH
    let absoluteMaxLevel = 0;
    wallItem.levels.forEach(l => {
        if (l.required_townhall <= userTH && l.level > absoluteMaxLevel) {
            absoluteMaxLevel = l.level;
        }
    });

    if (absoluteMaxLevel === 0) return result;

    // Get total wall count allowed at user's TH
    const thItem = staticData.buildings.find(b => b._id === 1000001);
    if (!thItem || !thItem.levels) return result;

    let totalWallsAllowed = 0;
    thItem.levels.forEach(l => {
        if (l.level <= userTH && l.unlocks) {
            l.unlocks.forEach(u => {
                if (u._id === 1000010) {
                    totalWallsAllowed += u.quantity;
                }
            });
        }
    });

    if (totalWallsAllowed === 0) return result;

    // PARTIAL LIMITS LOGIC:
    // Some levels have a capped number of walls (e.g. only 125 walls can be Level 19).
    const WALL_LIMITS = {
        19: 125
    };

    // Calculate Total Cost dynamically based on limits per level step
    // Total = Sum( allowed_count_at_step_L * cost_of_step_L )
    result.total = 0;

    // Iterate from level 1 up to absoluteMaxLevel
    for (let l = 1; l <= absoluteMaxLevel; l++) {
        // Find cost to upgrade TO level l (from l-1)
        const levelData = wallItem.levels.find(lvl => lvl.level === l);
        const stepCost = levelData ? (levelData.build_cost || levelData.upgrade_cost || 0) : 0;

        // Determine how many walls are allowed to take this step
        // Default is all walls, unless a limit exists for this level
        const limit = WALL_LIMITS[l] !== undefined ? WALL_LIMITS[l] : Infinity;
        const countAllowed = Math.min(totalWallsAllowed, limit);

        result.total += countAllowed * stepCost;
    }

    // Note: completed calculation remains similar but we should cap 'completed' ? 
    // Actually, user might have more walls than allowed if data is weird, 
    // but typically we just sum up what they HAVE.
    // The PERCENTAGE will be correct because Total is now the realistic max.

    // Calculate user's completed cost
    let userWalls = userVillage.buildings ? userVillage.buildings.filter(b => b.data === 1000010) : [];
    userWalls.forEach(stack => {
        const count = stack.cnt || 1;
        const lvl = stack.lvl;
        const costForThisLevel = getCumulativeCost(wallItem, lvl);
        result.completed += (costForThisLevel * count);
    });

    // Map to resources
    result.resources.Mixed.total = result.total;
    result.resources.Mixed.completed = result.completed;

    if (result.total > 0) {
        result.percent = (result.completed / result.total) * 100;
    }

    return result;
};
