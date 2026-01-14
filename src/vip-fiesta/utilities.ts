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
