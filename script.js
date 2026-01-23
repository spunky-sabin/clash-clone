console.log('Clash Ninja Script loaded');

window.openVillageShareModal = function (tag) {
    alert('Share feature not implemented in this local version.');
};

document.addEventListener('DOMContentLoaded', () => {
    let staticData = null;
    let userData = null;
    let originalUserData = null; // Store original unfiltered data
    let currentVillage = 'home'; // Track current village
    let currentCategory = 'defenses';
    let allUpgrades = [];
    let userTH = 0; // Store current Town Hall level for access by render functions

    // DOM Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const statsBtn = document.getElementById('statsBtn');
    const debugBtn = document.getElementById('debugBtn');
    const villageSwitchBtn = document.getElementById('villageSwitchBtn');
    const uploadModal = document.getElementById('uploadModal');
    const modalClose = document.getElementById('modalClose');
    const parseBtn = document.getElementById('parseBtn');
    const jsonInput = document.getElementById('jsonInput');
    const categoryTabs = document.querySelectorAll('.nav-tab');
    const upgradeTablesContainer = document.getElementById('upgradeTablesContainer');
    const searchBar = document.getElementById('searchBar');
    const hideMaxedCheckbox = document.getElementById('hideMaxed');
    const hideSuperchargesCheckbox = document.getElementById('hideSupercharges');

    if (hideSuperchargesCheckbox) {
        hideSuperchargesCheckbox.addEventListener('change', () => {
            renderCurrentCategory();
        });
    }

    // Load Static Data
    fetch('static_data.json')
        .then(response => response.json())
        .then(data => {
            staticData = data;
            console.log('Static Data loaded successfully');

            // Automatically load hybrid API data after static data is ready
            if (window.loadHybridData) {
                window.loadHybridData().then(hybridData => {
                    if (hybridData) {
                        originalUserData = hybridData; // Store for village switching
                        analyzeVillage(hybridData);
                        console.log('🎉 Village data loaded and analyzed automatically!');
                    }
                }).catch(err => {
                    console.error('Could not auto-load hybrid data:', err);
                });
            }
        })
        .catch(err => console.error('FATAL: Could not load static_data.json', err));

    // Landing Page Upload Button
    const landingUploadBtn = document.getElementById('landingUploadBtn');
    if (landingUploadBtn) {
        landingUploadBtn.addEventListener('click', () => {
            // Open modal
            if (uploadModal) uploadModal.classList.add('active');
        });
    }

    // API Button logic
    const apiBtn = document.getElementById('apiUpdateBtn');
    if (apiBtn) {
        apiBtn.addEventListener('click', () => {
            alert("Sending API Request to update progress...");
            console.log("Mock API Request sent.");
        });
    }

    // Modal Controls
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (uploadModal) uploadModal.classList.add('active');
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (uploadModal) uploadModal.classList.remove('active');
        });
    }

    if (uploadModal) {
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                uploadModal.classList.remove('active');
            }
        });
    }

    // Village Switcher
    if (villageSwitchBtn) {
        villageSwitchBtn.addEventListener('click', () => {
            // Toggle village
            currentVillage = currentVillage === 'home' ? 'builderBase' : 'home';

            // Update button text and style
            if (currentVillage === 'builderBase') {
                villageSwitchBtn.textContent = 'Switch to Home Village';
                villageSwitchBtn.style.background = 'var(--accent-orange)';
            } else {
                villageSwitchBtn.textContent = 'Switch to Builder Base';
                villageSwitchBtn.style.background = 'var(--accent-blue)';
            }

            // Re-analyze with current village data
            if (originalUserData && staticData) {
                analyzeVillage(originalUserData);
            }
        });
    }

    // Stats Button
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            if (userData && staticData) {
                const th = detectUserTownHall(userData);
                window.renderStats(userData, staticData, th);
            } else {
                alert('Please upload/load your village data first.');
            }
        });
    }

    // Debug Button
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            if (userData && staticData) {
                const th = detectUserTownHall(userData);
                window.renderDebug(userData, staticData, th);
            } else {
                alert('Please upload/load your village data first.');
            }
        });
    }

    // Parse Button
    if (parseBtn) {
        parseBtn.addEventListener('click', () => {
            if (!staticData) {
                alert('Still loading game data...');
                return;
            }

            const inputStr = jsonInput.value.trim();
            if (!inputStr) {
                alert('Please paste your village JSON first.');
                return;
            }

            try {
                let parsed = JSON.parse(inputStr);
                // Simulate API Fetch for Name
                fetchPlayerName(parsed.tag).then(name => {
                    parsed.name = name;
                    userData = parsed;
                    analyzeVillage(userData);
                    uploadModal.classList.remove('active');
                });
            } catch (e) {
                console.error(e);
                alert('JSON Error: ' + e.message);
            }
        });
    }



    // Mock API Function
    // Real API Function
    async function fetchPlayerName(tag) {
        if (!tag) return 'Unknown Chief';

        try {
            // Call the local Node.js backend
            const response = await fetch(`/api/player/${encodeURIComponent(tag)}`);
            const data = await response.json();

            if (data.success && data.player) {
                return data.player.name;
            } else {
                console.warn('API Error:', data.error);
                return 'Clash Chief';
            }
        } catch (error) {
            console.error('Network Error fetching player name:', error);
            // This usually happens if the Node server isn't running or 
            // if we are running via Python server (port 8000) but API is on port 3000 
            // (though relative path implies same origin).
            return 'Clash Chief';
        }
    }

    // Category Tab Switching
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            renderCurrentCategory();

            // Update UI Heading
            const titleEl = document.getElementById('currentSectionTitle');
            const tabName = tab.querySelector('.tab-name').textContent;
            if (titleEl) titleEl.innerHTML = `${tabName} <i class="fas fa-cog"></i>`;
        });
    });

    // Search and Filter
    if (searchBar) searchBar.addEventListener('input', renderCurrentCategory);
    /**
     * Hide or show tabs and progress rows based on Town Hall level constraints
     * @param {number} thLevel 
     */
    function updateFeatureVisibility(thLevel) {
        // Unlock Levels
        const UNLOCKS = {
            heroes: 7,
            pets: 14,
            supercharge: 16,
            equipment: 8, // Blacksmith unlocks at TH8
            siege: 12, // Workshop unlocks at TH12

            crafted: 6 // Capital Peak / Forge generally available later
        };

        // Helper to toggle visibility
        const toggle = (selector, condition) => {
            const els = document.querySelectorAll(selector);
            els.forEach(el => {
                // If it's a tab, we use inline-flex or none
                if (el.classList.contains('nav-tab')) {
                    el.style.display = condition ? 'inline-flex' : 'none';
                }
                // If it's a progress row 
                else {
                    // Check if it's a table row or div
                    el.style.display = condition ? (el.tagName === 'TR' ? 'table-row' : 'flex') : 'none';
                }
            });
        };

        // 1. Navigation Tabs
        toggle('.nav-tab[data-category="heroes"]', thLevel >= UNLOCKS.heroes);
        toggle('.nav-tab[data-category="pets"]', thLevel >= UNLOCKS.pets);
        toggle('.nav-tab[data-category="equipment"]', thLevel >= UNLOCKS.equipment);
        toggle('.nav-tab[data-category="sieges"]', thLevel >= UNLOCKS.siege);

        // 2. Progress Rows (Dashboard)
        const toggleId = (id, condition) => {
            const el = document.getElementById(id);
            if (el) el.style.display = condition ? 'flex' : 'none';
        };

        toggleId('row-heroes', thLevel >= UNLOCKS.heroes);
        toggleId('row-pets', thLevel >= UNLOCKS.pets);
        toggleId('row-equipment', thLevel >= UNLOCKS.equipment);

        // Supercharges only relevant at TH16
        toggleId('row-supercharge', thLevel >= UNLOCKS.supercharge);
    }

    function detectUserTownHall(userData, village = 'home') {
        if (village === 'home') {
            if (!userData.buildings) return 0;
            const thBuilding = userData.buildings.find(b => b.data === 1000001);
            return thBuilding ? thBuilding.lvl : 0;
        } else {
            // Builder Base
            if (!userData.buildings2) return 0;
            const bhBuilding = userData.buildings2.find(b => b.data === 1000048);
            return bhBuilding ? bhBuilding.lvl : 10; // Default BH10
        }
    }

    /**
     * Validate data freshness based on timestamp
     * @param {Object} data - User data with timestamp field
     * @returns {Object} Validation result with isStale flag and age in hours
     */
    function validateDataFreshness(data) {
        const result = {
            isStale: false,
            ageInSeconds: 0,
            ageInHours: 0,
            message: ''
        };

        if (!data.timestamp) {
            result.message = 'No timestamp found in data';
            return result;
        }

        const currentTimestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
        const dataTimestamp = data.timestamp;
        const ageInSeconds = currentTimestamp - dataTimestamp;
        const ageInHours = ageInSeconds / 3600;

        result.ageInSeconds = ageInSeconds;
        result.ageInHours = ageInHours;

        // Check if data is older than 1 day (86400 seconds)
        const ONE_DAY_IN_SECONDS = 86400;
        if (ageInSeconds > ONE_DAY_IN_SECONDS) {
            result.isStale = true;
            result.message = 'Old Json Data Detected! Please Upload A Fresh Data';
        }

        return result;
    }

    /**
     * Display or hide warning banner for stale data
     * @param {boolean} show - Whether to show the warning
     * @param {string} message - Warning message to display
     */
    function toggleDataWarning(show, message = '') {
        let warningBanner = document.getElementById('dataWarningBanner');

        if (show && !warningBanner) {
            // Create warning banner if it doesn't exist
            warningBanner = document.createElement('div');
            warningBanner.id = 'dataWarningBanner';
            warningBanner.className = 'data-warning-banner';
            warningBanner.innerHTML = `
                <div class="warning-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="warning-message">${message}</span>
                </div>
            `;

            // Insert at the top of the upgrade tables container
            const container = document.getElementById('upgradeTablesContainer');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(warningBanner, container);
            }
        } else if (!show && warningBanner) {
            // Remove warning banner
            warningBanner.remove();
        } else if (show && warningBanner) {
            // Update existing banner message
            const messageSpan = warningBanner.querySelector('.warning-message');
            if (messageSpan) {
                messageSpan.textContent = message;
            }
        }
    }

    function analyzeVillage(unfilteredData) {
        // Expose to window for external access (e.g., from landing page)
        window.analyzeVillage = analyzeVillage;

        try {
            // Validate data freshness
            const validation = validateDataFreshness(unfilteredData);
            if (validation.isStale) {
                console.warn(`⚠️ Data is ${validation.ageInHours.toFixed(1)} hours old (stale)`);
                toggleDataWarning(true, validation.message);
            } else {
                console.log(`✅ Data is fresh (${validation.ageInHours.toFixed(1)} hours old)`);
                toggleDataWarning(false);
            }

            // Store original unfiltered data
            originalUserData = unfilteredData;

            // Filter data by current village
            let filteredData;
            if (window.filterDataByVillage) {
                filteredData = window.filterDataByVillage(unfilteredData, currentVillage);
            } else {
                // Fallback if villageFilter.js not loaded
                filteredData = unfilteredData;
            }

            // Update userData with filtered data
            userData = filteredData;

            userTH = detectUserTownHall(unfilteredData, currentVillage);
            if (userTH === 0) {
                console.warn('Could not detect village hall level.');
            }

            // Update Village Info
            updateVillageInfo(unfilteredData, userTH);

            // Update Feature Visibility (Tabs/Rows)
            updateFeatureVisibility(userTH);

            // Calculate Progressions with filtered data
            const results = calculateProgressions(filteredData, staticData, userTH);
            console.log('Progression Results:', results);

            // Update Progress Bars (with visibility logic)
            updateProgressBars(results, userTH);

            // Update B.O.B Status
            updateBOBStatus(unfilteredData);

            // Update Sidebar ("Remaining" figures)
            // updateSidebar(results); // Deprecated: Now called in renderCurrentCategory using processedTableData

            // Generate Upgrade Data
            if (window.analyzeUpgrades) {
                allUpgrades = window.analyzeUpgrades(userData, staticData, userTH);

                // Force reset to Defenses section on new analysis
                currentCategory = 'defenses';

                // Update Tab UI
                categoryTabs.forEach(t => {
                    t.classList.toggle('active', t.dataset.category === 'defenses');
                });

                // Update Section Title
                const titleEl = document.getElementById('currentSectionTitle');
                if (titleEl) titleEl.innerHTML = `Defenses <i class="fas fa-cog"></i>`;

                renderCurrentCategory();

                // Update Tab States (Count, Colors)
                updateTabStates(allUpgrades, results);
            }

            // Process Tableview Data (integrated from tracker.html)
            if (window.processTableData) {
                // Store the user's data timestamp for real-time countdown
                if (userData.timestamp && window.setUserDataTimestamp) {
                    window.setUserDataTimestamp(userData.timestamp);
                    console.log('✓ User data timestamp set:', userData.timestamp);
                }

                window.processTableData(userData, staticData, userTH);
                console.log('✓ Tableview data processed successfully');

                // Update Builder Breakdown with active upgrades
                updateBuilderBreakdown();

                // Start real-time countdown update (every second)
                startRealTimeCountdown();
            }

            // Force reset to Defenses section on new analysis (after all data processed)
            currentCategory = 'defenses';

            // Update Tab UI
            categoryTabs.forEach(t => {
                t.classList.toggle('active', t.dataset.category === 'defenses');
            });

            // Update Section Title
            const titleEl = document.getElementById('currentSectionTitle');
            if (titleEl) titleEl.innerHTML = `Defenses <i class="fas fa-cog"></i>`;

            // Initial Render
            renderCurrentCategory();

            // Switch View: Hide Landing, Show App
            document.getElementById('landing-page').style.display = 'none';
            document.getElementById('tracker-app').style.display = 'block';

        } catch (error) {
            console.error('Analysis Error:', error);
            alert('Failed to analyze village: ' + error.message);
        }
    }

    function updateBuilderBreakdown() {
        // Get active upgrades (items with status 'Upgrading') from processedTableData
        const tableData = window.processedTableData || [];

        // Filter for builder-type upgrades only (buildings, defenses, etc. - NOT lab or heroes on altar)
        // Lab upgrades use the Laboratory, Heroes use the Hero Altar - not builders
        const builderCategories = ['Defense', 'Resource', 'Army', 'Trap', 'Crafted'];

        const activeUpgrades = tableData
            .filter(item => {
                if (item.status !== 'Upgrading' || !builderCategories.includes(item.category)) {
                    return false;
                }
                // Also filter out completed upgrades (real remaining time <= 0)
                if (item.upgradeInfo && window.getRealRemainingTime) {
                    const realRemaining = window.getRealRemainingTime(item.upgradeInfo.remainingTime);
                    return realRemaining > 0;
                }
                return item.upgradeInfo && item.upgradeInfo.remainingTime > 0;
            })
            .sort((a, b) => {
                // Sort by remaining time (shortest first)
                const aTime = a.upgradeInfo ? a.upgradeInfo.remainingTime : 0;
                const bTime = b.upgradeInfo ? b.upgradeInfo.remainingTime : 0;
                return aTime - bTime;
            });

        const PERMANENT_BUILDERS = 6;
        const showGoblin = activeUpgrades.length > PERMANENT_BUILDERS;

        // Update each builder row
        for (let i = 1; i <= PERMANENT_BUILDERS; i++) {
            const builderRow = document.getElementById(`builder-${i}`);
            if (!builderRow) continue;

            const upgrade = activeUpgrades[i - 1]; // 0-indexed array
            updateBuilderRow(builderRow, upgrade, i);
        }

        // Handle Goblin Builder
        const goblinRow = document.getElementById('builder-goblin');
        if (goblinRow) {
            if (showGoblin) {
                goblinRow.style.display = 'flex';
                const goblinUpgrade = activeUpgrades[PERMANENT_BUILDERS]; // 7th upgrade
                updateBuilderRow(goblinRow, goblinUpgrade, 'Goblin');
            } else {
                goblinRow.style.display = 'none';
            }
        }
    }

    function updateBuilderRow(row, upgrade, builderNum) {
        const statusDiv = row.querySelector('.builder-status');
        if (!statusDiv) return;

        if (upgrade && upgrade.upgradeInfo) {
            // Builder is working
            row.classList.add('working');
            row.classList.remove('idle');

            const info = upgrade.upgradeInfo;
            const realRemaining = window.getRealRemainingTime
                ? window.getRealRemainingTime(info.remainingTime)
                : info.remainingTime;

            const progress = info.totalTime > 0
                ? Math.min(100, Math.max(0, Math.round(((info.totalTime - realRemaining) / info.totalTime) * 100)))
                : 0;

            const gemCost = window.calculateGemCost
                ? window.calculateGemCost(realRemaining)
                : 0;

            const displayName = upgrade.moduleName
                ? `${upgrade.name} - ${upgrade.moduleName}`
                : upgrade.name;

            statusDiv.className = 'builder-status working';
            statusDiv.innerHTML = `
                <div class="builder-work-info">
                    <span class="builder-work-name">${displayName} → Lv ${info.upgradingTo}</span>
                    <div class="builder-progress-container">
                        <div class="builder-progress-bar">
                            <div class="builder-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="builder-time">${formatTimeShort(realRemaining)}</span>
                        <span class="builder-gem-cost"><span class="builder-gem-icon">💎</span>${gemCost}</span>
                    </div>
                </div>
            `;
        } else {
            // Builder is idle
            row.classList.remove('working');
            row.classList.add('idle');

            statusDiv.className = 'builder-status idle';
            statusDiv.innerHTML = `<span class="idle-text">Builder Idle!</span>`;
        }
    }


    function updateBOBStatus(userData) {
        // Check for B.O.B Control (ID 1000064) in Home Village buildings
        // Note: userData here might be filtered or unfiltered. Safer to check unfiltered 'buildings' array.
        // If userData passed is refined, we might need to check originalUserData if available or ensure this is the full object.
        // Assuming 'userData' arg here is 'unfilteredData' passed from analyzeVillage.

        let unlocked = false;
        if (userData.buildings) {
            const bob = userData.buildings.find(b => b.data === 1000064);
            if (bob) unlocked = true;
        }

        const box = document.getElementById('bobStatusBox');
        const text = document.getElementById('bobStatusText');

        if (unlocked) {
            if (box) box.classList.remove('locked');
            if (text) {
                text.textContent = 'UNLOCKED';
                text.classList.remove('locked');
            }
        } else {
            if (box) box.classList.add('locked');
            if (text) {
                text.textContent = 'LOCKED';
                text.classList.add('locked');
            }
        }
    }

    function updateTabStates(upgrades, results) {
        // results contains 'completed' vs 'total'.
        // upgrades contains 'isUpgrading' status.

        const tabs = document.querySelectorAll('.nav-tab');

        tabs.forEach(tab => {
            const category = tab.dataset.category;

            // 1. Reset
            tab.classList.remove('tab-upgrading', 'tab-maxed', 'alert');

            // 2. Upgrading Check (Yellow)
            // Filter upgrades for this category
            // We need to map category names again or just check if ANY upgrade in this category is busy.
            // Using same map as renderCurrentCategory
            const categoryMap = {
                'defenses': ['Defense', 'Traps'],
                'structures': ['Resources', 'Army Buildings'],
                'lab': ['Troops', 'Spells', 'Siege Machines'],
                'heroes': ['Heroes'],
                'equipment': ['Equipment'],
                'pets': ['Pets'],
                'walls': ['Walls'],
                'crafted': ['Crafted']
            };
            const cats = categoryMap[category] || [category];

            const categoryUpgrades = upgrades.filter(u => cats.includes(u.category));
            const isUpgrading = categoryUpgrades.some(u => u.isUpgrading); // Assuming isUpgrading flag set by analyze_upgrades logic?
            // Actually existing analyze_upgrades might not set 'isUpgrading' unless we passed builder data or inferred it.
            // The user said "Yellow if any item is being upgraded... with actual data showing how many".
            // Since we don't have real builder data, we check 'timer' > 0 ? No, that's just build time.
            // We check 'status' if API data provided?
            // For now, if no API data, we can't know for sure. But prompt says "if any item is being upgraded...".
            // We will trust 'upgrade.isUpgrading' property updates if any.

            if (isUpgrading) {
                tab.classList.add('tab-upgrading', 'alert');
            }

            // 3. Maxed Check (Green)
            // Using 'results' object which has percent. If percent is 100.
            // Mapping results key to tab category
            const resultKeyMap = {
                'defenses': null, // results.structures includes defenses? No. static_data separates. 
                // Wait, calculateProgressions returns: structures, lab, heroes, equipment, pets, walls.
                // It doesn't split Defenses vs Structures clearly in the result object for the BARs.
                // BUT the result object for 'structures' usually combines all buildings.
                // If we want per-tab green status, we need to check the upgrades array.
            };

            const total = categoryUpgrades.length;
            const maxed = categoryUpgrades.filter(u => u.currentLevel >= u.maxLevel).length;

            if (total > 0 && total === maxed) {
                tab.classList.add('tab-maxed');
            }

            // 4. Count Badge
            // "Show how many items in that section are being upgraded if any" -> Yellow
            // "Defenses (3)" -> Shows total count or upgrading count?
            // Prompt: "Add notification badges/counts (e.g., "Defenses (3)")... Yellow if any item is being upgraded... showing how many ... are being upgraded".
            // So Count = Upgrading Count.

            const upgradingCount = categoryUpgrades.filter(u => u.isUpgrading).length;
            const countEl = tab.querySelector('.tab-count');

            if (countEl) {
                if (upgradingCount > 0) {
                    countEl.textContent = `(${upgradingCount})`;
                    countEl.style.display = 'inline';
                } else {
                    countEl.textContent = '';
                    countEl.style.display = 'none';
                }
            }
        });
    }

    function updateVillageInfo(userData, userTH) {
        // Village Name
        const villageNameEl = document.getElementById('villageName');
        if (userData.name && villageNameEl) {
            villageNameEl.innerHTML = `${userData.name} <i class="fas fa-share-alt share-icon" title="Share"></i>`;
        }

        // Player Tag
        const playerTagEl = document.getElementById('playerTag');
        const playerLinkEl = document.getElementById('playerLink');
        if (userData.tag) {
            if (playerTagEl) playerTagEl.textContent = userData.tag;
            if (playerLinkEl) {
                playerLinkEl.href = `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${userData.tag.replace('#', '')}`;
            }
        }

        // TH/BH Badge
        const thBadgeEl = document.getElementById('thBadge');
        if (thBadgeEl) {
            if (currentVillage === 'home') {
                thBadgeEl.textContent = `Town Hall ${userTH}`;
            } else {
                thBadgeEl.textContent = `Builder Hall ${userTH}`;
            }
        }

        // TH/BH Image
        const thImageEl = document.getElementById('thImage');
        if (thImageEl) {
            if (currentVillage === 'home') {
                thImageEl.src = `/images/entities/1_${userTH}.png`;
            } else {
                // Builder Hall image (ID 1000048 for BH)
                thImageEl.src = `/images/entities/1000048_${userTH}.png`;
            }
        }
    }

    function updateSidebar() {
        if (!window.processedTableData || window.processedTableData.length === 0) return;

        // Map UI Category to Data Categories
        const catMap = {
            'defenses': ['Defense'],
            'resources': ['Resources'],
            'army': ['Army Buildings'],
            'traps': ['Trap'],
            'troops': ['Troops'],
            'spells': ['Spells'],
            'dark-troops': ['Dark Troops'],
            'sieges': ['Siege Machines'],
            'heroes': ['Heroes'],
            'pets': ['Pets'],
            'equipment': ['Equipment'],
            'walls': ['Walls'],
            'crafted': ['Crafted'],
            'guardians': ['Guardians']
        };

        const targetCats = catMap[currentCategory] || [];
        const items = window.processedTableData.filter(i => targetCats.includes(i.category));

        // -- 1. Calculate Normal Totals --
        // Logic: specificTotals (Normal) are pre-calculated per Building Type in tableview_logic.
        // We sum distinct Building Types.

        let mainGold = 0;
        let mainElixir = 0;
        let mainDark = 0;
        let mainTime = 0;
        const processedTypes = new Set();

        items.forEach(item => {
            if (processedTypes.has(item.name)) return;
            processedTypes.add(item.name);

            // Add Pre-calculated Normal Totals
            // Validate values are numbers
            const cash = item.sectionNormalCost || 0;
            const time = item.sectionNormalTime || 0;

            if (cash > 0) {
                // Determine resource type for this building/item type
                const res = item.res || 'Gold';
                if (res === 'Gold') mainGold += cash;
                else if (res === 'Elixir') mainElixir += cash;
                else if (res === 'Dark Elixir') mainDark += cash;
            }

            mainTime += time;
        });

        // Special Case for Walls: processedTableData has rows per level.
        // tableview_logic.js processWalls doesn't seem to have 'sectionNormalCost'.
        // It creates rows with 'cost' (which is count * unit_cost). 
        // We should sum 'cost' from all rows for Walls.
        if (currentCategory === 'walls') {
            mainGold = 0; mainElixir = 0; mainDark = 0; // Reset to avoid double counting if any overlap
            items.forEach(item => {
                const c = item.cost || 0;
                mainGold += c; // Walls usually Gold/Elixir mix, but check res
                // Note: Wall rows created by processWalls set 'res'.
            });
            // Walls have 0 time.
        }


        // -- 2. Calculate Supercharge Totals --
        // Logic: Iterate ALL instances (not just unique types) because each instance has its own supercharge state.

        let superGold = 0;
        let superElixir = 0;
        let superDark = 0;
        let superTime = 0;
        let hasSuperchargeContent = false;

        items.forEach(item => {
            // Check if item has Supercharge Data
            if (item.superchargeData && item.totalSuperchargeLevels > 0) {
                const scData = item.superchargeData;
                const currentSC = item.superchargeLevel || 0;
                const isSCing = item.isSupercharging;

                // Calculate Remaining Supercharge Levels
                // If isSCing is true, we are currently upgrading to currentSC + 1.
                // We need to count:
                // 1. Remaining time of current upgrade (already tracked in 'timer' but usually main status handles timer?)
                //    Wait, tableview_logic handles timer in 'upgradeInfo'.

                // If upgrading SC:
                if (isSCing && item.upgradeInfo) {
                    // remainingTime is real-time.
                    superTime += (item.upgradeInfo.remainingTime || 0);
                    // No cost for active upgrade (already paid).
                }

                // Future SC levels
                // Start level for future calc:
                const startLvl = isSCing ? currentSC + 2 : currentSC + 1;

                if (startLvl <= item.totalSuperchargeLevels) {
                    // Iterate future levels
                    scData.levels.forEach(lvl => {
                        if (lvl.level >= startLvl) {
                            superGold += (lvl.build_cost || 0); // SC usually Gold?
                            superTime += (lvl.build_time || 0);
                            hasSuperchargeContent = true;
                        }
                    });
                    if (!hasSuperchargeContent && startLvl <= item.totalSuperchargeLevels) hasSuperchargeContent = true;
                }

                // If we have ANY SC content (even if maxed, maybe show 0?)
                // Requirement: "shows info about the section supercharge is avaiable"
                // If maxed, it's available but 0 cost.
                if (item.totalSuperchargeLevels > 0) hasSuperchargeContent = true;
            }
        });


        // -- 3. Render --

        // Helper
        const formatNum = (num) => {
            if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'; // Billion
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num;
        };

        // Helper Time using the generic format
        // We can reuse formatTimeShort logic or simple day/hour
        const formatTimeRel = (seconds) => {
            if (seconds <= 0) return '0s';
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            return `${d}d ${h}h`;
        };

        // Render Main
        const mainContainer = document.getElementById('sidebar-main-content');
        if (mainContainer) {
            let html = '';
            if (mainGold > 0) html += `<div class="card-row"><div class="res-label"><img src="images/entities/gold.png" class="res-icon-sm"> Gold</div><div class="res-val text-gold">${formatNum(mainGold)}</div></div>`;
            if (mainElixir > 0) html += `<div class="card-row"><div class="res-label"><img src="images/entities/elixir.png" class="res-icon-sm"> Elixir</div><div class="res-val text-purple">${formatNum(mainElixir)}</div></div>`;
            if (mainDark > 0) html += `<div class="card-row"><div class="res-label"><img src="images/entities/dark_elixir.png" class="res-icon-sm"> Dark Elixir</div><div class="res-val">${formatNum(mainDark)}</div></div>`;

            if (html === '') html = `<div class="card-row" style="color:#a0aec0; justify-content:center;">All Maxed!</div>`;
            mainContainer.innerHTML = html;
        }

        const mainTimeEl = document.getElementById('main-time-total');
        if (mainTimeEl) mainTimeEl.textContent = formatTimeRel(mainTime);
        const mainBuilderEl = document.getElementById('main-time-builders');
        if (mainBuilderEl) mainBuilderEl.textContent = formatTimeRel(mainTime / 6); // 6 Builders


        // Render Supercharge
        const scSection = document.getElementById('sidebar-supercharge-section');
        const scContainer = document.getElementById('sidebar-supercharge-content');

        if (hasSuperchargeContent) {
            scSection.style.display = 'block';
            let html = '';
            // Supercharges cost distinct resources? Usually Gold/Elixir/DE?
            // Assuming Gold for Defenses SC.
            // Check logic above: we added to superGold. 
            // NOTE: Supercharges can be Elixir (e.g. Army... wait do army have SC?)
            // Only Defenses have Supercharges currently. So Gold.

            if (superGold > 0) html += `<div class="card-row"><div class="res-label"><img src="images/entities/gold.png" class="res-icon-sm"> Gold</div><div class="res-val text-gold">${formatNum(superGold)}</div></div>`;
            // Add others if needed

            if (html === '') html = `<div class="card-row" style="color:#a0aec0; justify-content:center;">All Supercharged!</div>`;
            scContainer.innerHTML = html;

            const scTimeEl = document.getElementById('super-time-total');
            if (scTimeEl) scTimeEl.textContent = formatTimeRel(superTime);

            const scBuilderEl = document.getElementById('super-time-builders');
            if (scBuilderEl) scBuilderEl.textContent = formatTimeRel(superTime / 6);

        } else {
            scSection.style.display = 'none';
        }

    }

    function calculateProgressions(userData, staticData, userTH) {
        // Check if we have API metadata (heroes with _apiData)
        const hasAPIData = userData.heroes && userData.heroes[0] && userData.heroes[0]._apiData;

        let heroesResult, labResult, petsResult;

        if (hasAPIData) {
            // Use cost-based API calculations with static data
            console.log('✨ Using API metadata + static data for cost-based progress calculations');

            heroesResult = window.calculateHeroProgressFromAPI
                ? window.calculateHeroProgressFromAPI(userData.heroes, userTH, staticData)
                : { percent: 0 };

            labResult = window.calculateLabProgressFromAPI
                ? window.calculateLabProgressFromAPI(userData.units || [], userData.spells || [], userTH, staticData)
                : { percent: 0 };

            petsResult = window.calculatePetsProgressFromAPI
                ? window.calculatePetsProgressFromAPI(userData.pets || [], userTH, staticData)
                : { percent: 0 };
        } else {
            // Fall back to complex cost-based calculations
            console.log('📊 Using cost-based calculations (no API metadata)');

            heroesResult = window.calculateHeroesCostBased
                ? window.calculateHeroesCostBased(userData, staticData, userTH)
                : { percent: 0 };

            labResult = window.calculateLabCostBased
                ? window.calculateLabCostBased(userData, staticData, userTH)
                : { percent: 0 };

            petsResult = window.calculatePets
                ? window.calculatePets(userData, staticData, userTH)
                : { percent: 0 };
        }

        const equipmentResult = window.calculateEquipmentClashNinjaFinal
            ? window.calculateEquipmentClashNinjaFinal(userData, staticData, userTH)
            : { percent: 0 };

        return {
            structures: window.calculateStructuresCostBased ? window.calculateStructuresCostBased(userData, staticData, userTH) : { percent: 0 },
            lab: labResult,
            heroes: heroesResult,
            equipment: equipmentResult,
            pets: petsResult,
            walls: window.calculateWalls ? window.calculateWalls(userData, staticData, userTH) : { percent: 0 },
            crafted: calculateCraftedPercentage(userData, staticData, userTH),
            supercharge: calculateSuperchargePercentage(userData, staticData, userTH)
        };
    }

    function calculateCraftedPercentage(userData, staticData, userTH) {
        let totalCost = 0;
        let completedCost = 0;
        const DARK_TO_ELIXIR_RATIO = 150; // 1 Dark Elixir = 150 Elixir equivalent

        const craftingStationStatic = (staticData.buildings || []).find(b => b._id === 1000097);
        if (!craftingStationStatic || !craftingStationStatic.seasonal_defenses) return { percent: 0 };

        const userBuildings = userData.buildings || [];
        const craftingStationUser = userBuildings.find(b => b.data === 1000097);
        const userTypes = craftingStationUser ? (craftingStationUser.types || []) : [];

        craftingStationStatic.seasonal_defenses.forEach(sDef => {
            const reqTH = sDef.required_townhall || 1;
            if (userTH < reqTH) return;

            const userTypeDef = userTypes.find(t => t.data === sDef._id);
            const userModules = userTypeDef ? (userTypeDef.modules || []) : [];

            if (sDef.modules) {
                sDef.modules.forEach(mod => {
                    const userMod = userModules.find(m => m.data === mod._id);
                    // If user has the type unlocked (userTypeDef exists), assume they have at least level 1 of modules
                    const curLvl = userMod ? (userMod.lvl || 1) : 1;

                    const modLevels = mod.levels || [];
                    const resource = mod.upgrade_resource || 'Dark Elixir';

                    // Total Cost: Sum of ALL levels cost with DE weighting
                    modLevels.forEach(lvl => {
                        const rawCost = lvl.build_cost || lvl.cost || lvl.upgrade_cost || 0;
                        // Apply DE weighting if resource is Dark Elixir
                        const weightedCost = (resource === 'Dark Elixir' || resource === 'Dark')
                            ? rawCost * DARK_TO_ELIXIR_RATIO
                            : rawCost;

                        totalCost += weightedCost;

                        // Completed Cost: Sum of levels <= curLvl
                        if (lvl.level <= curLvl) {
                            completedCost += weightedCost;
                        }
                    });
                });
            }
        });

        const percent = totalCost > 0 ? (completedCost / totalCost) * 100 : 0;
        return { percent, total: totalCost, completed: completedCost };
    }

    function calculateSuperchargePercentage(userData, staticData, userTH) {
        let totalCost = 0;
        let completedCost = 0;
        const buildings = [];

        // Iterate all buildings in static data
        (staticData.buildings || []).forEach(sBuild => {
            if (sBuild.village !== 'home') return;

            sBuild.levels.forEach(lvl => {
                if (lvl.required_townhall <= userTH && lvl.supercharge) {
                    const scData = lvl.supercharge;
                    if (!scData.levels) return;

                    const userBuilds = (userData.buildings || []).filter(b => b.data === sBuild._id);

                    userBuilds.forEach(uBuild => {
                        const userScLvl = uBuild.supercharge || 0;
                        const totalScLevels = scData.levels.length;
                        const isAtMax = uBuild.lvl >= lvl.level;

                        let isSupercharging = false;
                        let timer = 0;

                        if (isAtMax && userScLvl < totalScLevels && uBuild.timer > 0) {
                            isSupercharging = true;
                            timer = uBuild.timer;
                        }

                        // Add to calculations
                        scData.levels.forEach(scLvl => {
                            const cost = scLvl.build_cost || scLvl.cost || 0;
                            totalCost += cost;
                            if (userScLvl >= scLvl.level) {
                                completedCost += cost;
                            }
                        });

                        // Add to list for dashboard details
                        if (isAtMax || userScLvl > 0) {
                            buildings.push({
                                name: sBuild.name,
                                superchargeLevel: userScLvl,
                                totalSuperchargeLevels: totalScLevels,
                                timer: timer,
                                isSupercharging: isSupercharging
                            });
                        }
                    });
                }
            });
        });

        const percent = totalCost > 0 ? (completedCost / totalCost) * 100 : 0;
        return {
            percent,
            total: totalCost,
            completed: completedCost,
            buildings
        };
    }

    function updateProgressBars(results, userTH) {
        // Define Visibility based on TH
        // Structures: Always
        // Lab: Always
        // Heroes: TH7+
        // Equipment: TH8+
        // Pets: TH14+
        // Walls: Always
        // Supercharge: TH16+ AND "superchargeable" check (for now simple TH check)
        // Crafted: TH16+

        const setVisible = (id, visible) => {
            const row = document.getElementById(id);
            if (row) row.style.display = visible ? 'flex' : 'none';
        };

        setVisible('row-structures', true);
        setVisible('row-walls', true);
        setVisible('row-lab', true); // Or specialized check
        setVisible('row-heroes', userTH >= 7);
        setVisible('row-equipment', userTH >= 8);
        setVisible('row-pets', userTH >= 14);
        setVisible('row-supercharge', userTH >= 16);
        setVisible('row-crafted', userTH >= 16);

        updateProgressBar('fill-structures', 'percent-structures', results.structures.percent);
        updateProgressBar('fill-lab', 'percent-lab', results.lab.percent);
        updateProgressBar('fill-heroes', 'percent-heroes', results.heroes.percent);
        updateProgressBar('fill-equipment', 'percent-equipment', results.equipment.percent);
        updateProgressBar('fill-pets', 'percent-pets', results.pets.percent);
        updateProgressBar('fill-walls', 'percent-walls', results.walls.percent);
        updateProgressBar('fill-supercharge', 'percent-supercharge', results.supercharge.percent);
        updateProgressBar('fill-crafted', 'percent-crafted', results.crafted.percent);

        // Update detailed information (if logic exists)
        // updateProgressDetails(results); // Removed Day/Completion stats per request.
    }


    function updateProgressBar(fillId, textId, percent) {
        const fillEl = document.getElementById(fillId);
        const textEl = document.getElementById(textId);

        if (fillEl && textEl) {
            // Equipment should display as integer (e.g., 57%)
            // All others should display with 1 decimal, truncated (e.g., 66.2 not 66.3)
            let formatted;
            if (fillId === 'fill-equipment') {
                // Integer only for equipment
                formatted = Math.floor(percent).toFixed(0);
            } else {
                // 1 decimal place, truncated (not rounded)
                formatted = (Math.floor(percent * 10) / 10).toFixed(1);
            }
            fillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            textEl.textContent = `${formatted}%`;

            // Text color logic? Image shows white text on bar. CSS handles it.
        }
    }

    function updateProgressDetails(results) {
        // Format large numbers with K/M suffixes
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };

        // Format time in readable format (Xd Yh)
        const formatTime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h`;
            return '< 1h';
        };

        // Update Structures details
        const structuresEl = document.getElementById('details-structures');
        if (structuresEl && results.structures.resources) {
            let html = '<div class=\"detail-row\">';
            if (results.structures.resources.Gold) {
                html += `<span class=\"detail-label\">Gold:</span><span class=\"detail-value\">${formatNumber(results.structures.resources.Gold.completed)}/${formatNumber(results.structures.resources.Gold.total)}</span>`;
            }
            if (results.structures.resources.Elixir) {
                html += `<span class=\"detail-label\">Elixir:</span><span class=\"detail-value\">${formatNumber(results.structures.resources.Elixir.completed)}/${formatNumber(results.structures.resources.Elixir.total)}</span>`;
            }
            html += '</div>';
            structuresEl.innerHTML = html;
        }

        // Update Lab details
        const labEl = document.getElementById('details-lab');
        if (labEl && results.lab.details) {
            const d = results.lab.details;
            let html = '<div class=\"detail-row\">';
            html += `<span class=\"detail-label\">Troops:</span><span class=\"detail-value\">${d.troops || 0}</span>`;
            html += `<span class=\"detail-label\">Spells:</span><span class=\"detail-value\">${d.spells || 0}</span>`;
            if (d.siegeMachines > 0) {
                html += `<span class=\"detail-label\">Siege:</span><span class=\"detail-value\">${d.siegeMachines}</span>`;
            }
            html += '</div>';
            labEl.innerHTML = html;
        }

        // Update Equipment details
        const equipmentEl = document.getElementById('details-equipment');
        if (equipmentEl && results.equipment.resources) {
            const r = results.equipment.resources;
            let html = '<div class=\"detail-row\">';
            html += `<span class=\"detail-label\">Shiny:</span><span class=\"detail-value\">${formatNumber(r.Shiny.completed)}/${formatNumber(r.Shiny.total)}</span>`;
            html += `<span class=\"detail-label\">Glowy:</span><span class=\"detail-value\">${formatNumber(r.Glowy.completed)}/${formatNumber(r.Glowy.total)}</span>`;
            html += `<span class=\"detail-label\">Starry:</span><span class=\"detail-value\">${formatNumber(r.Starry.completed)}/${formatNumber(r.Starry.total)}</span>`;
            html += '</div>';
            equipmentEl.innerHTML = html;
        }

        // Update Walls details
        const wallsEl = document.getElementById('details-walls');
        if (wallsEl && results.walls.details) {
            const d = results.walls.details;
            let html = '<div class=\"detail-row\">';

            // Show level distribution
            const levels = Object.keys(d.byLevel).sort((a, b) => b - a); // Sort descending
            levels.forEach(level => {
                html += `<span class=\"detail-label\">Lvl ${level}:</span><span class=\"detail-value\">${d.byLevel[level]}</span>`;
            });

            html += '</div>';
            wallsEl.innerHTML = html;
        }
    }

    function renderCurrentCategory() {
        // Update Sidebar to match current category
        updateSidebar();

        // Use tableview's processedTableData if available, otherwise fall back to allUpgrades
        let dataSource = window.processedTableData && window.processedTableData.length > 0
            ? window.processedTableData
            : [];

        if (dataSource.length === 0 && allUpgrades.length === 0) {
            const tbody = document.getElementById('defenseTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 3rem; color: var(--text-secondary);">No data loaded. Please upload your village JSON.</td></tr>';
            }
            return;
        }

        // Category mapping from index.html tabs to tableview categories
        const categoryMap = {
            'defenses': ['Defense'],
            'guardians': ['Guardians'],
            'traps': ['Trap'],
            'army': ['Army'],
            'resources': ['Resource'],
            'troops': ['Troops'],
            'spells': ['Spells'],
            'sieges': ['Siege Machines'],
            'heroes': ['Heroes'],
            'equipment': ['Equipment'],
            'pets': ['Pets'],
            'walls': ['Walls'],
            'crafted': ['Crafted'],
            'dark-troops': ['Dark Troops'],
            'structures': ['Resource', 'Army']
        };

        const searchTerm = document.getElementById('search-bar') ? document.getElementById('search-bar').value.toLowerCase() : '';
        const hideMaxed = document.getElementById('hideMaxed') ? document.getElementById('hideMaxed').checked : false;
        const hideSupercharges = document.getElementById('hideSupercharges') ? document.getElementById('hideSupercharges').checked : false;

        // Get categories to filter
        const targetCategories = categoryMap[currentCategory] || [currentCategory];

        // Filter data
        let items = dataSource.filter(item => {
            if (!targetCategories.includes(item.category)) return false;
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return false;
            if (hideMaxed && item.status === 'Maxed') return false;
            return true;
        });

        // Equipment gets special rendering
        if (currentCategory === 'equipment') {
            renderEquipmentTable(items);
            return;
        }

        // Sort: Group by name first, then by level within each group
        items.sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            return a.level - b.level;
        });

        // --- Supercharge UI Logic ---
        // 1. Check if this category has ANY superchargeable items (regardless of upgrade status)
        // We check 'totalSuperchargeLevels' property which should be present on items if they support supercharge
        const hasSuperchargeItems = items.some(i => i.totalSuperchargeLevels > 0);

        // 2. toggle UI visibility
        const scToggleContainer = document.getElementById('hideSupercharges') ? document.getElementById('hideSupercharges').parentElement : null;
        const scInfoText = document.querySelector('.filter-info');

        if (scToggleContainer) {
            scToggleContainer.style.display = hasSuperchargeItems ? 'flex' : 'none';
        }

        if (scInfoText) {
            if (!hasSuperchargeItems) {
                scInfoText.style.display = 'none';
            } else {
                scInfoText.style.display = 'inline';

                // 3. Update Text Content
                if (!hideSupercharges) {
                    // Checkbox Unchecked -> Show Nothing
                    scInfoText.textContent = '';
                } else {
                    // Checkbox Checked -> Show "X Supercharge types available"
                    // We need to count unique NAMES of items that have available supercharges
                    // item.allRemainingUpgrades.upgrades contains the list. We check if any is isSupercharge

                    const uniqueScTypes = new Set();
                    items.forEach(item => {
                        if (item.allRemainingUpgrades && item.allRemainingUpgrades.upgrades) {
                            const hasScUpgrade = item.allRemainingUpgrades.upgrades.some(u => u.isSupercharge);
                            if (hasScUpgrade) {
                                uniqueScTypes.add(item.name);
                            }
                        }
                    });

                    const count = uniqueScTypes.size;
                    if (count > 0) {
                        scInfoText.textContent = `${count} Supercharge types available`;
                    } else {
                        scInfoText.textContent = ''; // Or "No Supercharges available" ? User said "Show NOTHING" if unchecked. Logic implies if checked show types. If 0 types, show empty?
                    }
                }
            }
        }

        // Update Stats Bar
        const total = items.length;
        const maxed = items.filter(i => i.status === 'Maxed').length;
        const upg = items.filter(i => i.status === 'Upgrading').length;

        const statTotal = document.getElementById('stat-total');
        const statMaxed = document.getElementById('stat-maxed');
        const statUpg = document.getElementById('stat-upg');
        if (statTotal) statTotal.textContent = total;
        if (statMaxed) statMaxed.textContent = maxed;
        if (statUpg) statUpg.textContent = upg;

        const tbody = document.getElementById('defenseTableBody');
        const table = document.getElementById('defenseTable');

        if (!tbody || !table) return;

        // Set Headers for 3-Column Layout
        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th class="col-defense">Defense</th>
                    <th class="col-level">Level</th>
                    <th class="col-upgrades">Upgrades</th>
                </tr>
            `;
        }

        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 3rem; color: var(--text-secondary);">No items found matching your filters.</td></tr>';
            return;
        }

        // Group items by name
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.name]) grouped[item.name] = [];
            grouped[item.name].push(item);
        });

        const userTH = window.currentUserTH || 1; // Need user TH for supercharge logic

        // Render each group
        Object.keys(grouped).forEach(name => {
            const group = grouped[name];

            // Calculate aggregate stats for this entity type (displayed in the Defense column)
            // Use values from the first item as it usually holds the section totals if processed by tableview_logic
            const sectionTotalUpgrades = group[0].sectionNormalCount || 0;
            const sectionTotalCost = group[0].sectionNormalCost || 0;
            const sectionTotalTime = group[0].sectionNormalTime || 0;

            group.forEach((item, idx) => {
                const row = document.createElement('tr');
                row.className = 'defense-row';
                if (idx === group.length - 1) {
                    row.classList.add('group-last-row');
                }

                // --- Column 1: Defense (Rowspan) ---
                if (idx === 0) {
                    const defCell = document.createElement('td');
                    defCell.rowSpan = group.length;
                    defCell.className = 'entity-cell group-header-cell';

                    // Icon
                    const iconUrl = item.icon || 'images/placeholder.png';

                    // Summary Box HTML
                    let summaryHtml = '';
                    if (sectionTotalUpgrades > 0) {
                        summaryHtml = `
                            <div class="defense-group-summary-box">
                                <div class="summary-count">${sectionTotalUpgrades} Upgrades</div>
                                <div class="summary-cost text-gold">${formatCostValue(sectionTotalCost)}</div>
                                <div class="summary-time">${formatTimeShort(sectionTotalTime)}</div>
                            </div>
                        `;
                    } else {
                        summaryHtml = `
                            <div class="defense-group-summary-box completed">
                                <div class="summary-count" style="color:#22c55e;">Maxed!</div>
                            </div>
                        `;
                    }

                    defCell.innerHTML = `
                        <div class="defense-group-content">
                            <img src="${iconUrl}" class="defense-group-icon" alt="${name}" onerror="this.style.opacity='0.5'">
                            <div class="defense-group-name">${name}</div>
                            ${summaryHtml}
                        </div>
                    `;
                    row.appendChild(defCell);
                }

                // --- Column 2: Level (Img + Text + Bolt + Btn) ---
                const levelCell = document.createElement('td');
                levelCell.className = 'td-level-centered';

                // Supercharge Bolts (Empty vs Filled)
                // Only show if userTH >= 16 (or item.totalSuperchargeLevels > 0)
                let boltsHtml = '';
                // Check if superchargable
                if (item.totalSuperchargeLevels > 0) { // Assuming this field exists from logic
                    boltsHtml = '<div class="bolt-row">';
                    for (let i = 1; i <= item.totalSuperchargeLevels; i++) {
                        const isFilled = i <= item.superchargeLevel;
                        const boltClass = isFilled ? 'bolt-filled' : 'bolt-empty';
                        boltsHtml += `<i class="fas fa-bolt ${boltClass}"></i>`;
                    }
                    boltsHtml += '</div>';
                }

                // Action Button (Update Logic)
                let actionBtn = '';
                if (item.status === 'Merge') {
                    actionBtn = `<button class="btn-action-merge" title="Merge"><i class="fas fa-hammer"></i></button>`;
                } else if (item.status === 'Build') {
                    actionBtn = `<button class="btn-action-build" title="Build"><i class="fas fa-plus"></i></button>`;
                } else if (item.status === 'Maxed' && (!item.totalSuperchargeLevels || item.superchargeLevel >= item.totalSuperchargeLevels)) {
                    // Fully Maxed
                    // No button or checkmark? Mockup showed Up Arrow button even for "15/16" 
                    // If fully maxed, maybe nothing or check
                } else {
                    actionBtn = `<button class="btn-action-arrow"><i class="fas fa-arrow-up"></i></button>`;
                }

                // Small Icon (use item.icon again or module icon)
                const smallIconUrl = item.moduleIcon || item.icon || 'images/placeholder.png';

                levelCell.innerHTML = `
                    <div class="level-column-content">
                        <img src="${smallIconUrl}" class="level-col-icon" onerror="this.style.display='none'">
                        <div class="level-col-text">${item.level}/${item.max}</div>
                        ${boltsHtml}
                        ${actionBtn}
                    </div>
                `;
                row.appendChild(levelCell);

                // --- Column 3: Upgrades ---
                const upgradeCell = document.createElement('td');
                upgradeCell.className = 'td-upgrades-list';

                let listHtml = '';

                if (item.status === 'Upgrading' && item.upgradeInfo) {
                    // Show upgrading status (re-using old logic but simplified)
                    const info = item.upgradeInfo;
                    const realRemaining = window.getRealRemainingTime ? window.getRealRemainingTime(info.remainingTime) : info.remainingTime;

                    listHtml += `
                        <div class="upgrade-item upgrading">
                             <span class="detail-label">Upgrading to Lvl ${info.upgradingTo}:</span>
                             <span class="detail-time">${formatTimeShort(realRemaining)}</span>
                        </div>
                     `;

                    // And remaining upgrades
                    if (info.remaining && info.remaining.upgrades) {
                        let scSummaryAdded = false;
                        info.remaining.upgrades.forEach(u => {
                            if (u.isSupercharge && hideSupercharges) {
                                if (!scSummaryAdded) {
                                    listHtml += `
                                        <div class="upgrade-line-item">
                                            <span class="uli-label" style="color:#f97316; width:auto; font-weight:700;">Supercharge Available</span>
                                        </div>
                                     `;
                                    scSummaryAdded = true;
                                }
                            } else {
                                listHtml += renderUpgradeListItem(u);
                            }
                        });
                    }

                } else if (item.allRemainingUpgrades && item.allRemainingUpgrades.upgrades.length > 0) {
                    // List all remaining
                    let scSummaryAdded = false;

                    item.allRemainingUpgrades.upgrades.forEach(u => {
                        if (u.isSupercharge && hideSupercharges) {
                            if (!scSummaryAdded) {
                                listHtml += `
                                    <div class="upgrade-line-item">
                                        <span class="uli-label" style="color:#f97316; width:auto; font-weight:700;">Supercharge Available</span>
                                    </div>
                                 `;
                                scSummaryAdded = true;
                            }
                        } else {
                            // Render normal or supercharge (if not hidden)
                            listHtml += renderUpgradeListItem(u);
                        }
                    });
                } else if (item.isMerged) {
                    listHtml = '<span class="status-text-merged">(Merged)</span>';
                } else if (item.status === 'Merge') {
                    // Show cost to merge
                    const costVal = formatCostValue(item.cost);
                    const timeVal = formatTimeShort(item.time);
                    listHtml = `
                        <div class="upgrade-line-item">
                            <span class="uli-label" style="color:var(--accent-yellow)">Merge:</span>
                            <span class="uli-cost" style="color:#d946ef; font-weight:700;">${costVal}</span>
                            <span class="uli-time" style="color:#cbd5e1;">${timeVal}</span>
                        </div>
                     `;
                } else if (item.status === 'Build') {
                    // Show cost to build
                    const costVal = formatCostValue(item.cost);
                    const timeVal = formatTimeShort(item.time);
                    listHtml = `
                        <div class="upgrade-line-item">
                            <span class="uli-label" style="color:var(--accent-green)">Build:</span>
                            <span class="uli-cost" style="color:#d946ef; font-weight:700;">${costVal}</span>
                            <span class="uli-time" style="color:#cbd5e1;">${timeVal}</span>
                        </div>
                     `;
                } else if (item.status === 'Maxed') {
                    // Check logic for "Maxed for TH" vs "Fully Maxed"
                    if (item.allRemainingUpgrades && item.allRemainingUpgrades.maxedForTH) {
                        listHtml = '<span class="status-text-muted">Maxed for TH</span>';
                    } else {
                        listHtml = '<span class="status-text-success">Fully Upgraded</span>';
                    }
                }

                upgradeCell.innerHTML = `<div class="upgrade-list-container">${listHtml}</div>`;
                row.appendChild(upgradeCell);

                tbody.appendChild(row);
            });
        });
    }

    // Helper to render a single line item in Upgrades column
    function renderUpgradeListItem(u) {
        // u structure: { level, cost, time, isSupercharge, resource }
        const isSc = u.isSupercharge;

        // Label
        let label = '';
        if (isSc) {
            // Display N bolts for Supercharge Level N
            let boltIcons = '';
            // Ensure reasonable count (1-4 usually)
            const count = u.level || 1;
            for (let i = 0; i < count; i++) {
                boltIcons += '<i class="fas fa-bolt" style="color:#3b82f6; font-size:0.8rem; margin-right:1px;"></i>';
            }
            label = `<span style="display:flex; gap:1px;">${boltIcons}</span>`;
        } else {
            label = `Lvl ${u.level}:`;
        }

        const costVal = formatCostValue(u.cost);
        const timeVal = formatTimeShort(u.time);

        // Colors: Cost = Purple (#d946ef), Time = Grey (#cbd5e1)
        return `
            <div class="upgrade-line-item">
                <span class="uli-label">${label}</span>
                <span class="uli-cost" style="color:#d946ef; font-weight:700;">${costVal}</span>
                <span class="uli-time" style="color:#cbd5e1;">${timeVal}</span>
            </div>
        `;
    }

    function renderEquipmentTable(items) {
        // Equipment Redesign - matches tracker.html approach
        const table = document.getElementById('defenseTable');
        if (!table) return;
        table.innerHTML = ''; // Clear everything

        // 1. Create Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="width: 20%;">Equipment</th>
                <th style="width: 30%;">Level</th>
                <th style="width: 50%;">Upgrades</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.id = 'defenseTableBody';
        table.appendChild(tbody);

        // Update Stats Bar
        const total = items.length;
        const maxed = items.filter(i => i.status === 'Maxed').length;
        const upg = items.filter(i => i.status === 'Upgrading').length;

        const statTotal = document.getElementById('stat-total');
        const statMaxed = document.getElementById('stat-maxed');
        const statUpg = document.getElementById('stat-upg');
        if (statTotal) statTotal.textContent = total;
        if (statMaxed) statMaxed.textContent = maxed;
        if (statUpg) statUpg.textContent = upg;

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No equipment found.</td></tr>';
            return;
        }

        // 2. Group Data by hero
        const groups = {};
        const heroOrder = ["Barbarian King", "Archer Queen", "Grand Warden", "Royal Champion"];

        items.forEach(item => {
            const hero = item.hero || "Unknown";
            if (!groups[hero]) groups[hero] = [];
            groups[hero].push(item);
        });

        // 3. Render Groups sorted by hero order
        const keys = Object.keys(groups).sort((a, b) => {
            const idxA = heroOrder.indexOf(a);
            const idxB = heroOrder.indexOf(b);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        keys.forEach(heroName => {
            // Hero Header row
            const hRow = document.createElement('tr');
            hRow.innerHTML = `<td colspan="3" class="hero-header">${heroName}</td>`;
            tbody.appendChild(hRow);

            // Equipment items for this hero
            groups[heroName].forEach(item => {
                const tr = document.createElement('tr');
                tr.className = 'eq-row';

                // Col 1: Icon + Name
                const cleanName = item.name.toLowerCase().replace(/ /g, '_');
                const iconPath = `images/dist/${cleanName}.png`;

                const col1 = `
                    <td>
                        <div style="text-align:center;">
                            <img src="${iconPath}" class="eq-icon-large" onerror="this.src='images/dist/unknown.png'; this.style.opacity=0.5;" alt="">
                            <span class="eq-name">${item.name}</span>
                        </div>
                    </td>
                `;

                // Col 2: Level info + Tags
                const isMaxed = item.status === 'Maxed';
                const actionIcon = isMaxed
                    ? `<span class="status-check">✓</span>`
                    : `<button class="upgrade-btn-small">↑</button>`;

                // Tags
                const rarityTag = `<span class="tag tag-${item.rarity ? item.rarity.toLowerCase() : 'common'}">${item.rarity || 'Common'}</span>`;

                let typeTagStr = 'Active';
                const knownPassives = ['Vampstache', 'Life Gem', 'Rage Gem', 'Healing Tome'];
                if (knownPassives.includes(item.name)) typeTagStr = 'Passive';

                const typeTag = `<span class="tag tag-${typeTagStr.toLowerCase()}">${typeTagStr}</span>`;

                const col2 = `
                    <td>
                        <div class="eq-level-cell">
                            <div class="eq-level-info">
                                <img src="${iconPath}" class="eq-small-icon" onerror="this.style.display='none'">
                                <span style="font-size:1.1rem; font-weight:bold;">${item.level}/${item.max}</span>
                                ${actionIcon}
                            </div>
                            <div class="eq-tags">
                                ${typeTag}
                                ${rarityTag}
                            </div>
                        </div>
                    </td>
                `;

                // Col 3: Upgrades
                let col3Content = '';
                if (isMaxed) {
                    col3Content = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#4ce64a; font-weight:bold;">Fully upgraded</div>`;
                } else if (item.status === 'Locked' && item.level === 0) {
                    const reqTH = item.raw ? item.raw.required_townhall : '?';
                    col3Content = `<div style="text-align:center; color:#aaa; padding-top:10px;">Locked (Unlock at TH${reqTH})</div>`;
                } else {
                    // Generate ore cost display
                    if (item.cost && typeof item.cost === 'object') {
                        col3Content = `
                            <div class="upgrade-list">
                                <div class="upgrade-row">
                                    <span>Lvl ${item.level + 1}:</span>
                                    <span class="ore-cost">${formatOreCost(item.cost)}</span>
                                </div>
                            </div>
                        `;
                    } else {
                        col3Content = `<div style="color:#aaa;">Cost data unavailable</div>`;
                    }
                }

                const col3 = `<td>${col3Content}</td>`;

                tr.innerHTML = col1 + col2 + col3;
                tbody.appendChild(tr);
            });
        });
    }

    function formatCostValue(cost) {
        if (typeof cost !== 'number' || !cost) return '-';
        // Show abbreviated format with precise decimals (no rounding)
        if (cost >= 1000000) {
            const val = cost / 1000000;
            // Show up to 2 decimal places, remove trailing zeros
            return parseFloat(val.toFixed(2)) + 'M';
        }
        if (cost >= 1000) {
            const val = cost / 1000;
            return parseFloat(val.toFixed(1)) + 'K';
        }
        return cost;
    }

    function formatTimeShort(seconds) {
        if (!seconds || seconds <= 0) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        // Always show full precision: Xd Xh Xm
        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(' ');
    }

    function formatTimeExtended(sec) {
        if (!sec || sec <= 0) return '-';
        const mo = Math.floor(sec / (86400 * 30));
        const d = Math.floor((sec % (86400 * 30)) / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        if (mo > 0) return `${mo}mo ${d}d ${h}h`;
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h`;
        const m = Math.floor((sec % 3600) / 60);
        return `${m}m`;
    }

    function formatOreCost(costObj) {
        if (!costObj || typeof costObj !== 'object') return '-';
        let parts = [];
        if (costObj.shiny_ore) parts.push(`<span class="c-shiny">${formatK(costObj.shiny_ore)}</span>`);
        if (costObj.glowy_ore) parts.push(`<span class="c-glowy">${formatK(costObj.glowy_ore)}</span>`);
        if (costObj.starry_ore) parts.push(`<span class="c-starry">${formatK(costObj.starry_ore)}</span>`);
        return parts.join(' ') || '-';
    }

    function formatK(num) {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }

    // Real-time countdown variables
    let countdownInterval = null;

    function startRealTimeCountdown() {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        // Update every second
        countdownInterval = setInterval(() => {
            updateAllUpgradingTimers();
        }, 1000);

        // Do an immediate update
        updateAllUpgradingTimers();
    }

    function updateAllUpgradingTimers() {
        // Find all upgrading elements and update their timers
        const upgradingElements = document.querySelectorAll('.upgrading-detailed');

        upgradingElements.forEach(el => {
            const timeEl = el.querySelector('.upgrading-time');
            const progressBar = el.querySelector('.upgrading-progress-bar');
            const progressText = el.querySelector('.upgrading-progress-text');
            const gemCostEl = el.querySelector('.gem-cost');
            const upgradingToEl = el.querySelector('.upgrading-to');

            if (!timeEl) return;

            // Get original timer value from data attribute
            const originalTimer = parseInt(el.dataset.originalTimer || 0);
            const totalTime = parseInt(el.dataset.totalTime || 0);

            if (!originalTimer) return;

            // Calculate real remaining time
            const realRemaining = window.getRealRemainingTime ?
                window.getRealRemainingTime(originalTimer) : originalTimer;

            // Update timer display
            if (realRemaining <= 0) {
                // Upgrade finished - transform the row display
                const row = el.closest('.defense-row');
                if (row) {
                    // Find the level cell and update it
                    const levelCell = row.querySelector('.td-level');
                    if (levelCell) {
                        const levelTextEl = levelCell.querySelector('.level-text');
                        if (levelTextEl && upgradingToEl) {
                            // Extract the new level from "Lv X" text
                            const newLevelMatch = upgradingToEl.textContent.match(/\d+/);
                            if (newLevelMatch) {
                                const newLevel = parseInt(newLevelMatch[0]);
                                const currentText = levelTextEl.textContent; // e.g., "5/10"
                                const maxMatch = currentText.match(/\/(\d+)/);
                                const max = maxMatch ? maxMatch[1] : '?';
                                levelTextEl.textContent = `${newLevel}/${max}`;
                            }
                        }
                    }
                }

                // Update the upgrade info section to show completion
                el.innerHTML = `
                    <div class="upgrade-complete-row">
                        <span class="complete-icon" style="color: #22c55e; font-size: 1.2rem;">✓</span>
                        <span class="complete-text" style="color: #22c55e; font-weight: 600;">Upgrade Complete!</span>
                    </div>
                `;

                // Mark as processed so we don't keep updating
                el.dataset.originalTimer = '0';
            } else {
                // Update time remaining
                timeEl.textContent = '- ' + formatTimeShort(realRemaining);

                // Update progress
                if (totalTime > 0 && progressBar && progressText) {
                    const completed = totalTime - realRemaining;
                    const progress = Math.min(100, Math.max(0, Math.round((completed / totalTime) * 100)));
                    progressBar.style.width = progress + '%';
                    progressText.textContent = progress + '%';
                }

                // Update gem cost
                if (gemCostEl && window.calculateGemCost) {
                    const gemCost = window.calculateGemCost(realRemaining);
                    gemCostEl.innerHTML = `<span class="gem-icon">💎</span>${gemCost}`;
                }
            }
        });

        // Also update builder breakdown timers
        updateBuilderTimers();
    }

    function updateBuilderTimers() {
        // Re-run the builder breakdown update to refresh progress bars and handle completed upgrades
        // This will transition builders to "Idle" when their upgrades finish
        updateBuilderBreakdown();
    }

    // Make functions available globally
    window.startRealTimeCountdown = startRealTimeCountdown;
    window.updateAllUpgradingTimers = updateAllUpgradingTimers;
    window.updateBuilderBreakdown = updateBuilderBreakdown;


    function renderUpgradeSection(category, upgrades) {
        let html = `
            <section class="upgrade-section">
                <div class="section-header">
                    <h3 class="section-title">${category}</h3>
                </div>
                <table class="upgrade-table">
                    <!-- Adjusted headers for new 2-column layout -->
                    <thead>
                        <tr>
                            <th style="width: 120px;">Entity</th>
                            <th>Status & Upgrades</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        upgrades.forEach(upgrade => {
            html += renderUpgradeRow(upgrade);
        });

        html += '</tbody></table></section>';
        return html;
    }

    function renderUpgradeRow(upgrade) {
        const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;
        const isMergedUnbuilt = upgrade.currentLevel === 0 && (upgrade.name.includes("Multi") || upgrade.name.includes("Ricochet") || upgrade.name.includes("Super Wizard"));

        let actionButton = '';
        if (isMaxed && (!upgrade.totalSuperchargeLevels || upgrade.superchargeLevel >= upgrade.totalSuperchargeLevels)) {
            actionButton = `<button class="btn-icon btn-check"><i class="fas fa-check"></i></button>`;
        } else if (isMergedUnbuilt) {
            actionButton = `<button class="btn-icon btn-merge"><i class="fas fa-random"></i></button>`;
        } else {
            actionButton = `<button class="btn-icon btn-wrench"><i class="fas fa-wrench"></i></button>`;
        }

        // Lightning Bolt Generation
        let boltHtml = '';
        if (upgrade.totalSuperchargeLevels > 0) {
            boltHtml = '<div class="supercharge-bolts">';
            for (let i = 1; i <= upgrade.totalSuperchargeLevels; i++) {
                const isFilled = i <= upgrade.superchargeLevel;
                const isPulse = upgrade.isSupercharging && i === upgrade.superchargeLevel + 1;
                const color = isFilled ? '#3b82f6' : '#4b5563';
                const pulseClass = isPulse ? 'bolt-pulse' : '';
                boltHtml += `<i class="fas fa-bolt ${pulseClass}" style="color: ${color}; margin-right: 2px; font-size: 0.8rem;"></i>`;
            }
            boltHtml += '</div>';
        }

        // Determine image path: Use building/trap images if available, fallback to icon
        let imagePath = upgrade.icon || 'images/placeholder.png';
        if (window.buildingImageLoader) {
            const buildingImagePath = window.buildingImageLoader.getImagePath(upgrade);
            if (buildingImagePath !== 'images/placeholder.png') {
                imagePath = buildingImagePath;
            }
        }

        let html = `
            <tr class="defense-row">
                <td class="entity-cell">
                    <div class="entity-stats">
                        <div class="entity-icon-wrapper" style="width:50px; height:50px; margin-bottom:0.25rem;">
                            <img src="${imagePath}" class="entity-icon" alt="${upgrade.name}" onerror="this.src='${upgrade.icon || 'images/placeholder.png'}'; this.style.opacity='0.3'">
                        </div>
                        <div class="count-display">
                            ${upgrade.totalInstances > 1
                ? `<span style="font-size:0.9rem;">Lvl ${upgrade.currentLevel} / ${upgrade.maxLevel}</span> <span style="font-size:0.7em; opacity:0.7; display:block;">(${upgrade.instance}/${upgrade.totalInstances})</span>`
                : `<span style="font-size:0.9rem;">Lvl ${upgrade.currentLevel} / ${upgrade.maxLevel}</span>`}
                        </div>
                        ${boltHtml}
                        <div class="action-btn-group">
                            ${actionButton}
                        </div>
                    </div>
                </td>
                
                <td class="upgrades-cell">
                    <div class="upgrade-details-block">
                        ${renderUpgradeColumnContent(upgrade, isMaxed, isMergedUnbuilt)}
                    </div>
                </td>
            </tr>
        `;
        return html;
    }

    function renderUpgradeColumnContent(upgrade, isMaxed, isMergedUnbuilt) {
        let html = '';
        const hideSupercharges = document.getElementById('hideSupercharges')?.checked;

        if (upgrade.upgradeInfo) {
            // 1. ACTIVE UPGRADE (Progress Bar)
            html += renderActiveProgressBar(upgrade);
        }

        if (isMaxed && (!upgrade.totalSuperchargeLevels || upgrade.superchargeLevel >= upgrade.totalSuperchargeLevels)) {
            // 2. FULLY MAXED STATE (Including Supercharges)
            html += '<div class="fully-upgraded-text">Fully Upgraded</div>';
        } else if (isMaxed && upgrade.totalSuperchargeLevels > 0 && upgrade.superchargeLevel < upgrade.totalSuperchargeLevels) {
            // 3. MAX MAIN LEVEL BUT SUPERCHARGES REMAINING
            if (hideSupercharges) {
                html += '<div class="supercharge-status-text" style="color: var(--accent-orange); font-weight: 600;">Supercharge Available</div>';
            } else {
                html += '<div class="upgrades-list-compact">';

                // Show Supercharge levels
                if (upgrade.superchargeData && upgrade.superchargeData.levels) {
                    const nextSCLevel = upgrade.isSupercharging ? upgrade.superchargeLevel + 2 : upgrade.superchargeLevel + 1;

                    upgrade.superchargeData.levels.forEach(sc => {
                        if (sc.level >= nextSCLevel) {
                            html += `
                                <div class="level-row sc-level-row">
                                    <div class="lvl-col" style="color: #3b82f6;"><i class="fas fa-bolt"></i> Lvl ${sc.level}:</div>
                                    <div class="cost-col">${formatCostRaw(sc.build_cost, upgrade.superchargeData.upgrade_resource || 'Gold')}</div>
                                    <div class="time-col">${formatTimeShort(sc.build_time)}</div>
                                </div>
                            `;
                        }
                    });
                }
                html += '</div>';
            }
        } else {
            // 4. NORMAL UPGRADE LIST
            html += '<div class="upgrades-list-compact">';

            upgrade.missingLevels.slice(0, 3).forEach(level => {
                html += renderCompactUpgradeRow(level);
            });

            if (upgrade.missingLevels.length > 3) {
                html += renderSummaryRow(upgrade.missingLevels.slice(3));
            }

            // Show "Supercharge Available" preview if main levels are done soon? 
            // The image shows supercharge levels listed even when building is not maxed yet (e.g. Lvl 16/17).
            if (!hideSupercharges && upgrade.superchargeData && upgrade.superchargeData.levels) {
                upgrade.superchargeData.levels.forEach(sc => {
                    html += `
                        <div class="level-row sc-level-row">
                            <div class="lvl-col" style="color: #3b82f6;"><i class="fas fa-bolt"></i> Lvl ${sc.level}:</div>
                            <div class="cost-col">${formatCostRaw(sc.build_cost, upgrade.superchargeData.upgrade_resource || 'Gold')}</div>
                            <div class="time-col">${formatTimeShort(sc.build_time)}</div>
                        </div>
                    `;
                });
            }

            // Total Summary
            if (isMergedUnbuilt || upgrade.missingLevels.length > 2) {
                const totalTime = upgrade.missingLevels.reduce((acc, l) => acc + l.time, 0);
                const totalCost = upgrade.missingLevels.reduce((acc, l) => acc + (typeof l.cost === 'number' ? l.cost : 0), 0);

                // Add SC costs to total if not hidden?
                let displayTotalTime = totalTime;
                let displayTotalCost = totalCost;

                if (!hideSupercharges && upgrade.superchargeData && upgrade.superchargeData.levels) {
                    upgrade.superchargeData.levels.forEach(sc => {
                        displayTotalTime += sc.build_time;
                        displayTotalCost += sc.build_cost;
                    });
                }

                html += `
                    <div class="upgrade-summary-card">
                        ${upgrade.missingLevels.length + (hideSupercharges ? 0 : (upgrade.totalSuperchargeLevels || 0))} Upgrades - ${formatCostValue(displayTotalCost)} - ${formatTimeShort(displayTotalTime)}
                    </div>
                 `;
            }

            html += '</div>';
        }

        return html;
    }

    function renderActiveProgressBar(upgrade) {
        // Calculate progress (mock logic unless we have start times)
        // Since we don't have start timestamp, we'll simulate a % based on remaining time vs total time
        // Actually we only have 'timer' (remaining seconds). We need total build time for that level.
        // For now, let's assume 50% or calculate if we had total time.
        // We can look up the "previous" level's build time from static data, but that's complex here.
        // Let's perform a visual trick or just show the bar filled partially based on a heuristic if exact not known.
        // Or if we can find the level data.

        // Simulating 50% for now or use a random consistent number
        const percent = 50;

        return `
            <div class="active-upgrade-container">
                <div class="progress-bar-container">
                    <div class="active-progress-bar" style="width: ${percent}%;">${percent}%</div>
                </div>
                <div class="upgrade-timer-row">
                    <div class="upgrade-timer-text">
                        <i class="fas fa-arrow-up"></i> ${upgrade.currentLevel + 1} - ${formatTime(upgrade.timer)}
                    </div>
                    <div class="gem-cost">
                        <i class="fas fa-gem"></i> ${calcGemCost(upgrade.timer)}
                    </div>
                </div>
            </div>
        `;
    }

    function renderCompactUpgradeRow(level) {
        return `
            <div class="level-row">
                <div class="lvl-col">Lvl ${level.level}:</div>
                <div class="cost-col">${formatCostRaw(level.cost, level.resource)}</div>
                <div class="time-col">${formatTimeShort(level.time)}</div>
            </div>
        `;
    }

    function renderSummaryRow(remainingLevels) {
        return `
            <div class="level-row" style="justify-content:center; color:var(--text-muted); font-size:0.8rem;">
                +${remainingLevels.length} more levels...
            </div>
        `;
    }

    function formatCostRaw(cost, resource) {
        let val = formatCostValue(cost);
        let colorClass = 'cost-gold';
        if (resource && resource.toLowerCase().includes('elixir')) colorClass = 'cost-elixir';
        if (resource && resource.toLowerCase().includes('dark')) colorClass = 'cost-dark';

        // Using emoji might be too cluttered, using color text
        return `<span class="${colorClass}">${val}</span>`;
    }

    function formatCostValue(cost) {
        if (typeof cost !== 'number') return 'Ores';
        // Show abbreviated format with precise decimals (no rounding)
        if (cost >= 1000000) {
            const val = cost / 1000000;
            return parseFloat(val.toFixed(2)) + 'M';
        }
        if (cost >= 1000) {
            const val = cost / 1000;
            return parseFloat(val.toFixed(1)) + 'K';
        }
        return cost;
    }

    function formatTimeShort(seconds) {
        if (!seconds) return '0m';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        // Always show full precision: Xd Xh Xm
        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(' ');
    }

    // Reuse existing formatTime for the active timer detailed view
    function formatTime(seconds) {
        if (seconds === 0) return 'Instant';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours > 0) str += `${hours}h `;
        if (minutes > 0 || (days === 0 && hours === 0)) str += `${minutes}m`;
        return str;
    }

    function calcGemCost(seconds) {
        if (seconds <= 0) return 0;

        // Reference points from image/game data: [seconds, gems]
        const points = [
            [0, 0],
            [60, 1],             // 1 min
            [3600, 20],          // 1 hour
            [86400, 260],        // 1 day
            [604800, 1000],      // 7 days
            [1209600, 1863],     // 14 days
        ];

        // Find the range [p1, p2] containing 'seconds'
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            if (seconds >= p1[0] && seconds <= p2[0]) {
                // Linear interpolation: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
                const ratio = (seconds - p1[0]) / (p2[0] - p1[0]);
                const gems = p1[1] + ratio * (p2[1] - p1[1]);
                return Math.floor(gems);
            }
        }

        // For time > 14 days, extrapolate using the last slope (7d to 14d rate)
        // Rate: (1863 - 1000) / (14d - 7d) = 863 / 7d ≈ 123 gems per day
        const lastP = points[points.length - 1]; // [14 days, 1863]
        const prevP = points[points.length - 2]; // [7 days, 1000]
        const slope = (lastP[1] - prevP[1]) / (lastP[0] - prevP[0]);

        const gems = lastP[1] + (seconds - lastP[0]) * slope;
        return Math.floor(gems);
    }

    function formatCost(cost, resource) {
        // Keeping this for compatibility if used elsewhere, 
        // but renderCompactUpgradeRow uses formatCostRaw
        return formatCostRaw(cost, resource);
    }
});
