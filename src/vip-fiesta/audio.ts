/**
 * Audio management for VIP Fiesta game mode.
 * Spawns and manages SFX objects for use with mod.PlaySound.
 */

/**
 * Enum for audio event types used in VIP Fiesta.
 */
export enum AudioEvent {
    FriendlyVipKilled,
    EnemyVipKilled,
    YouAreVip,
    NewVip,
}

/**
 * Map storing spawned SFX objects by their AudioEvent enum key.
 */
const audioObjects = new Map<AudioEvent, number>();

/**
 * Initializes audio by spawning necessary SFX objects.
 * Must be called during game initialization.
 */
export function initializeAudio(): void {
    // Spawn SFX objects at origin with default rotation/scale
    const origin = mod.CreateVector(0, 0, 0);
    const rotation = mod.CreateVector(0, 0, 0);
    const scale = mod.CreateVector(1, 1, 1);

    // Spawn friendly VIP killed sound
    const friendlyVipKilledObj = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gauntlet_Vendetta_FriendlyHVTKilled_OneShot2D,
        origin,
        rotation,
        scale
    );
    audioObjects.set(AudioEvent.FriendlyVipKilled, mod.GetObjId(friendlyVipKilledObj));

    // Spawn enemy VIP killed sound (player killed HVT)
    const enemyVipKilledObj = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gauntlet_Vendetta_PlayerKilledHVT_OneShot2D,
        origin,
        rotation,
        scale
    );
    audioObjects.set(AudioEvent.EnemyVipKilled, mod.GetObjId(enemyVipKilledObj));
    // Spawn "you are the target" sound
    const youAreVipObj = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gauntlet_Vendetta_YouAreTheTarget_OneShot2D,
        origin,
        rotation,
        scale
    );
    audioObjects.set(AudioEvent.YouAreVip, mod.GetObjId(youAreVipObj));

    // Spawn "new HVT" sound
    const newVipObj = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gauntlet_Vendetta_NewHVT_OneShot2D,
        origin,
        rotation,
        scale
    );
    audioObjects.set(AudioEvent.NewVip, mod.GetObjId(newVipObj));
}

/**
 * Plays a sound for a specific team.
 * @param event - The audio event to play.
 * @param amplitude - Volume level (typically 1.0).
 * @param team - The team that should hear the sound.
 */
export function playSoundForTeam(event: AudioEvent, amplitude: number, team: mod.Team): void {
    const objectId = audioObjects.get(event);
    if (objectId === undefined || objectId === -1) {
        // Audio object not spawned or spawn failed
        return;
    }
    mod.PlaySound(objectId, amplitude, team);
}

/**
 * Plays a sound for a specific player.
 * @param event - The audio event to play.
 * @param amplitude - Volume level (typically 1.0).
 * @param player - The player that should hear the sound.
 */
export function playSoundForPlayer(event: AudioEvent, amplitude: number, player: mod.Player): void {
    const objectId = audioObjects.get(event);
    if (objectId === undefined || objectId === -1) {
        // Audio object not spawned or spawn failed
        return;
    }
    mod.PlaySound(objectId, amplitude, player);
}

/**
 * Plays a sound globally (all players).
 * @param event - The audio event to play.
 * @param amplitude - Volume level (typically 1.0).
 */
export function playSoundGlobal(event: AudioEvent, amplitude: number): void {
    const objectId = audioObjects.get(event);
    if (objectId === undefined || objectId === -1) {
        // Audio object not spawned or spawn failed
        return;
    }
    mod.PlaySound(objectId, amplitude);
}
