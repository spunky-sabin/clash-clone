/**
 * Clan Service
 * 
 * This module provides functions to fetch and process clan data
 * from the Clash of Clans API.
 */

const { client, formatTag } = require('./client');

/**
 * Get detailed information about a clan
 * @param {string} clanTag - The clan tag (with or without #)
 * @returns {Promise<Object>} Clan data
 */
async function getClan(clanTag) {
    try {
        const tag = formatTag(clanTag);
        const clan = await client.getClan(tag);

        return {
            tag: clan.tag,
            name: clan.name,
            type: clan.type,
            description: clan.description,
            location: clan.location,
            badgeUrls: clan.badgeUrls,
            clanLevel: clan.clanLevel,
            clanPoints: clan.clanPoints,
            clanBuilderBasePoints: clan.clanBuilderBasePoints,
            clanVersusPoints: clan.clanVersusPoints,
            requiredTrophies: clan.requiredTrophies,
            warFrequency: clan.warFrequency,
            warWinStreak: clan.warWinStreak,
            warWins: clan.warWins,
            warTies: clan.warTies,
            warLosses: clan.warLosses,
            isWarLogPublic: clan.isWarLogPublic,
            warLeague: clan.warLeague,
            members: clan.members,
            memberList: clan.memberList,
            labels: clan.labels,
            requiredVersusTrophies: clan.requiredVersusTrophies,
            requiredTownhallLevel: clan.requiredTownhallLevel
        };
    } catch (error) {
        console.error(`Error fetching clan ${clanTag}:`, error.message);
        throw error;
    }
}

/**
 * Get list of clan members
 * @param {string} clanTag - The clan tag (with or without #)
 * @returns {Promise<Array>} Array of member objects
 */
async function getClanMembers(clanTag) {
    try {
        const tag = formatTag(clanTag);
        const clan = await client.getClan(tag);

        return clan.memberList.map(member => ({
            tag: member.tag,
            name: member.name,
            role: member.role,
            expLevel: member.expLevel,
            league: member.league,
            trophies: member.trophies,
            versusTrophies: member.versusTrophies,
            clanRank: member.clanRank,
            previousClanRank: member.previousClanRank,
            donations: member.donations,
            donationsReceived: member.donationsReceived
        }));
    } catch (error) {
        console.error(`Error fetching clan members for ${clanTag}:`, error.message);
        throw error;
    }
}

/**
 * Get clan war log
 * @param {string} clanTag - The clan tag (with or without #)
 * @returns {Promise<Array>} Array of war log entries
 */
async function getClanWarLog(clanTag) {
    try {
        const tag = formatTag(clanTag);
        const warLog = await client.getClanWarLog(tag);

        return warLog.map(war => ({
            result: war.result,
            endTime: war.endTime,
            teamSize: war.teamSize,
            attacksPerMember: war.attacksPerMember,
            clan: {
                tag: war.clan.tag,
                name: war.clan.name,
                badgeUrls: war.clan.badgeUrls,
                clanLevel: war.clan.clanLevel,
                attacks: war.clan.attacks,
                stars: war.clan.stars,
                destructionPercentage: war.clan.destructionPercentage
            },
            opponent: {
                tag: war.opponent.tag,
                name: war.opponent.name,
                badgeUrls: war.opponent.badgeUrls,
                clanLevel: war.opponent.clanLevel,
                stars: war.opponent.stars,
                destructionPercentage: war.opponent.destructionPercentage
            }
        }));
    } catch (error) {
        console.error(`Error fetching war log for ${clanTag}:`, error.message);
        throw error;
    }
}

/**
 * Get current clan war
 * @param {string} clanTag - The clan tag (with or without #)
 * @returns {Promise<Object>} Current war data
 */
async function getCurrentWar(clanTag) {
    try {
        const tag = formatTag(clanTag);
        const war = await client.getClanWar(tag);

        return {
            state: war.state,
            teamSize: war.teamSize,
            attacksPerMember: war.attacksPerMember,
            preparationStartTime: war.preparationStartTime,
            startTime: war.startTime,
            endTime: war.endTime,
            clan: war.clan,
            opponent: war.opponent
        };
    } catch (error) {
        console.error(`Error fetching current war for ${clanTag}:`, error.message);
        throw error;
    }
}

/**
 * Search for clans by name
 * @param {string} name - Clan name to search for
 * @param {Object} options - Search options (minMembers, maxMembers, etc.)
 * @returns {Promise<Array>} Array of clan search results
 */
async function searchClans(name, options = {}) {
    try {
        const clans = await client.searchClans({ name, ...options });

        return clans.map(clan => ({
            tag: clan.tag,
            name: clan.name,
            type: clan.type,
            badgeUrls: clan.badgeUrls,
            clanLevel: clan.clanLevel,
            clanPoints: clan.clanPoints,
            location: clan.location,
            members: clan.members,
            requiredTrophies: clan.requiredTrophies,
            warFrequency: clan.warFrequency,
            warWinStreak: clan.warWinStreak,
            warWins: clan.warWins,
            isWarLogPublic: clan.isWarLogPublic,
            warLeague: clan.warLeague,
            labels: clan.labels
        }));
    } catch (error) {
        console.error(`Error searching clans with name ${name}:`, error.message);
        throw error;
    }
}

module.exports = {
    getClan,
    getClanMembers,
    getClanWarLog,
    getCurrentWar,
    searchClans
};
