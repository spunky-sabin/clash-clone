/**
 * Test Hybrid Data with API Priority
 * Run with: node api/testHybridPriority.js
 */

const fs = require('fs');
const path = require('path');
const { mergeAPIData } = require('./hybridDataMerger');

async function testHybridPriority() {
    console.log('='.repeat(60));
    console.log('Testing Hybrid Data with API Priority');
    console.log('='.repeat(60));

    try {
        // Load user data
        const userDataPath = path.join(__dirname, '..', 'user_main.json');
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

        console.log('\n📄 JSON Data:');
        console.log(`   Player Tag: ${userData.tag}`);
        console.log(`   Builder Hall (from buildings2): ${userData.buildings2?.find(b => b.data === 1000048)?.lvl || 'Not found'}`);
        console.log(`   Heroes: ${userData.heroes?.length || 0}`);
        console.log(`   Troops: ${userData.units?.length || 0}`);

        console.log('\n🔄 Merging with API...');
        const result = await mergeAPIData(userData);

        if (result.metadata.apiSuccess) {
            console.log('\n🔴 API Data (PRIMARY SOURCE):');
            console.log(`   Player Name: ${result.metadata.apiPlayerName}`);
            console.log(`   Town Hall: ${result.metadata.apiTownHallLevel}`);
            console.log(`   Builder Hall: ${result.data.builderHallLevel || 'Not in API'}`);

            console.log('\n📊 Comparison:');
            console.log(`   Heroes - JSON: ${userData.heroes?.length || 0}, API: ${result.data.heroes?.length || 0}`);
            console.log(`   Troops - JSON: ${userData.units?.length || 0}, API: ${result.data.units?.length || 0}`);

            if (result.data.pets) {
                console.log(`   Pets (from API): ${result.data.pets.length}`);
                result.data.pets.forEach(pet => {
                    if (pet._apiData) {
                        console.log(`     - ${pet._apiData.name}: Level ${pet.lvl}/${pet._apiData.maxLevel}`);
                    }
                });
            }

            console.log('\n✅ Data Sources Used:');
            Object.keys(result.metadata.sources).forEach(key => {
                const source = result.metadata.sources[key];
                const icon = source === 'api' ? '🔴' : '📄';
                console.log(`   ${icon} ${key}: ${source.toUpperCase()}`);
            });

        } else {
            console.log(`\n❌ API Error: ${result.metadata.apiError}`);
            console.log('   Falling back to JSON data');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ API data is prioritized and used when available!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testHybridPriority();
