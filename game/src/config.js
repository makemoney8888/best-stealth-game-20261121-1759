// Lantern's Shadow — shared constants and tuning.
// All sizes are in canvas pixels; the world is a tile grid seen from above.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 178; // px per second
export const GUARD_RADIUS = 13;
export const GUARD_PATROL_SPEED = 66;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_PAUSE_AT_WAYPOINT = 0.9; // seconds

export const VISION_RANGE = 168; // px, guard sight distance in open light
export const VISION_HALF_ANGLE = 0.62; // radians either side of facing (~35 deg)
export const SHADOW_RANGE_FACTOR = 0.55; // sight range while the player hides in shadow
export const BUSH_HIDE_DISTANCE = 72; // px: inside a bush, only seen closer than this
export const CATCH_DISTANCE = 22; // px: an alerted guard this close catches the player

// Suspicion meter: 0 calm, 1 full alarm. Rises while the player is seen,
// faster up close; decays while hidden.
export const DETECT_BASE_RATE = 0.55;
export const DETECT_CLOSE_BONUS = 2.1;
export const DETECT_DECAY_RATE = 0.55;
export const SUSPICIOUS_AT = 0.3; // meter above this: guard stops and stares
export const CHASE_LOST_SIGHT = 2.5; // seconds unseen before a chasing guard gives up

export const MAX_ALARMS = 3;

// Palette: a night garden lit by lanterns.
export const COLORS = {
  floorA: '#22332c',
  floorB: '#1f2f29',
  floorEdge: '#182420',
  wall: '#4b5a52',
  wallTop: '#6b7d72',
  wallEdge: '#2c3833',
  crate: '#8a6b3f',
  crateEdge: '#5f4a2a',
  crateLine: '#a8844f',
  bush: '#2e6b3a',
  bushDark: '#245430',
  bushLight: '#3f8a4c',
  shadow: '#101a17',
  shadowEdge: '#1b2b26',
  exit: '#2ec4b6',
  exitGlow: '#7ff0e2',
  shard: '#ffd166',
  player: '#2b2f4a',
  playerCloak: '#3a4066',
  lantern: '#ffd166',
  lanternGlow: 'rgba(255, 209, 102, 0.28)',
  guard: '#b03a2e',
  guardDark: '#7e2a20',
  coneCalm: 'rgba(255, 214, 90, 0.16)',
  coneSuspicious: 'rgba(255, 149, 0, 0.24)',
  coneAlerted: 'rgba(255, 60, 40, 0.30)',
  coneEdgeCalm: 'rgba(255, 214, 90, 0.35)',
  coneEdgeAlerted: 'rgba(255, 60, 40, 0.55)',
  hudBg: 'rgba(10, 16, 14, 0.72)',
  text: '#f2ead8',
  textDim: '#b9c4b8',
  accent: '#ffd166',
  danger: '#ff5a3c',
};
