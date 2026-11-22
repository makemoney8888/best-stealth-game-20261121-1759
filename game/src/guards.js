// Lantern's Shadow — guard behaviour: patrol, suspicion, chase.
// A guard walks its waypoint loop, watches a vision cone, and raises the
// alarm when it is sure it saw the player. States: 'patrol', 'suspicious',
// 'chase'.

import {
  TILE,
  GUARD_RADIUS,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_PAUSE_AT_WAYPOINT,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  SHADOW_RANGE_FACTOR,
  BUSH_HIDE_DISTANCE,
  CATCH_DISTANCE,
  DETECT_BASE_RATE,
  DETECT_CLOSE_BONUS,
  DETECT_DECAY_RATE,
  SUSPICIOUS_AT,
  CHASE_LOST_SIGHT,
} from './config.js';
import { T, hasLineOfSight, kindAtPoint, moveCircle } from './world.js';

/**
 * Can this guard see the player right now?
 * Needs the player inside the vision cone, within (possibly shadow-shortened)
 * range, with a clear line of sight. Bushes hide the player unless close.
 */
export function guardSeesPlayer(guard, player, grid) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = VISION_RANGE;
  if (kindAtPoint(grid, player.x, player.y) === T.SHADOW) range *= SHADOW_RANGE_FACTOR;
  if (dist > range) return false;
  if (kindAtPoint(grid, player.x, player.y) === T.BUSH && dist > BUSH_HIDE_DISTANCE) return false;
  const angleTo = Math.atan2(dy, dx);
  let diff = angleTo - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > VISION_HALF_ANGLE) return false;
  return hasLineOfSight(grid, guard.x, guard.y, player.x, player.y);
}

export class Guard {
  constructor(def) {
    this.waypoints = def.path.map(([col, row]) => ({ x: (col + 0.5) * TILE, y: (row + 0.5) * TILE }));
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.facing = 0;
    this.speedMul = def.speed || 1;
    this.targetIndex = 1 % this.waypoints.length;
    this.pauseTimer = 0;
    this.state = 'patrol'; // patrol | suspicious | chase
    this.suspicion = 0; // 0..1
    this.unseenTimer = 0;
    this.stepTimer = 0;
  }

  get alerted() {
    return this.state === 'chase';
  }

  /** Advance one frame. Returns 'alarm' when suspicion just hit full, 'caught' on contact. */
  update(dt, player, grid, sfx) {
    const sees = guardSeesPlayer(this, player, grid);
    if (sees) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      let range = VISION_RANGE;
      if (kindAtPoint(grid, player.x, player.y) === T.SHADOW) range *= SHADOW_RANGE_FACTOR;
      const closeness = 1 - Math.min(1, dist / range);
      this.suspicion += (DETECT_BASE_RATE + DETECT_CLOSE_BONUS * closeness) * dt;
      this.unseenTimer = 0;
      // Turn to face what was seen.
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    } else {
      this.suspicion = Math.max(0, this.suspicion - DETECT_DECAY_RATE * dt);
      this.unseenTimer += dt;
    }

    if (this.state !== 'chase' && this.suspicion >= 1) {
      this.state = 'chase';
      this.suspicion = 1;
      return 'alarm';
    }
    if (this.state === 'chase') {
      if (this.unseenTimer > CHASE_LOST_SIGHT) {
        this.state = 'patrol';
        this.suspicion = 0;
        this.unseenTimer = 0;
        this._headForNearestWaypoint();
      } else {
        this._chase(dt, player, grid, sfx);
        if (Math.hypot(player.x - this.x, player.y - this.y) < CATCH_DISTANCE) return 'caught';
      }
      return null;
    }

    if (this.suspicion >= SUSPICIOUS_AT) {
      // Suspicious: stop and stare at the player while the meter builds.
      this.state = 'suspicious';
      return null;
    }
    this.state = 'patrol';
    this._patrol(dt, grid, sfx);
    return null;
  }

  _patrol(dt, grid, sfx) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }
    const target = this.waypoints[this.targetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = GUARD_PATROL_SPEED * this.speedMul;
    if (dist < 4) {
      this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
      this.pauseTimer = GUARD_PAUSE_AT_WAYPOINT;
      return;
    }
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    const moved = moveCircle(grid, this.x, this.y, GUARD_RADIUS, nx - this.x, ny - this.y);
    this.x = moved.x;
    this.y = moved.y;
    this._maybeStep(dt, sfx, step);
  }

  _chase(dt, player, grid, sfx) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const step = GUARD_CHASE_SPEED * this.speedMul * dt;
    const nx = this.x + (dx / dist) * Math.min(dist, step);
    const ny = this.y + (dy / dist) * Math.min(dist, step);
    this.facing = Math.atan2(dy, dx);
    const moved = moveCircle(grid, this.x, this.y, GUARD_RADIUS, nx - this.x, ny - this.y);
    this.x = moved.x;
    this.y = moved.y;
    this._maybeStep(dt, sfx, step);
  }

  _maybeStep(dt, sfx, step) {
    this.stepTimer -= dt;
    if (step > 0.5 && this.stepTimer <= 0) {
      this.stepTimer = 0.45;
      if (sfx) sfx.step();
    }
  }

  _headForNearestWaypoint() {
    let best = 0;
    let bestDist = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - this.x, w.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    this.targetIndex = best;
  }
}
