import React, { useState, useEffect, createRef } from "react";
import DirectionSelector from "./components/DirectionSelector";
import { ActionsType, HexPatternsType, HexType, PowerupEffectType } from "./types";
import { getNeighborCoords } from "./utils/NeighborUtils";
import { detectLinesAndLoops } from "./utils/detectLinesAndLoops";
import { BOARD_MARGIN, REMOVED_HEXES_MARGIN, NUMBER_OF_COLUMNS, NUMBER_OF_ROWS, HEX_HEIGHT, HEX_WIDTH, COLUMN_WIDTH, ROW_HEIGHT, colors } from "./config/consts";
import { HexTile } from "./components/HexTile";

const HexGrid: React.FC = () => {
  const [initialPullDirection, setInitialPullDirection] = useState(1);
  const [isClockwise, setIsClockwise] = useState<boolean | null>(true); // null = always pull in the same (initial) direction, no rotation
  const [tapAction, setTapAction] = useState<ActionsType>("pull");

  const [hexes, setHexes] = useState<HexType[]>(
    Array.from({ length: NUMBER_OF_COLUMNS * NUMBER_OF_ROWS }, (_, i) => ({
      index: i,
      ref: createRef<SVGGElement>(),
      color: Math.floor(Math.random() * colors.length),
      restingLocation: { x: i % NUMBER_OF_COLUMNS, y: Math.floor(i / NUMBER_OF_COLUMNS) },
      powerup: null,
      removedIndex: null,
      isQueuedForCollection: false,

      animatedValue: null,
      animationStartTime: null,
      opacityInterpolator: null,
      positionInterpolator: null,
      startingLocation: null,
    }))
  );

  const [hexPatterns, setHexPatterns] = useState<HexPatternsType[]>(detectLinesAndLoops(hexes));

  console.log(hexes);

  const findHexIndex = (x: number, y: number): number | null => {
    const index = hexes.findIndex((loc) => loc.restingLocation && loc.restingLocation.x === x && loc.restingLocation.y === y);
    return index !== -1 ? index : null;
  };

  const handleHexClick = (hex: HexType) => {
    if (tapAction === "pull") {
      removeHex(hex);
    } else if (tapAction === "collect") {
      collectPatterns(hex);
    }
  };

  const removeHex = (hex: HexType) => {
    const { restingLocation, index } = hex;
    if (!restingLocation) {
      console.log("This hex is not on the board in removeHex");
      return;
    }
    const { x, y } = restingLocation;
    if (x === null || y === null) {
      console.log("This hex has no x or y in removeHex");
      return;
    }
  
    // Batch all changes into a single update of hexes
    setHexes((prevHexes) => {
      // Make a shallow copy of the previous state
      let updatedHexes = [...prevHexes];

      const hexToRemove = updatedHexes.find((h) => h.index === index);
      if (!hexToRemove) {
        console.log("Hex to remove not found in removeHex");
        return updatedHexes;
      }

      // Mark the removed hex by setting its restingLocation to null and assigning its removedIndex.
      const removedCount = updatedHexes.filter((h) => h.removedIndex !== null).length;
      const newRemovedHex = {
        ...hexToRemove,
        restingLocation: null,
        removedIndex: removedCount,
      };
      console.log(`Removing hex ${index} at ${x}, ${y} with removedIndex ${removedCount}`);
      console.log(newRemovedHex);

      updatedHexes = updatedHexes.filter((h) => h.index !== index);
      updatedHexes.push(newRemovedHex);

      // Initialize variables for the spiral update logic.
      let length = 1;
      let steps = 0;
      let direction = initialPullDirection;
      let grow = false;
      let currentX = x;
      let currentY = y;
  
      while (true) {
        const neighborCoords = getNeighborCoords(currentX, currentY, direction);
        if (!neighborCoords) break;
  
        // Look for a hex at the neighbor coordinates.
        const neighborIndex = findHexIndex(neighborCoords.x, neighborCoords.y);
        if (neighborIndex === null) {
          // If no hex is found, create a new one at the current position.
          const newTile: HexType = {
            index: updatedHexes.length + 1,
            ref: createRef<SVGGElement>(),
            color: Math.floor(Math.random() * colors.length),
            restingLocation: { x: currentX, y: currentY },
            powerup: null,
            removedIndex: null,
            isQueuedForCollection: false,
            animatedValue: null,
            animationStartTime: null,
            opacityInterpolator: null,
            positionInterpolator: null,
            startingLocation: null,
          };
          updatedHexes.push(newTile);
          break;
        }
  
        // "Move" the neighbor hex by updating its restingLocation.
        updatedHexes[neighborIndex] = {
          ...updatedHexes[neighborIndex],
          restingLocation: { x: currentX, y: currentY },
        };
  
        // Update the current coordinates to the neighbor's original position.
        currentX = neighborCoords.x;
        currentY = neighborCoords.y;
        steps++;

        // When spiraling out, if you've moved the length of the current line, it's time to change direction, and maybe the next line will be longer
        // Every other line gets longer, so grow is toggled every time steps reaches length
        // So this will increase the length of the line in a spiral every other step, and shift the direction of each line one tick, either clockwise or counter-clockwise
        // If moving straight (i.e. isClockwise === null) the length and grow calculations are still done, but have no effect
        // Also, when clearing the board from collecting a pattern, the direction is always straight
        if (steps >= length) {
          steps = 0;
          if (grow) length++;
          grow = !grow;
          direction =
            isClockwise === null || tapAction === "collect"
              ? initialPullDirection
              : isClockwise === true
              ? (direction % 6) + 1
              : ((direction - 2 + 6) % 6) + 1;
        }
      }
  
      // Return the fully updated hexes array.
      return updatedHexes;
    });
  };

  const collectPatterns = (hex: HexType) => {
    console.log("Collecting patterns Hex");
    console.log(hex);
    if(hex.restingLocation === null || hex.restingLocation.x === null || hex.restingLocation.y === null || hex.removedIndex !== null) return; // could be a removed hex, don't collect patterns from those (should never happen anyway)

    const hexPattern = hexPatterns.find((pattern) => pattern.index === hex.index);
    if (!hexPattern) return;
    console.log(hexPattern);

    if (hexPattern.lines.length === 0 && hexPattern.loop === null && hexPattern.core === null) {
      console.log("No pattern detected");
      return;
    }

    // This hex is part of (at least) one line
    // Lines collapse into a single hex, and that hex is a powerup
    if (hexPattern.lines.length > 0) {

      // All the lines this hex is a part of will be removed.
      // Set all the hexes in those lines to be queued for collection
      // Then set the selected line hex as a power-up, which undoes the queue for collection
      const lineIds = hexPattern.lines.map((line) => line.lineId);
      queueLineHexes(lineIds);
      placePowerup(hex, hexPattern);
    }

    // Loops vanish but don't become anything. Any core within a loop becomes a lasting or permanent powerup
    if (hexPattern.loop) {
      console.log("Loop detected");
    }

    // Cores become lasting or permanent powerups (items at the bottom of the screen)
    if (hexPattern.core) {
      console.log("Core detected");
    }
  };

  // Provided a list of lineIds (from a hex that was selected to be collected), set all hexes in those lines to be queued for collection
  const queueLineHexes = (lineIds: number[]) => {
    setHexes((prev) => prev.map((hex) => {
      const hexPattern = hexPatterns.find((pattern) => pattern.index === hex.index);
      if (!hexPattern) return hex;
      if (hexPattern.lines.some((line) => lineIds.includes(line.lineId))) {
        return { ...hex, isQueuedForCollection: true };
      }
      return hex;
    }));
  }

  // Place a powerup on the hex that is selected in a line
  // The powerup effect is based on the color of the line
  // The powerup level is based on the length of the longest line, plus the number of lines
  const placePowerup = (hex: HexType, hexPattern: HexPatternsType) => {
    let powerupEffect:PowerupEffectType;
    switch (hex.color) {
      case 0:  powerupEffect = "bomb";   break;
      case 1:  powerupEffect = "cut";    break;
      case 2:  powerupEffect = "turns";  break;
      case 3:  powerupEffect = "rotate"; break;
      case 4:  powerupEffect = "swap";   break;
      case 5:  powerupEffect = "clear";  break;
      default: powerupEffect = "unknown";
    }

    // One line, length 5, is the lowest level powerup, so subtract 5 so the powerups start from level 1
    const powerupLevel = Math.max(...hexPattern.lines.map((line) => line.length)) + hexPattern.lines.length - 5;

    const powerup = {
      effect: powerupEffect,
      level: powerupLevel,
      location: {
        isOnBoard: false,
        consumableIndex: null,
        lastingIndex: null,
        permanentIndex: null,
      },
    };
    setHexes((prev) => prev.map((newHex) => (newHex.index === hex.index ? { ...newHex, powerup: powerup, isQueuedForCollection: false } : newHex)));
  };

  useEffect(() => {
    const removedTiles = hexes
      .filter((tile) => tile.removedIndex !== null)
      .sort((a, b) => (a.removedIndex! - b.removedIndex!));
    hexes.forEach((hex) => {
      const hexRef = hex.ref.current;
      if (hexRef) {
        if (hex.restingLocation !== null && hex.restingLocation.x !== null && hex.restingLocation.y !== null) {
          const xPos = hex.restingLocation.x * COLUMN_WIDTH + HEX_WIDTH * 1 + BOARD_MARGIN + REMOVED_HEXES_MARGIN;
          const yPos = hex.restingLocation.y * ROW_HEIGHT + (hex.restingLocation.x % 2 === 0 ? ROW_HEIGHT / 2 : 0);
          hexRef.setAttribute("transform", `translate(${xPos}, ${yPos})`);
        } else {
          const xOffset = BOARD_MARGIN;
          const yOffset = removedTiles.findIndex((tile) => tile.removedIndex === hex.removedIndex) * HEX_HEIGHT * 0.67;
          hexRef.setAttribute("transform", `translate(${xOffset}, ${yOffset})`);
        }
      }
    });

    setHexPatterns(detectLinesAndLoops(hexes));
  }, [hexes]);

  const totalWidth = (2 + NUMBER_OF_COLUMNS) * COLUMN_WIDTH; // +2 is for the stack of used tiles on the right, it's 0.5 more than it needs to be
  const totalHeight = (1 + NUMBER_OF_ROWS) * ROW_HEIGHT; // +1 is for the stagger of tiles in a row, it's 0.5 more than it needs to be

//  const fieldHexes = hexes.filter((hex) => hex.removedIndex === null);
//  const removedHexes = hexes.filter((hex) => hex.removedIndex !== null);

  return (
    <>
      <div style={{ minHeight: "3rem" }}>
        <DirectionSelector initialPullDirection={initialPullDirection} setInitialPullDirection={setInitialPullDirection} isClockwise={isClockwise} setIsClockwise={setIsClockwise} tapAction={tapAction} setTapAction={setTapAction} />
      </div>
      <svg
        className="hex-grid"
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ position: "relative", margin: "1rem" }}
      >
        {hexes
          .sort((a, b) => ((a.removedIndex || 0) - (b.removedIndex || 0)))
          .map((hex) => {
          const hexPattern = hexPatterns?.find((pattern) => pattern.index === hex.index);
          if (!hexPattern) return null;
          return <HexTile key={hex.index} hex={hex} hexPattern={hexPattern} handleHexClick={handleHexClick} />
        })}
      </svg>
    </>
  );
};

export default HexGrid;
