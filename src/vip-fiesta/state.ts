export interface TeamScoreInfo {
    teamId: number;
    vipKills: number;
    rank: number;
}

export interface GameState {
    teamVipById: Map<number, number>;
    vipKillsByTeamId: Map<number, number>;
    playerKillsById: Map<number, number>;
    playerDeathsById: Map<number, number>;
    playerVipKillsById: Map<number, number>;
    firstDeployByPlayerId: Set<number>;
    vipSpottingShownFor: Map<number, { youAreVip: boolean }>;
    lastGlobalSpotAt: number;
    gameEnded: boolean;
    sortedTeamScores: TeamScoreInfo[];
}

export const gameState: GameState = {
    teamVipById: new Map(),
    vipKillsByTeamId: new Map(),
    playerKillsById: new Map(),
    playerDeathsById: new Map(),
    playerVipKillsById: new Map(),
    firstDeployByPlayerId: new Set(),
    vipSpottingShownFor: new Map(),
    lastGlobalSpotAt: 0,
    gameEnded: false,
    sortedTeamScores: [],
};

/**
 * Synchronize gameState player/team maps with the currently active players.
 * - Initializes player stats and team entries for teams present in the match
 * - Prunes player entries for players no longer present
 * - Prunes team-level maps for teams with no active players (keeps state tidy for score UI)
 */
export function syncGameStateFromPlayers(): void {
    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);

    const seenPlayerIds = new Set<number>();
    const seenTeamIds = new Set<number>();

    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const playerId = mod.GetObjId(player);
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        seenPlayerIds.add(playerId);
        seenTeamIds.add(teamId);

        // Initialize player-scoped maps
        if (!gameState.playerVipKillsById.has(playerId)) gameState.playerVipKillsById.set(playerId, 0);
        if (!gameState.playerKillsById.has(playerId)) gameState.playerKillsById.set(playerId, 0);
        if (!gameState.playerDeathsById.has(playerId)) gameState.playerDeathsById.set(playerId, 0);

        // Initialize team-scoped maps for active teams
        if (!gameState.vipKillsByTeamId.has(teamId)) gameState.vipKillsByTeamId.set(teamId, 0);
        if (!gameState.teamVipById.has(teamId)) gameState.teamVipById.set(teamId, -1);
    }

    // Prune players no longer present
    for (const pid of Array.from(gameState.playerVipKillsById.keys())) {
        if (!seenPlayerIds.has(pid)) gameState.playerVipKillsById.delete(pid);
    }
    for (const pid of Array.from(gameState.playerKillsById.keys())) {
        if (!seenPlayerIds.has(pid)) gameState.playerKillsById.delete(pid);
    }
    for (const pid of Array.from(gameState.playerDeathsById.keys())) {
        if (!seenPlayerIds.has(pid)) gameState.playerDeathsById.delete(pid);
    }

    // Prune teams with no active players
    for (const tid of Array.from(gameState.vipKillsByTeamId.keys())) {
        if (!seenTeamIds.has(tid)) gameState.vipKillsByTeamId.delete(tid);
    }
    for (const tid of Array.from(gameState.teamVipById.keys())) {
        if (!seenTeamIds.has(tid)) gameState.teamVipById.delete(tid);
    }
}

/**
 * Update the sorted team scores cache for performance optimization.
 * This should be called whenever team scores change.
 */
export function updateSortedTeamScores(): void {
    const teamScores: TeamScoreInfo[] = [];
    
    // Collect all team scores (excluding neutral team ID 0)
    for (const [teamId, vipKills] of gameState.vipKillsByTeamId.entries()) {
        if (teamId !== 0) {
            teamScores.push({ teamId, vipKills, rank: 0 });
        }
    }
    
    // Sort by VIP kills (descending)
    teamScores.sort((a, b) => b.vipKills - a.vipKills);
    
    // Assign ranks
    for (let i = 0; i < teamScores.length; i++) {
        teamScores[i].rank = i + 1;
    }
    
    gameState.sortedTeamScores = teamScores;
}
