# Clash Ninja Progress Tracker Functionality Study

This document outlines the formulas, methods, and constraints used by Clash Ninja (and similar Clash of Clans trackers) to calculate player progression.

## 1. Progression Calculation Formulas & Methods

Clash Ninja primarily uses **Resource Cost** as the main metric for calculating progression percentage, with **Time** as a secondary metric for planning.

### A. General Progression (Structures, Lab, Heroes, Walls)
The progress percentage for any category is typically calculated based on the cumulative cost of upgrades completed versus the total cost of all upgrades available for that Town Hall level.

**Formula:**
```
Progress Percentage = (Total Cost of Completed Upgrades / Total Cost of All Available Upgrades) * 100
```

*   **Rationale:** Higher-level upgrades (especially Heroes and Walls) are significantly more expensive. A simple count of "levels completed" would give a misleadingly high progress percentage early on. Cost-based tracking reflects the actual "effort" remaining.
*   **Time-Based Tracking (Secondary):** Used for planning (Gantt charts).
    *   *Formula:* `(Total Build Time of Completed Upgrades / Total Build Time Required) * 100` helps estimate "days remaining" but isn't the primary "progress bar" stat usually.

### B. Special Categories

#### 1. Laboratory (Lab)
*   **Metric:** Resource Cost (Elixir/Dark Elixir) or Time.
*   **Notes:** Magic items (Books/Hammers) instantly remove cost and time from the "Remaining" totals.

#### 2. Heroes
*   **Metric:** Resource Cost (Dark Elixir/Elixir) & Time.
*   **Constraint:** Heroes must be awake to be used (unless special events/equipment change this), but tracking monitors levels regardless of state.

#### 3. Hero Equipment (Blacksmith)
*   **Metric:** Ores (Shiny, Glowy, Starry).
*   **Tracking:** Progress is tracked by the total amount of Ores required to max out specific equipment pieces.
*   **Levels:**
    *   **Common:** Max Level 18.
    *   **Epic:** Max Level 27.
*   **Cost Calculation:**
    *   **Shiny Ore:** Basic levels.
    *   **Glowy Ore:** Milestone levels (every 3 levels for Common, up to L9 for Epic).
    *   **Starry Ore:** Epic equipment exclusives (Level 10+ milestones).

#### 4. Pets
*   **Unlock:** Via Pet House (Town Hall 14+).
*   **Metric:** Resource Cost (Dark Elixir) & Time.
*   **Levels:** Each pet has its own level cap (usually 10 or 15).

#### 5. Supercharges (Town Hall 16+)
*   **Definition:** Temporary buffs for Max Level buildings.
*   **Requirement:** Building must be fully maxed for the current Town Hall.
*   **Tracking:** These are strictly optional/temporary "levels" and are often tracked separately or as a "bonus" completion percentage, as they are removed when a new permanent level is released.

#### 6. Crafted Defenses (Town Hall 17+)
*   **Definition:** Seasonal, temporary defenses built at the Crafting Station.
*   **System:** Players track the "Modules" installed.
*   **Requirement:** Max Town Hall level typically.
*   **Nature:** Seasonal. Progress resets or converts to resources (Sparky Stones) at the end of a season. Trackers usually treating this as a recurring task or separate "Seasonal" tab.

#### 7. Merged Defenses (TH16+)
*   **Definition:** Permanent combination of two defenses.
*   **Method:**
    *   **Ricochet Cannon:** 2x Max Cannon.
    *   **Multi-Archer Tower:** 2x Max Archer Tower.
*   **Tracking:** The "input" buildings are consumed. The new building starts at Level 1. Progress calculation removes the old buildings from the "Structures" list and adds the new Merged Defense to the list.

---

## 2. Upgrade Constraints & Rules

These rules dictate when an upgrade is "Available" to be tracked or started.

### A. Town Hall Gating
*   **General Rule:** All buildings, traps, hero levels, and troop levels have a hard cap determined by the Town Hall level.
*   **Tracker Logic:** A tracker will not show "Level 21 Cannon" as an available upgrade if the user is TH13, even if they have the resources.

### B. Pet Unlocks
Pets are gated by the **Pet House** level (which is gated by TH level).
*   **TH14 (Pet House 1-4):**
    *   Lvl 1: L.A.S.S.I
    *   Lvl 2: Electro Owl
    *   Lvl 3: Mighty Yak
    *   Lvl 4: Unicorn
*   **TH15+:** Frosty, Diggy, Poison Lizard, Phoenix via higher Pet House levels.

### C. Gear Up Requirements (Master Builder)
Defenses in the Home Village can be "Geared Up" to add a second mode. This requires a specific level of defense in the **Home Village** AND a specific level of defense in the **Builder Base**.
*   **Cannon (Burst Mode):**
    *   Home Village: Cannon Level 7+
    *   Builder Base: Double Cannon Level 4+
*   **Archer Tower (Fast Attack):**
    *   Home Village: Archer Tower Level 10+
    *   Builder Base: Archer Tower Level 6+
*   **Mortar (Burst Mode):**
    *   Home Village: Mortar Level 8+
    *   Builder Base: Multi-Mortar Level 8+

### D. Merged Defense Constraints
*   **Irreversible:** Once merged, the user cannot un-merge.
*   **Requirement:** The two "Feeder" buildings must be at the maximum level for the *previous* Town Hall (typically) to be eligible for merging.
