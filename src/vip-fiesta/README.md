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

## Features

- Dynamic amount of teams based on user input from the portal web UI.
- Supports up to 100 teams.

## Game Mode Variants

### VIP-Extraction

The objective is for the VIPs to reach designated extraction points while bodyguards protect them from opposing players.

### Kings of Fire

The map area is limited by a ring of fire that constantly moves around the map, forcing players into closer proximity and increasing the intensity of engagements.
Players spawn in the air and must parachute down to the battlefield.
The best player of each top-3 team is highlighted as VIP.
