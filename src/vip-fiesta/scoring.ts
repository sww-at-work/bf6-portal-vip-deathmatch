import { CONFIG } from './config.ts';
import { ShowEventGameModeMessage } from '../modlib/index.ts';

export function handlePlayerDied(
    player: mod.Player,
    other: mod.Player,
    teamVipById: Map<number, number>,
    vipKillsByTeamId: Map<number, number>,
    playerKillsById: Map<number, number>,
    playerDeathsById: Map<number, number>,
    playerVipKillsById: Map<number, number>,
    assignVipForTeam: (team: mod.Team) => void,
    getGameEnded: () => boolean,
    setGameEnded: (ended: boolean) => void
): void {
    if (getGameEnded() && CONFIG.scoring.stopCountingAfterWin) return;

    const killerId = mod.GetObjId(other);
    const victimId = mod.GetObjId(player);
    playerKillsById.set(killerId, (playerKillsById.get(killerId) ?? 0) + 1);
    playerDeathsById.set(victimId, (playerDeathsById.get(victimId) ?? 0) + 1);

    const victimTeam = mod.GetTeam(player);
    const victimTeamId = mod.GetObjId(victimTeam);
    const vipId = teamVipById.get(victimTeamId);

    if (vipId !== undefined && vipId === victimId) {
        const killerTeamId = mod.GetObjId(mod.GetTeam(other));
        vipKillsByTeamId.set(killerTeamId, (vipKillsByTeamId.get(killerTeamId) ?? 0) + 1);
        
        // Track individual player VIP kills
        playerVipKillsById.set(killerId, (playerVipKillsById.get(killerId) ?? 0) + 1);

        ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.vipDied), victimTeam);

        teamVipById.delete(victimTeamId);

        (async () => {
            await mod.Wait(CONFIG.vipReassignDelaySeconds);
            assignVipForTeam(victimTeam);
        })();

        const killerTeamKills = vipKillsByTeamId.get(killerTeamId) ?? 0;
        if (killerTeamKills >= CONFIG.targetVipKills) {
            if (CONFIG.scoring.announceOnTargetReached) {
                ShowEventGameModeMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.teamWins));
            }
            if (CONFIG.scoring.stopCountingAfterWin) {
                setGameEnded(true);
            }
        }
    }
}
