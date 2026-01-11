export function spotVipTargetsGlobal(teamVipById: Map<number, number>): void {
    const vipPlayers: mod.Player[] = [];
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    const seenTeamIds = new Set<number>();
    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(allPlayers, i) as mod.Player;
        const pid = mod.GetObjId(p);
        // Track all teams present to attach per-team icons
        seenTeamIds.add(mod.GetObjId(mod.GetTeam(p)));
        for (const [, vipId] of teamVipById.entries()) {
            if (vipId === pid) {
                vipPlayers.push(p);
                break;
            }
        }
    }

    for (const vip of vipPlayers) {
        const vipAlive = mod.GetSoldierState(vip, mod.SoldierStateBool.IsAlive);
        if (!vipAlive) {
            // Remove any existing UI icon if VIP is dead
            mod.RemoveUIIcon(vip);
            continue;
        }

        // Spot this VIP for all players for 1s in both minimap and 3D
        mod.SpotTarget(vip, 1, mod.SpotStatus.SpotInBoth);

        // Attach a red skull icon per team (visibility-scoped) to avoid colour overrides and vertical offset bug
        const red = mod.CreateVector(1, 0, 0);
        for (const teamId of Array.from(seenTeamIds.values())) {
            const team = mod.GetTeam(teamId);
            mod.AddUIIcon(
                vip,
                mod.WorldIconImages.Skull,
                3,
                red,
                mod.Message(mod.stringkeys.vipFiesta.ui.vipMarker),
                team
            );
        }
    }
}

// Helper: remove any UI icon(s) on a given player's soldier
export function removeVipIconForPlayer(player: mod.Player): void {
    mod.RemoveUIIcon(player);
}
