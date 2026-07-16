import type { WireColor } from "../lib/socket";

const map: Record<WireColor, string> = {
  red: "Merah",
  green: "Hijau",
  blue: "Biru",
  yellow: "Kuning",
  black: "Hitam",
};

export const getWireName = (color: WireColor) => map[color];
