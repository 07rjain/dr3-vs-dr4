export type Direction = "up" | "down" | "same" | "unknown";

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = roundScore(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function scoreDelta(
  dr3: number | null,
  dr4: number | null,
): { delta: number | null; direction: Direction } {
  if (dr3 === null || dr4 === null || !Number.isFinite(dr3) || !Number.isFinite(dr4)) {
    return { delta: null, direction: "unknown" };
  }
  const delta = roundScore(dr4 - dr3);
  if (delta === 0) return { delta: 0, direction: "same" };
  return { delta, direction: delta > 0 ? "up" : "down" };
}

export function deltaLabel(direction: Direction, delta: number | null): string {
  if (direction === "unknown" || delta === null) return "—";
  if (direction === "same" || delta === 0) return "0";
  const magnitude = formatScore(Math.abs(delta));
  return direction === "up" ? `+${magnitude}` : `−${magnitude}`;
}

export function deltaSentence(direction: Direction, delta: number | null): string {
  if (direction === "unknown" || delta === null) {
    return "One model has no score, so there is no numeric difference.";
  }
  if (direction === "same" || delta === 0) {
    return "Both models return the same score.";
  }
  const magnitude = formatScore(Math.abs(delta));
  const unit = magnitude === "1" ? "point" : "points";
  if (direction === "up") {
    return `DR4 is ${magnitude} ${unit} higher than the current rating.`;
  }
  return `DR4 is ${magnitude} ${unit} lower than the current rating.`;
}

export function directionWord(direction: Direction): string {
  switch (direction) {
    case "up":
      return "Higher";
    case "down":
      return "Lower";
    case "same":
      return "Same";
    default:
      return "No difference";
  }
}
