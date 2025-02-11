import { HexPatternsType, HexType } from "../types";
import { getEdgeHexes, getNeighborCoords, getNeighborHex } from "./NeighborUtils";

export const detectLinesAndLoops = (hexes: HexType[]) => {
    const gameboardHexes = hexes.filter((hex) => hex.removedIndex === null);
    const detectedHexPatterns: HexPatternsType[] = gameboardHexes.map((hex): HexPatternsType => ({
      index:hex.index,
      edge: false,
      lines: [],
      loop: null,
      core: null
    }));

    // Detect lines
    let lineId = 0;
    const directions = [
      1, // Vertical
      2, // Up-right
      3, // Down-right
    ];

    detectedHexPatterns.forEach((hexPattern) => {
      const currentHex = hexes.find((h) => h.index === hexPattern.index);
      if (!currentHex || currentHex.restingLocation === null) return;

      directions.forEach((direction) => {
        if (currentHex.restingLocation === null || currentHex.restingLocation.x === null || currentHex.restingLocation.y === null) return;
        let count = 1;
        let line = [hexPattern];
        let lineColor = currentHex.color;
        let neighborCoords;
        let neighborIndex: number | null;
        let neighborHex;

        // Skip if the line is already detected from a hex further back in this direction
        const backwardsneighbor = getNeighborHex(currentHex.restingLocation.x, currentHex.restingLocation.y, direction + 3, hexes);
        if (backwardsneighbor && backwardsneighbor.color === lineColor) return;

        let x = currentHex.restingLocation.x;
        let y = currentHex.restingLocation.y;
        let consoleIt = false;
        while (true) {
          if(x === null || y === null) break;

          neighborCoords = getNeighborCoords(x, y, direction);
          if(x === 0 && y === 7) {
            consoleIt = true;
          } else {
            consoleIt = false;
          }
          if (!neighborCoords) break;
          x = neighborCoords.x;
          y = neighborCoords.y;

          neighborIndex = hexes.findIndex((loc) => loc.restingLocation !== null && loc.restingLocation.x === x && loc.restingLocation.y === y);
          const neighborCount = hexes.filter((loc) => loc.restingLocation !== null && loc.restingLocation.x === x && loc.restingLocation.y === y).length;
          if (neighborCount > 1) console.log(`Neighbor ${x}, ${y} count ${neighborCount}`);
          if (neighborIndex === null) break;

          neighborHex = hexes.find((h) => h.index === neighborIndex);
          const neighborHexCount = hexes.filter((h) => h.index === neighborIndex).length;
          if (neighborHexCount > 1) console.log(`Neighbor index ${neighborIndex} count ${neighborHexCount}`);
          if (!neighborHex) break;

          if (neighborHex.color === lineColor) {
            const detectedHexPattern = detectedHexPatterns.find((pattern) => pattern.index === neighborIndex);
            if (detectedHexPattern) line.push(detectedHexPattern);
            count++;
          } else {
            break;
          }
        }

        if (count >= 5) {
          console.log("Line detected", line);
          line.forEach((lineHex, index) => (lineHex.lines.push({lineId: lineId, step: index, length: count})));
          line.forEach((lineHex) => {if(lineHex.lines.length > 1) console.log("Double line detected", lineHex)});
          lineId++;
        }
      });
    });

    // Detect cores
    const numberOfColors = 1 + hexes.reduce((acc, hex) => {
      const colorValue = Number(hex.color); // Try to cast the color value to a number
      if (!isNaN(colorValue)) { // Check if it's a valid number
          return Math.max(acc, colorValue); // Update the accumulator with the maximum value
      }
      return acc; // If not a number, just return the accumulator
    }, 0); // Start no colours
    const colors = Array.from(Array(numberOfColors).keys()); // Create an array of colors, like [0, 1, 2, 3, 4, 5]

    const edgeHexes = getEdgeHexes(hexes);
    edgeHexes.forEach((edgeHex) => {
      const currentPattern = detectedHexPatterns.find((pattern) => pattern.index === edgeHex.index);
      if (!currentPattern) return; // should never happen
      currentPattern.edge = true;
    });

    const walkNeighbors = (hex: HexType, color: number, detectedHexPatterns: HexPatternsType[], hexes: HexType[]) => {
      if (hex.restingLocation === null || hex.restingLocation.x === null || hex.restingLocation.y === null) return; // Check to make Typescript happy

      for (let direction = 1; direction <= 6; direction++) {
          const neighbor = getNeighborHex(hex.restingLocation.x, hex.restingLocation.y, direction, hexes);
          if (!neighbor) continue; // If no neighbor exists, skip. Happens on the edge

          const neighborPattern = detectedHexPatterns.find((pattern) => pattern.index === neighbor.index);
          if (!neighborPattern) continue; // Should never happen

          if (neighborPattern.core !== null) continue; // Already processed
          neighborPattern.core = false; // Mark as processed (reached in the walk, thus not the core of a loop)

          if (neighbor.color === color) continue; // Same color, stop walking

          walkNeighbors(neighbor, color, detectedHexPatterns, hexes); // Recursive call
      }
  };

  for (const color of colors) {
    for (const edgeHex of edgeHexes) {
        if (edgeHex.restingLocation === null || edgeHex.restingLocation.x === null || edgeHex.restingLocation.y === null) continue;

        const currentPattern = detectedHexPatterns.find((pattern) => pattern.index === edgeHex.index);
        if (!currentPattern) continue;

        if (currentPattern.core !== null) continue;
        currentPattern.core = false;

        if (edgeHex.color === color) continue;

        walkNeighbors(edgeHex, color, detectedHexPatterns, hexes);
    }

    for (const hexPattern of detectedHexPatterns) {
        if (hexPattern.core === null) hexPattern.core = true;
        if (hexPattern.core === false) hexPattern.core = null;
    }
  }

  for (const hexPattern of detectedHexPatterns) {
    if (hexPattern.core === null) hexPattern.core = false;
  }

  // Detect loops
  const cores = detectedHexPatterns.filter((hexPattern) => hexPattern.core === true);
  for (const core of cores) {
    const coreHex = hexes.find((hex) => hex.index === core.index);
    if (!coreHex) continue;

    const coreNeighbors = [1, 2, 3, 4, 5, 6].map((direction) => coreHex.restingLocation ? getNeighborHex(coreHex.restingLocation.x, coreHex.restingLocation.y, direction, hexes) : null);
    const coreNeighborsPatterns = coreNeighbors.map((neighbor) => detectedHexPatterns.find((pattern) => pattern.index === neighbor?.index));

    for (const pattern of coreNeighborsPatterns) {
      if (pattern && pattern.core !== true) pattern.loop = true;
    }
  }

  return detectedHexPatterns;
};