window.calculateEquipmentClashNinjaFinal = function (userVillage, staticData, userTH) {
    // Standardized Scarcity Ratios
    // Balanced Weights: Shiny=1, Glowy=8, Starry=100
    // Based on Gem/Medal value analysis
    const ORE_RATIOS = { shiny: 1, glowy: 8, starry: 100 };

    const result = {
        completed: 0,
        total: 0,
        percent: 0,
        resources: {
            Shiny: { total: 0, completed: 0 },
            Glowy: { total: 0, completed: 0 },
            Starry: { total: 0, completed: 0 },
            Mixed: { total: 0, completed: 0 } // For consistency if needed
        }
    };

    // Helper: Get cost object for a specific level step
    // Logic: Cost to reach Level N is stored in Level N-1 object.
    // Level 1 is unlocked/base, so cost to "reach" Level 1 is 0.
    // Cost to reach Level 2 is in Level 1 object.
    function getStepCost(item, targetLevel) {
        if (targetLevel <= 1) return null;

        // Find the level object for (targetLevel - 1)
        const levelData = item.levels.find(l => l.level === (targetLevel - 1));
        if (!levelData || !levelData.upgrade_cost) return null;

        return levelData.upgrade_cost;
    }

    // Helper: Calculate weighted value of a cost object
    function getWeightedValue(costObj) {
        const shiny = costObj.shiny_ore || 0;
        const glowy = costObj.glowy_ore || 0;
        const starry = costObj.starry_ore || 0;

        return (shiny * ORE_RATIOS.shiny) +
            (glowy * ORE_RATIOS.glowy) +
            (starry * ORE_RATIOS.starry);
    }

    if (staticData.equipment) {
        const levelDistribution = {};
        let equipmentCount = 0;

        staticData.equipment.forEach(item => {
            // 1. Determine Max Level allowed at this Town Hall
            let maxLvl = 0;
            item.levels.forEach(l => {
                if (l.required_townhall <= userTH && l.level > maxLvl) maxLvl = l.level;
            });
            if (maxLvl === 0) return;

            // 2. Calculate TOTAL
            // Iterate 1..Max
            for (let l = 1; l <= maxLvl; l++) {
                const stepCost = getStepCost(item, l);
                if (stepCost) {
                    const weight = getWeightedValue(stepCost);

                    result.total += weight;
                    result.resources.Mixed.total += weight;

                    result.resources.Shiny.total += (stepCost.shiny_ore || 0);
                    result.resources.Glowy.total += (stepCost.glowy_ore || 0);
                    result.resources.Starry.total += (stepCost.starry_ore || 0);
                }
            }

            // 3. Calculate COMPLETED
            const uEquip = userVillage.equipment ? userVillage.equipment.find(e => e.data === item._id) : null;
            if (uEquip) {
                const currentLvl = uEquip.lvl || 1;
                const effectiveLvl = Math.min(currentLvl, maxLvl);

                // Track level distribution
                if (!levelDistribution[effectiveLvl]) {
                    levelDistribution[effectiveLvl] = 0;
                }
                levelDistribution[effectiveLvl]++;
                equipmentCount++;

                // Sum levels 1..effectiveLvl
                for (let l = 1; l <= effectiveLvl; l++) {
                    const stepCost = getStepCost(item, l);
                    if (stepCost) {
                        const weight = getWeightedValue(stepCost);

                        result.completed += weight;
                        result.resources.Mixed.completed += weight;

                        result.resources.Shiny.completed += (stepCost.shiny_ore || 0);
                        result.resources.Glowy.completed += (stepCost.glowy_ore || 0);
                        result.resources.Starry.completed += (stepCost.starry_ore || 0);
                    }
                }
            }
        });

        // Add detailed breakdown
        result.details = {
            byLevel: levelDistribution,
            totalEquipment: equipmentCount,
            oreRatios: ORE_RATIOS
        };
    }

    result.percent = result.total > 0
        ? (result.completed / result.total) * 100
        : 0;

    return result; // Explicit return
};