export interface Station {
  x?: number;
  z: number;
  radius?: number;
  label?: string;
}
export function stationReached(
  position: { x: number; z: number },
  station: Station,
) {
  return station.radius !== undefined
    ? Math.hypot(position.x - (station.x ?? 0), position.z - station.z) <=
        station.radius
    : Math.abs(position.x - (station.x ?? 0)) <= 6 &&
        Math.abs(position.z - station.z) <= 1.4;
}
export function finishReached(
  position: { x: number; z: number },
  finish: number | { x: number; z: number; radius: number },
  visited: number,
  total: number,
) {
  if (visited < total) return false;
  return typeof finish === "number"
    ? position.z <= finish && Math.abs(position.x) <= 6
    : Math.hypot(position.x - finish.x, position.z - finish.z) <= finish.radius;
}
export function waypoint(
  position: { x: number; z: number },
  target: { x?: number; z: number },
  yaw: number,
) {
  const dx = (target.x ?? 0) - position.x,
    dz = target.z - position.z;
  const angle = Math.atan2(-dx, -dz) - yaw;
  return {
    distance: Math.hypot(dx, dz),
    angle: Math.atan2(Math.sin(angle), Math.cos(angle)),
  };
}
