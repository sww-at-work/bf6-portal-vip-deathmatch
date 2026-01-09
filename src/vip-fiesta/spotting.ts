import { CONFIG } from './config.ts';

export function refreshSpotsForObserver(
    observer: mod.Player,
    teamVipById: Map<number, number>,
    observerWorldIcons: Map<number, Map<number, mod.WorldIcon>>
): void {
    const observerId = mod.GetObjId(observer);

    // Track current VIPs
    const currentVipIds: number[] = [];
    for (const [, vipId] of teamVipById.entries()) {
        if (vipId !== undefined) currentVipIds.push(vipId);
    }

    // Spot in both world and minimap
    for (const vipId of currentVipIds) {
        const vipPlayer = getPlayerById(vipId);
        if (!vipPlayer) continue;
        mod.SpotTarget(vipPlayer, observer, 1, mod.SpotStatus.SpotInBoth);

        // Maintain 3D WorldIcon per observer if enabled
        if (CONFIG.markers.enable3DIcons) {
            spawnOrUpdateWorldIcon(observer, vipPlayer, observerWorldIcons);
        }
    }

    // Cleanup world icons for VIPs that no longer exist
    if (CONFIG.markers.enable3DIcons) {
        const perObserver = observerWorldIcons.get(observerId);
        if (perObserver) {
            for (const [vipId, icon] of perObserver.entries()) {
                if (currentVipIds.indexOf(vipId) < 0) {
                    mod.UnspawnObject(icon as unknown as mod.Object);
                    perObserver.delete(vipId);
                }
            }
        }
    }
}

export function updateIconDistancesForObserver(
    observer: mod.Player,
    observerWorldIcons: Map<number, Map<number, mod.WorldIcon>>
): void {
    if (!CONFIG.markers.enable3DIcons) return;
    const observerId = mod.GetObjId(observer);
    const perObserver = observerWorldIcons.get(observerId);
    if (!perObserver) return;

    const observerPos = mod.GetSoldierState(observer, mod.SoldierStateVector.GetPosition) as mod.Vector;
    for (const [vipId, icon] of perObserver.entries()) {
        const vipPlayer = getPlayerById(vipId);
        if (!vipPlayer) continue;

        // If observer is the VIP, no icon/text is needed; remove if present
        if (vipId === observerId) {
            mod.UnspawnObject(icon as unknown as mod.Object);
            perObserver.delete(vipId);
            continue;
        }

        const vipPos = mod.GetSoldierState(vipPlayer, mod.SoldierStateVector.GetPosition) as mod.Vector;
        const dist = mod.DistanceBetween(observerPos, vipPos);
        const rounded = mod.RoundToInteger(dist);
        const msg = mod.Message(mod.stringkeys.vipFiesta.ui.distanceMeters, rounded);
        mod.SetWorldIconText(icon, msg);
    }
}

function spawnOrUpdateWorldIcon(
    observer: mod.Player,
    vipPlayer: mod.Player,
    observerWorldIcons: Map<number, Map<number, mod.WorldIcon>>
): void {
    const observerId = mod.GetObjId(observer);
    const vipId = mod.GetObjId(vipPlayer);
    const vipTeamId = mod.GetObjId(mod.GetTeam(vipPlayer));
    const friendly = vipTeamId === mod.GetObjId(mod.GetTeam(observer));

    let perObserver = observerWorldIcons.get(observerId);
    if (!perObserver) {
        perObserver = new Map<number, mod.WorldIcon>();
        observerWorldIcons.set(observerId, perObserver);
    }

    // If the observer is the VIP, do not show an icon; remove any existing
    if (vipId === observerId) {
        const existing = perObserver.get(vipId);
        if (existing) {
            mod.UnspawnObject(existing as unknown as mod.Object);
            perObserver.delete(vipId);
        }
        return;
    }

    let icon = perObserver.get(vipId);
    const vipPos = mod.GetSoldierState(vipPlayer, mod.SoldierStateVector.GetPosition) as mod.Vector;
    const offsetPos = mod.Add(vipPos, mod.CreateVector(0, 2.5, 0));

    if (!icon) {
        const rotation = mod.CreateVector(0, 0, 0);
        const spawned = mod.SpawnObject(mod.RuntimeSpawn_Common.WorldIcon, offsetPos, rotation) as mod.WorldIcon;
        icon = spawned;
        perObserver.set(vipId, icon);

        mod.SetWorldIconOwner(icon, observer);
        mod.SetWorldIconImage(icon, friendly ? mod.WorldIconImages.Triangle : mod.WorldIconImages.Skull);
        mod.SetWorldIconColor(icon, friendly ? mod.CreateVector(0, 1, 0) : mod.CreateVector(1, 0, 0));
        mod.SetWorldIconText(icon, mod.Message(mod.stringkeys.vipFiesta.ui.vipMarker));
        mod.EnableWorldIconImage(icon, true);
        mod.EnableWorldIconText(icon, true);
    } else {
        mod.SetWorldIconPosition(icon, offsetPos);
    }
}

function getPlayerById(id: number): mod.Player | undefined {
    const all = mod.AllPlayers();
    const n = mod.CountOf(all);
    for (let i = 0; i < n; i++) {
        const p = mod.ValueInArray(all, i) as mod.Player;
        if (mod.GetObjId(p) === id) return p;
    }
    return undefined;
}
