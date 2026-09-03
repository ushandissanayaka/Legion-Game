import { Vector3Data } from '../types/game';

interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const PLAYER_RADIUS = 0.4;
const ARENA_LIMIT = 30;

function box(width: number, depth: number, x: number, z: number): BoxCollider {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

// Solid map geometry. Bounds intentionally match the client AABB collision model.
const MAP_COLLIDERS: BoxCollider[] = [
  box(70, 1, 0, -35), box(70, 1, 0, 35),
  box(1, 70, -35, 0), box(1, 70, 35, 0),
  box(3, 3, -33, -33), box(3, 3, 33, -33),
  box(3, 3, -33, 33), box(3, 3, 33, 33),
  box(10, 8, -18, -20), box(6, 5, -12, -17),
  box(11, 9, 18, 20), box(7, 5, 12, 17),
  box(8, 8, 19, -18), box(9, 9, -18, 18),
  box(10, 10, 0, 0), box(2.5, 2.5, 0, 0),
  box(6, 1, 0, -12), box(1, 3, 3, -13.5),
  box(6, 1, 0, 12), box(1, 3, -3, 13.5),
  box(1, 6, 12, 0), box(1, 6, -12, 0),
  box(2, 2, 6, -6), box(2, 2, 8.5, -5), box(2, 2, 7, -8.5), box(2, 2, 9.5, -7.5),
  box(2, 2, -6, 6), box(2, 2, -8, 7.5), box(2, 2, -9.5, 5.5),
  box(2, 2, -15, -10), box(2, 2, -12, -10), box(2, 2, -13.5, -12.5),
  box(2, 2, 15, 10), box(2, 2, 12, 10), box(2, 2, 13.5, 12.5),
  box(6, 1, 0, -12), box(1, 3, 3, -13.5), box(6, 1, 0, 12), box(1, 3, -3, 13.5),
  box(1, 6, 12, 0), box(1, 6, -12, 0),
  box(6, 0.6, -20, 0), box(6, 0.6, 20, 0),
  box(8, 0.6, 0, -26), box(8, 0.6, 0, 26),
  box(5, 0.6, -26, -10), box(5, 0.6, 26, 10),
  box(0.4, 0.4, -4, -4), box(0.4, 0.4, 4, -4),
  box(0.4, 0.4, -6, 14), box(0.4, 0.4, -5, 15),
  box(0.4, 0.4, 16, -4), box(0.4, 0.4, 16, -5.5), box(0.4, 0.4, 17, -3.5),
  box(0.4, 0.4, -16, 4), box(0.4, 0.4, -17, 5.5),
  box(0.4, 0.4, -25, -10), box(0.4, 0.4, -25, 10),
  box(0.4, 0.4, 25, -10), box(0.4, 0.4, 25, 10),
  box(0.4, 0.4, -10, -28), box(0.4, 0.4, 10, -28),
  box(0.4, 0.4, -10, 28), box(0.4, 0.4, 10, 28),
  box(0.4, 0.4, 28, 0), box(0.4, 0.4, -28, 0),
  box(0.4, 0.4, 0, 28), box(0.4, 0.4, 0, -28),
];

export function isPositionBlocked(position: Vector3Data): boolean {
  if (![position.x, position.y, position.z].every(Number.isFinite)) return true;
  if (Math.abs(position.x) > ARENA_LIMIT - PLAYER_RADIUS || Math.abs(position.z) > ARENA_LIMIT - PLAYER_RADIUS) {
    return true;
  }

  return MAP_COLLIDERS.some(collider =>
    position.x + PLAYER_RADIUS > collider.minX &&
    position.x - PLAYER_RADIUS < collider.maxX &&
    position.z + PLAYER_RADIUS > collider.minZ &&
    position.z - PLAYER_RADIUS < collider.maxZ
  );
}
