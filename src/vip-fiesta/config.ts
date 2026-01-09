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
        enable3DIcons: false,
        enableMinimapSpotting: false,
    },
};
