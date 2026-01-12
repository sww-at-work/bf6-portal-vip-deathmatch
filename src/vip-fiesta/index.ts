import { getPlayersInTeam, ShowEventGameModeMessage, ShowHighlightedGameModeMessage } from '../modlib/index.ts';
import { CONFIG } from './config.ts';
import { spotVipTargetsGlobal, removeVipIconForPlayer, removeVipIconForPlayerId, updateVipWorldIcons } from './spotting.ts';
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
    private lastGlobalSpotAt = 0;

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
        // Maintain edge notification only; global spotting handled centrally
        this.updateSpottingForPlayer(player);
    }

    ongoingGlobal(): void {
        // Central VIP spotting for all players (minimap ping throttled; 3D marker moved every tick)
        const now = Date.now();
        if (now - this.lastGlobalSpotAt >= 1000) {
            spotVipTargetsGlobal(this.teamVipById);
            this.lastGlobalSpotAt = now;
        }
        // Update WorldIcon positions smoothly every tick
        updateVipWorldIcons(this.teamVipById);
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

        // Observer-based spotting reserved for future; do not spot per-player here
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

        // Ensure any icon attached to the dead player's soldier is removed
        // (VIP markers attach to the VIP's object with team-scoped visibility)
        removeVipIconForPlayer(player);

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

        // Remove any icon bound to the leaving player
        removeVipIconForPlayerId(playerId);

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

        // Remove any icon tied to the switching player; will recreate if they remain VIP
        removeVipIconForPlayer(player);

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
