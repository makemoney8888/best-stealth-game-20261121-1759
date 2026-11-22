// Lantern's Shadow — game entry point: state machine, loop, and wiring.
// Screens: title -> playing <-> paused -> levelComplete -> (next level | win)
//        -> gameOver -> (retry). ?shot=title|stealth|caught|win stages a
//        frozen scene for screenshots instead of playing.

import { TILE, VIEW_W, VIEW_H, PLAYER_RADIUS, PLAYER_SPEED, MAX_ALARMS } from './config.js';
import { LEVELS } from './levels.js';
import { parseLevel, moveCircle } from './world.js';
import { Guard } from './guards.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { draw } from './render.js';
import { buildShotState } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sfx = new Sfx();

const state = {
  screen: 'title',
  levelIndex: 0,
  levelDef: LEVELS[0],
  world: null,
  player: { x: 0, y: 0, facing: 0, moving: false },
  guards: [],
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

function loadLevel(index) {
  const levelDef = LEVELS[index];
  const world = parseLevel(levelDef);
  state.levelIndex = index;
  state.levelDef = levelDef;
  state.world = world;
  state.player = { x: world.playerStart.x, y: world.playerStart.y, facing: 0, moving: false };
  state.guards = levelDef.guards.map((def) => new Guard(def));
  state.alarms = 0;
  state.shardsCollected = 0;
  state.levelTime = 0;
  state.gameOverReason = null;
  state.alarmFlash = 0;
  state.clickTarget = null;
  input.clear();
}

function setScreen(screen) {
  state.screen = screen;
  const messages = {
    title: "Lantern's Shadow. Press Enter to begin.",
    playing: `${state.levelDef.name}. Reach the glowing exit unseen.`,
    paused: 'Paused.',
    levelComplete: 'Level clear! Press Enter for the next level.',
    gameOver: state.gameOverReason === 'alarms'
      ? 'Three alarms. The garden woke up. Press Enter to retry.'
      : 'Caught by a guard. Press Enter to retry.',
    win: 'You cleared all three levels! Press Enter to play again.',
  };
  statusEl.textContent = messages[screen] || '';
}

function startGame() {
  loadLevel(0);
  state.totalTime = 0;
  state.totalShards = 0;
  setScreen('playing');
  sfx.unlock();
  sfx.click();
}

function nextLevel() {
  state.totalTime += state.levelTime;
  state.totalShards += state.shardsCollected;
  if (state.levelIndex + 1 >= LEVELS.length) {
    setScreen('win');
    sfx.win();
    return;
  }
  loadLevel(state.levelIndex + 1);
  setScreen('playing');
  sfx.levelClear();
}

function gameOver(reason) {
  state.gameOverReason = reason;
  setScreen('gameOver');
  sfx.caught();
}

function onConfirm() {
  sfx.unlock();
  if (state.screen === 'title') startGame();
  else if (state.screen === 'levelComplete') nextLevel();
  else if (state.screen === 'gameOver') {
    loadLevel(state.levelIndex);
    setScreen('playing');
  } else if (state.screen === 'win') startGame();
  else if (state.screen === 'paused') setScreen('playing');
}

function onPause() {
  if (state.screen === 'playing') {
    setScreen('paused');
    sfx.click();
  } else if (state.screen === 'paused') {
    setScreen('playing');
  }
}

input.onConfirm = onConfirm;
input.onPause = onPause;
input.onAnyKey = () => sfx.unlock();
input.onMute = () => {
  state.muted = !state.muted;
  sfx.muted = state.muted;
};
canvas.addEventListener('mousedown', () => {
  if (state.screen === 'title') onConfirm();
});

function updatePlayer(dt) {
  const p = state.player;
  let vx = 0;
  let vy = 0;
  const keys = input.moveVector();
  if (keys) {
    vx = keys.x;
    vy = keys.y;
    state.clickTarget = null;
  } else if (input.clickTarget) {
    const dx = input.clickTarget.x - p.x;
    const dy = input.clickTarget.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      input.clickTarget = null;
    } else {
      vx = dx / dist;
      vy = dy / dist;
      state.clickTarget = input.clickTarget;
    }
  }
  p.moving = vx !== 0 || vy !== 0;
  if (p.moving) {
    p.facing = Math.atan2(vy, vx);
    const moved = moveCircle(state.world.grid, p.x, p.y, PLAYER_RADIUS, vx * PLAYER_SPEED * dt, vy * PLAYER_SPEED * dt);
    p.x = moved.x;
    p.y = moved.y;
  }
  // Pick up lantern shards.
  for (const shard of state.world.shards) {
    if (!shard.taken && Math.hypot(shard.x - p.x, shard.y - p.y) < PLAYER_RADIUS + 10) {
      shard.taken = true;
      state.shardsCollected++;
      sfx.pickup();
    }
  }
  // Reached the exit?
  const col = Math.floor(p.x / TILE);
  const row = Math.floor(p.y / TILE);
  if (col === state.world.exit.col && row === state.world.exit.row) {
    setScreen('levelComplete');
    sfx.levelClear();
  }
}

function update(dt) {
  if (state.screen !== 'playing') return;
  state.levelTime += dt;
  if (state.alarmFlash > 0) state.alarmFlash = Math.max(0, state.alarmFlash - dt * 1.5);
  updatePlayer(dt);
  if (state.screen !== 'playing') return; // exit reached during this frame
  for (const guard of state.guards) {
    const result = guard.update(dt, state.player, state.world.grid, sfx);
    if (result === 'alarm') {
      state.alarms++;
      state.alarmFlash = 1;
      sfx.alarm();
      if (state.alarms >= MAX_ALARMS) {
        gameOver('alarms');
        return;
      }
    } else if (result === 'caught') {
      gameOver('caught');
      return;
    }
  }
}

// Screenshot staging: a frozen, deterministic scene, no updates.
const params = new URLSearchParams(window.location.search);
const shotKind = params.get('shot');
let shotMode = false;
if (shotKind) {
  const staged = buildShotState(shotKind);
  Object.assign(state, staged);
  setScreen(staged.screen);
  shotMode = true;
} else {
  loadLevel(0);
  setScreen('title');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!shotMode) update(dt);
  draw(ctx, state, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
