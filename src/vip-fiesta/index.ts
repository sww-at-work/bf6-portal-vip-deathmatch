import { getPlayersInTeam } from '../modlib/index.ts';
import { CONFIG } from './config.ts';
import { spotVipTargetsGlobal, removeVipIconForPlayer, removeVipIconForPlayerId, updateVipWorldIcons } from './spotting.ts';
import { selectVipForTeam } from './selection.ts';
// Death processing is handled within VIPFiesta to avoid passing functions/state around
import { initializeScoreboard, updateScoreboard } from './scoreboard.ts';
import { initializeScoreUI, updateScoreUI, createScoreUIForNewPlayer, removeScoreUIForPlayer } from './score-ui.ts';
import { syncGameStateFromPlayers, updateSortedTeamScores } from './state.ts';
import { gameState } from './state.ts';

export class VIPFiesta {

    initialize(): void {
        // Sync initial roster and teams at game start
        syncGameStateFromPlayers();
        updateSortedTeamScores();
        initializeScoreboard();
        initializeScoreUI();
        mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting));
    }

    private teamHasAssignedVip(teamId: number): boolean {
        const currentVip = gameState.teamVipById.get(teamId);
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
        if (now - gameState.lastGlobalSpotAt >= 1000) {
            spotVipTargetsGlobal();
            gameState.lastGlobalSpotAt = now;
        }
        // Update WorldIcon positions smoothly every tick
        updateVipWorldIcons();
    }

    onPlayerDeployed(player: mod.Player): void {
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        if (!this.teamHasAssignedVip(teamId)) {
            this.assignVipForTeam(team);
        }

        if (CONFIG.showIntroOnDeploy) {
            const pid = mod.GetObjId(player);
            if (!gameState.firstDeployByPlayerId.has(pid)) {
                gameState.firstDeployByPlayerId.add(pid);
                mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting), player);
            }
        }

        // Notify player if they are the VIP
        const vipId = gameState.teamVipById.get(teamId);
        if (vipId !== undefined && vipId === mod.GetObjId(player)) {
            mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);
        }
    }

    private updateSpottingForPlayer(player: mod.Player): void {
        const playerId = mod.GetObjId(player);
        const playerTeamId = mod.GetObjId(mod.GetTeam(player));

        // Edge-message on becoming VIP
        const teamVipId = gameState.teamVipById.get(playerTeamId);
        const isVip = teamVipId !== undefined && teamVipId === playerId;
        const state = gameState.vipSpottingShownFor.get(playerId) ?? { youAreVip: false };
        if (isVip && !state.youAreVip) {
            mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);
            state.youAreVip = true;
        } else if (!isVip && state.youAreVip) {
            state.youAreVip = false;
        }
        gameState.vipSpottingShownFor.set(playerId, state);

        // Observer-based spotting reserved for future; do not spot per-player here
    }


    onPlayerDied(player: mod.Player, other: mod.Player): void {
        // Keep game state aligned with current roster
        syncGameStateFromPlayers();
        // Handle suicides or deaths without a valid killer (redeploy/deserting)
        try {
            if (!other) {
                this.handleSuicide(player);
                return;
            }
            const playerId = mod.GetObjId(player);
            const otherId = mod.GetObjId(other);
            if (playerId === otherId) {
                this.handleSuicide(player);
                return;
            }
        } catch {
            // Defensive: if accessing killer info fails, treat as no-killer case
            this.handleSuicide(player);
            return;
        }

        this.processPlayerDeath(player, other);

        // Ensure any icon attached to the dead player's soldier is removed
        // (VIP markers attach to the VIP's object with team-scoped visibility)
        removeVipIconForPlayer(player);

        // Update scoreboard after death processing
        this.updateScoreboardValues();
    }

    private handleSuicide(player: mod.Player): void {
        const victimId = mod.GetObjId(player);
        gameState.playerDeathsById.set(victimId, (gameState.playerDeathsById.get(victimId) ?? 0) + 1);

        const victimTeam = mod.GetTeam(player);
        const victimTeamId = mod.GetObjId(victimTeam);
        const vipId = gameState.teamVipById.get(victimTeamId);

        // If the victim was the VIP, treat as VIP death without awarding kills
        if (vipId !== undefined && vipId === victimId) {
            mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.vipDied), victimTeam);
            gameState.teamVipById.delete(victimTeamId);
            (async () => {
                await mod.Wait(CONFIG.vipReassignDelaySeconds);
                this.assignVipForTeam(victimTeam);
            })();
        }

        // Clean up any world icons tied to the dead player and refresh scoreboard
        removeVipIconForPlayer(player);
        this.updateScoreboardValues();
    }

    private processPlayerDeath(player: mod.Player, other: mod.Player): void {
        if (gameState.gameEnded) return;

        const killerId = mod.GetObjId(other);
        const victimId = mod.GetObjId(player);
        gameState.playerKillsById.set(killerId, (gameState.playerKillsById.get(killerId) ?? 0) + 1);
        gameState.playerDeathsById.set(victimId, (gameState.playerDeathsById.get(victimId) ?? 0) + 1);

        const victimTeam = mod.GetTeam(player);
        const victimTeamId = mod.GetObjId(victimTeam);
        const vipId = gameState.teamVipById.get(victimTeamId);

        if (vipId !== undefined && vipId === victimId) {
            const killerTeam = mod.GetTeam(other);
            const killerTeamId = mod.GetObjId(killerTeam);
            gameState.vipKillsByTeamId.set(killerTeamId, (gameState.vipKillsByTeamId.get(killerTeamId) ?? 0) + 1);

            // Track individual player VIP kills
            gameState.playerVipKillsById.set(killerId, (gameState.playerVipKillsById.get(killerId) ?? 0) + 1);

            // Compute updated team VIP kill count for messaging
            const killerTeamKills = gameState.vipKillsByTeamId.get(killerTeamId) ?? 0;

            // Notify the killer's team and include the killer in the message
            mod.DisplayHighlightedWorldLogMessage(
                mod.Message(
                    mod.stringkeys.vipFiesta.notifications.vipKilledTeam,
                    other,
                    killerTeamKills,
                    CONFIG.targetVipKills
                ),
                killerTeam
            );

            mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.vipDied), victimTeam);

            gameState.teamVipById.delete(victimTeamId);

            (async () => {
                await mod.Wait(CONFIG.vipReassignDelaySeconds);
                this.assignVipForTeam(victimTeam);
            })();

            if (killerTeamKills >= CONFIG.targetVipKills) {
                mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.teamWins));
                gameState.gameEnded = true;
                mod.EndGameMode(killerTeam);
            }
        }
    }

    onPlayerJoinGame(player: mod.Player): void {
        // Initialize maps to include this player/team
        syncGameStateFromPlayers();
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);
        if (!this.teamHasAssignedVip(teamId)) {
            this.assignVipForTeam(team);
        }

        // Create score UI for the new player
        createScoreUIForNewPlayer(player);

        // Update scoreboard when player joins
        this.updateScoreboardValues();
    }

    onPlayerLeaveGame(playerId: number): void {
        // Initialize/prune maps after player leaves
        syncGameStateFromPlayers();
        // If a leaving player was a VIP, clear their team VIP slot
        for (const [teamId, vipId] of gameState.teamVipById.entries()) {
            if (vipId === playerId) {
                gameState.teamVipById.delete(teamId);
            }
        }

        // Remove any icon bound to the leaving player
        removeVipIconForPlayerId(playerId);

        // Remove score UI for the leaving player
        removeScoreUIForPlayer(playerId);

        // Update scoreboard when player leaves
        this.updateScoreboardValues();
    }

    onPlayerSwitchTeam(player: mod.Player, newTeam: mod.Team): void {
        // Initialize/prune maps around the team switch
        syncGameStateFromPlayers();
        const playerId = mod.GetObjId(player);
        // Remove VIP assignment from old team if this player was the VIP
        for (const [teamId, vipId] of gameState.teamVipById.entries()) {
            if (vipId === playerId) {
                gameState.teamVipById.delete(teamId);
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
        for (const [teamId, kills] of gameState.vipKillsByTeamId.entries()) {
            if (kills > topKills) {
                topKills = kills;
                winningTeamId = teamId;
            }
        }
        if (winningTeamId !== undefined && CONFIG.onTimeLimitAnnounceWinner) {
            mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.teamWins));
        }
    }

    private assignVipForTeam(team: mod.Team): void {
        const teamId = mod.GetObjId(team);
        const members = getPlayersInTeam(team);
        if (members.length === 0) return;

        const newVip = selectVipForTeam(members);
        gameState.teamVipById.set(teamId, mod.GetObjId(newVip));

        // Notify the team with the new VIP's name
        mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.newVip, newVip), team);

        // Notify the new VIP
        mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), newVip);

        // Update scoreboard when VIP changes
        this.updateScoreboardValues();
    }

    private updateScoreboardValues(): void {
        updateSortedTeamScores();
        updateScoreboard();
        updateScoreUI();
    }


}
