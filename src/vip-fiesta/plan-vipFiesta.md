# Plan: Scoreboard, Config Scores, Spotting Cadence

## Overview
- Use built-in scoreboard (FFA) in `mod` for per-player scoreboard.
- Drive target and current scores from config/state (no hardcoded values).
- Update VIP world icons every tick; throttle `SpotTarget` to ~1 Hz.
- Upgrade score UI: top-3 teams, always include player’s team, progress bars to target.
- Add per-player HUD (“Your VIP: {name}” + highlight if you) and one-time intro.
- Reduce notifications; prefer team-relevant lightweight UI.

## Steps
1. Config + stats in state [src/vip-fiesta/state.ts](src/vip-fiesta/state.ts)
- Add `GameConfig` with `targetVipKills`, `spottingRefreshHz`, `worldIconRefreshHz`.
- Provide `getConfig()`, `setConfig()`; replace `TARGET_SCORE` with `getConfig().targetVipKills`.
- Add per-player maps: `vipKillsByPlayer`, `killsByPlayer`, `deathsByPlayer`.
- Helpers: `incrementVipKills(player)`, `incrementKills(player)`, `incrementDeaths(player)`, `getPlayerStats(player)`.
- Keep `teamScores` and `currentVipByTeam`; ensure all reads are via state helpers.

2. Built-in scoreboard (FFA) wiring [src/vip-fiesta/vip-manager.ts](src/vip-fiesta/vip-manager.ts)
- Initialize scoreboard in `onGameStarted()`; teardown in `onGameEnded()`.
- Columns: Team ID, VIP badge, VIP Kills, Kills, Deaths.
- Update rows on: `onPlayerDeployed()`, `onPlayerDied()`, `onPlayerTeamSwitch()`, VIP reseat.
- Sorting: team rank by team VIP kills → player VIP kills → total kills.
- Verify exact `mod` scoreboard API names in `bf6-portal-mod-types/index.d.ts` and adapt accordingly.

3. Spotting cadence + world icons [src/vip-fiesta/vip-manager.ts](src/vip-fiesta/vip-manager.ts)
- Track `lastSpotAtByPlayer`; call `mod.SpotTarget(player, duration, SpotInBoth)` ≤ 1/sec.
- World icons: create per VIP; color friendly/enemy; text shows distance.
- Update icon position/text every tick (30 Hz) in `OngoingPlayer` or a dedicated updater.
- Remove/recreate icons on VIP changes and clear on death/switch/leave.

4. Score UI upgrade [src/vip-fiesta/score-ui.ts](src/vip-fiesta/score-ui.ts)
- Render top-3 teams by VIP kills; always include player’s team if not in top-3 (appended).
- Progress bars: fill ratio = team VIP kills / `getConfig().targetVipKills`; bars use team color.
- Labels: team ID/name + `X/Y VIP kills`; highlight player’s team if in top-3.
- Header shows dynamic target from config.

5. Per-player HUD + intro UI [src/vip-fiesta/index.ts](src/vip-fiesta/index.ts), [src/vip-fiesta/vip-manager.ts](src/vip-fiesta/vip-manager.ts)
- HUD: “Your VIP: {name}”; highlight if local player is VIP; update on deploy, team switch, VIP reseat.
- Intro: one-time banner per player on first deploy; track via `shownIntroFor` set in state; auto-dismiss quickly.

6. Strings + consistency [src/vip-fiesta/strings.json](src/vip-fiesta/strings.json)
- Add keys for score header (“Target: {}”), row templates, HUD labels, intro text.
- Remove hardcoded “/20”; all UI derives target from `getConfig()`.
- Limit world logs to essential/team-relevant events; rely on HUD/score UI for state.

## Data Model Changes
- `GameConfig`: `{ targetVipKills: number, spottingRefreshHz: number, worldIconRefreshHz: number }`.
- Per-player stats: `Map<PlayerId, { vipKills: number, kills: number, deaths: number }>` or separate maps.
- Existing: `teamScores: Map<TeamId, number>`, `currentVipByTeam: Map<TeamId, Player>`.

## UI Changes
- Score UI: progress bars, top-3 + player team rule, dynamic target header.
- HUD: small unobtrusive widget for current team VIP; self-highlight.
- Intro: brief one-time rules text.

## Spotting Cadence
- Keep VIP world icons updated every tick (30 Hz) to follow heads.
- Throttle `SpotTarget` to ~1 Hz; duration ≈ 3–10s; re-apply only when nearing expiry.

## Risks / Checks
- Confirm scoreboard API names and capabilities in `bf6-portal-mod-types`.
- Verify world icon APIs support per-team coloring and distance labels; fallback to spotting-only if limited.
- Ensure `IsAlive` checks before any player actions; avoid heavy work in `Ongoing*`.
- Avoid duplicate exported function names across files; keep helpers non-exported where possible.

## Open Points
- Team naming source (ID vs custom names).
- Target score set via Portal UI vs code; expose setter if needed.
- Sorting tie-breakers and display limits on scoreboard if API constrains columns.
