// Team utility functions for VIP-Fiesta

export function getPlayersInTeam(teamObj: mod.Team): mod.Player[] {
    const teamId = mod.GetObjId(teamObj);
    const allPlayers = mod.AllPlayers();
    const n = mod.CountOf(allPlayers);
    const teamMembers: mod.Player[] = [];

    for (let i = 0; i < n; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        if (mod.GetObjId(mod.GetTeam(player)) === teamId) {
            teamMembers.push(player);
        }
    }
    return teamMembers;
}

export function getAlivePlayersInTeam(teamObj: mod.Team): mod.Player[] {
    const teamId = mod.GetObjId(teamObj);
    const allPlayers = mod.AllPlayers();
    const n = mod.CountOf(allPlayers);
    const alivePlayers: mod.Player[] = [];

    for (let i = 0; i < n; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const isAlive = mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive);
        if (mod.GetObjId(mod.GetTeam(player)) === teamId && isAlive) {
            alivePlayers.push(player);
        }
    }
    return alivePlayers;
}

// Static team color vectors (pre-created to avoid repeated allocations)
const TEAM_COLORS: mod.Vector[] = [
    mod.CreateVector(0.5, 0.5, 0.5),   // Team 0 / Neutral: Gray
    mod.CreateVector(0.2, 0.5, 1.0),   // Team 1: Blue
    mod.CreateVector(1.0, 0.4, 0.2),   // Team 2: Orange/Red
    mod.CreateVector(0.2, 1.0, 0.5),   // Team 3: Green
    mod.CreateVector(1.0, 1.0, 0.2),   // Team 4: Yellow
    mod.CreateVector(0.8, 0.2, 1.0),   // Team 5: Purple
    mod.CreateVector(1.0, 0.6, 0.8),   // Team 6: Pink
];

export function getTeamColor(teamId: number): mod.Vector {
    if (teamId <= 0 || teamId >= TEAM_COLORS.length) return TEAM_COLORS[0];
    return TEAM_COLORS[teamId];
}
