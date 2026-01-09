# AI Coding Instructions: BF6 Portal TypeScript Template

## Big Picture
- Purpose: Build Battlefield 6 Portal scripts in TypeScript; bundle to `dist/bundle.ts` and `dist/bundle.strings.json` for upload to Portal.
- Entrypoint: All gameplay starts in [src/index.ts](src/index.ts). It wires Portal event handlers to a `VIPFiesta` module (`vip-fiesta/index.ts`), which is expected to implement the game-mode logic.
- API surface: Use the Portal `mod` namespace (types via `bf6-portal-mod-types`). Utilities in [src/modlib/index.ts](src/modlib/index.ts) add UI helpers, notifications, condition tracking, array conversions, and team utilities.
- Outputs: The bundler (`bf6-portal-bundler`) auto-collects any `strings.json` files and emits `dist/bundle.strings.json`.

## Workflows
- Build: `npm run build` → emits `dist/bundle.ts` and `dist/bundle.strings.json`.
- Upload: In Portal Editor → Scripts: upload `dist/bundle.ts`; Text Strings: upload `dist/bundle.strings.json`.
- Thumbnail: `npm run export-thumbnail` reads an image in `src/thumbnail.*`, resizes to 352x248, compresses ≤78KB, writes `dist/thumbnail.png|jpg`.
- Spatial minify (POSIX script): `npm run minify-spatials` loops `spatials/*.json` and writes minified to `dist/spatials/*.json`.
  - Windows PowerShell alternative:
    ```powershell
    Get-ChildItem .\spatials -Filter *.json | ForEach-Object {
      node .\spatial-minifier.js --input $_.FullName --out (Join-Path .\dist\spatials $_.Name)
    }
    ```
- Logs: Portal errors often surface in `C:\Users\<username>\AppData\Local\Temp\Battlefield™ 6\PortalLog.txt`. A sample log file exists at [logs/PortalLog.txt](logs/PortalLog.txt).

## Project Conventions
- Strings: Any on-screen text must be defined in a nearby `strings.json` (the bundler auto-picks files ending in `strings.json`). Missing keys can halt the script at runtime.
- Ongoing functions: Keep `OngoingGlobal()` and `OngoingPlayer()` minimal; they run 30 times/second.
- Game-mode messaging: Prefer `ShowEventGameModeMessage()` and `DisplayCustomNotificationMessage()` from [src/modlib/index.ts](src/modlib/index.ts) over Portal’s `DisplayGameModeMessage` (currently unreliable).
- UI composition: Build HUD using `ParseUI(...)` with JSON-style params; restrict visibility via `teamId` or `playerId` when needed.
- Team utilities: Use `getPlayersInTeam(team)` to target team-wide UI/notifications.

## Key Files & Patterns
- [src/index.ts](src/index.ts):
  - Forwards Portal events to `VIPFiesta` methods: `initialize()`, `ongoingPlayer(player)`, `onPlayerDeployed(player)`, `onPlayerDied(player, other)`, `onPlayerJoinGame(player)`, `onPlayerLeaveGame(id)`, `onPlayerSwitchTeam(player, team)`, `onTimeLimitReached()`.
  - Implement `src/vip-fiesta/index.ts` to provide this class and methods.
- [src/modlib/index.ts](src/modlib/index.ts):
  - UI: `ParseUI(...)` and custom notification helpers (`DisplayCustomNotificationMessage`, `ClearCustomNotificationMessage`).
  - Messaging: `ShowEventGameModeMessage` and `ShowNotificationMessage` wrappers.
  - Conditions: `ConditionState` and `getPlayerCondition/team/capturePoint/mcom/vehicle/getGlobalCondition` for edge-triggered events.
  - Arrays: `ConvertArray`, `FilteredArray`, `IndexOfFirstTrue`, `IsTrueForAll/Any`, `SortedArray`.
  - Timing: `WaitUntil(delay, cond)` for polling a condition.
- [src/vip-fiesta/README.md](src/vip-fiesta/README.md): Design doc for VIP-Fiesta (HUD, 3D markers, scoreboard, notifications, file/module layout).
- [export-thumbnail.js](export-thumbnail.js): Uses `sharp` to resize/compress thumbnails; chooses PNG or JPEG based on input.
- [spatial-minifier.js](spatial-minifier.js): CLI to shrink Spatial JSON:
  - Flags: `--input`, `--out`, `--no-rename`, `--no-precision`, `--precision <digits>`, `--formatted`, `--show-mappings`.
  - Preserves `Static/` IDs; shortens names/IDs; reduces numeric precision (default 6 digits).

## Examples (project-specific)
- Team-wide message:
  ```ts
  import { getPlayersInTeam, ShowNotificationMessage } from './modlib/index.ts';
  const teammates = getPlayersInTeam(team);
  teammates.forEach(p => ShowNotificationMessage(mod.Message(mod.stringkeys.template.team.notice), p));
  ```
- Edge-triggered action:
  ```ts
  import { getPlayerCondition } from './modlib/index.ts';
  if (getPlayerCondition(player, 0).update(mod.GetSoldierState(player, mod.SoldierStateBool.IsJumping))) {
    // Run once on transition to jumping
  }
  ```

## Gotchas
- Ensure `src/vip-fiesta/index.ts` exists and exports `VIPFiesta` with methods used by [src/index.ts](src/index.ts); otherwise the build will fail.
- Avoid using strings not present in `strings.json`; Portal will silently stop on missing keys.
- `minify-spatials` script in `package.json` uses a POSIX `for` loop; use the PowerShell alternative on Windows.
