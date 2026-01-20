import { CONFIG } from './config.ts';
import { getTeamColor } from './utilities.ts';
import { gameState } from './state.ts';

type VipIconEntry = { icon: mod.WorldIcon; player: mod.Player };

// Keyed by `${ownerTeamId}:${vipId}` to support per-team visibility and styling
const vipWorldIconsByTeamVipKey: Map<string, VipIconEntry> = new Map();

function teamVipKey(ownerTeamId: number, vipId: number): string {
    return ownerTeamId + ':' + vipId;
}

function vipOffsetPosition(player: mod.Player): mod.Vector {
    const pos = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
    const y = CONFIG.markers.verticalOffsetMeters;
    // Add a vertical offset directly in meters
    return mod.Add(pos, mod.CreateVector(0, y, 0));
}

function ensureVipWorldIconForTeam(vip: mod.Player, ownerTeam: mod.Team, friendly: boolean): void {
    const vipId = mod.GetObjId(vip);
    const ownerTeamId = mod.GetObjId(ownerTeam);
    const key = teamVipKey(ownerTeamId, vipId);
    if (vipWorldIconsByTeamVipKey.has(key)) return;

    const spawnPos = vipOffsetPosition(vip);
    const worldicon = mod.SpawnObject(
        mod.RuntimeSpawn_Common.WorldIcon,
        spawnPos,
        mod.CreateVector(0, 0, 0)
    );

    // Configure icon per team visibility and styling
    const iconImage = friendly ? CONFIG.markers.friendlyIconImage : CONFIG.markers.enemyIconImage;
    // Enemy VIP icons should use the VIP's team color; friendly can keep configured friendly color
    const vipTeamId = mod.GetObjId(mod.GetTeam(vip));
    const iconColor = friendly ? CONFIG.markers.friendlyColorRGB : getTeamColor(vipTeamId);
    mod.SetWorldIconImage(worldicon, iconImage);
    mod.SetWorldIconColor(worldicon, iconColor);
    mod.SetWorldIconOwner(worldicon, ownerTeam);
    mod.SetWorldIconPosition(worldicon, spawnPos);
    mod.EnableWorldIconImage(worldicon, true);
    mod.EnableWorldIconText(worldicon, true);
    // Set text to string key "VIP"
    mod.SetWorldIconText(worldicon, mod.Message(mod.stringkeys.vipFiesta.ui.vipMarker));

    vipWorldIconsByTeamVipKey.set(key, { icon: worldicon, player: vip });
}

function removeVipWorldIconsByVipId(vipId: number): void {
    for (const [key, entry] of Array.from(vipWorldIconsByTeamVipKey.entries())) {
        const parts = key.split(':');
        const keyVipId = Number(parts[1]);
        if (keyVipId === vipId) {
            mod.UnspawnObject(entry.icon);
            vipWorldIconsByTeamVipKey.delete(key);
        }
    }
}

function removeVipWorldIconForPlayer(player: mod.Player): void {
    removeVipWorldIconsByVipId(mod.GetObjId(player));
}

export function updateVipWorldIcons(): void {
    if (!CONFIG.markers.enable3DIcons) return;

    // Build desired icon keys: for each team, show friendly icon for its VIP and enemy icons for all other VIPs
    const desiredKeys = new Set<string>();
    const allPlayers = mod.AllPlayers();
    const total = mod.CountOf(allPlayers);

    // Map observed team ids to a representative Team object
    const teamObjById = new Map<number, mod.Team>();
    for (let i = 0; i < total; i++) {
        const p = mod.ValueInArray(allPlayers, i) as mod.Player;
        const t = mod.GetTeam(p);
        teamObjById.set(mod.GetObjId(t), t);
    }

    // Helper to find a player object by id
    function findPlayerById(targetId: number): mod.Player | undefined {
        for (let i = 0; i < total; i++) {
            const p = mod.ValueInArray(allPlayers, i) as mod.Player;
            if (mod.GetObjId(p) === targetId) return p;
        }
        return undefined;
    }

    // Iterate VIPs
    for (const [vipTeamId, vipId] of gameState.teamVipById.entries()) {
        if (vipId === -1) continue;
        const vip = findPlayerById(vipId);
        if (!vip) continue;
        const alive = mod.GetSoldierState(vip, mod.SoldierStateBool.IsAlive);
        if (!alive) continue;

        // Ensure icons for every team present
        for (const [ownerTeamId, ownerTeam] of teamObjById.entries()) {
            const friendly = ownerTeamId === vipTeamId;
            if (!friendly && !CONFIG.markers.enableEnemyIcons) continue;
            const key = teamVipKey(ownerTeamId, vipId);
            desiredKeys.add(key);
            ensureVipWorldIconForTeam(vip, ownerTeam, friendly);
        }
    }

    // Move or remove existing icons
    for (const [key, entry] of Array.from(vipWorldIconsByTeamVipKey.entries())) {
        if (!desiredKeys.has(key)) {
            mod.UnspawnObject(entry.icon);
            vipWorldIconsByTeamVipKey.delete(key);
            continue;
        }
        const vip = entry.player;
        const alive = mod.GetSoldierState(vip, mod.SoldierStateBool.IsAlive);
        if (!alive) {
            // Remove if VIP died
            const parts = key.split(':');
            const vipId = Number(parts[1]);
            removeVipWorldIconsByVipId(vipId);
            continue;
        }
        // Update position with configured vertical offset
        const newPos = vipOffsetPosition(vip);
        mod.SetWorldIconPosition(entry.icon, newPos);
    }
}

export function spotVipTargetsGlobal(): void {
    // Only perform minimap/3D spotting ping if configured
    if (!CONFIG.markers.enableMinimapSpotting) return;

    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    const currentVipIds = new Set<number>();
    for (const [, vipId] of gameState.teamVipById.entries()) currentVipIds.add(vipId);

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
    removeVipWorldIconsByVipId(playerId);
}
