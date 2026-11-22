// Lantern's Shadow — all canvas drawing: the night garden, vision cones,
// the player and guards, the HUD, and the menu / end screens.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, VISION_RANGE, VISION_HALF_ANGLE, COLORS, MAX_ALARMS } from './config.js';
import { T, tileAt, rayDistance, kindAtPoint } from './world.js';

// Deterministic per-tile shade so the floor has texture without randomness.
function tileShade(col, row) {
  return ((col * 73 + row * 131) % 5) - 2;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = world.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (kind === T.SHADOW) {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.shadowEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        // faint moon-mottling inside shadow
        ctx.fillStyle = 'rgba(120, 160, 190, 0.05)';
        ctx.beginPath();
        ctx.arc(x + 10 + tileShade(col, row) * 2, y + 12, 6, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 22, 4, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const shade = tileShade(col, row);
      ctx.fillStyle = shade >= 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (shade === 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
      if (kind === T.BUSH) {
        // Bush floor stays dark green; the bush itself is drawn later, over actors.
        ctx.fillStyle = 'rgba(36, 84, 48, 0.5)';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

function drawExit(ctx, world, now) {
  const x = (world.exit.col + 0.5) * TILE;
  const y = (world.exit.row + 0.5) * TILE;
  const pulse = 0.75 + 0.25 * Math.sin(now / 350);
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 46);
  glow.addColorStop(0, `rgba(46, 196, 182, ${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(46, 196, 182, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();
  // Doorway: two posts and a lintel, glowing doorway between.
  ctx.fillStyle = '#123b36';
  ctx.fillRect(x - 13, y - 13, 26, 26);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.fillRect(x - 8, y - 10, 16, 20);
  ctx.fillStyle = '#0d2b28';
  ctx.fillRect(x - 8, y - 10, 16, 4);
  ctx.fillStyle = COLORS.exit;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', x, y + 26);
}

function drawShards(ctx, world, now) {
  for (const shard of world.shards) {
    if (shard.taken) continue;
    const bob = Math.sin(now / 300 + shard.x) * 2;
    const glow = ctx.createRadialGradient(shard.x, shard.y + bob, 1, shard.x, shard.y + bob, 16);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.55)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y + bob, 16, 0, Math.PI * 2);
    ctx.fill();
    // Diamond shard.
    ctx.fillStyle = COLORS.shard;
    ctx.beginPath();
    ctx.moveTo(shard.x, shard.y + bob - 7);
    ctx.lineTo(shard.x + 5, shard.y + bob);
    ctx.lineTo(shard.x, shard.y + bob + 7);
    ctx.lineTo(shard.x - 5, shard.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(shard.x, shard.y + bob - 4);
    ctx.lineTo(shard.x + 2, shard.y + bob - 1);
    ctx.lineTo(shard.x, shard.y + bob + 1);
    ctx.lineTo(shard.x - 2, shard.y + bob - 1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawVisionCone(ctx, guard, grid) {
  const rays = 26;
  const half = VISION_HALF_ANGLE;
  const color = guard.state === 'chase' ? COLORS.coneAlerted
    : guard.state === 'suspicious' ? COLORS.coneSuspicious : COLORS.coneCalm;
  const edge = guard.state === 'chase' ? COLORS.coneEdgeAlerted : COLORS.coneEdgeCalm;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const a = guard.facing - half + (2 * half * i) / rays;
    const d = rayDistance(grid, guard.x, guard.y, a, VISION_RANGE);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawWallsAndCrates(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = world.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (kind === T.WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
        ctx.fillRect(x + TILE - 3, y, 3, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (kind === T.CRATE) {
        ctx.fillStyle = COLORS.crate;
        roundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 3);
        ctx.fill();
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = COLORS.crateLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
      }
    }
  }
}

function drawBushes(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (world.grid[row][col] !== T.BUSH) continue;
      const x = col * TILE;
      const y = row * TILE;
      // Drawn over actors so a hidden player is partly covered.
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = COLORS.bush;
      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 9, 0, Math.PI * 2);
      ctx.arc(x + 22, y + 10, 10, 0, Math.PI * 2);
      ctx.arc(x + 16, y + 22, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.bushLight;
      ctx.beginPath();
      ctx.arc(x + 12, y + 10, 4, 0, Math.PI * 2);
      ctx.arc(x + 22, y + 20, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.bushDark;
      ctx.beginPath();
      ctx.arc(x + 20, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlayer(ctx, player, now) {
  const bob = player.moving ? Math.sin(now / 90) * 1.5 : 0;
  // Lantern glow.
  const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, 52);
  glow.addColorStop(0, COLORS.lanternGlow);
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 52, 0, Math.PI * 2);
  ctx.fill();
  // Cloak.
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  // Hood point in the facing direction.
  const hx = player.x + Math.cos(player.facing) * 9;
  const hy = player.y + bob + Math.sin(player.facing) * 9;
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, held out in front.
  const lx = player.x + Math.cos(player.facing) * 15;
  const ly = player.y + bob + Math.sin(player.facing) * 15;
  ctx.fillStyle = '#8a6b3f';
  ctx.fillRect(lx - 3, ly - 5, 6, 10);
  ctx.fillStyle = COLORS.lantern;
  ctx.beginPath();
  ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuard(ctx, guard, now) {
  // Suspicion meter arc above the head.
  if (guard.suspicion > 0.02 && guard.state !== 'chase') {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 20, 9, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.suspicion > 0.6 ? COLORS.danger : COLORS.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 20, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
    ctx.stroke();
  }
  // Body.
  ctx.fillStyle = COLORS.guardDark;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 10, 0, Math.PI * 2);
  ctx.fill();
  // Facing wedge (nose / visor).
  const nx = guard.x + Math.cos(guard.facing) * 11;
  const ny = guard.y + Math.sin(guard.facing) * 11;
  ctx.fillStyle = '#ffd9d0';
  ctx.beginPath();
  ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Helmet ridge.
  ctx.strokeStyle = COLORS.guardDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x - Math.sin(guard.facing) * 7, guard.y + Math.cos(guard.facing) * 7);
  ctx.lineTo(guard.x + Math.sin(guard.facing) * 7, guard.y - Math.cos(guard.facing) * 7);
  ctx.stroke();
  // Alert marks.
  if (guard.state === 'chase') {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 24);
  } else if (guard.state === 'suspicious') {
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 24);
  }
}

function drawClickTarget(ctx, target, now) {
  if (!target) return;
  const pulse = 5 + Math.sin(now / 150) * 2;
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(target.x - 8, target.y);
  ctx.lineTo(target.x + 8, target.y);
  ctx.moveTo(target.x, target.y - 8);
  ctx.lineTo(target.x, target.y + 8);
  ctx.stroke();
}

function drawWorld(ctx, state, now) {
  drawFloor(ctx, state.world);
  drawExit(ctx, state.world, now);
  drawShards(ctx, state.world, now);
  for (const guard of state.guards) drawVisionCone(ctx, guard, state.world.grid);
  drawWallsAndCrates(ctx, state.world);
  drawPlayer(ctx, state.player, now);
  for (const guard of state.guards) drawGuard(ctx, guard, now);
  drawBushes(ctx, state.world);
  drawClickTarget(ctx, state.clickTarget, now);
  // Alarm flash.
  if (state.alarmFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 20, ${Math.min(0.28, state.alarmFlash * 0.4)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 40);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.levelDef.name, 12, 21);
  // Alarms: three lantern dots, lit ones are the alarms already raised.
  const cx = VIEW_W / 2 - 30;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('Alarms', cx - 58, 21);
  for (let i = 0; i < MAX_ALARMS; i++) {
    const x = cx + i * 24;
    ctx.fillStyle = i < state.alarms ? COLORS.danger : 'rgba(255, 209, 102, 0.35)';
    ctx.beginPath();
    ctx.arc(x, 20, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i < state.alarms ? '#fff' : '#8a7a4a';
    ctx.beginPath();
    ctx.arc(x, 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shards and timer, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.shard;
  ctx.font = 'bold 15px sans-serif';
  const totalShards = state.world.shards.length;
  ctx.fillText(`◆ ${state.shardsCollected}/${totalShards}`, VIEW_W - 110, 21);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(formatTime(state.levelTime), VIEW_W - 12, 21);
  ctx.textBaseline = 'alphabetic';
  // Objective line under the bar.
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(242, 234, 216, 0.75)';
  ctx.fillText(state.levelDef.hint, 12, 58);
  if (state.muted) {
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('muted (M)', VIEW_W - 12, 58);
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function panel(ctx, title, lines, accent) {
  const w = 560;
  const h = 120 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(8, 14, 12, 0.82)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent || COLORS.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || COLORS.accent;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.fillStyle = COLORS.text;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 92 + i * 30);
  });
}

function drawTitle(ctx, state, now) {
  drawWorld(ctx, state, now);
  ctx.fillStyle = 'rgba(6, 10, 9, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bob = Math.sin(now / 500) * 4;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText("Lantern's Shadow", VIEW_W / 2, 200 + bob);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  ctx.fillText('A top-down stealth game — carry your lantern through the night garden.', VIEW_W / 2, 240 + bob);
  ctx.fillText('Reach the glowing exit. Stay out of the guards’ vision cones.', VIEW_W / 2, 268 + bob);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px sans-serif';
  ctx.fillText('Move: WASD / arrows, or click to walk  •  Pause: P  •  Mute: M', VIEW_W / 2, 330);
  ctx.fillText('Bushes hide you  •  Shadows shorten a guard’s sight  •  3 alarms and the night is over', VIEW_W / 2, 356);
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(now / 300) > -0.2;
  if (blink) ctx.fillText('Press Enter or click to begin', VIEW_W / 2, 420);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px sans-serif';
  ctx.fillText('3 levels  •  lantern shards to collect  •  best time wins the night', VIEW_W / 2, 470);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(6, 10, 9, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 'Paused', ['Press P or Escape to keep sneaking.', 'Enter restarts the level.'], COLORS.textDim);
}

function drawLevelComplete(ctx, state) {
  panel(ctx, 'Level Clear!', [
    `${state.levelDef.name} — ${formatTime(state.levelTime)}`,
    `Shards: ${state.shardsCollected} of ${state.world.shards.length}   •   Alarms: ${state.alarms}`,
    'Press Enter for the next level.',
  ]);
}

function drawGameOver(ctx, state) {
  const reason = state.gameOverReason === 'alarms'
    ? 'Three alarms — the garden woke up.'
    : 'A guard caught you in the open.';
  panel(ctx, 'Caught in the Dark', [
    reason,
    `${state.levelDef.name}   •   Shards: ${state.shardsCollected}`,
    'Press Enter to try the level again.',
  ], COLORS.danger);
}

function drawWin(ctx, state) {
  panel(ctx, 'Dawn Breaks — You Made It!', [
    `All three levels cleared in ${formatTime(state.totalTime)}.`,
    `Lantern shards collected: ${state.totalShards} of 9.`,
    'Press Enter to play again from the garden gate.',
  ]);
}

/** Draw the whole frame for the current game state. */
export function draw(ctx, state, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#101a17';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') {
    drawTitle(ctx, state, now);
    return;
  }
  drawWorld(ctx, state, now);
  if (state.screen === 'playing' || state.screen === 'paused') drawHud(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  else if (state.screen === 'levelComplete') drawLevelComplete(ctx, state);
  else if (state.screen === 'gameOver') drawGameOver(ctx, state);
  else if (state.screen === 'win') drawWin(ctx, state);
}
