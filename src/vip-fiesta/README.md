# VIP-Fiesta

This is a casual Battlefield 6 game mode where players take on the roles of VIPs and bodyguards.
The goal is to kill a set number of VIPs from the opposing team while protecting your own VIPs.
The team with the most VIP kills at the end of the match wins.

## Game Mechanics

- At the start of the match, each team is assigned a VIP randomly from their players.
- Bodyguards are the other players on the team who must protect their VIP.
- When a VIP is killed, a new VIP is randomly selected from the remaining bodyguards on that team (with a 5 second delay).
- Players earn points for their team by killing enemy VIPs.
- The game ends when a team reaches a predefined number of VIP kills or when the match timer runs out.
- VIPs are highlighted on the HUD for all players to see.

## Detailed Implementation

### HUD-UI

- There should be a static UI element showing the current VIP (player name) of your team
- In case of the current player being the VIP themself, this should be highlighted to the player in the same UI element location (e.g. different color, bold text, or icon - "YOU are the VIP! - Stay alive!")

#### Score UI

- A UI element showing the current VIP kills per team should be present
- This UI element should update in real-time as VIP kills occur
- the UI should be positioned at the bottom left of the screen
- each team should have a distinct color for easy identification
- the score of a team is represented by a progress bar filling up with the number of VIP kills
- the progress bar should have a maximum length representing the target VIP kills to win
- the team color should be used for the progress bar
- the team rank (1st, 2nd, 3rd) following its ID or name should be displayed in front of the progress bar
- the current number of VIP kills should be displayed on the right side of the progress bar
- the target number of VIP kills to win should be displayed centrally above the score UI
- the score UI should show the top teams based on VIP kills, sorted in descending order
- the score UI should show a maximum of 3 teams at once
- the player's team entry in the score UI should always be visually distinguished (e.g. highlighted background and *YOU* label)
- the player's team should always be visible, even if not in the top teams
- the player's team should be positioned according to its rank:
- if the player's team is not in the top teams
  - it should be displayed at the bottom as 3rd team but with its according rank and score

#### Introduction UI

- If a player deploys for the first time, a brief introduction UI element should be shown explaining the game mode rules in one or two sentences
- This introduction UI should quickly disappear and should not reappear on subsequent deployments

### 3D-UI

- The VIP players should have special markers above their heads to distinguish them from bodyguards
  - they are spotted on the minimap and have a 3D marker above their heads.
  - a world icon above the VIP heads indicates their location.
  - the world icon image for the friendly VIP is a Triangle (alternative Eye, Assist)
  - the world icon image for enemy VIPs is a Skull (alternative DangerPing, Alert)
  - the world icon text should display the distance to the VIP
  - the world icon should be repositioned every tick to stay above the VIP's head
  - the world icons should be generated per player, so 
    - players on the same team see their VIP's icon in a friendly color (green) and enemy VIPs in an enemy color (red)
    - the distance text updates correctly for each player
  - in order to show icons on the minimap that differ from usual spotted enemies an additional spotting mechanism is used
    - a minimap icon can be achieved by spawning a capturepoint entity on the VIP's position and updating its position every tick to match the VIP player's position.
      - The capturepoint entity should be inside a sector object
    - minimap icons have the same appearance and visibility to all players
  - bodyguards do not have any special markers.

### Scoreboard

- The scoreboard type should be CustomFFA (Free For All) as the type Team Deathmatch only supports two teams at the moment
- The scoreboard should show all players from all teams

#### Scoreboard Columns

- The scoreboard should reflect per player:
  - the team ID
  - the current VIP status (e.g. an icon next to the player name if the player is the current VIP)
  - the total number of VIPs killed by the player
  - the total number of kills by the player
  - the total number of deaths by the player
  - internal sorting number (not visible, but used for sorting only)

#### Scoreboard Sorting

- the scoreboard should be sorted by an internal sorting number in ascending order: 
  - players are clustered by their team.
  - The teams are sorted by the team rank (VIP Kills) in descending order.
  - within each team, the players are sorted by their VIP kills and then total killsin descending order.
  - players with the same VIP kills and total kills are sorted by their deaths in ascending order.
  - this requires custom sorting logic and internal number assignment, by which the players can be sorted

### Notifications

- Notification messages should be avoided and custom UI elements should be used instead to reflect the game state
- highlighted world log messages are okay, but should be reduced to the events that matter for your own team only, or the overall game state e.g.
  - Your VIP was killed
  - Your team killed an enemy VIP
  - Your VIP is under attack
  - Your new VIP is (player name)

### File Structure

The following file structure is an example, but not mandatory, for organizing the VIP-Fiesta game mode code. Each file should focus on a specific aspect of the game mode to maintain clarity and modularity.

- `vip-fiesta/`
  - `README.md` - This file, describing the game mode and its implementation details.
  - `vip-fiesta.ts` - Starting point of the game mode, handling core logic and event registration.
  - `team-management.ts` - Logic for team assignments and VIP selection.
  - `hud-ui.ts` - HUD UI elements for displaying VIP status and scores.
  - `scoreboard.ts` - Custom scoreboard implementation reflecting VIP kills and player stats.
  - `3d-ui.ts` - 3D UI elements for VIP markers above player heads.
  - `notifications.ts` - Notification logic for important game events.
  - `utils.ts` - Utility functions and helpers used across multiple files.
  - `config.ts` - Configuration settings for the game mode (e.g., target VIP kills, time limits).
  - `events.ts` - Event handlers for player actions and game state changes.
  - `strings.json` - String definitions for in-game text and messages.

### Open Questions

- How to handle team balancing if players join/leave mid-game?
- How is the team assignment behavior when players join mid-game via friends or matchmaking?
- how are squads organized within teams (e.g. is there more than one squad per team possible)?


