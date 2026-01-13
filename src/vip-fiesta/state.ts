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
};
