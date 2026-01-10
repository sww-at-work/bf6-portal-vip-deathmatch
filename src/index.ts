import { VIPFiesta } from './vip-fiesta/index.ts';

let vipFiesta: VIPFiesta | undefined;

// This will trigger every sever tick.
export function OngoingGlobal(): void {
    // Do something minimal every tick. Remember, this gets called 30 times per second.
    vipFiesta?.ongoingGlobal();
}

// This will trigger every sever tick, for each Player.
export function OngoingPlayer(eventPlayer: mod.Player): void {
    // VIP Fiesta: maintain VIP spotting
    vipFiesta?.ongoingPlayer(eventPlayer);
}

// This will trigger at the start of the gamemode.
export function OnGameModeStarted(): void {
    // Initialize VIP Fiesta game mode
    vipFiesta = new VIPFiesta();
    vipFiesta.initialize();
}

// This will trigger whenever a Player deploys.
export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    // VIP Fiesta: handle player deploy
    vipFiesta?.onPlayerDeployed(eventPlayer);
}

// This will trigger whenever a Player dies.
export function OnPlayerDied(
    eventPlayer: mod.Player, // The player who died.
    eventOtherPlayer: mod.Player, // The player who killed the player who died.
    eventDeathType: mod.DeathType, // The type of death.
    eventWeaponUnlock: mod.WeaponUnlock // The weapon that killed the player who died.
): void {
    // VIP Fiesta: check if VIP was killed
    vipFiesta?.onPlayerDied(eventPlayer, eventOtherPlayer);
}

// This will trigger when a Player joins the game.
export function OnPlayerJoinGame(eventPlayer: mod.Player): void {
    // VIP Fiesta: handle player join
    vipFiesta?.onPlayerJoinGame(eventPlayer);
}

// This will trigger when any player leaves the game.
export function OnPlayerLeaveGame(eventNumber: number): void {
    // VIP Fiesta: handle player leave
    vipFiesta?.onPlayerLeaveGame(eventNumber);
}

// This will trigger when a Player changes team.
export function OnPlayerSwitchTeam(eventPlayer: mod.Player, eventTeam: mod.Team): void {
    // VIP Fiesta: handle team switch
    vipFiesta?.onPlayerSwitchTeam(eventPlayer, eventTeam);
}

// This will trigger when the gamemode time limit has been reached.
export function OnTimeLimitReached(): void {
    // VIP Fiesta: end game when time runs out
    vipFiesta?.onTimeLimitReached();
}
