# Building Image Loader Implementation

## Overview
A system has been implemented to automatically display building images from the `home-base` folder based on the user's current building level in the upgrade table.

## How It Works

### 1. **Building Image Loader Module** (`buildingImageLoader.js`)
This module handles:
- **Name Mapping**: Converts building names from `static_data.json` to their corresponding folder names in `home-base/buildings` and `home-base/traps`
- **Image Path Generation**: Creates the correct file path based on building type and level
- **Image Preloading**: Optionally preloads images to avoid delays

### 2. **Integration Points**

#### In HTML (`index.html`):
- Added `<script src="buildingImageLoader.js"></script>` before other scripts

#### In JavaScript (`script.js`):
- Updated `renderUpgradeRow()` function to use `buildingImageLoader.getImagePath(upgrade)` for buildings and traps
- Falls back to existing icon if no matching building image found

### 3. **Image Path Structure**

For **Buildings**:
```
home-base/buildings/{folder-name}/{folder-name}-{level}.png

Example: home-base/buildings/cannon/cannon-5.png
         home-base/buildings/archer-tower/archer-tower-12.png
```

For **Traps**:
```
home-base/traps/{folder-name}/{folder-name}-{level}.png

Example: home-base/traps/bomb/bomb-3.png
         home-base/traps/spring-trap/spring-trap-7.png
```

### 4. **Building Name Mappings**

The system includes comprehensive mappings for all buildings and traps:

**Defensive Buildings:**
- Army Camp → `army-camp`
- Barracks → `barracks`
- Cannon → `cannon`
- Archer Tower → `archer-tower`
- Mortar → `mortar`
- Air Defense → `air-defense`
- Wizard Tower → `wizard-tower`
- Hidden Tesla → `hidden-tesla`
- Inferno Tower → `inferno-tower`
- Eagle Artillery → `eagle-artillery`
- X-Bow → `x-bow`
- And many more...

**Resource Buildings:**
- Gold Storage → `gold-storage`
- Gold Mine → `gold-mine`
- Elixir Storage → `elixir-storage`
- Dark Elixir Storage → `dark-elixir-storage`
- And more...

**Traps:**
- Bomb → `bomb`
- Spring Trap → `spring-trap`
- Air Bomb → `air-bomb`
- Giant Bomb → `giant-bomb`
- And more...

### 5. **Features**

✅ **Level-Based Images**: Each building shows the correct image for its current level
✅ **Automatic Fallback**: If a building image is not found, falls back to placeholder
✅ **Error Handling**: Includes `onerror` handlers to gracefully handle missing images
✅ **Preloading**: Can preload images to prevent loading delays
✅ **Extensible**: Easy to add new buildings or modify name mappings

### 6. **Usage Example**

When a user uploads their village data:
1. The system analyzes all buildings and their current levels
2. When rendering a row for "Cannon" at level 5:
   - Path is generated: `home-base/buildings/cannon/cannon-5.png`
   - Image is displayed showing Cannon level 5
3. If the user upgrades to level 6:
   - Next time data is processed, the path updates to `home-base/buildings/cannon/cannon-6.png`

### 7. **Implementation Files Modified**

1. **Created**: `/home/sabin/clan-ninja-clone/buildingImageLoader.js` - New utility module
2. **Modified**: `/home/sabin/clan-ninja-clone/index.html` - Added script include
3. **Modified**: `/home/sabin/clan-ninja-clone/script.js` - Updated renderUpgradeRow() function

## Testing

To test the implementation:
1. Upload a village JSON file
2. Navigate to any category (Defenses, Resources, Traps, etc.)
3. Verify that building images display correctly
4. Check that the correct level image appears for each building

## Future Enhancements

- Add hero and equipment image loading from home-base
- Add animation transitions when levels change
- Add tooltip with building stats on hover
- Cache loaded images for performance
