# AI Coding Assistant Instructions for Battlefield 6 Portal Scripting

## Project Overview

This is a TypeScript template for creating Battlefield 6 Portal experiences (custom game modes/mods). 
Code is compiled via a custom bundler and manually uploaded to Portal's web editor.

**Key Technologies:**

- TypeScript 5.9.3 with strict mode
- Node.js 23.0.0+ required
- QuickJS runtime (Portal's JavaScript engine)
- bf6-portal-bundler for Portal-specific compilation
- bf6-portal-mod-types for game API type definitions
- bf6-portal-utils for UI, logging, map detection utilities

## Common Commands

```bash
npm run build              # Compile to dist/bundle.ts and dist/bundle.strings.json
npm run lint               # Check for linting errors
npm run lint:fix           # Auto-fix linting issues
npm run prettier           # Format code
npm run export-thumbnail   # Resize/compress thumbnail to Portal specs (352x248px, 78KB max)
npm run minify-spatials    # Minify spatial JSON files in ./spatials/ to ./dist/spatials/
```

## Architecture

### Event-Driven Model

Portal executes code through event handler functions exported from `src/index.ts`. The game engine calls these automatically:

- **One-time events**: `OnPlayerDeployed`, `OnPlayerDied`, `OnPlayerTeamSwitch`, `OnVehicleSpawned`, etc.
- **Ongoing events**: `OngoingPlayer`, `OngoingGlobal` - run 30x/second (keep minimal!)

### String System

All in-game text must be pre-defined in `*.strings.json` files. The bundler collects all `*strings.json` files and outputs `bundle.strings.json`. Access strings via `mod.Message(mod.stringkeys.path.to.key)`.


### bf6-portal-mod-types

This node package provides Type definitions for the Portal API.

All Portal API functionality is accessed through the global `mod` namespace:

- `mod.GetSoldierState()` - Query player state (position, health, etc.)
- `mod.DisplayNotificationMessage()` - Show UI messages
- `mod.Message()` - Create string references
- `mod.Wait()` - Async delay

**IMPORTANT:** 

- Always start by reading the types in `node_modules/bf6-portal-mod-types/index.d.ts`
- DO NOT make up methods in the mod namespace that aren't defined in `bf6-portal-mod-types/index.d.ts`


### Key Directories

- `src/` - Source code; `index.ts` is the entry point with all event handlers
- `src/<mod-name>/` - Individual game mode/utility folder with mode-specific code
- `src/modlib/` - Official Portal helper library (excluded from linting)
- `spatials/` - Spatial Editor JSON map files (optional)
- `dist/` - Build output (upload these files to Portal Web Editor)

### Utility Libraries (bf6-portal-utils)

- `bf6-portal-utils/ui` - Object-oriented UI system wrapper
- `bf6-portal-utils/logger` - In-game debug logging (static rows or scrolling)
- `bf6-portal-utils/map-detector` - Working map detection (built-in is broken)
- `bf6-portal-utils/interact-multi-click-detector` - Detect triple-click for menus

## Development Notes

- No hot reload - must rebuild, upload bundle.ts and bundle.strings.json to Portal Web Editor, restart server
- `Ongoing*` functions run 30x/second; keep them fast to avoid lag
- Portal log file (PC): `C:\Users\username\AppData\Local\Temp\Battlefield™ 6\PortalLog.txt`


### Function Name Conflicts

**Avoid duplicate exported function names across files!**

The bundler merges all files into one bundle. 
If two files export functions with the same name, you get:

```
Cannot redeclare exported variable 'functionName'
Duplicate function implementation
```

Solution: Use unique names and namespaces or don't export helper functions that are only used internally.

---

## API Lessons Learned

### Player State Queries

**CRITICAL: Check if player is deployed/alive before applying any actions to a player!**

```typescript
// BAD - throws "PlayerNotDeployed" exception if player not spawned
mod.AddEquipment(player, weapon);

// GOOD - check IsAlive first, or wrap in try/catch
if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) {
    // Safe to apply actions to player
    mod.AddEquipment(player, weapon);
}
```

### Teams API

**There is NO `mod.AllTeams()` function!**

```typescript
// BAD - does not exist
const teams = mod.AllTeams();

// GOOD - get team by ID directly (teams are 1-indexed)
const team = mod.GetTeam(teamId); // teamId: number
```

To iterate teams, iterate through players and collect existing teams:

```typescript
const teamsSet = new Set<mod.Team>();
const allPlayers = mod.AllPlayers();
for (let i = 0; i < mod.CountOf(allPlayers); i++) {
    const player = mod.ValueInArray(allPlayers, i) as mod.Player;
    const team = mod.GetTeam(player);
    teamsSet.add(team);
}
```

A useful helper from modlib

```typescript
import { getPlayersInTeam } from '../modlib/index.ts';

// Returns array of players on a team
const players: mod.Player[] = getPlayersInTeam(team);
```

### Player Spotting

```typescript
// Spot a player for all players (visible on minimap + 3D marker)
mod.SpotTarget(player, duration, mod.SpotStatus.SpotInBoth);

// SpotStatus options:
// - SpotInBoth: minimap + 3D world marker
// - SpotInMinimap: minimap only
// - SpotInWorld: 3D marker only
// - Unspot: remove spotting

// Remove spotting
mod.SpotTarget(player, mod.SpotStatus.Unspot);
```

### Game Mode Settings

```typescript
// Set via code (cannot be set in Portal Editor for custom modes)
mod.SetGameModeTargetScore(20);      // Score to win
mod.SetGameModeTimeLimit(1200);      // Time limit in seconds
mod.EndGameMode(winningTeam);        // End game with winner
```

### Array Iteration Pattern

Portal uses its own array type. Convert or iterate manually:

```typescript
// Manual iteration
const allPlayers = mod.AllPlayers();
const count = mod.CountOf(allPlayers);
for (let i = 0; i < count; i++) {
    const player = mod.ValueInArray(allPlayers, i) as mod.Player;
    // ...
}

// Or use modlib helper
import { ConvertArray } from '../modlib/index.ts';
const playersArray = ConvertArray(mod.AllPlayers());
```

### Async/Await with mod.Wait()

```typescript
// Using .then()
mod.Wait(3).then(() => {
    // Runs after 3 seconds
});

// Using async/await
async function example() {
    await mod.Wait(3);
    // Runs after 3 seconds
}
```

### Custom UI Best Practices

The custom UI system is based on single elements called "widgets". 
The main widgets are containers (panels) that hold other widgets (text, images, progress bars, etc.).
Widgets can have a parent-child relationship for nesting.
Widgets are layed out with relative positioning inside their parent container using anchor positions plus offsets from that relative position.

1. Use unique widget names to find/update widgets later
2. Store widget names as constants
3. UI widgets by default are global (seen by all players) unless a specific receiver is set (team or player)
4. Use `mod.GetUIRoot()` as parent for top-level widgets
5. Containers can be nested for complex layouts

```typescript
const WIDGET_NAME = 'my_unique_widget';
mod.AddUIText(WIDGET_NAME, ...);

// Later, find and update
const widget = mod.FindUIWidgetWithName(WIDGET_NAME);
mod.SetUITextLabel(widget, newMessage);
```

#### Known Issues

When using a team as a receiver for UI widgets, players who join mid-game do not receive the UI automatically.
To workaround, listen for `OnPlayerJoin` and re-draw the UI for the team.

---

## Game Mode Development Checklist

1. **Create module folder** under `src/` (e.g., `src/my-mode/`)
2. **Create strings.json** for all UI text
3. **Create main controller class** with methods for each event
4. **Integrate in src/index.ts** - import and call controller methods from event handlers
5. **Run `npm run build`** and check for TypeScript errors
6. **Test in Portal** - check `PortalLog.txt` for runtime errors