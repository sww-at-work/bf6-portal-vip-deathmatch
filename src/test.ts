const playerIcons = new Map<number, mod.WorldIcon>();

export function OnPlayerDeployed(player: mod.Player) {
    const iconPos = mod.Add(mod.ForwardVector(), mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition));
    const worldicon = mod.SpawnObject(mod.RuntimeSpawn_Common.WorldIcon, mod.Add(mod.UpVector(), mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition)), mod.CreateVector(0, 0, 0));
    mod.SetWorldIconColor(worldicon, mod.CreateVector(255, 0, 0));
    mod.SetWorldIconImage(worldicon, mod.WorldIconImages.Skull);
    mod.SetWorldIconOwner(worldicon, mod.GetTeam(player));
    mod.SetWorldIconPosition(worldicon, iconPos);
    mod.EnableWorldIconImage(worldicon, true);
    mod.EnableWorldIconText(worldicon, true);
    playerIcons.set(mod.GetObjId(player), worldicon);
}

export function OngoingPlayer(player: mod.Player) {
    const id = mod.GetObjId(player);
    const icon = playerIcons.get(id);
    if (icon) {
        const iconPos = mod.Add(mod.UpVector(), mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition));
        mod.SetWorldIconPosition(icon, iconPos);
    }
}

export function OnPlayerDied(player: mod.Player) {
    const id = mod.GetObjId(player);
    const icon = playerIcons.get(id);
    if (icon) {
        mod.UnspawnObject(icon);
        playerIcons.delete(id);
    }
}