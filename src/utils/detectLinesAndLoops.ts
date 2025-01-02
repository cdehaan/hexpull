import { HexPatternsType, HexType } from "../types";
import { getEdgeHexes, getNeighborCoords, getNeighborHex } from "./NeighborUtils";

export const detectLinesAndLoops = (hexes: HexType[]) => {
    console.log('Detecting lines and loops');
    const detectedHexPatterns: HexPatternsType[] = hexes.map((hex) => ({ index:hex.index, edge: false, line: false, loop: null, core: null }));

    // Detect lines
    const directions = [
      1, // Vertical
      2, // Up-right
      3, // Down-right
    ];

    detectedHexPatterns.forEach((hexPattern) => {
      const currentHex = hexes.find((h) => h.index === hexPattern.index);
      if (!currentHex) return;
      if (currentHex.x === null || currentHex.y === null) return;

      directions.forEach((direction) => {
        let count = 1;
        let line = [hexPattern];
        let lineColor = currentHex.color;
        let neighborCoords;
        let neighborIndex: number | null;
        let neighborHex;

        let x = currentHex.x;
        let y = currentHex.y;
        while (true) {
          if(!x || !y) break;

          neighborCoords = getNeighborCoords(x, y, direction);
          if (!neighborCoords) break;
          x = neighborCoords.x;
          y = neighborCoords.y;

          neighborIndex = hexes.findIndex((loc) => loc.x === x && loc.y === y);
          if (neighborIndex === null) break;

          neighborHex = hexes.find((h) => h.index === neighborIndex);
          if (!neighborHex) break;

          if (neighborHex.color === lineColor) {
            line.push(detectedHexPatterns[neighborIndex]);
            count++;
          } else {
            break;
          }
        }

        if (count >= 5) {
          //console.log('Line detected', line);
          line.forEach((lineHex) => (lineHex.line = true));
        }
      });
    });

    // Detect loops
    const numberOfColors = hexes.reduce((acc, hex) => {
      const colorValue = Number(hex.color); // Try to cast the color value to a number
      if (!isNaN(colorValue)) { // Check if it's a valid number
          return Math.max(acc, colorValue); // Update the accumulator with the maximum value
      }
      return acc; // If not a number, just return the accumulator
    }, 0); // Start with the smallest safe integer
    const colors = Array.from(Array(numberOfColors).keys()); // Create an array of colors, like [0, 1, 2, 3, 4, 5]

    const edgeHexes = getEdgeHexes(hexes);
    edgeHexes.forEach((edgeHex) => {
      const currentPattern = detectedHexPatterns.find((pattern) => pattern.index === edgeHex.index);
      if (!currentPattern) return; // should never happen
      currentPattern.edge = true;
    });

    const walkNeighbors = (hex: HexType, color: number, detectedHexPatterns: HexPatternsType[], hexes: HexType[]) => {
      if (!hex.x || !hex.y) return; // Should never happen

      for (let direction = 1; direction <= 6; direction++) {
          const neighbor = getNeighborHex(hex.x, hex.y, direction, hexes);
          if (!neighbor) continue; // If no neighbor exists, skip. Happens on the edge

          const neighborPattern = detectedHexPatterns.find((pattern) => pattern.index === neighbor.index);
          if (!neighborPattern) continue; // Should never happen

          if (neighborPattern.core === false) return; // Already processed
          neighborPattern.core = false; // Mark as processed

          if (neighbor.color === color) return; // Same color, stop walking

          walkNeighbors(neighbor, color, detectedHexPatterns, hexes); // Recursive call
      }
  };


  colors.forEach((color) => {

    edgeHexes.forEach((edgeHex) => {
      if (edgeHex.x === null || edgeHex.y === null) return; // should never happen

      const currentPattern = detectedHexPatterns.find((pattern) => pattern.index === edgeHex.index);
      if(!currentPattern) return; // should never happen

      if(currentPattern.core === false) return;
      currentPattern.core = false;

      if(edgeHex.color === color) return;

      walkNeighbors(edgeHex, color, detectedHexPatterns, hexes);
    });

    detectedHexPatterns.forEach((hexPattern) => {
      if(hexPattern.core === null) {
        hexPattern.core = true;
      } else {
        hexPattern.core = null;
      }
    });  

  });



  return detectedHexPatterns;
};