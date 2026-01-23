window.calculatePets = function (userVillage, staticData, userTH) {
    const result = {
        completed: 0,
        total: 0,
        percent: 0,
        timeCompleted: 0,  // Track time separately
        timeTotal: 0,      // Track time separately
        resources: {
            // "Mixed" helps align with walls structure if UI expects it, 
            // but we'll essentially store the Weighted Total here.
            Mixed: { total: 0, completed: 0 },
            // Keep specific buckets for detail views if needed
            Gold: { total: 0, completed: 0 },
            Elixir: { total: 0, completed: 0 },
            DarkElixir: { total: 0, completed: 0 }
        }
    };

    const DARK_TO_ELIXIR_RATIO = 150;

    // Helper: Get cost object { cost, resource } for a specific level step
    // User verified: Cost/Time to reach Level N is stored in Level N-1 object.
    function getStepData(item, targetLevel) {
        if (targetLevel <= 1) return null; // Unlocking (Level 1) is free/instant in this schema

        const levelData = item.levels.find(l => l.level === (targetLevel - 1));
        if (!levelData) return null;

        const cost = levelData.upgrade_cost || 0;
        let resource = item.upgrade_resource || 'Dark Elixir';
        if (resource === 'Dark Elixir') resource = 'DarkElixir';

        return { cost, resource, time: levelData.upgrade_time || 0 };
    }

    // Helper: Convert to Weighted Cost
    function getWeightedCost(cost, resource) {
        if (resource === 'DarkElixir') return cost * DARK_TO_ELIXIR_RATIO;
        return cost; // Elixir/Gold = 1
    }

    if (staticData.pets) {
        staticData.pets.forEach(item => {
            if (item.village && item.village !== 'home') return;

            // 1. Max Level
            let maxLvl = 0;
            item.levels.forEach(l => {
                if (l.required_townhall <= userTH && l.level > maxLvl) maxLvl = l.level;
            });
            if (maxLvl === 0) return;

            // 2. Calculate TOTAL
            // Iterate 1..Max
            for (let l = 1; l <= maxLvl; l++) {
                const step = getStepData(item, l);
                if (step) {
                    const wCost = getWeightedCost(step.cost, step.resource);

                    // Update Main Weighted Stats
                    result.resources.Mixed.total += wCost;
                    result.total += wCost;

                    // Track timeTotal
                    result.timeTotal += step.time;

                    // Update granular stats
                    if (result.resources[step.resource]) {
                        result.resources[step.resource].total += step.cost;
                    }
                }
            }

            // 3. Calculate COMPLETED
            if (userVillage.pets) {
                const uPet = userVillage.pets.find(p => p.data === item._id);
                if (uPet) {
                    const currentLvl = uPet.lvl || 1;
                    const effectiveLvl = Math.min(currentLvl, maxLvl);

                    // Sum levels 1..effectiveLvl
                    for (let l = 1; l <= effectiveLvl; l++) {
                        const step = getStepData(item, l);
                        if (step) {
                            const wCost = getWeightedCost(step.cost, step.resource);
                            result.resources.Mixed.completed += wCost;
                            result.completed += wCost;

                            // Track timeCompleted
                            result.timeCompleted += step.time;

                            if (result.resources[step.resource]) {
                                result.resources[step.resource].completed += step.cost;
                            }
                        }
                    }

                    // Active Upgrade (Cost Logic: Paid Upfront -> Counted)
                    if (uPet.timer && uPet.timer > 0) {
                        const nextLvl = currentLvl + 1;
                        if (nextLvl <= maxLvl) {
                            const step = getStepData(item, nextLvl);
                            if (step) {
                                const wCost = getWeightedCost(step.cost, step.resource);
                                result.resources.Mixed.completed += wCost;
                                result.completed += wCost;

                                // Track timeCompleted
                                result.timeCompleted += step.time;

                                if (result.resources[step.resource]) {
                                    result.resources[step.resource].completed += step.cost;
                                }
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

    return result;
};