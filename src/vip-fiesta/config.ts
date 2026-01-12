export interface VipFiestaConfig {
    targetVipKills: number;
    vipReassignDelaySeconds: number;
    showIntroOnDeploy: boolean;
    onTimeLimitAnnounceWinner: boolean;
    scoring: {
        announceOnTargetReached: boolean;
        stopCountingAfterWin: boolean;
    };
    vipSelection: 'random' | 'topPlayers';
    topPlayersPoolSize: number;
    ui: {
        enableHud: boolean;
    };
    markers: {
        enable3DIcons: boolean;
        enableMinimapSpotting: boolean;
        verticalOffsetMeters: number;
        enemyColorRGB: { r: number; g: number; b: number };
        friendlyColorRGB: { r: number; g: number; b: number };
    };
}

export const CONFIG: VipFiestaConfig = {
    targetVipKills: 10,
    vipReassignDelaySeconds: 5,
    showIntroOnDeploy: true,
    onTimeLimitAnnounceWinner: true,
    scoring: {
        announceOnTargetReached: true,
        stopCountingAfterWin: true,
    },
    vipSelection: 'random',
    topPlayersPoolSize: 3,
    ui: {
        enableHud: true,
    },
    markers: {
        enable3DIcons: true,
        enableMinimapSpotting: true,
        verticalOffsetMeters: 3,
        enemyColorRGB: { r: 255, g: 0, b: 0 },
        friendlyColorRGB: { r: 0, g: 170, b: 255 },
    },
};
