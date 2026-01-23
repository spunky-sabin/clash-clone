/**
 * Example Usage of Clash of Clans API Services
 * 
 * This file demonstrates how to use the API services to fetch
 * player and clan data from the Clash of Clans API.
 * 
 * Run this file with: node api/example.js
 */

const playerService = require('./playerService');
const clanService = require('./clanService');

// Example player and clan tags
const EXAMPLE_PLAYER_TAG = '#2PP'; // Replace with a real player tag
const EXAMPLE_CLAN_TAG = '#2YUL2PRYJ'; // Replace with a real clan tag

/**
 * Example: Fetch player data
 */
async function exampleGetPlayer() {
    console.log('\n=== Fetching Player Data ===');
    try {
        const player = await playerService.getPlayer(EXAMPLE_PLAYER_TAG);
        console.log(`Player Name: ${player.name}`);
        console.log(`Town Hall Level: ${player.townHallLevel}`);
        console.log(`Trophies: ${player.trophies}`);
        console.log(`Experience Level: ${player.expLevel}`);

        if (player.clan) {
            console.log(`Clan: ${player.clan.name} (${player.clan.tag})`);
        }
    } catch (error) {
        console.error('Failed to fetch player:', error.message);
    }
}

/**
 * Example: Fetch player heroes
 */
async function exampleGetPlayerHeroes() {
    console.log('\n=== Fetching Player Heroes ===');
    try {
        const heroes = await playerService.getPlayerHeroes(EXAMPLE_PLAYER_TAG);
        heroes.forEach(hero => {
            console.log(`${hero.name}: Level ${hero.level}/${hero.maxLevel}`);
        });
    } catch (error) {
        console.error('Failed to fetch heroes:', error.message);
    }
}

/**
 * Example: Fetch clan data
 */
async function exampleGetClan() {
    console.log('\n=== Fetching Clan Data ===');
    try {
        const clan = await clanService.getClan(EXAMPLE_CLAN_TAG);
        console.log(`Clan Name: ${clan.name}`);
        console.log(`Clan Level: ${clan.clanLevel}`);
        console.log(`Members: ${clan.members}/50`);
        console.log(`War Wins: ${clan.warWins}`);
        console.log(`War Win Streak: ${clan.warWinStreak}`);
    } catch (error) {
        console.error('Failed to fetch clan:', error.message);
    }
}

/**
 * Example: Fetch clan members
 */
async function exampleGetClanMembers() {
    console.log('\n=== Fetching Clan Members ===');
    try {
        const members = await clanService.getClanMembers(EXAMPLE_CLAN_TAG);
        console.log(`Total Members: ${members.length}`);

        // Show top 5 members by trophies
        const topMembers = members
            .sort((a, b) => b.trophies - a.trophies)
            .slice(0, 5);

        console.log('\nTop 5 Members:');
        topMembers.forEach((member, index) => {
            console.log(`${index + 1}. ${member.name} - ${member.trophies} trophies (${member.role})`);
        });
    } catch (error) {
        console.error('Failed to fetch clan members:', error.message);
    }
}

/**
 * Example: Search for clans
 */
async function exampleSearchClans() {
    console.log('\n=== Searching for Clans ===');
    try {
        const clans = await clanService.searchClans('Reddit', {
            minMembers: 40,
            limit: 5
        });

        console.log(`Found ${clans.length} clans:`);
        clans.forEach((clan, index) => {
            console.log(`${index + 1}. ${clan.name} (${clan.tag}) - Level ${clan.clanLevel}, ${clan.members} members`);
        });
    } catch (error) {
        console.error('Failed to search clans:', error.message);
    }
}

/**
 * Example: Verify player exists
 */
async function exampleVerifyPlayer() {
    console.log('\n=== Verifying Player ===');
    try {
        const exists = await playerService.verifyPlayer(EXAMPLE_PLAYER_TAG);
        console.log(`Player ${EXAMPLE_PLAYER_TAG} exists: ${exists}`);
    } catch (error) {
        console.error('Failed to verify player:', error.message);
    }
}

/**
 * Run all examples
 */
async function runAllExamples() {
    console.log('='.repeat(50));
    console.log('Clash of Clans API Examples');
    console.log('='.repeat(50));

    await exampleVerifyPlayer();
    await exampleGetPlayer();
    await exampleGetPlayerHeroes();
    await exampleGetClan();
    await exampleGetClanMembers();
    await exampleSearchClans();

    console.log('\n' + '='.repeat(50));
    console.log('All examples completed!');
    console.log('='.repeat(50));
}

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples().catch(error => {
        console.error('Error running examples:', error);
        process.exit(1);
    });
}

module.exports = {
    exampleGetPlayer,
    exampleGetPlayerHeroes,
    exampleGetClan,
    exampleGetClanMembers,
    exampleSearchClans,
    exampleVerifyPlayer
};
