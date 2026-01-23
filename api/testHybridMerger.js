/**
 * Test Hybrid Data Merger
 * 
 * Tests merging API data with JSON user data
 * Run with: node api/testHybridMerger.js
 */

const fs = require('fs');
const path = require('path');
const { mergeAPIData } = require('./hybridDataMerger');

async function testHybridMerger() {
    console.log('='.repeat(60));
    console.log('Testing Hybrid Data Merger');
    console.log('='.repeat(60));

    try {
        // Load user_main.json
        console.log('\n1. Loading user_main.json...');
        const userDataPath = path.join(__dirname, '..', 'user_main.json');
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        console.log(`   ✓ Loaded player tag: ${userData.tag}`);

        // Merge with API data
        console.log('\n2. Fetching and merging API data...');
        const result = await mergeAPIData(userData);

        console.log(`\n3. Merge Results:`);
        console.log(`   API Success: ${result.metadata.apiSuccess}`);

        if (result.metadata.apiSuccess) {
            console.log(`   Player Name (from API): ${result.metadata.apiPlayerName}`);
            console.log(`   Town Hall (from API): ${result.metadata.apiTownHallLevel}`);
            console.log('');
            console.log('   Data Sources:');
            Object.keys(result.metadata.sources).forEach(key => {
                const source = result.metadata.sources[key];
                const icon = source === 'api' ? '🔴' : '📄';
                console.log(`     ${icon} ${key}: ${source.toUpperCase()}`);
            });

            // Show hero comparison
            console.log('\n4. Heroes Comparison:');
            console.log('   JSON Heroes:', userData.heroes ? userData.heroes.length : 0);
            console.log('   Merged Heroes:', result.data.heroes ? result.data.heroes.length : 0);

            if (result.data.heroes && result.data.heroes.length > 0) {
                console.log('\n   Hero Details (from API):');
                result.data.heroes.forEach(hero => {
                    if (hero._apiData) {
                        console.log(`     - ${hero._apiData.name}: Level ${hero.lvl}/${hero._apiData.maxLevel}`);
                    }
                });
            }

            // Show troop comparison
            console.log('\n5. Troops Comparison:');
            console.log(`   JSON Units: ${userData.units ? userData.units.length : 0}`);
            console.log(`   Merged Units: ${result.data.units ? result.data.units.length : 0}`);
            console.log(`   Merged Siege: ${result.data.siege_machines ? result.data.siege_machines.length : 0}`);

            // Show spell comparison
            console.log('\n6. Spells Comparison:');
            console.log(`   JSON Spells: ${userData.spells ? userData.spells.length : 0}`);
            console.log(`   Merged Spells: ${result.data.spells ? result.data.spells.length : 0}`);

        } else {
            console.log(`   ✗ API Error: ${result.metadata.apiError}`);
            console.log('   Using JSON data only');
        }

        console.log('\n' + '='.repeat(60));
        console.log('Test completed!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
if (require.main === module) {
    testHybridMerger().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { testHybridMerger };
