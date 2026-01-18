console.log('Clash Ninja Script loaded');

window.openVillageShareModal = function (tag) {
    alert('Share feature not implemented in this local version.');
};

document.addEventListener('DOMContentLoaded', () => {
    let staticData = null;
    let userData = null;
    let currentCategory = 'defenses';
    let allUpgrades = [];

    // DOM Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const statsBtn = document.getElementById('statsBtn');
    const debugBtn = document.getElementById('debugBtn');
    const uploadModal = document.getElementById('uploadModal');
    const modalClose = document.getElementById('modalClose');
    const parseBtn = document.getElementById('parseBtn');
    const demoBtn = document.getElementById('demoBtn');
    const jsonInput = document.getElementById('jsonInput');
    const categoryTabs = document.querySelectorAll('.category-tab');
    const upgradeTablesContainer = document.getElementById('upgradeTablesContainer');
    const searchBar = document.getElementById('searchBar');
    const hideMaxedCheckbox = document.getElementById('hideMaxed');

    // Load Static Data
    fetch('static_data.json')
        .then(response => response.json())
        .then(data => {
            staticData = data;
            console.log('Static Data loaded successfully');
        })
        .catch(err => console.error('FATAL: Could not load static_data.json', err));

    // Modal Controls
    uploadBtn.addEventListener('click', () => {
        uploadModal.classList.add('active');
    });

    modalClose.addEventListener('click', () => {
        uploadModal.classList.remove('active');
    });

    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
        }
    });

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
            userData = JSON.parse(inputStr);
            analyzeVillage(userData);
            uploadModal.classList.remove('active');
        } catch (e) {
            console.error(e);
            alert('JSON Error: ' + e.message);
        }
    });

    // Demo Button
    demoBtn.addEventListener('click', () => {
        if (!staticData) return;
        fetch('user_data_test_13.json')
            .then(r => r.json())
            .then(data => {
                userData = data;
                jsonInput.value = JSON.stringify(data, null, 2);
                analyzeVillage(data);
                uploadModal.classList.remove('active');
            })
            .catch(err => console.error('Could not load demo data', err));
    });

    // Category Tab Switching
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            renderCurrentCategory();
        });
    });

    // Search and Filter
    searchBar.addEventListener('input', renderCurrentCategory);
    hideMaxedCheckbox.addEventListener('change', renderCurrentCategory);

    function detectUserTownHall(userData) {
        if (!userData.buildings) return 0;
        const thBuilding = userData.buildings.find(b => b.data === 1000001);
        return thBuilding ? thBuilding.lvl : 0;
    }

    function analyzeVillage(userData) {
        try {
            const userTH = detectUserTownHall(userData);
            if (userTH === 0) {
                alert('Could not detect Town Hall level.');
                return;
            }

            // Update Village Info
            updateVillageInfo(userData, userTH);

            // Calculate Progressions
            const results = calculateProgressions(userData, staticData, userTH);
            console.log('Progression Results:', results);

            // Update Progress Bars
            updateProgressBars(results);

            // Generate Upgrade Data
            if (window.analyzeUpgrades) {
                allUpgrades = window.analyzeUpgrades(userData, staticData, userTH);
                renderCurrentCategory();
            }

        } catch (error) {
            console.error('Analysis Error:', error);
            alert('Failed to analyze village: ' + error.message);
        }
    }

    function updateVillageInfo(userData, userTH) {
        // Village Name
        const villageNameEl = document.getElementById('villageName');
        if (userData.name && villageNameEl) {
            villageNameEl.textContent = userData.name;
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

        // TH Badge
        const thBadgeEl = document.getElementById('thBadge');
        if (thBadgeEl) {
            thBadgeEl.textContent = `Town Hall ${userTH}`;
        }

        // TH Image
        const thImageEl = document.getElementById('thImage');
        if (thImageEl) {
            thImageEl.src = `/images/entities/1_${userTH}.png`;
        }
    }

    function calculateProgressions(userData, staticData, userTH) {
        const equipmentResult = window.calculateEquipmentClashNinjaFinal
            ? window.calculateEquipmentClashNinjaFinal(userData, staticData, userTH)
            : { percent: 0 };

        return {
            structures: window.calculateStructures ? window.calculateStructures(userData, staticData, userTH) : { percent: 0 },
            lab: window.calculateLab ? window.calculateLab(userData, staticData, userTH) : { percent: 0 },
            heroes: window.calculateHeroesCostBased ? window.calculateHeroesCostBased(userData, staticData, userTH) : { percent: 0 },
            equipment: equipmentResult,
            pets: window.calculatePets ? window.calculatePets(userData, staticData, userTH) : { percent: 0 },
            walls: window.calculateWalls ? window.calculateWalls(userData, staticData, userTH) : { percent: 0 }
        };
    }

    function updateProgressBars(results) {
        updateProgressBar('fill-structures', 'percent-structures', results.structures.percent);
        updateProgressBar('fill-lab', 'percent-lab', results.lab.percent);
        updateProgressBar('fill-heroes', 'percent-heroes', results.heroes.percent);
        updateProgressBar('fill-equipment', 'percent-equipment', results.equipment.percent);
        updateProgressBar('fill-pets', 'percent-pets', results.pets.percent);
        updateProgressBar('fill-walls', 'percent-walls', results.walls.percent);
        updateProgressBar('fill-supercharge', 'percent-supercharge', 0); // Placeholder
        updateProgressBar('fill-crafted', 'percent-crafted', 0); // Placeholder
    }

    function updateProgressBar(fillId, textId, percent) {
        const fillEl = document.getElementById(fillId);
        const textEl = document.getElementById(textId);

        if (fillEl && textEl) {
            // Truncate to 3 decimal places (no rounding up)
            // e.g. 58.29539 -> 58.295
            const factor = 10;
            const formatted = (Math.floor(percent * factor) / factor).toFixed(1);
            fillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            textEl.textContent = `${formatted}%`;
        }
    }

    function renderCurrentCategory() {
        if (allUpgrades.length === 0) {
            upgradeTablesContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 3rem;">No data loaded. Please upload your village JSON.</p>';
            return;
        }

        const searchTerm = searchBar.value.toLowerCase();
        const hideMaxed = hideMaxedCheckbox.checked;

        // Filter upgrades by category
        let filtered = allUpgrades.filter(upgrade => {
            // Map categories
            const categoryMap = {
                'defenses': ['Defences', 'Traps'],
                'structures': ['Resources', 'Army Buildings'],
                'lab': ['Troops', 'Spells', 'Siege Machines'],
                'heroes': ['Heroes'],
                'equipment': ['Equipment'],
                'pets': ['Pets'],
                'walls': ['Walls']
            };

            const categories = categoryMap[currentCategory] || [currentCategory];
            if (!categories.includes(upgrade.category)) return false;

            // Apply search filter
            if (searchTerm && !upgrade.name.toLowerCase().includes(searchTerm)) return false;

            // Apply maxed filter
            if (hideMaxed && upgrade.currentLevel >= upgrade.maxLevel) return false;

            return true;
        });

        // Group by entity type (for things like "Air Defense")
        const grouped = {};
        filtered.forEach(upgrade => {
            if (!grouped[upgrade.category]) {
                grouped[upgrade.category] = [];
            }
            grouped[upgrade.category].push(upgrade);
        });

        // Render
        let html = '';
        for (const [category, upgrades] of Object.entries(grouped)) {
            html += renderUpgradeSection(category, upgrades);
        }

        if (html === '') {
            html = '<p style="text-align:center; color: var(--text-secondary); padding: 3rem;">No items found matching your filters.</p>';
        }

        upgradeTablesContainer.innerHTML = html;
    }

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
        if (isMaxed) {
            actionButton = `<button class="btn-icon btn-check"><i class="fas fa-check"></i></button>`;
        } else if (isMergedUnbuilt) {
            actionButton = `<button class="btn-icon btn-merge"><i class="fas fa-random"></i></button>`;
        } else {
            // Default wrench for normal upgrades
            actionButton = `<button class="btn-icon btn-wrench"><i class="fas fa-wrench"></i></button>`;
        }

        let html = `
            <tr>
                <td class="entity-cell">
                    <div class="entity-stats">
                        <div class="entity-icon-wrapper" style="width:50px; height:50px; margin-bottom:0.25rem;">
                            <img src="${upgrade.icon || '/images/placeholder.png'}" class="entity-icon" alt="${upgrade.name}" onerror="this.style.opacity='0.3'">
                        </div>
                        <div class="count-display">
                            ${upgrade.totalInstances > 1
                ? `Lvl ${upgrade.currentLevel} <span style="font-size:0.8em; opacity:0.7">(${upgrade.instance}/${upgrade.totalInstances})</span>`
                : `Lvl ${upgrade.currentLevel}`}
                        </div>
                        <div class="lightning-icon"><i class="fas fa-bolt"></i></div>
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

        if (upgrade.isUpgrading) {
            // 1. ACTIVE UPGRADE (Progress Bar)
            html += renderActiveProgressBar(upgrade);
        }

        if (isMaxed) {
            // 2. MAXED STATE
            html += '<div class="fully-upgraded-text">Fully Upgraded</div>';
        } else {
            // 3. UPGRADE LIST
            html += '<div class="upgrades-list-compact">';

            // Header for the list slightly different? No, just list items.
            // If active, we start showing from the NEXT level in the list below the bar? 
            // The logic in analyze_upgrades already prepares `missingLevels`. 
            // If upgrading, missingLevels starts from current+2.

            upgrade.missingLevels.slice(0, 3).forEach(level => {
                html += renderCompactUpgradeRow(level);
            });

            if (upgrade.missingLevels.length > 3) {
                html += renderSummaryRow(upgrade.missingLevels.slice(3));
            }

            // Supercharge placeholder (logic can be improved later)
            if (upgrade.currentLevel > 10) { // Arbitrary check for demo
                html += '<div class="supercharge-text">Supercharge Available</div>';
            }

            // Total Summary for Unbuilt items or general info
            if (isMergedUnbuilt || upgrade.missingLevels.length > 2) {
                const totalTime = upgrade.missingLevels.reduce((acc, l) => acc + l.time, 0);
                const totalCost = upgrade.missingLevels.reduce((acc, l) => acc + (typeof l.cost === 'number' ? l.cost : 0), 0);
                html += `
                    <div class="upgrade-summary-card">
                        ${upgrade.missingLevels.length} Levels - ${formatCostValue(totalCost)} - ${formatTimeShort(totalTime)}
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

        // Formats with up to 2 decimal places, removing trailing zeros (e.g. 1.50M -> 1.5M)
        if (cost >= 1000000) return parseFloat((cost / 1000000).toFixed(2)) + 'M';
        if (cost >= 1000) return parseFloat((cost / 1000).toFixed(2)) + 'K';
        return cost;
    }

    function formatTimeShort(seconds) {
        if (!seconds) return '0d';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
        }
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
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
