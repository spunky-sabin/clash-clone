# Clash of Clans API Integration

This folder contains the API integration for the Clash of Clans official API using the `clashofclans.js` library.

## 📁 Folder Structure

```
api/
├── config.js           # API configuration and keys
├── client.js           # API client initialization
├── playerService.js    # Player-related API functions
├── clanService.js      # Clan-related API functions
├── example.js          # Usage examples
└── README.md           # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or newer
- npm package manager
- Clash of Clans API key from [developer.clashofclans.com](https://developer.clashofclans.com)

### Installation

The required package is already installed:
```bash
npm install clashofclans.js
```

## 📖 Usage

### Player Service

```javascript
const playerService = require('./api/playerService');

// Get full player information
const player = await playerService.getPlayer('#PLAYERTAG');

// Get player's heroes
const heroes = await playerService.getPlayerHeroes('#PLAYERTAG');

// Get player's troops
const troops = await playerService.getPlayerTroops('#PLAYERTAG');

// Get player's spells
const spells = await playerService.getPlayerSpells('#PLAYERTAG');

// Verify if player exists
const exists = await playerService.verifyPlayer('#PLAYERTAG');
```

### Clan Service

```javascript
const clanService = require('./api/clanService');

// Get full clan information
const clan = await clanService.getClan('#CLANTAG');

// Get clan members
const members = await clanService.getClanMembers('#CLANTAG');

// Get clan war log
const warLog = await clanService.getClanWarLog('#CLANTAG');

// Get current war
const currentWar = await clanService.getCurrentWar('#CLANTAG');

// Search for clans
const clans = await clanService.searchClans('ClanName', {
  minMembers: 40,
  limit: 10
});
```

## 🔑 API Key Configuration

The API key is stored in `api/config.js`. The current key is configured for:
- **IP Whitelist**: 103.191.131.139
- **Tier**: Developer/Silver
- **Scope**: Clash of Clans API

⚠️ **Security Note**: In production, consider moving the API key to environment variables instead of hardcoding it in the config file.

## 🧪 Testing the API

Run the example file to test the API integration:

```bash
node api/example.js
```

Make sure to update the example player and clan tags in `api/example.js` with real tags before running.

## 📚 Available Data

### Player Data
- Basic info (name, tag, town hall level, trophies)
- Heroes and their levels
- Troops and their levels
- Spells and their levels
- Achievements
- Clan membership
- War statistics
- League information

### Clan Data
- Basic info (name, tag, description, level)
- Member list with roles and stats
- War statistics (wins, losses, streak)
- War log history
- Current war status
- Location and badges

## 🔗 Useful Links

- [Official API Documentation](https://developer.clashofclans.com)
- [clashofclans.js Documentation](https://clashofclans.js.org)
- [API Endpoints Reference](https://developer.clashofclans.com/#/documentation)

## ⚠️ Important Notes

1. **Player/Clan Tags**: Tags start with `#` in the game. The library handles URL encoding automatically.
2. **Rate Limits**: The Silver tier has rate limits. Be mindful when making bulk requests.
3. **IP Whitelisting**: Your API key is tied to specific IP addresses. Update the key if your server IP changes.
4. **Error Handling**: All service functions include try-catch blocks. Handle errors appropriately in your application.

## 🔄 Integration with Existing Project

To integrate this API with your existing Clash Ninja tracker:

1. Use `playerService.getPlayer()` to fetch live player data
2. Extract hero, troop, and spell data from the API response
3. Use the data to populate your progression calculations
4. Cache API responses to avoid hitting rate limits
5. Implement error handling for invalid tags or API downtime
