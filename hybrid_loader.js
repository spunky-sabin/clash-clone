// Hybrid API Data Loader for Index Page
// Auto-fetch and display player data using the hybrid API system

async function loadHybridData() {
    try {
        console.log('🔄 Fetching hybrid API data...');

        // First load the user's JSON to get the player tag
        const jsonResponse = await fetch('user_main.json');
        const jsonData = await jsonResponse.json();
        const playerTag = jsonData.tag;

        if (!playerTag) {
            console.error('No player tag found in user_main.json');
            return null;
        }

        // Call the hybrid data endpoint
        const apiResponse = await fetch('/api/player/hybrid-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userData: jsonData })
        });

        const hybridResult = await apiResponse.json();

        if (!hybridResult.success) {
            console.error('Hybrid API failed:', hybridResult.error);
            // Fall back to JSON data
            return jsonData;
        }

        console.log('✅ Hybrid data loaded successfully!');
        console.log(`Data sources: Heroes=${hybridResult.metadata.sources.heroes}, Troops=${hybridResult.metadata.sources.troops}, Spells=${hybridResult.metadata.sources.spells}`);

        // Return the merged data
        return hybridResult.data;

    } catch (error) {
        console.error('Error loading hybrid data:', error);
        // Fall back to loading user_main.json directly
        try {
            const fallbackResponse = await fetch('user_main.json');
            return await fallbackResponse.json();
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            return null;
        }
    }
}

// Export for use in script.js
window.loadHybridData = loadHybridData;
