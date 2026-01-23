// Render Stats Module
// Aggregates data from all calculation modules and renders a stats table

window.renderStats = function (userVillage, staticData, userTH) {
    if (!staticData || !userVillage) return;

    // Data Gathering
    const stats = [];

    // 1. Structures
    const structures = window.calculateStructuresCostBased(userVillage, staticData, userTH);
    stats.push({
        name: 'Structures',
        icon: '/images/buildings/1000001.png', // TH icon or general builder icon
        data: structures
    });

    // 2. Lab
    const lab = window.calculateLabCostBased(userVillage, staticData, userTH);
    stats.push({
        name: 'Lab',
        icon: '/images/buildings/1000006.png', // Lab icon
        data: lab
    });

    // 3. Heroes
    const heroes = window.calculateHeroesCostBased(userVillage, staticData, userTH);
    stats.push({
        name: 'Heroes',
        icon: '/images/heroes/1000015.png', // King icon or general hero icon
        data: heroes
    });

    // 4. Equipment
    const equipment = window.calculateEquipmentClashNinjaFinal(userVillage, staticData, userTH);
    stats.push({
        name: 'Hero Equipment',
        icon: '/images/equipment/Equipment_Shiny_Ore.png', // Ore icon? or Anvil?
        data: equipment
    });

    // 5. Pets
    const pets = window.calculatePets(userVillage, staticData, userTH);
    stats.push({
        name: 'Pets',
        icon: '/images/pets/Pet_House.png', // Pet House icon
        data: pets
    });

    // 6. Walls
    const walls = window.calculateWalls(userVillage, staticData, userTH);
    stats.push({
        name: 'Walls',
        icon: '/images/buildings/1000010.png', // Wall icon
        data: walls
    });

    // Helper to format large numbers
    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    // Helper to format time (Total: 33mo 29d 20h)
    // Always show months, days, and hours for consistency
    function formatTimeLong(seconds) {
        if (!seconds) return '0mo 0d 0h';
        const months = Math.floor(seconds / (86400 * 30)); // 30 day months
        let rem = seconds % (86400 * 30);
        const days = Math.floor(rem / 86400);
        rem %= 86400;
        const hours = Math.floor(rem / 3600);

        // Format: 33mo 29d 20h (always show all three)
        return `${months}mo ${days}d ${hours}h`;
    }

    // Builders Calculation (Time / N)
    // Assuming standard builder counts per category? Or global?
    // Screenshot shows "With 6 builders", "With 2 builders" (Guardians), "With 3 builders" (Crafted Def).
    // I'll stick to 6 builders for Structures/Heroes standard, maybe 1 for Lab (Research runs singly? Or "With 1 Lab"?).
    // Lab usually has 1 slot (2 with goblin researcher but temporary).
    // Heroes can be upgraded in parallel.
    // I 'll apply a default divider based on context or user setting (if any).
    // For now I'll hardcode typical max: 6 for structures/heroes, 1 for lab, 4 for pets (Pet House upgrade slots? No, usually 1 active pet upgrade allowed at a time. Wait, Pet House has multiple slots? No, 1 slot. "With 1 builder"?).
    // Actually, user data might have builder count. Assuming 5 or 6.

    const builders = userVillage.builders || 5;

    let html = `
    <div class="stats-container">
        <div class="stats-header">
            <div class="col-type">Type</div>
            <div class="col-resource">Resource</div>
            <div class="col-total">Total</div>
            <div class="col-time">Time</div>
        </div>
    `;

    stats.forEach(cat => {
        const res = cat.data.resources || {};
        const totalRows = Object.keys(res).filter(k => res[k].total > 0).length;
        if (totalRows === 0) return; // Skip empty cats

        // Determine builders divider
        let divider = 1;
        let dividerLabel = "1 builder";
        if (cat.name === 'Structures' || cat.name === 'Walls' || cat.name === 'Heroes') {
            divider = builders;
            dividerLabel = `${builders} builders`;
        } else if (cat.name === 'Lab') {
            divider = 1;
            dividerLabel = "1 lab";
        } else if (cat.name === 'Pets') {
            divider = 1; // 1 pet at a time
            dividerLabel = "1 pet house";
        }

        html += `<div class="stats-row">`;

        // Type Col
        html += `
            <div class="col-type cell">
                <img src="${cat.icon}" class="icon-lg">
                <span>${cat.name}</span>
            </div>
        `;

        // Resource & Total Cols (grouped)
        html += `<div class="col-middle-group">`;

        // Only show Mixed for Walls, skip Mixed for other categories
        const resourceKeys = Object.keys(res).filter(k => {
            if (res[k].total <= 0) return false;
            // Skip Mixed resource for non-wall categories
            if (k === 'Mixed' && cat.name !== 'Walls') return false;
            return true;
        });
        resourceKeys.forEach((key, idx) => {
            const data = res[key];
            const resName = key === 'DarkElixir' ? 'Dark Elixir' : key;

            // Calculate REMAINING cost (total - completed)
            const remainingCost = data.total - data.completed;

            // Resource Icon?
            let resIcon = '';
            if (key === 'Gold') resIcon = 'gold';
            else if (key === 'Elixir') resIcon = 'elixir';
            else if (key === 'DarkElixir') resIcon = 'dark-elixir'; // check css class
            else if (key === 'Shiny') resIcon = 'shiny-ore';
            else if (key === 'Glowy') resIcon = 'glowy-ore';
            else if (key === 'Starry') resIcon = 'starry-ore';
            else if (key === 'Mixed') resIcon = 'gold-elixir-mix'; // Custom?

            // Fallback for icons if we don't have CSS classes yet
            // Using text color classes if available
            const colorClass = key.toLowerCase();

            html += `
                <div class="res-row ${idx > 0 ? 'border-top' : ''}">
                    <div class="col-resource sub-cell">
                        <span class="res-icon ${resIcon}"></span>
                        <span class="${colorClass}">${resName}</span>
                    </div>
                    <div class="col-total sub-cell">
                        <span class="${colorClass}">${formatNumber(remainingCost)}</span>
                    </div>
                </div>
             `;
        });
        html += `</div>`; // End middle group

        // Time Col
        // Now using timeTotal and timeCompleted from calculation modules
        const timeTotal = cat.data.timeTotal || 0;
        const timeCompleted = cat.data.timeCompleted || 0;
        const timeRemaining = timeTotal - timeCompleted;

        const timeStr = timeRemaining > 0 ? formatTimeLong(timeRemaining) : '0mo 0d 0h';
        const dividedTimeStr = timeRemaining > 0 ? formatTimeLong(timeRemaining / divider) : '0mo 0d 0h';

        html += `
            <div class="col-time cell">
                ${timeRemaining > 0 ? `
                    <div class="time-main">Total:<br>${timeStr}</div>
                    <div class="time-sub">With ${dividerLabel}:<br>${dividedTimeStr}</div>
                ` : '<span style="color: var(--text-muted);">Completed</span>'}
            </div>
        `;



        html += `</div>`; // End stats-row
    });

    html += `</div>`;

    // Inject into a modal or container
    let container = document.getElementById('stats-modal-content');
    if (!container) {
        // Create modal if missing (rough implementation)
        const modal = document.createElement('div');
        modal.id = 'stats-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content stats-modal-wrapper">
                <span class="close-modal">&times;</span>
                <h2>Progression Stats</h2>
                <div id="stats-modal-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
        container = document.getElementById('stats-modal-content');

        // Close logic
        modal.querySelector('.close-modal').onclick = () => modal.classList.remove('active');
        window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    }

    container.innerHTML = html;
    document.getElementById('stats-modal').classList.add('active');
};
