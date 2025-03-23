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

  const halfDirections = [
    1, // Vertical
    2, // Up-right
    3, // Down-right
  ];

  const allDirections = [1, 2, 3, 4, 5, 6];

  // Detect lines
  let lineId = 1;

  detectedHexPatterns.forEach((hexPattern) => {
    const currentHex = hexes.find((h) => h.index === hexPattern.index);
    if (!currentHex) return;

    halfDirections.forEach((direction) => {
      if (currentHex.restingLocation === null) return;
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
      while (true) {
        if(x === null || y === null) break;

        neighborCoords = getNeighborCoords(x, y, direction);
        if (!neighborCoords) break;
        x = neighborCoords.x;
        y = neighborCoords.y;

        neighborIndex = hexes.findIndex((loc) => loc.restingLocation && loc.restingLocation.x === x && loc.restingLocation.y === y);
        if (neighborIndex === null) break;

        neighborHex = hexes.find((h) => h.index === neighborIndex);
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
        //console.log("Line detected", line);
        line.forEach((lineHex, index) => (lineHex.lines.push({lineId: lineId, step: index, length: count})));
        //line.forEach((lineHex) => {if(lineHex.line.length > 1) console.log("Double line detected", lineHex)});
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

  // This functio will be used to walk through the neighbors of a hex, for each colour, and mark them as core (or not)
  const walkNeighbors = (hex: HexType, color: number, detectedHexPatterns: HexPatternsType[], hexes: HexType[]) => {
    if (hex.restingLocation === null) return; // Should never happen

    for (let direction = 1; direction <= 6; direction++) {
      const neighbor = getNeighborHex(hex.restingLocation.x, hex.restingLocation.y, direction, hexes);
      if (!neighbor) continue; // If no neighbor in this direction exists, skip. Happens on the edge

      const neighborPattern = detectedHexPatterns.find((pattern) => pattern.index === neighbor.index);
      if (!neighborPattern) continue; // Should never happen

      if (neighborPattern.core !== null) continue; // Already processed
      neighborPattern.core = false; // Mark as processed (reached in the walk, thus not the core of a loop)

      if (neighbor.color === color) continue; // Same color, stop walking

      walkNeighbors(neighbor, color, detectedHexPatterns, hexes); // Recursive call
    }
  };

  // For each color, walk through the edge hexes and mark unreached hexes as cores.
  // Starting from every point on the edge, If you walk to every neighbor, unless you are on the colour currently being processed, you'll touch every hex that isn't a core
  for (const color of colors) {
    for (const edgeHex of edgeHexes) {
        if (edgeHex.restingLocation === null) continue;

        const currentPattern = detectedHexPatterns.find((pattern) => pattern.index === edgeHex.index);
        if (!currentPattern) continue;

        if (currentPattern.core !== null) continue;
        currentPattern.core = false;

        if (edgeHex.color === color) continue;

        walkNeighbors(edgeHex, color, detectedHexPatterns, hexes);
    }

    // If a hex is untouched, it's a core
    // If a hex is touched, it's not a core for this color, but might be for another color, so set it back to null
    for (const hexPattern of detectedHexPatterns) {
        if (hexPattern.core === null) hexPattern.core = true;
        if (hexPattern.core === false) hexPattern.core = null;
    }
  }

  // If a hex is touched for every color, it's not a core
  // If a hex hasn't been set to true during any of the walks, it's not a core
  // We just set it back to null in anticipation of testing another colour, but we already tested all colours, so we know it's not a core
  for (const hexPattern of detectedHexPatterns) {
    if (hexPattern.core === null) hexPattern.core = false;
  }


  // At this point, all hex patterns should have core set to "true" or "false"


  // This is the walking function for cores, similar to the above walk, but this time looking for touching cores
  // Function to number the cores, with touching cores having the same number
  const coreWalk = (hex: HexType, detectedHexPatterns: HexPatternsType[], hexes: HexType[], coreId: number) => {
    if (hex.restingLocation === null) return; // Should never happen, means we're trying to walk from a removed hex

    for (const direction of allDirections) {
      const neighbor = getNeighborHex(hex.restingLocation.x, hex.restingLocation.y, direction, hexes);
      if (!neighbor) continue; // If no neighbor in this direction exists, skip. Happens on the edge

      const neighborPattern = detectedHexPatterns.find((pattern) => pattern.index === neighbor.index);
      if (!neighborPattern) continue; // Should never happen

      if (neighborPattern.core !== true) continue; // Not a core, skip
      neighborPattern.core = coreId; // This core touches the core that was passed in

      coreWalk(neighbor, detectedHexPatterns, hexes, coreId); // Recursive call, maybe this core touches yet another core
    }
  };


  const corePatterns = detectedHexPatterns.filter((hexPattern) => hexPattern.core === true);

  let coreId = 1;
  for (const corePattern of corePatterns) {
    if (corePattern.core !== true) continue; // This core has already been processed (given an id), it must be touching another core
    corePattern.core = coreId;
    const coreHex = hexes.find((hex) => hex.index === corePattern.index);
    if (!coreHex) continue; // Should never happen
    coreWalk(coreHex, detectedHexPatterns, hexes, coreId); // Walk from the core in all direction, giving all touching cores the same id, recursively
    coreId++;
  }



  // 2 or 3 cores that aren't touching (and thus have different ids) might share loop hexes
  // In this case, all the core IDs must be stored in this loop array in the loopIds array for now
  // (It would be possible to give loop hexes multiple ids, and only remove them when all their cores are gone, but that seems like poor gameplay)
  // Later, we'll use this data to set all overlapping loops (and their cores) to the same id, then throw away this variable
  const loopIdArrays = detectedHexPatterns.map((hexPattern) => {return {index: hexPattern.index, loop: new Set<number>()}});


  // Detect loops
  // Take each core hex, and walk one step in every direction. If you reach a core, it's not a loop hex
  // Otherwise, it is a loop, so add the ID of the core to the loop array for that hex
  for (const corePattern of corePatterns) {
    const coreHex = hexes.find((hex) => hex.index === corePattern.index);
    if (!coreHex) continue;
    const coreId = corePattern.core;
    if (typeof coreId !== "number") continue; // Should never happen

    const coreNeighbors = allDirections.map((direction) => {return coreHex.restingLocation === null ? null : getNeighborHex(coreHex.restingLocation.x, coreHex.restingLocation.y, direction, hexes)});
    const coreNeighborsPatterns = coreNeighbors.map((neighbor) => detectedHexPatterns.find((pattern) => pattern.index === neighbor?.index));

    for (const coreNeighborPattern of coreNeighborsPatterns) {
      if (coreNeighborPattern && coreNeighborPattern.core === false) {
        const loopIdArray = loopIdArrays.find((loopIdArray) => loopIdArray.index === coreNeighborPattern.index);
        if (loopIdArray) loopIdArray.loop.add(coreId);
      }
    }
  }

  // If a hex pattern isn't given a loop id, it's not part of a loop, so set it to false
  // Previously, it was set to null, meaning it wasn't known yet
  detectedHexPatterns.forEach((hexPattern) => {
    if (!hexPattern.loop) {
      hexPattern.loop = false;
    }
  });

  return detectedHexPatterns;
};