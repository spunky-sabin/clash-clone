/**
 * Player Service
 * 
 * This module provides functions to fetch and process player data
 * from the Clash of Clans API.
 */

const { client, formatTag } = require('./client');

/**
 * Get detailed information about a player
 * @param {string} playerTag - The player tag (with or without #)
 * @returns {Promise<Object>} Player data
 */
async function getPlayer(playerTag) {
    try {
        const tag = formatTag(playerTag);
        const player = await client.getPlayer(tag);

        return {
            tag: player.tag,
            name: player.name,
            townHallLevel: player.townHallLevel,
            townHallWeaponLevel: player.townHallWeaponLevel,
            expLevel: player.expLevel,
            trophies: player.trophies,
            bestTrophies: player.bestTrophies,
            warStars: player.warStars,
            attackWins: player.attackWins,
            defenseWins: player.defenseWins,
            builderHallLevel: player.builderHallLevel,
            versusTrophies: player.versusTrophies,
            bestVersusTrophies: player.bestVersusTrophies,
            versusBattleWins: player.versusBattleWins,
            role: player.role,
            warPreference: player.warPreference,
            donations: player.donations,
            donationsReceived: player.donationsReceived,
            clan: player.clan ? {
                tag: player.clan.tag,
                name: player.clan.name,
                clanLevel: player.clan.clanLevel,
                badgeUrls: player.clan.badgeUrls
            } : null,
            league: player.league,
            achievements: player.achievements,
            troops: player.troops,
            heroes: player.heroes,
            spells: player.spells,
            labels: player.labels
        };
    } catch (error) {
        console.error(`Error fetching player ${playerTag}:`, error.message);
        throw error;
    }
}

/**
 * Get player's heroes with their current levels
 * @param {string} playerTag - The player tag (with or without #)
 * @returns {Promise<Array>} Array of hero objects
 */
async function getPlayerHeroes(playerTag) {
    try {
        const tag = formatTag(playerTag);
        const player = await client.getPlayer(tag);

        return player.heroes.map(hero => ({
            name: hero.name,
            level: hero.level,
            maxLevel: hero.maxLevel,
            village: hero.village
        }));
    } catch (error) {
        console.error(`Error fetching heroes for ${playerTag}:`, error.message);
        throw error;
    }
}

/**
 * Get player's troop levels
 * @param {string} playerTag - The player tag (with or without #)
 * @returns {Promise<Array>} Array of troop objects
 */
async function getPlayerTroops(playerTag) {
    try {
        const tag = formatTag(playerTag);
        const player = await client.getPlayer(tag);

        return player.troops.map(troop => ({
            name: troop.name,
            level: troop.level,
            maxLevel: troop.maxLevel,
            village: troop.village
        }));
    } catch (error) {
        console.error(`Error fetching troops for ${playerTag}:`, error.message);
        throw error;
    }
}

/**
 * Get player's spell levels
 * @param {string} playerTag - The player tag (with or without #)
 * @returns {Promise<Array>} Array of spell objects
 */
async function getPlayerSpells(playerTag) {
    try {
        const tag = formatTag(playerTag);
        const player = await client.getPlayer(tag);

        return player.spells.map(spell => ({
            name: spell.name,
            level: spell.level,
            maxLevel: spell.maxLevel,
            village: spell.village
        }));
    } catch (error) {
        console.error(`Error fetching spells for ${playerTag}:`, error.message);
        throw error;
    }
}

/**
 * Verify if a player exists
 * @param {string} playerTag - The player tag (with or without #)
 * @returns {Promise<boolean>} True if player exists
 */
async function verifyPlayer(playerTag) {
    try {
        const tag = formatTag(playerTag);
        await client.getPlayer(tag);
        return true;
    } catch (error) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}

module.exports = {
    getPlayer,
    getPlayerHeroes,
    getPlayerTroops,
    getPlayerSpells,
    verifyPlayer
};
