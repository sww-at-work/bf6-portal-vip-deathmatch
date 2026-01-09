import { CONFIG } from './config.ts';

export function selectVipForTeam(
    members: mod.Player[],
    playerKillsById: Map<number, number>,
    playerDeathsById: Map<number, number>
): mod.Player {
    if (CONFIG.vipSelection === 'topPlayers') {
        const ranked = members
            .slice()
            .sort((a, b) => {
                const ka = playerKillsById.get(mod.GetObjId(a)) ?? 0;
                const kb = playerKillsById.get(mod.GetObjId(b)) ?? 0;
                if (kb !== ka) return kb - ka;
                const da = playerDeathsById.get(mod.GetObjId(a)) ?? 0;
                const db = playerDeathsById.get(mod.GetObjId(b)) ?? 0;
                if (da !== db) return da - db;
                return mod.GetObjId(a) - mod.GetObjId(b);
            });
        const poolSize = Math.max(1, Math.min(CONFIG.topPlayersPoolSize, ranked.length));
        const pool = ranked.slice(0, poolSize);
        return pool[Math.floor(Math.random() * pool.length)];
    }
    return members[Math.floor(Math.random() * members.length)];
}
