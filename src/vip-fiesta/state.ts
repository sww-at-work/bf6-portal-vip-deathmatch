// Game configuration constants
export const CONFIG = {
    WIN_SCORE: 20,
    TIME_LIMIT_SECONDS: 1200, // 20 minutes
    VIP_RESPAWN_DELAY_SECONDS: 3,
    TEAM_COUNT: 100,
    PLAYERS_PER_TEAM: 4,
} as const;

// Game state interface
export interface VIPFiestaState {
    // Team scores - Map of teamId (number) to score
    teamScores: Map<number, number>;

    // Current VIP per team - Map of teamId to playerId (or null if no VIP)
    teamVIPs: Map<number, number | null>;

    // VIP selection cooldown - teams where VIP just died and are in cooldown
    vipCooldowns: Set<number>;

    // Active teams - teams with at least one player (dynamically updated)
    activeTeamIds: number[];

    // Game status
    gameStarted: boolean;
    gameEnded: boolean;
}

// Create initial state with all teams initialized
export function createInitialState(): VIPFiestaState {
    const state: VIPFiestaState = {
        teamScores: new Map(),
        teamVIPs: new Map(),
        vipCooldowns: new Set(),
        activeTeamIds: [],
        gameStarted: false,
        gameEnded: false,
    };

    // Initialize all teams with 0 score and no VIP
    for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
        state.teamScores.set(teamId, 0);
        state.teamVIPs.set(teamId, null);
    }

    return state;
}

// Calculate active teams based on current player distribution
export function calculateActiveTeamIds(): number[] {
    const activeTeams = new Set<number>();
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);

    for (let i = 0; i < count; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        if (teamId >= 1 && teamId <= CONFIG.TEAM_COUNT) {
            activeTeams.add(teamId);
        }
    }

    // Return sorted array for consistent UI ordering
    return Array.from(activeTeams).sort((a, b) => a - b);
}

// Check if two arrays of team IDs are different
export function activeTeamsChanged(oldTeams: number[], newTeams: number[]): boolean {
    if (oldTeams.length !== newTeams.length) return true;
    for (let i = 0; i < oldTeams.length; i++) {
        if (oldTeams[i] !== newTeams[i]) return true;
    }
    return false;
}

// Helper to get team with highest score (only considers active teams)
export function getWinningTeamId(state: VIPFiestaState): number {
    let winningTeamId = state.activeTeamIds[0] ?? 1;
    let highestScore = -1;

    // Only check active teams
    for (const teamId of state.activeTeamIds) {
        const score = state.teamScores.get(teamId) ?? 0;
        if (score > highestScore) {
            highestScore = score;
            winningTeamId = teamId;
        }
    }

    return winningTeamId;
}
