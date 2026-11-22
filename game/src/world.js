// Lantern's Shadow — the parsed world: tile grid, collision and line of sight.
// Pure logic (no DOM), so it can be smoke-tested from Node.

import { TILE, COLS, ROWS } from './config.js';

// Tile kinds. 'wall' and 'crate' are solid and block sight; 'bush' and
// 'shadow' are floor with a stealth property.
export const T = { FLOOR: 0, WALL: 1, CRATE: 2, BUSH: 3, SHADOW: 4 };

export function tileAt(grid, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return T.WALL;
  return grid[row][col];
}

export function isSolidTile(kind) {
  return kind === T.WALL || kind === T.CRATE;
}

export function blocksSightTile(kind) {
  return kind === T.WALL || kind === T.CRATE;
}

/** Parse one level definition into a playable world. */
export function parseLevel(def) {
  const grid = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { col: COLS - 2, row: ROWS - 2 };
  const shards = [];
  for (let row = 0; row < ROWS; row++) {
    const line = def.map[row];
    const out = [];
    for (let col = 0; col < COLS; col++) {
      const ch = line[col];
      let kind = T.FLOOR;
      if (ch === '#') kind = T.WALL;
      else if (ch === 'C') kind = T.CRATE;
      else if (ch === 'B') kind = T.BUSH;
      else if (ch === 'S') kind = T.SHADOW;
      else if (ch === 'P') playerStart = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
      else if (ch === 'E') exit = { col, row };
      else if (ch === '*') shards.push({ x: (col + 0.5) * TILE, y: (row + 0.5) * TILE, taken: false });
      out.push(kind);
    }
    grid.push(out);
  }
  return { grid, playerStart, exit, shards };
}

/** Move a circle (x, y, radius) by (dx, dy), sliding along solid tiles. */
export function moveCircle(grid, x, y, radius, dx, dy) {
  let nx = x + dx;
  if (circleHitsSolid(grid, nx, y, radius)) {
    // Step back to the wall in small increments instead of sticking.
    const step = dx > 0 ? 1 : -1;
    while (!circleHitsSolid(grid, nx - step, y, radius) && Math.abs(nx - x) > 0.5) nx -= step;
    if (circleHitsSolid(grid, nx, y, radius)) nx = x;
  }
  let ny = y + dy;
  if (circleHitsSolid(grid, nx, ny, radius)) {
    const step = dy > 0 ? 1 : -1;
    while (!circleHitsSolid(grid, nx, ny - step, radius) && Math.abs(ny - y) > 0.5) ny -= step;
    if (circleHitsSolid(grid, nx, ny, radius)) ny = y;
  }
  return { x: nx, y: ny };
}

export function circleHitsSolid(grid, x, y, radius) {
  const c0 = Math.floor((x - radius) / TILE);
  const c1 = Math.floor((x + radius) / TILE);
  const r0 = Math.floor((y - radius) / TILE);
  const r1 = Math.floor((y + radius) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isSolidTile(tileAt(grid, col, row))) continue;
      const nearestX = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
      const nearestY = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

/** True when the straight line between two points crosses no sight-blocking tile. */
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (blocksSightTile(tileAt(grid, Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
  }
  return true;
}

/** Distance a ray travels from (x, y) along angle before hitting a solid tile. */
export function rayDistance(grid, x, y, angle, maxDist) {
  const step = 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    const px = x + cos * d;
    const py = y + sin * d;
    if (blocksSightTile(tileAt(grid, Math.floor(px / TILE), Math.floor(py / TILE)))) return d;
  }
  return maxDist;
}

/** The tile kind under a point, for stealth checks (bush / shadow). */
export function kindAtPoint(grid, x, y) {
  return tileAt(grid, Math.floor(x / TILE), Math.floor(y / TILE));
}
