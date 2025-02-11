import { HexPatternsType, HexType } from "../types";

export const getNeighborCoords = (x: number, y: number, direction: number): { x: number; y: number } | null => {
    const evenRow = x % 2 === 0;
    switch (direction) {
      case 1: return { x, y: y - 1 }; // Above
      case 2: return { x: x + 1, y: evenRow ? y : y - 1 }; // Upper-right
      case 3: return { x: x + 1, y: evenRow ? y + 1 : y }; // Lower-right
      case 4: return { x, y: y + 1 }; // Below
      case 5: return { x: x - 1, y: evenRow ? y + 1 : y }; // Lower-left
      case 6: return { x: x - 1, y: evenRow ? y : y - 1 }; // Upper-left
      default: return null;
    }
  };

export const getNeighborHex = (x: number, y: number, direction: number, hexes: HexType[]): HexType | null => {
  const coords = getNeighborCoords(x, y, direction);
  if (!coords) return null;
  return hexes.find((loc) => loc.restingLocation && loc.restingLocation.x === coords.x && loc.restingLocation.y === coords.y) || null;
}

export const getNeighborPattern = (x: number, y: number, direction: number, hexes: HexType[], hexPatterns: HexPatternsType[]): HexPatternsType | null => {
  const coords = getNeighborCoords(x, y, direction);
  if (!coords) return null;
  const hex = hexes.find((loc) => loc.restingLocation && loc.restingLocation.x === coords.x && loc.restingLocation.y === coords.y) || null;
  if (!hex) return null;
  return hexPatterns.find((pattern) => pattern.index === hex.index) || null;
} 

export const getEdgeHexes = (hexes: HexType[]): HexType[] => {
  return hexes
    .filter(hex => hex.removedIndex === null)
    .map((hex) => {
      const hexNeighbors = [1, 2, 3, 4, 5, 6].map((direction) => {return hex.restingLocation === null ? null : getNeighborHex(hex.restingLocation.x, hex.restingLocation.y, direction, hexes)});
      if (hexNeighbors.some((hexes) => hexes === null)) return hex;
      return null;
    })
    .filter((hex) => hex !== null) as HexType[];
}