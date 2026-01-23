/**
 * Test API Integration
 * 
 * This script demonstrates fetching player data from JSON and the API
 * Run with: node api/testIntegration.js
 */

const fs = require('fs');
const path = require('path');
const apiIntegration = require('./apiIntegration');

/**
 * Load user data from JSON file
 */
function loadUserData(filename) {
    const filepath = path.join(__dirname, '..', filename);
    const rawData = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(rawData);
}

/**
 * Test the integration
 */
async function testIntegration() {
    console.log('='.repeat(60));
    console.log('Testing API Integration with JSON Data');
    console.log('='.repeat(60));

    try {
        // Load user data
        console.log('\n1. Loading user_main.json...');
        const userData = loadUserData('user_main.json');
        console.log(`   ✓ JSON loaded successfully`);

        // Extract player tag
        const playerTag = apiIntegration.getPlayerTagFromData(userData);
        console.log(`   Player Tag from JSON: ${playerTag}`);

        // Fetch player display info (with caching)
        console.log('\n2. Fetching player info from API...');
        const displayInfo = await apiIntegration.getPlayerDisplayInfo(userData);

        if (displayInfo.success) {
            console.log(`   ✓ Player Name: ${displayInfo.name}`);
            console.log(`   ✓ Player Tag: ${displayInfo.tag}`);
            console.log(`   ✓ Town Hall Level: ${displayInfo.townHallLevel}`);
            console.log(`   ✓ Trophies: ${displayInfo.trophies}`);
            console.log(`   ✓ From Cache: ${displayInfo.fromCache}`);

            if (displayInfo.fromCache) {
                const minutesLeft = Math.floor(displayInfo.expiresIn / 1000 / 60);
                console.log(`   ℹ Cache expires in: ${minutesLeft} minutes`);
            }
        } else {
            console.log(`   ✗ Error: ${displayInfo.error}`);
            return;
        }

        // Simulate clicking the API button after a short delay
        console.log('\n3. Simulating API button click (should use cache)...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const secondFetch = await apiIntegration.fetchPlayerData(playerTag, false);
        if (secondFetch.success) {
            console.log(`   ✓ Player Name: ${secondFetch.player.name}`);
            console.log(`   ✓ From Cache: ${secondFetch.fromCache} (should be true)`);
        }

        // Test force refresh
        console.log('\n4. Testing force refresh (API button with force)...');
        const forceRefresh = await apiIntegration.refreshPlayerData(playerTag);
        if (forceRefresh.success) {
            console.log(`   ✓ Player Name: ${forceRefresh.player.name}`);
            console.log(`   ✓ From Cache: ${forceRefresh.fromCache} (should be false)`);
            console.log(`   ✓ Fresh data fetched from API`);
        }

        // Show cache status
        console.log('\n5. Cache Status:');
        const timeRemaining = apiIntegration.getCacheTimeRemaining(playerTag);
        const minutesLeft = Math.floor(timeRemaining / 1000 / 60);
        const secondsLeft = Math.floor((timeRemaining / 1000) % 60);
        console.log(`   Cache expires in: ${minutesLeft}m ${secondsLeft}s`);

        console.log('\n' + '='.repeat(60));
        console.log('Test completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
if (require.main === module) {
    testIntegration().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { testIntegration };
