/**
 * Simple Express Server for Clash of Clans API Integration
 * 
 * This server provides API endpoints for the frontend to fetch player data
 * from the Clash of Clans API without exposing the API key to the client.
 * 
 * Run with: node api/server.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiIntegration = require('./apiIntegration');
const playerService = require('./playerService');
const clanService = require('./clanService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the project root
app.use(express.static(path.join(__dirname, '..')));

/**
 * GET /api/player/:tag
 * Fetch player data by tag
 */
app.get('/api/player/:tag', async (req, res) => {
    try {
        const playerTag = decodeURIComponent(req.params.tag);
        const forceRefresh = req.query.force === 'true';

        console.log(`📡 Fetching player data for ${playerTag} (force: ${forceRefresh})`);

        const result = await apiIntegration.fetchPlayerData(playerTag, forceRefresh);

        if (result.success) {
            res.json({
                success: true,
                player: result.player,
                fromCache: result.fromCache,
                cachedAt: result.cachedAt,
                expiresIn: result.expiresIn,
                fetchedAt: result.fetchedAt
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error,
                playerTag: playerTag
            });
        }
    } catch (error) {
        console.error('Error in /api/player:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/player/display-info
 * Get player display info from JSON data
 */
app.post('/api/player/display-info', async (req, res) => {
    try {
        const userData = req.body;

        if (!userData) {
            return res.status(400).json({
                success: false,
                error: 'No user data provided'
            });
        }

        console.log('📡 Getting player display info from JSON data');

        const result = await apiIntegration.getPlayerDisplayInfo(userData);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/player/display-info:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/player/hybrid-data
 * Merge API data with JSON user data
 * Returns hybrid data with API (heroes, troops, spells) + JSON (buildings, walls, etc.)
 */
const { mergeAPIData } = require('./hybridDataMerger');

app.post('/api/player/hybrid-data', async (req, res) => {
    try {
        const userData = req.body;

        if (!userData) {
            return res.status(400).json({
                success: false,
                error: 'No user data provided'
            });
        }

        console.log('📡 Merging API data with JSON user data...');

        const result = await mergeAPIData(userData);

        console.log(`✅ Merged successfully. Sources: Heroes=${result.metadata.sources.heroes}, Troops=${result.metadata.sources.troops}, Spells=${result.metadata.sources.spells}`);

        res.json({
            success: true,
            data: result.data,
            metadata: result.metadata
        });
    } catch (error) {
        console.error('Error in /api/player/hybrid-data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/clan/:tag
 * Fetch clan data by tag
 */
app.get('/api/clan/:tag', async (req, res) => {
    try {
        const clanTag = decodeURIComponent(req.params.tag);

        console.log(`📡 Fetching clan data for ${clanTag}`);

        const clan = await clanService.getClan(clanTag);
        res.json({
            success: true,
            clan: clan
        });
    } catch (error) {
        console.error('Error in /api/clan:', error);
        res.status(error.status === 404 ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/clan/:tag/members
 * Fetch clan members
 */
app.get('/api/clan/:tag/members', async (req, res) => {
    try {
        const clanTag = decodeURIComponent(req.params.tag);

        console.log(`📡 Fetching clan members for ${clanTag}`);

        const members = await clanService.getClanMembers(clanTag);
        res.json({
            success: true,
            members: members,
            count: members.length
        });
    } catch (error) {
        console.error('Error in /api/clan/members:', error);
        res.status(error.status === 404 ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/cache/status/:tag
 * Get cache status for a player tag
 */
app.get('/api/cache/status/:tag', (req, res) => {
    try {
        const playerTag = decodeURIComponent(req.params.tag);
        const timeRemaining = apiIntegration.getCacheTimeRemaining(playerTag);

        res.json({
            success: true,
            playerTag: playerTag,
            isCached: timeRemaining > 0,
            expiresIn: timeRemaining,
            expiresInSeconds: Math.floor(timeRemaining / 1000)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/cache/:tag
 * Clear cache for a player tag
 */
app.delete('/api/cache/:tag', (req, res) => {
    try {
        const playerTag = decodeURIComponent(req.params.tag);
        apiIntegration.clearCache(playerTag);

        res.json({
            success: true,
            message: `Cache cleared for ${playerTag}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/cache
 * Clear all cache
 */
app.delete('/api/cache', (req, res) => {
    try {
        apiIntegration.clearCache();

        res.json({
            success: true,
            message: 'All cache cleared'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        cacheDuration: apiIntegration.CACHE_DURATION
    });
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 Clash of Clans API Server Started');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`📄 Static files served from: ${path.join(__dirname, '..')}`);
    console.log(`⏱️  Cache duration: ${apiIntegration.CACHE_DURATION / 1000 / 60} minutes`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET    /api/player/:tag`);
    console.log(`  POST   /api/player/display-info`);
    console.log(`  POST   /api/player/hybrid-data`);
    console.log(`  GET    /api/clan/:tag`);
    console.log(`  GET    /api/clan/:tag/members`);
    console.log(`  GET    /api/cache/status/:tag`);
    console.log(`  DELETE /api/cache/:tag`);
    console.log(`  DELETE /api/cache`);
    console.log(`  GET    /api/health`);
    console.log('='.repeat(60));
});

module.exports = app;
