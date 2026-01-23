const fs = require('fs');

// Mock window for browser-targeted script
global.window = {};

const analyzeUpgradesFile = require('./calculation/analyze_upgrades.js');
const analyzeUpgrades = window.analyzeUpgrades;

// Load Static Data
const staticData = JSON.parse(fs.readFileSync('static_data.json', 'utf8'));

// Find Dragon Rider
const dragonRider = staticData.troops.find(t => t.name === "Dragon Rider");

if (!dragonRider) {
    console.error("Dragon Rider not found in static data!");
    process.exit(1);
}

console.log("Dragon Rider Level 5 object:", dragonRider.levels.find(l => l.level === 5));
console.log("Dragon Rider Level 6 object:", dragonRider.levels.find(l => l.level === 6));


// Mock User Data: Level 5
const userData = {
    troops: [{ data: dragonRider._id, lvl: 5 }]
};

// Town Hall 16 just to be safe
const userTH = 16;

// Run Analyze Upgrades
console.log("--- Running analyzeUpgrades for Dragon Rider (Level 5 -> 6) ---");

// Helper to find result
const results = analyzeUpgrades(userData, staticData, userTH);

// Dragon Rider is a troop, so it should be in results
// Note: analyzeUpgrades returns array of upgrade objects. 
// Iterate and find the one that matches Dragon Rider ID or name

const drUpgrade = results.find(u => u.name === "Dragon Rider");

if (drUpgrade) {
    console.log("Result Found:");

    console.log(`Name: ${drUpgrade.name}`);
    console.log(`Current Level: ${drUpgrade.currentLevel}`);
    console.log(`Costs - Gold: ${drUpgrade.costGold}, Elixir: ${drUpgrade.costElixir}, Dark: ${drUpgrade.costDark}`);
    console.log(`Time: ${drUpgrade.time}`);

    // Check missingLevels array if present
    if (drUpgrade.missingLevels) {
        console.log("Missing Levels:");
        console.log(JSON.stringify(drUpgrade.missingLevels, null, 2));
    }

} else {
    console.log("Dragon Rider Upgrade Object NOT found in results.");
}
