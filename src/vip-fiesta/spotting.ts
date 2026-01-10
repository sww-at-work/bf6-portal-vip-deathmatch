// Simplified VIP spotting: use Portal's SpotTarget to spot both minimap and 3D.
// Spots all current team VIPs for the given observer.
export function spotVipTargetsForObserver(
    observer: mod.Player,
    teamVipById: Map<number, number>
): void {
    // Collect current VIP players
    const vipPlayers: mod.Player[] = [];
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(allPlayers, i) as mod.Player;
        const pid = mod.GetObjId(p);
        for (const [, vipId] of teamVipById.entries()) {
            if (vipId === pid) {
                vipPlayers.push(p);
                break;
            }
        }
    }

    // Spot in both minimap and 3D for each VIP
    for (const vip of vipPlayers) {
        mod.SpotTarget(vip, observer, 1, mod.SpotStatus.SpotInBoth);
    }
}

// Global VIP spotting (no per-observer): spots all VIPs for everyone.
// This reduces per-player work and leverages the global SpotTarget overload.
export function spotVipTargetsGlobal(teamVipById: Map<number, number>): void {
    const vipPlayers: mod.Player[] = [];
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(allPlayers, i) as mod.Player;
        const pid = mod.GetObjId(p);
        for (const [, vipId] of teamVipById.entries()) {
            if (vipId === pid) {
                vipPlayers.push(p);
                break;
            }
        }
    }

    for (const vip of vipPlayers) {
        // Spot for all players for 1 second; called every tick to keep active
        mod.SpotTarget(vip, 1);
    }
}
