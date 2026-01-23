/**
 * Test hybrid data via server endpoint
 * Run with: node api/testHybridEndpoint.js
 */

const fs = require('fs');
const path = require('path');

async function testHybridEndpoint() {
    console.log('='.repeat(60));
    console.log('Testing Hybrid Data Server Endpoint');
    console.log('='.repeat(60));

    try {
        // Load user data
        const userDataPath = path.join(__dirname, '..', 'user_main.json');
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

        console.log('\n1. Sending POST request to /api/player/hybrid-data...');

        const response = await fetch('http://localhost:3000/api/player/hybrid-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('\n✅ Hybrid data received successfully!');
            console.log(`\nPlayer: ${result.metadata.apiPlayerName} (TH${result.metadata.apiTownHallLevel})`);
            console.log('\nData Sources:');
            Object.keys(result.metadata.sources).forEach(key => {
                const source = result.metadata.sources[key];
                const icon = source === 'api' ? '🔴' : '📄';
                console.log(`  ${icon} ${key}: ${source.toUpperCase()}`);
            });

            console.log(`\nHeroes: ${result.data.heroes ? result.data.heroes.length : 0}`);
            console.log(`Troops: ${result.data.units ? result.data.units.length : 0}`);
            console.log(`Spells: ${result.data.spells ? result.data.spells.length : 0}`);
            console.log(`Buildings: ${result.data.buildings ? result.data.buildings.length : 0} (from JSON)`);

        } else {
            console.log(`\n❌ Error: ${result.error}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('Test completed!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testHybridEndpoint();
