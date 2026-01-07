# Tasks

## HUD-UI

- There should be a static but not intrusive UI element showing the current VIP of your team
- In case of the current player being the VIP themself, this should be highlighted

### Score UI

- A UI element showing the current VIP kills per team should be present
- This UI element should update in real-time as VIP kills occur
- the UI should be positioned at the top center of the screen
- each team should have a distinct color for easy identification
- the score of a team is represented by a progress bar filling up with the number of VIP kills
- the progress bar should have a maximum length representing the target VIP kills to win
- the team color should be used for the progress bar
- the team ID or name should be displayed above or beside the progress bar
- the current number of VIP kills should be displayed within or beside the progress bar
- the target number of VIP kills to win should be displayed centrally above the score UI
- only the top 3 teams with the highest VIP kills should be shown in sorted order
- the players own team should always be visible, even if not in the top teams
- if the player's team is not in the top teams, it should be displayed at the bottom with its score
- if the player's team is in the top teams, it should be highlighted for easy identification (e.g. bold border or a marker with "YOU")

### Introduction UI

- If a player deploys for the first time, a brief introduction UI element should be shown explaining the game mode rules in one or two sentences
- This introduction UI should quickly disappear and should not reappear on subsequent deployments

## 3D-UI

- The VIP players should have special markers above their heads to distinguish them from bodyguards
  - they are spotted on the minimap and have a 3D marker above their heads.
  - a world icon above the VIP heads indicates their location.
  - the world icon text should display the distance
  - the world icon should be repositioned every tick to stay above the VIP's head
  - the world icons should be generated per team, so players on the same team see their VIP's icon in a friendly color and enemy VIPs in an enemy color
  - bodyguards do not have any special markers.

## Scoreboard

- The scoreboard type should be of type FFA (Free For All)
- The scoreboard should reflect per player:
  - the team ID
  - the current VIP status (e.g. an icon next to the player name if the player is the current VIP)
  - the total number of VIPs killed by the player
  - the total number of kills by the player
  - the total number of deaths by the player
- the scoreboard should be sorted by the team rank first, then by VIP kills, then by total kills
  - this might require custom sorting logic and internal number assignment, by which the players can be sorted

## Notifications

- Notification messages should be avoided and custom UI elements should be used instead to reflect the game state
- highlighted world log messages are okay, but should be reduced to the events that matter for your own team only, or the overall game state e.g.
  - Your VIP was killed
  - Your team killed an enemy VIP
  - Your VIP is under attack
  - Your new VIP is (player name)

# Open Questions

- How to handle team balancing if players join/leave mid-game?
- How is the team assignment behavior when players join mid-game via friends or matchmaking?
- how are squads organized within teams (e.g. is there more than one squad per team)?
