// Lantern's Shadow — deterministic staged scenes for screenshots.
// ?shot=title | stealth | caught | win builds a fixed game state (seeded)
// so a screenshot shows a real render of the game, not a mock-up.

import { TILE } from './config.js';
import { LEVELS } from './levels.js';
import { parseLevel } from './world.js';
import { Guard } from './guards.js';
import { makeRng } from './random.js';

function baseState(levelIndex) {
  const levelDef = LEVELS[levelIndex];
  const world = parseLevel(levelDef);
  const guards = levelDef.guards.map((def) => new Guard(def));
  return {
    screen: 'playing',
    levelIndex,
    levelDef,
    world,
    player: { x: world.playerStart.x, y: world.playerStart.y, facing: 0, moving: false },
    guards,
    alarms: 0,
    shardsCollected: 0,
    levelTime: 0,
    totalTime: 0,
    totalShards: 0,
    gameOverReason: null,
    alarmFlash: 0,
    muted: false,
    clickTarget: null,
  };
}

/** A staged state for one screenshot kind. Unknown kinds fall back to title. */
export function buildShotState(kind) {
  const rng = makeRng(20261121);
  void rng;
  if (kind === 'stealth') {
    const state = baseState(1);
    // Player crouched behind a crate while a guard's cone sweeps past.
    state.player.x = 9.5 * TILE;
    state.player.y = 9.5 * TILE;
    state.player.facing = Math.PI / 2;
    state.alarms = 1;
    state.levelTime = 47;
    state.shardsCollected = 1;
    state.world.shards[0].taken = true;
    state.clickTarget = { x: 13.5 * TILE, y: 12.5 * TILE };
    const g0 = state.guards[0];
    g0.x = 10.5 * TILE;
    g0.y = 5.5 * TILE;
    g0.facing = Math.PI / 2;
    g0.suspicion = 0.55;
    g0.state = 'suspicious';
    const g1 = state.guards[1];
    g1.x = 20.5 * TILE;
    g1.y = 8.5 * TILE;
    g1.facing = -Math.PI / 2;
    return state;
  }
  if (kind === 'caught') {
    const state = baseState(0);
    state.screen = 'gameOver';
    state.gameOverReason = 'caught';
    state.alarms = 2;
    state.levelTime = 33;
    state.shardsCollected = 1;
    state.world.shards[0].taken = true;
    state.player.x = 12.5 * TILE;
    state.player.y = 5.5 * TILE;
    state.player.facing = Math.PI;
    state.alarmFlash = 0.6;
    const g0 = state.guards[0];
    g0.x = 13.5 * TILE;
    g0.y = 5.5 * TILE;
    g0.facing = Math.PI;
    g0.state = 'chase';
    g0.suspicion = 1;
    return state;
  }
  if (kind === 'win') {
    const state = baseState(2);
    state.screen = 'win';
    state.totalTime = 312;
    state.totalShards = 7;
    state.levelTime = 96;
    state.shardsCollected = 2;
    state.world.shards[0].taken = true;
    state.world.shards[1].taken = true;
    state.player.x = (state.world.exit.col + 0.5) * TILE;
    state.player.y = (state.world.exit.row + 0.5) * TILE;
    return state;
  }
  // 'title' and anything else.
  const state = baseState(0);
  state.screen = 'title';
  return state;
}
