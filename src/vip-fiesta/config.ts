export interface VipFiestaConfig {
    targetVipKills: number;
    timeLimitMinutes: number;
    vipReassignDelaySeconds: number;
    showIntroOnDeploy: boolean;
    onTimeLimitAnnounceWinner: boolean;
    vipSelection: 'random' | 'topPlayers';
    topPlayersPoolSize: number;
    ui: {
        enableHud: boolean;
    };
    markers: {
        enable3DIcons: boolean;
        enableMinimapSpotting: boolean;
        enableEnemyIcons: boolean;
        verticalOffsetMeters: number;
        enemyIconImage: mod.WorldIconImages;
        friendlyIconImage: mod.WorldIconImages;
        enemyColorRGB: mod.Vector;
        friendlyColorRGB: mod.Vector;
    };
}

export const CONFIG: VipFiestaConfig = {
    targetVipKills: 3,
    timeLimitMinutes: 3,
    vipReassignDelaySeconds: 5,
    showIntroOnDeploy: true,
    onTimeLimitAnnounceWinner: true,
    vipSelection: 'random',
    topPlayersPoolSize: 3,
    ui: {
        enableHud: true,
    },
    markers: {
        enable3DIcons: true,
        enableMinimapSpotting: true,
        enableEnemyIcons: true,
        verticalOffsetMeters: 3,
        enemyIconImage: mod.WorldIconImages.Skull,
        friendlyIconImage: mod.WorldIconImages.Triangle,
        enemyColorRGB: mod.CreateVector(1, 0, 0),
        friendlyColorRGB: mod.CreateVector(0, 1, 0),
    },
};
