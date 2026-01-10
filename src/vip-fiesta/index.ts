import { getPlayersInTeam, ShowEventGameModeMessage, ShowHighlightedGameModeMessage } from '../modlib/index.ts';
import { CONFIG } from './config.ts';
import { refreshSpotsForObserver, updateIconDistancesForObserver } from './spotting.ts';
import { selectVipForTeam } from './selection.ts';
import { handlePlayerDied } from './scoring.ts';
import { initializeScoreboard, updateScoreboard, ensureScoreboardMapsInitialized } from './scoreboard.ts';

export class VIPFiesta {
    private teamVipById: Map<number, number> = new Map();
    private vipKillsByTeamId: Map<number, number> = new Map();
    private firstDeployByPlayerId: Set<number> = new Set();
    private gameEnded = false;
    private playerKillsById: Map<number, number> = new Map();
    private playerDeathsById: Map<number, number> = new Map();
    private playerVipKillsById: Map<number, number> = new Map();
    private vipSpottingShownFor: Map<number, { youAreVip: boolean }> = new Map();
    private lastSpotRefreshAt: Map<number, number> = new Map(); // observerId -> timestamp (ms)
    private observerWorldIcons: Map<number, Map<number, mod.WorldIcon>> = new Map(); // observerId -> (vipId -> icon)

    initialize(): void {
        initializeScoreboard();
        ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting));
    }

    private teamHasAssignedVip(teamId: number): boolean {
        const currentVip = this.teamVipById.get(teamId);
        return currentVip !== undefined && currentVip !== -1;
    }

    ongoingPlayer(player: mod.Player): void {
        // Placeholder: keep minimal to avoid per-tick overhead
        // Intended: maintain 3D markers and minimap spotting for current VIPs
        this.updateSpottingForPlayer(player);
        updateIconDistancesForObserver(player, this.observerWorldIcons);
    }

    onPlayerDeployed(player: mod.Player): void {
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        if (!this.teamHasAssignedVip(teamId)) {
            this.assignVipForTeam(team);
        }

        if (CONFIG.showIntroOnDeploy) {
            const pid = mod.GetObjId(player);
            if (!this.firstDeployByPlayerId.has(pid)) {
                this.firstDeployByPlayerId.add(pid);
                ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting), player);
            }
        }

        // Notify player if they are the VIP
        const vipId = this.teamVipById.get(teamId);
        if (vipId !== undefined && vipId === mod.GetObjId(player)) {
            ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);
        }
    }

    private updateSpottingForPlayer(player: mod.Player): void {
        const playerId = mod.GetObjId(player);
        const playerTeamId = mod.GetObjId(mod.GetTeam(player));

        // Edge-message on becoming VIP
        const teamVipId = this.teamVipById.get(playerTeamId);
        const isVip = teamVipId !== undefined && teamVipId === playerId;
        const state = this.vipSpottingShownFor.get(playerId) ?? { youAreVip: false };
        if (isVip && !state.youAreVip) {
            ShowHighlightedGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);
            state.youAreVip = true;
        } else if (!isVip && state.youAreVip) {
            state.youAreVip = false;
        }
        this.vipSpottingShownFor.set(playerId, state);

        // World/minimap spotting refresh (throttled) using SpotInBoth
        if (CONFIG.markers.enable3DIcons || CONFIG.markers.enableMinimapSpotting) {
            const now = Date.now();
            const last = this.lastSpotRefreshAt.get(playerId) ?? 0;
            if (now - last > 1000) {
                this.refreshSpotsForObserver(player);
                this.lastSpotRefreshAt.set(playerId, now);
            }
        }
    }

    private refreshSpotsForObserver(observer: mod.Player): void {
        refreshSpotsForObserver(observer, this.teamVipById, this.observerWorldIcons);
    }

    onPlayerDied(player: mod.Player, other: mod.Player): void {
        handlePlayerDied(
            player,
            other,
            this.teamVipById,
            this.vipKillsByTeamId,
            this.playerKillsById,
            this.playerDeathsById,
            this.playerVipKillsById,
            (team) => this.assignVipForTeam(team),
            () => this.gameEnded,
            (ended) => {
                this.gameEnded = ended;
            }
        );

        // Update scoreboard after death processing
        this.updateScoreboardValues();
    }

    onPlayerJoinGame(player: mod.Player): void {
        // Initialize maps to include this player/team
        ensureScoreboardMapsInitialized({
            teamVipById: this.teamVipById,
            vipKillsByTeamId: this.vipKillsByTeamId,
            playerVipKillsById: this.playerVipKillsById,
            playerKillsById: this.playerKillsById,
            playerDeathsById: this.playerDeathsById,
        });
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);
        if (!this.teamHasAssignedVip(teamId)) {
            this.assignVipForTeam(team);
        }

        // Update scoreboard when player joins
        this.updateScoreboardValues();
    }

    onPlayerLeaveGame(playerId: number): void {
        // Initialize/prune maps after player leaves
        ensureScoreboardMapsInitialized({
            teamVipById: this.teamVipById,
            vipKillsByTeamId: this.vipKillsByTeamId,
            playerVipKillsById: this.playerVipKillsById,
            playerKillsById: this.playerKillsById,
            playerDeathsById: this.playerDeathsById,
        });
        // If a leaving player was a VIP, clear their team VIP slot
        for (const [teamId, vipId] of this.teamVipById.entries()) {
            if (vipId === playerId) {
                this.teamVipById.delete(teamId);
            }
        }

        // Update scoreboard when player leaves
        this.updateScoreboardValues();
    }

    onPlayerSwitchTeam(player: mod.Player, newTeam: mod.Team): void {
        // Initialize/prune maps around the team switch
        ensureScoreboardMapsInitialized({
            teamVipById: this.teamVipById,
            vipKillsByTeamId: this.vipKillsByTeamId,
            playerVipKillsById: this.playerVipKillsById,
            playerKillsById: this.playerKillsById,
            playerDeathsById: this.playerDeathsById,
        });
        const playerId = mod.GetObjId(player);
        // Remove VIP assignment from old team if this player was the VIP
        for (const [teamId, vipId] of this.teamVipById.entries()) {
            if (vipId === playerId) {
                this.teamVipById.delete(teamId);
            }
        }

        // Ensure new team has a VIP
        const newTeamId = mod.GetObjId(newTeam);
        if (!this.teamHasAssignedVip(newTeamId)) {
            this.assignVipForTeam(newTeam);
        }

        // Update scoreboard when player switches team
        this.updateScoreboardValues();
    }

    onTimeLimitReached(): void {
        // Announce winner by VIP kills if any
        let winningTeamId: number | undefined;
        let topKills = -1;
        for (const [teamId, kills] of this.vipKillsByTeamId.entries()) {
            if (kills > topKills) {
                topKills = kills;
                winningTeamId = teamId;
            }
        }
        if (winningTeamId !== undefined && CONFIG.onTimeLimitAnnounceWinner) {
            ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.teamWins));
        }
    }

    private assignVipForTeam(team: mod.Team): void {
        const teamId = mod.GetObjId(team);
        const members = getPlayersInTeam(team);
        if (members.length === 0) return;

        const newVip = selectVipForTeam(members, this.playerKillsById, this.playerDeathsById);
        this.teamVipById.set(teamId, mod.GetObjId(newVip));

        // Notify the new VIP
        ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), newVip);

        // Update scoreboard when VIP changes
        this.updateScoreboardValues();
    }

    private updateScoreboardValues(): void {
        updateScoreboard({
            teamVipById: this.teamVipById,
            vipKillsByTeamId: this.vipKillsByTeamId,
            playerVipKillsById: this.playerVipKillsById,
            playerKillsById: this.playerKillsById,
            playerDeathsById: this.playerDeathsById,
        });
    }


}
