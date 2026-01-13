import { CONFIG } from './config.ts';

type VipIconEntry = { icon: mod.WorldIcon; player: mod.Player };

const vipWorldIconsByVipId: Map<number, VipIconEntry> = new Map();

function vipOffsetPosition(player: mod.Player): mod.Vector {
    const pos = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
    const y = CONFIG.markers.verticalOffsetMeters;
    // Add a vertical offset directly in meters
    return mod.Add(pos, mod.CreateVector(0, y, 0));
}

function ensureVipWorldIcon(vip: mod.Player): void {
    const vipId = mod.GetObjId(vip);
    if (vipWorldIconsByVipId.has(vipId)) return;

    const spawnPos = vipOffsetPosition(vip);
    const worldicon = mod.SpawnObject(
        mod.RuntimeSpawn_Common.WorldIcon,
        spawnPos,
        mod.CreateVector(0, 0, 0)
    );

    // Configure icon
    mod.SetWorldIconImage(worldicon, mod.WorldIconImages.Skull);
    mod.SetWorldIconColor(worldicon, CONFIG.markers.enemyColorRGB);
    // Globally visible: do NOT set owner
    mod.SetWorldIconPosition(worldicon, spawnPos);
    mod.EnableWorldIconImage(worldicon, true);
    mod.EnableWorldIconText(worldicon, true);
    // Set text to string key "VIP"
    mod.SetWorldIconText(worldicon, mod.Message(mod.stringkeys.vipFiesta.ui.vipMarker));

    vipWorldIconsByVipId.set(vipId, { icon: worldicon, player: vip });
}

function removeVipWorldIconByVipId(vipId: number): void {
    const entry = vipWorldIconsByVipId.get(vipId);
    if (entry) {
        mod.UnspawnObject(entry.icon);
        vipWorldIconsByVipId.delete(vipId);
    }
}

function removeVipWorldIconForPlayer(player: mod.Player): void {
    removeVipWorldIconByVipId(mod.GetObjId(player));
}

export function updateVipWorldIcons(teamVipById: Map<number, number>): void {
    if (!CONFIG.markers.enable3DIcons) return;

    // Build current VIP id set
    const currentVipIds = new Set<number>();
    for (const [, vipId] of teamVipById.entries()) currentVipIds.add(vipId);

    // Ensure icons exist for all current VIPs
    const all = mod.AllPlayers();
    const count = mod.CountOf(all);
    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(all, i) as mod.Player;
        const pid = mod.GetObjId(p);
        if (currentVipIds.has(pid)) {
            const alive = mod.GetSoldierState(p, mod.SoldierStateBool.IsAlive);
            if (alive) ensureVipWorldIcon(p);
        }
    }

    // Move or remove existing icons
    for (const [vipId, entry] of Array.from(vipWorldIconsByVipId.entries())) {
        // GC icons for players who are no longer VIPs
        if (!currentVipIds.has(vipId)) {
            removeVipWorldIconByVipId(vipId);
            continue;
        }
        const vip = entry.player;
        const alive = mod.GetSoldierState(vip, mod.SoldierStateBool.IsAlive);
        if (!alive) {
            removeVipWorldIconByVipId(vipId);
            continue;
        }
        // Update position with configured vertical offset
        const newPos = vipOffsetPosition(vip);
        mod.SetWorldIconPosition(entry.icon, newPos);
    }
}

export function spotVipTargetsGlobal(teamVipById: Map<number, number>): void {
    // Only perform minimap/3D spotting ping if configured
    if (!CONFIG.markers.enableMinimapSpotting) return;

    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    const currentVipIds = new Set<number>();
    for (const [, vipId] of teamVipById.entries()) currentVipIds.add(vipId);

    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(allPlayers, i) as mod.Player;
        const pid = mod.GetObjId(p);
        if (!currentVipIds.has(pid)) continue;
        const alive = mod.GetSoldierState(p, mod.SoldierStateBool.IsAlive);
        if (!alive) continue;
        // Spot for 1s in both minimap and 3D (radar ping)
        mod.SpotTarget(p, 1, mod.SpotStatus.SpotInBoth);
    }
}

// Helper: remove any icon(s) tied to a player's soldier (UI icon legacy + WorldIcon)
export function removeVipIconForPlayer(player: mod.Player): void {
    // WorldIcon cleanup
    removeVipWorldIconForPlayer(player);
}

export function removeVipIconForPlayerId(playerId: number): void {
    // Rely on world icon map for cleanup by player id
    removeVipWorldIconByVipId(playerId);
}
