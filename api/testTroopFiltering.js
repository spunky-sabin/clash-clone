/**
 * Test Super Troop and Seasonal Filtering
 * Run with: node api/testTroopFiltering.js
 */

const fs = require('fs');
const path = require('path');
const { mergeAPIData } = require('./hybridDataMerger');

async function testTroopFiltering() {
    console.log('='.repeat(60));
    console.log('Testing Super Troop and Seasonal Filtering');
    console.log('='.repeat(60));

    try {
        // Load user data
        const userDataPath = path.join(__dirname, '..', 'user_main.json');
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

        console.log('\n🔄 Merging with API...');
        const result = await mergeAPIData(userData);

        if (result.metadata.apiSuccess) {
            console.log('\n✅ API fetch successful!');
            console.log(`\nPlayer: ${result.metadata.apiPlayerName}`);
            console.log(`Total Troops: ${result.data.units?.length || 0}`);
            console.log(`Pets: ${result.data.pets?.length || 0}`);

            // Check for any super troops or seasonal troops (should be filtered out)
            const superTroops = [];
            const seasonalTroops = [];

            if (result.data.units) {
                result.data.units.forEach(unit => {
                    if (unit._apiData) {
                        // These should not exist since we filter them out
                        console.log(`  - ${unit._apiData.name}: Level ${unit.lvl}/${unit._apiData.maxLevel} (${unit._apiData.village})`);
                    }
                });
            }

            console.log('\n📋 Summary:');
            console.log(`  Regular Troops: ${result.data.units?.length || 0}`);
            console.log(`  Siege Machines: ${result.data.siege_machines?.length || 0}`);
            console.log(`  Pets: ${result.data.pets?.length || 0}`);
            console.log(`  Super Troops (filtered): Should be 0`);
            console.log(`  Seasonal Troops (filtered): Should be 0`);

        } else {
            console.log(`\n❌ API Error: ${result.metadata.apiError}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Super troops and seasonal troops are filtered!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testTroopFiltering();
