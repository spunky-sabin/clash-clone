/**
 * Analyze Upgrades Module
 * Generates upgrade data for all building types, troops, heroes, pets, equipment, and walls
 * Returns an array of upgrade objects with missing levels and current status
 */

window.analyzeUpgrades = function (userData, staticData, userTH) {
    const upgrades = [];

    // Process Buildings
    if (staticData.buildings) {
        staticData.buildings.forEach(building => {
            if (building.village && building.village !== 'home') return;

            // Find max level for this TH
            let maxLevel = 0;
            building.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            if (maxLevel === 0) return;

            // Find user's instances of this building
            const userBuildings = userData.buildings ? userData.buildings.filter(b => b.data === building._id) : [];

            if (userBuildings.length === 0 && building.levels[0].required_townhall <= userTH) {
                // Building not built yet but available
                upgrades.push(createUpgradeObject(building, 0, maxLevel, null, 1, 1, 'building'));
            } else {
                userBuildings.forEach((userBld, idx) => {
                    const currentLevel = userBld.lvl || 0;
                    const timer = userBld.timer || 0;
                    upgrades.push(createUpgradeObject(building, currentLevel, maxLevel, timer, idx + 1, userBuildings.length, 'building'));
                });
            }
        });
    }

    // Process Traps
    if (staticData.traps) {
        staticData.traps.forEach(trap => {
            if (trap.village && trap.village !== 'home') return;

            let maxLevel = 0;
            trap.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            if (maxLevel === 0) return;

            const userTraps = userData.traps ? userData.traps.filter(t => t.data === trap._id) : [];

            if (userTraps.length === 0 && trap.levels[0].required_townhall <= userTH) {
                upgrades.push(createUpgradeObject(trap, 0, maxLevel, null, 1, 1, 'trap'));
            } else {
                userTraps.forEach((userTrap, idx) => {
                    const currentLevel = userTrap.lvl || 0;
                    const timer = userTrap.timer || 0;
                    upgrades.push(createUpgradeObject(trap, currentLevel, maxLevel, timer, idx + 1, userTraps.length, 'trap'));
                });
            }
        });
    }

    // Process Heroes
    if (staticData.heroes) {
        // Check if we're using API data
        const hasAPIData = userData.heroes && userData.heroes.length > 0 && userData.heroes[0]._apiData;

        staticData.heroes.forEach(hero => {
            if (hero.village && hero.village !== 'home') return;

            let maxLevel = 0;
            hero.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            if (maxLevel === 0) return;

            const userHero = userData.heroes ? userData.heroes.find(h => h.data === hero._id) : null;

            // When using API data, if hero is not in userData, it's not unlocked - skip it
            if (hasAPIData && !userHero) {
                return; // API didn't return it, so it's not unlocked
            }

            // Check if this is API data with unlock metadata
            if (userHero && userHero._apiData) {
                // Skip if not unlocked yet at this TH
                if (userHero._apiData.unlockHallLevel && userHero._apiData.unlockHallLevel > userTH) {
                    return; // Don't show in upgrade table
                }
            }

            const currentLevel = userHero ? (userHero.lvl || 0) : 0;
            const timer = userHero && userHero.timer ? userHero.timer : 0;

            upgrades.push(createUpgradeObject(hero, currentLevel, maxLevel, timer, 1, 1, 'hero'));
        });
    }

    // Process Pets
    if (staticData.pets) {
        // Check if we're using API data
        const hasAPIData = userData.pets && userData.pets.length > 0 && userData.pets[0]._apiData;

        staticData.pets.forEach(pet => {
            if (pet.village && pet.village !== 'home') return;

            let maxLevel = 0;
            pet.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            if (maxLevel === 0) return;

            const userPet = userData.pets ? userData.pets.find(p => p.data === pet._id) : null;

            // When using API data, if pet is not in userData, it's not unlocked - skip it
            if (hasAPIData && !userPet) {
                return; // API didn't return it, so it's not unlocked
            }

            // Check if this is API data with unlock metadata
            if (userPet && userPet._apiData) {
                // Skip if not unlocked yet at this TH
                if (userPet._apiData.unlockHallLevel && userPet._apiData.unlockHallLevel > userTH) {
                    return; // Don't show in upgrade table
                }
            }

            const currentLevel = userPet ? (userPet.lvl || 0) : 0;
            const timer = userPet && userPet.timer ? userPet.timer : 0;

            upgrades.push(createUpgradeObject(pet, currentLevel, maxLevel, timer, 1, 1, 'pet'));
        });
    }

    // Process Troops (includes Sieges)
    if (staticData.troops) {
        // Check if we're using API data
        const hasAPIData = userData.troops && userData.troops.length > 0 && userData.troops[0]._apiData;

        staticData.troops.forEach(troop => {
            if (troop.village && troop.village !== 'home') return;
            // Filter seasonal items (e.g., Meteor Golem)
            if (troop.is_seasonal) return;

            let maxLevel = 0;
            troop.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            // STRICT UNLOCK CHECK: Ensure the item is actually unlocked at this TH
            // Check Level 1 requirement vs userTH
            if (troop.levels && troop.levels.length > 0) {
                if (troop.levels[0].required_townhall > userTH) return;
            }

            if (maxLevel === 0) return;

            // Determine if it's a Siege Machine
            const isSiege = troop.production_building === 'Workshop';
            const type = isSiege ? 'siege' : 'troop';

            // Find user data
            let userUnit = null;
            if (isSiege) {
                userUnit = userData.siege_machines ? userData.siege_machines.find(s => s.data === troop._id) : null;
                // Fallback to troops array if sieges not found separately
                if (!userUnit && userData.troops) {
                    userUnit = userData.troops.find(t => t.data === troop._id);
                }
            } else {
                userUnit = userData.troops ? userData.troops.find(t => t.data === troop._id) : null;
            }

            // Filter super troops (boostable)
            if (userUnit && userUnit.boostable) return;

            // Production building requirement filter
            // Only hide if user DOES NOT have it (level === 0) AND building requirement is not met
            const currentLevel = userUnit ? (userUnit.lvl || 0) : 0;
            if (currentLevel === 0 && troop.production_building && troop.production_building_level) {
                const buildingIds = {
                    "Barracks": 1000006,
                    "Dark Barracks": 1000026,
                    "Workshop": 1000059
                };
                const buildingId = buildingIds[troop.production_building];
                if (buildingId) {
                    const userBuildings = userData.buildings ? userData.buildings.filter(b => b.data === buildingId) : [];
                    const userBuildLvl = userBuildings.length > 0 ? Math.max(...userBuildings.map(b => b.lvl)) : 0;
                    if (userBuildLvl < troop.production_building_level) return; // Hide
                }
            }

            // When using API data, validation logic
            if (hasAPIData && !userUnit) {
                return;
            }
            if (userUnit && userUnit._apiData) {
                if (userUnit._apiData.unlockHallLevel && userUnit._apiData.unlockHallLevel > userTH) {
                    return;
                }
            }

            upgrades.push(createUpgradeObject(troop, currentLevel, maxLevel, null, 1, 1, type));
        });
    }

    // Process Guardians
    if (staticData.guardians) {
        staticData.guardians.forEach(guardian => {
            if (guardian.village && guardian.village !== 'home') return;

            let maxLevel = 0;
            guardian.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            // Trust the maxLevel check based on TH
            if (maxLevel === 0) return;

            const userGuardian = userData.heroes ? userData.heroes.find(h => h.data === guardian._id) : null;
            // Guardians likely stored in heroes array in user data? Or separate? 
            // Assuming heroes array for now based on previous finding of Minion Prince there.

            const currentLevel = userGuardian ? (userGuardian.lvl || 0) : 0;
            const timer = userGuardian && userGuardian.timer ? userGuardian.timer : 0;

            upgrades.push(createUpgradeObject(guardian, currentLevel, maxLevel, timer, 1, 1, 'guardian'));
        });
    }

    // Process Spells
    if (staticData.spells) {
        // Check if we're using API data (at least one spell has _apiData)
        const hasAPIData = userData.spells && userData.spells.length > 0 && userData.spells[0]._apiData;

        staticData.spells.forEach(spell => {
            if (spell.village && spell.village !== 'home') return;
            // Filter seasonal items
            if (spell.is_seasonal) return;

            let maxLevel = 0;
            spell.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            // STRICT UNLOCK CHECK
            if (spell.levels && spell.levels.length > 0) {
                if (spell.levels[0].required_townhall > userTH) return;
            }

            if (maxLevel === 0) return;

            const userSpell = userData.spells ? userData.spells.find(s => s.data === spell._id) : null;
            const currentLevel = userSpell ? (userSpell.lvl || 0) : 0;

            // Production building requirement filter
            if (currentLevel === 0 && spell.production_building && spell.production_building_level) {
                const buildingIds = {
                    "Spell Factory": 1000020,
                    "Dark Spell Factory": 1000029
                };
                const buildingId = buildingIds[spell.production_building];
                if (buildingId) {
                    const userBuildings = userData.buildings ? userData.buildings.filter(b => b.data === buildingId) : [];
                    const userBuildLvl = userBuildings.length > 0 ? Math.max(...userBuildings.map(b => b.lvl)) : 0;
                    if (userBuildLvl < spell.production_building_level) return; // Hide
                }
            }

            // When using API data, if spell is not in userData, it's not unlocked - skip it
            if (hasAPIData && !userSpell) {
                return; // API didn't return it, so it's not unlocked
            }

            // Check if this is API data with unlock metadata
            if (userSpell && userSpell._apiData) {
                // Skip if not unlocked yet at this TH
                if (userSpell._apiData.unlockHallLevel && userSpell._apiData.unlockHallLevel > userTH) {
                    return; // Don't show in upgrade table
                }
            }

            upgrades.push(createUpgradeObject(spell, currentLevel, maxLevel, null, 1, 1, 'spell'));
        });
    }

    // Helper function to get user's production building level
    function getUserBuildingLevel(buildingName) {
        const buildingIds = {
            "Barracks": 1000006,
            "Dark Barracks": 1000026,
            "Spell Factory": 1000020,
            "Dark Spell Factory": 1000029,
            "Workshop": 1000059,
            "Pet House": 1000068,
            "Blacksmith": 1000070
        };

        const id = buildingIds[buildingName];
        if (!id) return 0;

        const buildings = userData.buildings ? userData.buildings.filter(b => b.data === id) : [];
        if (!buildings.length) return 0;
        return Math.max(...buildings.map(b => b.lvl));
    }

    // Process Equipment
    if (staticData.equipment) {
        staticData.equipment.forEach(equipment => {
            if (equipment.village && equipment.village !== 'home') return;

            let maxLevel = 0;
            equipment.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.level > maxLevel) {
                    maxLevel = lvl.level;
                }
            });

            // Check if unlocked (Epic equipment show even if locked, Common equipment only if TH requirement met)
            const isEpic = equipment.rarity === 'Epic';
            const requiredTH = equipment.required_townhall || 1;
            const userEquip = userData.equipment ? userData.equipment.find(e => e.data === equipment._id) : null;
            const isOwned = userEquip && userEquip.lvl > 0;

            // Filter: Show if owned, OR if Epic, OR if Common and TH requirement met
            if (!isOwned && !isEpic && userTH < requiredTH) return;

            if (maxLevel === 0) return;

            const currentLevel = userEquip ? (userEquip.lvl || 0) : 0;

            upgrades.push(createUpgradeObject(equipment, currentLevel, maxLevel, null, 1, 1, 'equipment'));
        });
    }

    return upgrades;
};

function createUpgradeObject(itemData, currentLevel, maxLevel, timer, instance, totalInstances, type) {
    const missingLevels = [];
    const isUpgrading = timer && timer > 0;

    // Determine starting level for missing levels
    // If upgrading, skip the level currently being upgraded (current + 1)
    const startLevel = isUpgrading ? currentLevel + 2 : currentLevel + 1;

    // Build list of missing levels
    for (let lvl = startLevel; lvl <= maxLevel; lvl++) {
        // HYBRID LOGIC:
        // 1. Check Previous Level (N-1) for 'upgrade_cost' (Troops, Heroes, Spells, etc.)
        // 2. Check Target Level (N) for 'build_cost' (Buildings, Traps)

        let cost = 0;
        let time = 0;
        let found = false;

        // 1. Try N-1 Logic (Common for upgrades)
        const prevLevelData = itemData.levels.find(l => l.level === lvl - 1);
        if (prevLevelData && (prevLevelData.upgrade_cost !== undefined || prevLevelData.upgrade_time !== undefined)) {
            cost = prevLevelData.upgrade_cost || 0;
            time = prevLevelData.upgrade_time || 0;
            found = true;
        }

        // 2. Try N Logic (Common for construction/buildings)
        // With N logic, we check the target level object.
        if (!found) {
            const levelData = itemData.levels.find(l => l.level === lvl);
            if (levelData && (levelData.build_cost !== undefined || levelData.build_time !== undefined)) {
                cost = levelData.build_cost || 0;
                time = levelData.build_time || 0;
                found = true;
            }
        }

        if (found) {
            missingLevels.push({
                level: lvl,
                cost: cost,
                time: time,
                resource: itemData.upgrade_resource || getResourceType(type)
            });
        }
    }

    // Determine category
    const category = determineCategory(itemData, type);

    // Generate icon path
    const icon = generateIconPath(itemData, type);

    return {
        name: itemData.name || 'Unknown',
        category: category,
        currentLevel: currentLevel,
        maxLevel: maxLevel,
        missingLevels: missingLevels,
        isUpgrading: isUpgrading,
        timer: timer || 0,
        instance: instance,
        totalInstances: totalInstances,
        icon: icon,
        _id: itemData._id,
        superchargeable: itemData.superchargeable || false
    };
}

function determineCategory(itemData, type) {
    if (type === 'hero') return 'Heroes';
    if (type === 'guardian') return 'Guardians'; // NEW Category
    if (type === 'pet') return 'Pets';
    if (type === 'equipment') return 'Equipment'; // NEW Category
    if (type === 'troop') return 'Troops';
    if (type === 'spell') return 'Spells';
    if (type === 'siege') return 'Siege Machines';
    if (type === 'trap') return 'Traps';

    // For buildings, check the type
    if (itemData.type) {
        const buildingType = itemData.type.toLowerCase();
        if (buildingType.includes('defense') || buildingType.includes('cannon') ||
            buildingType.includes('tower') || buildingType.includes('mortar')) {
            return 'Defences';
        }
        if (buildingType.includes('resource') || buildingType.includes('storage') ||
            buildingType.includes('mine') || buildingType.includes('collector')) {
            return 'Resources';
        }
        if (buildingType.includes('army') || buildingType.includes('barrack') ||
            buildingType.includes('camp') || buildingType.includes('laboratory')) {
            return 'Army Buildings';
        }
    }

    return 'Structures';
}

function getResourceType(type) {
    if (type === 'hero' || type === 'pet') return 'Dark Elixir';
    if (type === 'troop' || type === 'spell' || type === 'siege') return 'Elixir';
    return 'Gold';
}

function generateIconPath(itemData, type) {
    // Try to use production ID for icon path
    const id = itemData._id || 0;
    const level = itemData.levels && itemData.levels.length > 0 ? itemData.levels[0].level : 1;

    return `/images/entities/${id}_${level}.png`;
}
