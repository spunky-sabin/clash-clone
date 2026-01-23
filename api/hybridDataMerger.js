/**
 * Hybrid Data Merger
 * 
 * Merges live API data with JSON player data.
 * Uses API for: Heroes, Troops, Spells, Pets
 * Uses JSON for: Buildings, Walls, Traps, Equipment, Decorations, etc.
 * 
 * Filtering Rules:
 * - Excludes super troops (boostable: true)
 * - Excludes seasonal troops (seasonal: true)
 * - Separates pets (unlockBuilding: "Pet House")
 */

const playerService = require('./playerService');

/**
 * Merge API data into JSON user data
 * @param {Object} userData - User data from JSON file
 * @param {string} playerTag - Player tag (optional, extracted from userData if not provided)
 * @returns {Promise<Object>} Merged data with API fields and metadata
 */
async function mergeAPIData(userData, playerTag = null) {
    const result = {
        data: { ...userData },
        metadata: {
            sources: {
                heroes: 'json',
                troops: 'json',
                spells: 'json',
                pets: 'json',
                equipment: 'json',
                buildings: 'json',
                walls: 'json'
            },
            apiSuccess: false,
            apiError: null,
            mergedAt: Date.now(),
            filtered: {
                superTroops: 0,
                seasonalTroops: 0
            }
        }
    };

    try {
        // Extract player tag if not provided
        if (!playerTag) {
            playerTag = userData.tag || userData.player_tag || userData.playerTag;
        }

        if (!playerTag) {
            result.metadata.apiError = 'No player tag found in data';
            return result;
        }

        // Fetch from API
        const apiPlayer = await playerService.getPlayer(playerTag);
        result.metadata.apiSuccess = true;
        result.metadata.apiPlayerName = apiPlayer.name;
        result.metadata.apiTownHallLevel = apiPlayer.townHallLevel;

        // Merge Heroes
        if (apiPlayer.heroes && apiPlayer.heroes.length > 0) {
            result.data.heroes = mergeHeroes(userData.heroes || [], apiPlayer.heroes);
            result.metadata.sources.heroes = 'api';
        }

        // Merge Troops (units and siege machines) + extract pets
        // Filter out super troops and seasonal troops
        if (apiPlayer.troops && apiPlayer.troops.length > 0) {
            const merged = mergeTroopsAndSpells(
                userData.units || [],
                userData.siege_machines || [],
                apiPlayer.troops,
                'troops',
                result.metadata.filtered
            );
            result.data.units = merged.units;
            result.data.siege_machines = merged.siegeMachines;

            // Pets are extracted from troops
            if (merged.pets && merged.pets.length > 0) {
                result.data.pets = merged.pets;
                result.metadata.sources.pets = 'api';
            }

            result.metadata.sources.troops = 'api';
        }

        // Merge Spells
        if (apiPlayer.spells && apiPlayer.spells.length > 0) {
            result.data.spells = mergeTroopsAndSpells(
                userData.spells || [],
                [],
                apiPlayer.spells,
                'spells',
                result.metadata.filtered
            ).units;
            result.metadata.sources.spells = 'api';
        }

        // Try to merge Equipment (if available in API)
        if (apiPlayer.heroEquipment && apiPlayer.heroEquipment.length > 0) {
            result.data.equipment = mergeEquipment(userData.equipment || [], apiPlayer.heroEquipment);
            result.metadata.sources.equipment = 'api';
        }

        // IMPORTANT: Preserve timestamp and tag at root level for validation
        if (userData.timestamp) {
            result.data.timestamp = userData.timestamp;
        }
        if (userData.tag) {
            result.data.tag = userData.tag;
        }
        if (userData.name) {
            result.data.name = userData.name;
        }

    } catch (error) {
        result.metadata.apiError = error.message;
        console.warn('API fetch failed, using JSON data only:', error.message);
    }

    return result;
}

/**
 * Merge hero data from API into JSON format
 */
function mergeHeroes(jsonHeroes, apiHeroes) {
    return apiHeroes.map(apiHero => {
        const jsonHero = jsonHeroes.find(h => {
            const heroName = getHeroName(h.data);
            return heroName && heroName.toLowerCase() === apiHero.name.toLowerCase();
        });

        return {
            data: jsonHero ? jsonHero.data : getHeroIdFromName(apiHero.name),
            lvl: apiHero.level,
            ...(jsonHero && jsonHero.timer ? { timer: jsonHero.timer } : {}),
            _apiData: {
                name: apiHero.name,
                village: apiHero.village,
                maxLevel: apiHero.maxLevel
            }
        };
    });
}

/**
 * Merge troops/spells from API into JSON format
 * Filters out:
 * - Super troops (boostable: true)
 * - Seasonal troops (seasonal: true)
 * Extracts:
 * - Pets (unlockBuilding: "Pet House")
 */
function mergeTroopsAndSpells(jsonUnits, jsonSiegeMachines, apiUnits, type, filteredStats) {
    const result = {
        units: [],
        siegeMachines: [],
        pets: []
    };

    apiUnits.forEach(apiUnit => {
        // SKIP: Super troops (boostable: true)
        if (apiUnit.boostable === true) {
            if (filteredStats) filteredStats.superTroops++;
            return;
        }

        // SKIP: Seasonal troops (seasonal: true)
        if (apiUnit.seasonal === true) {
            if (filteredStats) filteredStats.seasonalTroops++;
            return;
        }

        // EXTRACT: Pets (unlockBuilding: "Pet House")
        if (apiUnit.unlockBuilding && apiUnit.unlockBuilding === 'Pet House') {
            result.pets.push({
                data: getUnitIdFromName(apiUnit.name, 'pets'),
                lvl: apiUnit.level,
                _apiData: {
                    name: apiUnit.name,
                    village: apiUnit.village,
                    maxLevel: apiUnit.maxLevel
                }
            });
            return;
        }

        // Determine if it's a siege machine
        const isSiegeMachine = apiUnit.name.includes('Siege') ||
            apiUnit.name.includes('Wall Wrecker') ||
            apiUnit.name.includes('Battle Blimp') ||
            apiUnit.name.includes('Stone Slammer') ||
            apiUnit.name.includes('Barracks') ||
            apiUnit.name.includes('Log Launcher') ||
            apiUnit.name.includes('Flame Flinger') ||
            apiUnit.name.includes('Battle Drill');

        const targetArray = isSiegeMachine ? jsonSiegeMachines : jsonUnits;
        const resultArray = isSiegeMachine ? 'siegeMachines' : 'units';

        const jsonUnit = targetArray.find(u => {
            const unitName = getUnitName(u.data);
            return unitName && unitName.toLowerCase() === apiUnit.name.toLowerCase();
        });

        const merged = {
            data: jsonUnit ? jsonUnit.data : getUnitIdFromName(apiUnit.name, type),
            lvl: apiUnit.level,
            ...(jsonUnit && jsonUnit.timer ? { timer: jsonUnit.timer } : {}),
            _apiData: {
                name: apiUnit.name,
                village: apiUnit.village,
                maxLevel: apiUnit.maxLevel
            }
        };

        result[resultArray].push(merged);
    });

    return result;
}

/**
 * Merge equipment from API (if available)
 */
function mergeEquipment(jsonEquipment, apiEquipment) {
    return apiEquipment.map(apiItem => {
        const jsonItem = jsonEquipment.find(e => {
            const equipName = getEquipmentName(e.data);
            return equipName && equipName.toLowerCase() === apiItem.name.toLowerCase();
        });

        return {
            data: jsonItem ? jsonItem.data : getEquipmentIdFromName(apiItem.name),
            lvl: apiItem.level,
            _apiData: {
                name: apiItem.name,
                maxLevel: apiItem.maxLevel
            }
        };
    });
}

// Helper functions
function getHeroName(id) {
    const heroMap = {
        4000000: 'Barbarian King',
        4000001: 'Archer Queen',
        4000002: 'Grand Warden',
        4000003: 'Royal Champion',
        4000018: 'Battle Machine'
    };
    return heroMap[id] || null;
}

function getHeroIdFromName(name) {
    const nameMap = {
        'Barbarian King': 4000000,
        'Archer Queen': 4000001,
        'Grand Warden': 4000002,
        'Royal Champion': 4000003,
        'Battle Machine': 4000018
    };
    return nameMap[name] || 0;
}

function getUnitName(id) {
    return null;
}

function getUnitIdFromName(name, type) {
    return 0;
}

function getEquipmentName(id) {
    return null;
}

function getEquipmentIdFromName(name) {
    return 0;
}

module.exports = {
    mergeAPIData
};
