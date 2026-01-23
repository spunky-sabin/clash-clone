/**
 * Clash of Clans API Client
 * 
 * This module initializes and exports the Clash of Clans API client
 * using the clashofclans.js library.
 */

const { Client } = require('clashofclans.js');
const API_CONFIG = require('./config');

// Initialize the Clash of Clans API client
const client = new Client({
    keys: [API_CONFIG.apiKey],
    // Optional: Configure request timeout
    timeout: 10000 // 10 seconds
});

/**
 * Utility function to format player/clan tags
 * Tags in the game start with #, but need to be URL-encoded as %23
 * This function handles both formats
 */
function formatTag(tag) {
    if (!tag) return '';
    // Remove # if present and add it back
    const cleanTag = tag.replace(/^#/, '');
    return `#${cleanTag}`;
}

module.exports = {
    client,
    formatTag
};
