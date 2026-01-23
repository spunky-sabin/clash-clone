/**
 * Building Image Loader Module
 * Handles mapping building names to their home-base folder structure
 * and generates the correct image path based on building level
 */

window.buildingImageLoader = {
    /**
     * Mapping of building/entity names to their folder names in home-base/buildings
     * This handles variations in naming between static_data and folder structure
     */
    buildingNameMap: {
        // Defensive Structures
        'Army Camp': 'army-camp',
        'Barracks': 'barracks',
        'Dark Barracks': 'dark-barracks',
        'Spell Factory': 'spell-factory',
        'Dark Spell Factory': 'dark-spell-factory',
        'Laboratory': 'laboratory',
        'Town Hall': 'town-hall',
        'Cannon': 'cannon',
        'Archer Tower': 'archer-tower',
        'Mortar': 'mortar',
        'Air Defense': 'air-defense',
        'Wizard Tower': 'wizard-tower',
        'Hidden Tesla': 'hidden-tesla',
        'Inferno Tower': 'inferno-tower',
        'Eagle Artillery': 'eagle-artillery',
        'Scattershot': 'scattershot',
        'Ricochet Cannon': 'ricochet-cannon',
        'Multi-Archer Tower': 'multi-archer-tower',
        'Multi Archer Tower': 'multi-archer-tower',
        'X-Bow': 'x-bow',
        'Air Sweeper': 'air-sweeper',
        'Bomb Tower': 'bomb-tower',
        'Firespitter': 'firespitter',
        'Multi-Gear Tower': 'multi-gear-tower',
        'Multi Gear Tower': 'multi-gear-tower',
        'Spell Tower': 'spell-tower',
        
        // Resource Structures
        'Gold Storage': 'gold-storage',
        'Gold Mine': 'gold-mine',
        'Elixir Storage': 'elixir-storage',
        'Elixir Collector': 'elixir-collector',
        'Dark Elixir Storage': 'dark-elixir-storage',
        'Dark Elixir Drill': 'dark-elixir-drill',
        'Sour Elixir Cauldron': 'sour-elixir-cauldron',
        'Workshop': 'workshop',
        'Clan Castle': 'clan-castle',
        'Builder\'s Hut': 'builders-hut',
        'Pet House': 'pet-house',
        'Hero Hall': 'hero-hall',
        'Crafting Station': 'crafting-station',
        'Monolith': 'monolith',
        'Helper Hut': 'helper-hut',
        
        // Traps
        'Bomb': 'bomb',
        'Spring Trap': 'spring-trap',
        'Air Bomb': 'air-bomb',
        'Giant Bomb': 'giant-bomb',
        'Giga Bomb': 'giga-bomb',
        'Seeking Air Mine': 'seeking-air-mine',
        'Skeleton Trap': 'skeleton-trap',
        'Tornado Trap': 'tornado-trap',
        
        // Wall
        'Wall': 'wall'
    },

    /**
     * Convert building name to folder name with fallback options
     * @param {string} buildingName - Name from static_data
     * @returns {string} - Folder name to use in path
     */
    getBuildingFolderName(buildingName) {
        if (!buildingName) return null;

        // Direct lookup
        if (this.buildingNameMap[buildingName]) {
            return this.buildingNameMap[buildingName];
        }

        // Try normalized version (lowercase, hyphenated)
        const normalized = buildingName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[''']/g, ''); // Remove apostrophes

        if (this.buildingNameMap[buildingName]) {
            return this.buildingNameMap[buildingName];
        }

        // Try matching keys
        for (const [key, folder] of Object.entries(this.buildingNameMap)) {
            if (key.toLowerCase() === buildingName.toLowerCase()) {
                return folder;
            }
        }

        // Fallback: return normalized name
        return normalized;
    },

    /**
     * Get the image path for a building at a specific level
     * @param {string} buildingName - Name of the building
     * @param {number} level - Current level of the building
     * @returns {string} - Full path to the image
     */
    getBuildingImagePath(buildingName, level) {
        if (!buildingName || !level || level < 1) {
            return 'images/placeholder.png';
        }

        const folderName = this.getBuildingFolderName(buildingName);
        if (!folderName) {
            return 'images/placeholder.png';
        }

        // Construct the path: home-base/buildings/{folder}/{folder}-{level}.png
        const imagePath = `home-base/buildings/${folderName}/${folderName}-${level}.png`;
        return imagePath;
    },

    /**
     * Get the image path for a trap at a specific level
     * @param {string} trapName - Name of the trap
     * @param {number} level - Current level of the trap
     * @returns {string} - Full path to the image
     */
    getTrapImagePath(trapName, level) {
        if (!trapName || !level || level < 1) {
            return 'images/placeholder.png';
        }

        const folderName = this.getBuildingFolderName(trapName);
        if (!folderName) {
            return 'images/placeholder.png';
        }

        // Construct the path: home-base/traps/{folder}/{folder}-{level}.png
        const imagePath = `home-base/traps/${folderName}/${folderName}-${level}.png`;
        return imagePath;
    },

    /**
     * Get the appropriate image path based on entity type
     * @param {Object} upgrade - Upgrade object with name, currentLevel, and type
     * @returns {string} - Full path to the image
     */
    getImagePath(upgrade) {
        if (!upgrade) return 'images/placeholder.png';

        const { name, currentLevel, type } = upgrade;

        // Handle unbuilt buildings
        if (!currentLevel || currentLevel < 1) {
            return 'images/placeholder.png';
        }

        // Route by type
        if (type === 'trap') {
            return this.getTrapImagePath(name, currentLevel);
        } else if (type === 'building') {
            return this.getBuildingImagePath(name, currentLevel);
        }

        // Default for other types
        return 'images/placeholder.png';
    },

    /**
     * Preload images to avoid loading delays
     * @param {Array} upgrades - Array of upgrade objects
     */
    preloadImages(upgrades) {
        if (!upgrades || !Array.isArray(upgrades)) return;

        const imageSet = new Set();
        
        upgrades.forEach(upgrade => {
            if (upgrade.type === 'building' || upgrade.type === 'trap') {
                // Preload current level image
                const currentImg = this.getImagePath(upgrade);
                imageSet.add(currentImg);

                // Optionally preload next level if not maxed
                if (upgrade.currentLevel < upgrade.maxLevel) {
                    const nextLevel = upgrade.currentLevel + 1;
                    const nextImg = upgrade.type === 'trap' 
                        ? this.getTrapImagePath(upgrade.name, nextLevel)
                        : this.getBuildingImagePath(upgrade.name, nextLevel);
                    imageSet.add(nextImg);
                }
            }
        });

        // Preload images
        imageSet.forEach(imagePath => {
            const img = new Image();
            img.src = imagePath;
        });
    }
};

// Export for Node.js (if used in server context)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.buildingImageLoader;
}
