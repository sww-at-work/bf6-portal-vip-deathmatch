# AI Coding Assistant Instructions for Battlefield 6 Portal Scripting

## Project Overview
This is a TypeScript template for Battlefield 6 Portal experiences (custom game modes/mods). Code compiles via `bf6-portal-bundler` to QuickJS runtime and uploads manually to Portal's web editor. No hot reload - rebuild, upload `dist/bundle.ts` and `dist/bundle.strings.json`, restart server.

## Architecture
- **Event-Driven**: Export functions like `OnPlayerDeployed`, `OngoingPlayer` (30x/sec - keep minimal)
- **String System**: All UI text pre-defined in `*.strings.json` files, accessed via `mod.Message(mod.stringkeys.path.to.key)`
- **mod Namespace**: All Portal API via global `mod` (e.g., `mod.GetSoldierState`, `mod.DisplayNotificationMessage`)

## Critical Patterns
- **Player State Checks**: Always verify `mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)` before querying other states to avoid `PlayerNotDeployed` exceptions
- **Teams**: No `mod.AllTeams()` - iterate manually: `for (let id = 1; id <= TEAM_COUNT; id++) { mod.GetTeam(id) }`
- **UI Widgets**: Use `mod.SetUITextLabel(widget, message)` not `mod.SetUIWidgetText`; `mod.SetUIWidgetVisible(widget, bool)` not `mod.SetUIWidgetVisibility`
- **Async**: Use `await mod.Wait(seconds)` for delays; `mod.Wait(seconds).then(() => {})` for callbacks
- **Arrays**: Portal arrays need manual iteration: `for (let i = 0; i < mod.CountOf(array); i++) { mod.ValueInArray(array, i) }`

## Build & Workflow
- `npm run build`: Compile to `dist/bundle.ts` + `dist/bundle.strings.json`
- Upload both files to Portal editor, restart server
- Check `PortalLog.txt` (PC: `%TEMP%\Battlefield™ 6\PortalLog.txt`) for runtime errors

## Utility Libraries
- **bf6-portal-utils/ui**: OO UI wrapper - `new UI.Button({...}, player)`
- **bf6-portal-utils/logger**: In-game logging - `new Logger(player, {staticRows: false})`
- **bf6-portal-utils/map-detector**: Map detection (built-in broken) - `MapDetector.currentMap()`
- **bf6-portal-utils/interact-multi-click-detector**: Multi-click detection for menus

## Common Pitfalls
- Silent failures on undefined string keys in `mod.Message()`
- Function name conflicts across files (bundler merges all)
- `Ongoing*` functions must be fast (30 FPS)
- UI is global - visible to all players unless restricted

## Key Files
- `src/index.ts`: Entry point with all event handlers
- `src/strings.json`: UI text definitions
- `CLAUDE.md`: Detailed API lessons and examples
- `README.md`: Setup, utilities, troubleshooting

## Development Tips
- Start with examples in `src/debug-tool/` for logging/UI patterns
- Use unique widget names for later updates: `mod.FindUIWidgetWithName(name)`
- Store constants for widget IDs: `const WIDGET_ID = 'unique_name'`
- Test player state queries in try/catch or after alive checks