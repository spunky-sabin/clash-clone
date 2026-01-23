/**
 * API Integration Layer
 * 
 * This module handles the integration between the UI and the Clash of Clans API,
 * including caching to respect rate limits and avoid unnecessary API calls.
 */

const playerService = require('./playerService');

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const playerCache = new Map();

/**
 * Get player tag from JSON data
 * @param {Object} userData - User data from JSON file
 * @returns {string} Player tag
 */
function getPlayerTagFromData(userData) {
    return userData.tag || userData.player_tag || userData.playerTag || '';
}

/**
 * Get cached player data if available and not expired
 * @param {string} playerTag - Player tag
 * @returns {Object|null} Cached data or null if expired/not found
 */
function getCachedPlayer(playerTag) {
    const cached = playerCache.get(playerTag);

    if (!cached) {
        return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > CACHE_DURATION) {
        // Cache expired
        playerCache.delete(playerTag);
        return null;
    }

    return {
        data: cached.data,
        cachedAt: cached.timestamp,
        expiresIn: CACHE_DURATION - age
    };
}

/**
 * Set player data in cache
 * @param {string} playerTag - Player tag
 * @param {Object} data - Player data to cache
 */
function setCachedPlayer(playerTag, data) {
    playerCache.set(playerTag, {
        data: data,
        timestamp: Date.now()
    });
}

/**
 * Fetch player data with caching
 * @param {string} playerTag - Player tag
 * @param {boolean} forceRefresh - Force API call even if cached
 * @returns {Promise<Object>} Player data with cache info
 */
async function fetchPlayerData(playerTag, forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
        const cached = getCachedPlayer(playerTag);
        if (cached) {
            return {
                success: true,
                fromCache: true,
                player: cached.data,
                cachedAt: cached.cachedAt,
                expiresIn: cached.expiresIn
            };
        }
    }

    // Fetch from API
    try {
        const player = await playerService.getPlayer(playerTag);

        // Cache the result
        setCachedPlayer(playerTag, player);

        return {
            success: true,
            fromCache: false,
            player: player,
            fetchedAt: Date.now()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            playerTag: playerTag
        };
    }
}

/**
 * Get player display info (name and tag) from JSON data and API
 * @param {Object} userData - User data from JSON file
 * @returns {Promise<Object>} Player display information
 */
async function getPlayerDisplayInfo(userData) {
    const playerTag = getPlayerTagFromData(userData);

    if (!playerTag) {
        return {
            success: false,
            error: 'No player tag found in data'
        };
    }

    const result = await fetchPlayerData(playerTag, false);

    if (!result.success) {
        return result;
    }

    return {
        success: true,
        tag: playerTag,
        name: result.player.name,
        townHallLevel: result.player.townHallLevel,
        trophies: result.player.trophies,
        fromCache: result.fromCache,
        cachedAt: result.cachedAt,
        expiresIn: result.expiresIn,
        fetchedAt: result.fetchedAt
    };
}

/**
 * Refresh player data from API (force refresh)
 * @param {string} playerTag - Player tag
 * @returns {Promise<Object>} Updated player data
 */
async function refreshPlayerData(playerTag) {
    return await fetchPlayerData(playerTag, true);
}

/**
 * Clear cache for a specific player or all players
 * @param {string} playerTag - Player tag (optional, clears all if not provided)
 */
function clearCache(playerTag = null) {
    if (playerTag) {
        playerCache.delete(playerTag);
    } else {
        playerCache.clear();
    }
}

/**
 * Get time remaining until cache expires for a player
 * @param {string} playerTag - Player tag
 * @returns {number} Milliseconds until cache expires, or 0 if not cached
 */
function getCacheTimeRemaining(playerTag) {
    const cached = getCachedPlayer(playerTag);
    return cached ? cached.expiresIn : 0;
}

module.exports = {
    getPlayerTagFromData,
    getPlayerDisplayInfo,
    fetchPlayerData,
    refreshPlayerData,
    clearCache,
    getCacheTimeRemaining,
    CACHE_DURATION
};
