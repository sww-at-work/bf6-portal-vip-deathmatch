/**
 * Scoreboard implementation for VIP-Fiesta game mode
 * 
 * This module handles:
 * - Setting up the scoreboard type (CustomFFA)
 * - Configuring column names and widths
 * - Calculating internal sorting numbers for each player
 * - Updating player scoreboard values
 * 
 * Sorting logic:
 * - Players are clustered by team
 * - Teams are sorted by VIP kills (descending)
 * - Within each team, players are sorted by:
 *   1. VIP kills (descending)
 *   2. Total kills (descending)
 *   3. Deaths (ascending)
 */

export interface ScoreboardData {
    teamVipById: Map<number, number>;
    vipKillsByTeamId: Map<number, number>;
    playerVipKillsById: Map<number, number>;
    playerKillsById: Map<number, number>;
    playerDeathsById: Map<number, number>;
}

/**
 * Initialize the scoreboard with column names and configuration
 */
export function initializeScoreboard(): void {
    // Set scoreboard type to CustomFFA as required
    mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);

    // Configure column names
    // Columns: Team, VIP Kills, Kills, Deaths, Sort Order
    mod.SetScoreboardColumnNames(
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColTeam),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColVipKills),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColKills),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColDeaths),
        mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColSortOrder)
    );

    // Set column widths as percentages (must total 100%)
    // Equally distributed: 25% each for main 4 columns and 0% for 5th column
    mod.SetScoreboardColumnWidths(25, 25, 25, 25, 0);

    /* Sort by the 5th column (sortOrder) in ascending order 
       (reverse sorting is set to true as the scoreboard sorts highest to lowest by default) 
       
       sorting bug:
        scoreboard sorting using the two parameter overload is using a 0-based index but documented as 1-based index
        scoreboard sorting using the single parameter overload is 1-based index
    */
    mod.SetScoreboardSorting(4, true); // 0-based index for 5th column
}

/**
 * Calculate the sorting number for a player
 * Lower numbers appear first in the scoreboard
 * 
 * Formula:
 * - Team rank multiplier (based on team VIP kills)
 * - Within team, sort by player VIP kills, then total kills, then deaths
 */
function calculateSortingNumber(
    playerId: number,
    teamId: number,
    teamRanks: Map<number, number>,
    data: ScoreboardData,
    weights: {
        teamWeight: number;
        vipWeight: number;
        killsWeight: number;
        deathsWeight: number;
        playerTieBase: number;
        vipRange: number;
        killsRange: number;
        deathsRange: number;
    }
): number {
    const teamRank = teamRanks.get(teamId) ?? 999;
    const playerVipKills = data.playerVipKillsById.get(playerId) ?? 0;
    const playerKills = data.playerKillsById.get(playerId) ?? 0;
    const playerDeaths = data.playerDeathsById.get(playerId) ?? 0;

    // Hierarchical weighting using dynamic ranges to keep the number smaller
    const teamComponent = teamRank * weights.teamWeight;
    const vipKillsComponent = (weights.vipRange - 1 - playerVipKills) * weights.vipWeight; // descending
    const killsComponent = (weights.killsRange - 1 - playerKills) * weights.killsWeight; // descending
    const deathsComponent = playerDeaths * weights.deathsWeight; // ascending
    const playerIdComponent = playerId % weights.playerTieBase; // ascending

    return teamComponent + vipKillsComponent + killsComponent + deathsComponent + playerIdComponent;
}

/**
 * Calculate team ranks based on VIP kills
 * Teams with more VIP kills get lower rank numbers (rank 1 is best)
 */
function calculateTeamRanks(vipKillsByTeamId: Map<number, number>): Map<number, number> {
    const teamRanks = new Map<number, number>();

    // Sort teams by VIP kills descending
    const sortedTeams = Array.from(vipKillsByTeamId.entries()).sort((a, b) => {
        const killsA = a[1];
        const killsB = b[1];
        if (killsB !== killsA) return killsB - killsA; // More kills = better rank
        return a[0] - b[0]; // Tiebreaker: lower team ID
    });

    // Assign ranks
    sortedTeams.forEach(([teamId], index) => {
        teamRanks.set(teamId, index + 1); // Rank 1, 2, 3, etc.
    });

    return teamRanks;
}

/**
 * Update scoreboard values for all players
 */
export function updateScoreboard(data: ScoreboardData): void {
    // Ensure maps contain current team/player IDs before computing ranks
    ensureScoreboardMapsInitialized(data);
    // Calculate team ranks purely from vipKillsByTeamId; ties broken by team ID
    const teamRanks = calculateTeamRanks(data.vipKillsByTeamId);

    // Compute dynamic ranges for compact sort numbers
    let maxVipKills = 0;
    for (const v of data.playerVipKillsById.values()) maxVipKills = Math.max(maxVipKills, v);
    let maxKills = 0;
    for (const v of data.playerKillsById.values()) maxKills = Math.max(maxKills, v);
    let maxDeaths = 0;
    for (const v of data.playerDeathsById.values()) maxDeaths = Math.max(maxDeaths, v);

    const vipRange = Math.max(1, maxVipKills + 1);
    const killsRange = Math.max(1, maxKills + 1);
    const deathsRange = Math.max(1, maxDeaths + 1);
    const playerTieBase = 100; // max 100 players

    const deathsWeight = playerTieBase;
    const killsWeight = deathsWeight * deathsRange;
    const vipWeight = killsWeight * killsRange;
    const teamWeight = vipWeight * vipRange;

    const weights = { teamWeight, vipWeight, killsWeight, deathsWeight, playerTieBase, vipRange, killsRange, deathsRange };

    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);

    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const playerId = mod.GetObjId(player);
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        const playerVipKills = data.playerVipKillsById.get(playerId) ?? 0;
        const playerKills = data.playerKillsById.get(playerId) ?? 0;
        const playerDeaths = data.playerDeathsById.get(playerId) ?? 0;
        const sortingNumber = calculateSortingNumber(playerId, teamId, teamRanks, data, weights);

        // Set scoreboard values for this player
        // Columns: Team ID, VIP Kills, Kills, Deaths, Sorting Number
        mod.SetScoreboardPlayerValues(
            player,
            teamId, // Column 1: Team ID
            playerVipKills, // Column 2: VIP Kills
            playerKills, // Column 3: Total Kills
            playerDeaths, // Column 4: Deaths
            sortingNumber // Column 5: Hidden sorting number
        );
    }
}

/**
 * Ensure scoreboard-related maps are initialized for all current players and teams.
 * Call this when players join, leave, or switch teams to keep maps in sync.
 */
export function ensureScoreboardMapsInitialized(data: ScoreboardData): void {
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
        if (!data.playerVipKillsById.has(playerId)) data.playerVipKillsById.set(playerId, 0);
        if (!data.playerKillsById.has(playerId)) data.playerKillsById.set(playerId, 0);
        if (!data.playerDeathsById.has(playerId)) data.playerDeathsById.set(playerId, 0);

        // Initialize team-scoped maps
        if (!data.vipKillsByTeamId.has(teamId)) data.vipKillsByTeamId.set(teamId, 0);
        if (!data.teamVipById.has(teamId)) data.teamVipById.set(teamId, -1); // -1 indicates no VIP assigned yet
    }

    // Prune players no longer present
    for (const pid of Array.from(data.playerVipKillsById.keys())) {
        if (!seenPlayerIds.has(pid)) data.playerVipKillsById.delete(pid);
    }
    for (const pid of Array.from(data.playerKillsById.keys())) {
        if (!seenPlayerIds.has(pid)) data.playerKillsById.delete(pid);
    }
    for (const pid of Array.from(data.playerDeathsById.keys())) {
        if (!seenPlayerIds.has(pid)) data.playerDeathsById.delete(pid);
    }

    // Optionally prune teams not currently represented (keeps maps tidy)
    for (const tid of Array.from(data.vipKillsByTeamId.keys())) {
        if (!seenTeamIds.has(tid)) data.vipKillsByTeamId.delete(tid);
    }
    for (const tid of Array.from(data.teamVipById.keys())) {
        if (!seenTeamIds.has(tid)) data.teamVipById.delete(tid);
    }
}
