import React, { useState, useEffect, useRef } from "react";
import DirectionSelector from "./components/DirectionSelector";
import { ActionsType, HexPatternsType, HexType, PowerupEffectType } from "./types";
import { getNeighborCoords } from "./utils/NeighborUtils";
import { detectLinesAndLoops } from "./utils/detectLinesAndLoops";

const NUMBER_OF_COLUMNS = 7;
const NUMBER_OF_ROWS = 12;
const HEX_HEIGHT = 40;
const HEX_MARGIN = 2;
const HEX_RATIO = 2 / Math.sqrt(3); // Ratio of hex width to height
const HEX_WIDTH = HEX_HEIGHT * HEX_RATIO; // Width of a hex
const COLUMN_WIDTH = HEX_WIDTH * 0.75 + HEX_MARGIN; // Width of a column
const ROW_HEIGHT = HEX_HEIGHT + HEX_MARGIN; // Height of a row
const opacity = 0.75;
//const colors = ["red", "blue", "gray", "yellow", "purple"];
const colors = [`rgba(255,0,0,${opacity})`, `rgba(0,0,255,${opacity})`, `rgba(128,128,128,${opacity})`, `rgba(255,255,0,${opacity})`, `rgba(64,0,128,${opacity})`];

const HexGrid: React.FC = () => {
  const [initialPullDirection, setInitialPullDirection] = useState(1);
  const [isClockwise, setIsClockwise] = useState<boolean | null>(true); // null = always pull in the same (initial) direction, no rotation
  const [tapAction, setTapAction] = useState<ActionsType>("pull");

  const [hexes, setHexes] = useState<HexType[]>(
    Array.from({ length: NUMBER_OF_COLUMNS * NUMBER_OF_ROWS }, (_, i) => ({
      index: i,
      x: i % NUMBER_OF_COLUMNS,
      y: Math.floor(i / NUMBER_OF_COLUMNS),
      color: Math.floor(Math.random() * colors.length),
      powerup: null,
      removedIndex: null,
      isQueuedForCollection: false,
    }))
  );

  let hexPatterns:HexPatternsType[] = detectLinesAndLoops(hexes);

  const hexRefs = useRef<SVGPolygonElement[] | null[]>(
    Array.from({ length: NUMBER_OF_COLUMNS * NUMBER_OF_ROWS }, () => null)
  );

  const moveHex = (index: number, newX: number, newY: number) => {
    setHexes((prev) =>
      prev.map((loc) => (loc.index === index ? { ...loc, x: newX, y: newY } : loc))
    );
  };

  const findHexIndex = (x: number, y: number): number | null => {
    const index = hexes.findIndex((loc) => loc.x === x && loc.y === y);
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
    const { x, y, index } = hex;
    if(x === null || y === null) return;
    setHexes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        x: null,
        y: null,
        removedIndex: prev.filter((loc) => loc.removedIndex !== null).length,
      };
      return updated;
    });

    let length = 1;
    let steps = 0;
    let direction = initialPullDirection;
    let grow = false;
    let currentX = x;
    let currentY = y;

    while (true) {
      const neighbor = getNeighborCoords(currentX, currentY, direction);
      if (!neighbor) break;

      const neighborIndex = findHexIndex(neighbor.x, neighbor.y);
      if (neighborIndex === null) {
        const newTile: HexType = {
          index: hexes.length,
          x: currentX,
          y: currentY,
          color: Math.floor(Math.random() * colors.length),
          powerup: null,
          removedIndex: null,
          isQueuedForCollection: false,
        };
        setHexes((prev) => [...prev, newTile]);
        break;
      }

      moveHex(neighborIndex, currentX, currentY);

      currentX = neighbor.x;
      currentY = neighbor.y;
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
        direction = (isClockwise === null || tapAction === "collect") ? initialPullDirection : isClockwise === true ? (direction % 6) + 1 : (direction - 2 + 6) % 6 + 1;
      }
    }
  };

  const collectPatterns = (hex: HexType) => {
    console.log("Collecting patterns Hex");
    console.log(hex);
    if(hex.x === null || hex.y === null || hex.removedIndex !== null) return; // could be a removed hex, don't collect patterns from those (should never happen anyway)

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
      const hexRef = hexRefs.current[hex.index];
      if (hexRef) {
        if (hex.x !== null && hex.y !== null) {
          const xPos = hex.x * COLUMN_WIDTH + HEX_WIDTH * 1;
          const yPos = hex.y * ROW_HEIGHT + (hex.x % 2 === 0 ? ROW_HEIGHT / 2 : 0);
          hexRef.setAttribute("transform", `translate(${xPos}, ${yPos})`);
        } else {
          const yOffset = removedTiles.findIndex((tile) => tile.removedIndex === hex.removedIndex) * HEX_HEIGHT * 0.67;
          hexRef.setAttribute("transform", `translate(0, ${yOffset})`);
        }
      }
    });

    hexPatterns = detectLinesAndLoops(hexes);
  }, [hexes]);

  const totalWidth = (2 + NUMBER_OF_COLUMNS) * COLUMN_WIDTH; // +2 is for the stack of used tiles on the right, it's 0.5 more than it needs to be
  const totalHeight = (1 + NUMBER_OF_ROWS) * ROW_HEIGHT; // +1 is for the stagger of tiles in a row, it's 0.5 more than it needs to be

  const fieldHexes = hexes.filter((hex) => hex.removedIndex === null);
  const removedHexes = hexes.filter((hex) => hex.removedIndex !== null);

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
        {fieldHexes.map((hex) => {
          const hexPattern = hexPatterns?.find((pattern) => pattern.index === hex.index);
          const evenColumn = hex.x! % 2 === 0;
          const isEdge = hexPattern && hexPattern.edge;
          const isLine = hexPattern && hexPattern.lines.length > 0;
          const lineCount = hexPattern ? hexPattern.lines.length : 0;
          const isLoop = hexPattern && hexPattern.loop;
          const isCore = hexPattern && hexPattern.core;
          const isPowerup = hex.powerup !== null;
          const isQueued = hex.isQueuedForCollection;
          const strokeOpacity = isEdge ? 0.8 : 1;
          const displayIndex = true;
          return (
            <g key={hex.index}>
              <polygon
                ref={(el) => (hexRefs.current[hex.index] = el)}
                points={`0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`}
                style={{
                  fill: colors[hex.color],
                  stroke: (isLine && isCore) ? `rgba(128,255,128,${strokeOpacity})` : isLine ? `rgba(0,255,0,${strokeOpacity})` : isCore ? `rgba(255,255,255,${strokeOpacity})` : isLoop ? colors[hex.color] : `rgba(0,0,0,${strokeOpacity})`,
                  strokeWidth: isCore ? "10px" : `${lineCount*3}px`,
                  cursor: "pointer",
                  transition: "transform 0.3s ease",
                  opacity: isQueued ? 0.5 : 1,
                }}
                onClick={() => handleHexClick(hex)}
              />
              <text
                x={((hex.x ?? 0) + 1.9) * (COLUMN_WIDTH)}
                y={(hex.y ?? 0) * (ROW_HEIGHT) + (HEX_HEIGHT / (evenColumn ? 1 : 2))}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isPowerup ? "#000" : isEdge ? "#999" : "white"}
                style={{ pointerEvents: "none", fontSize: isLoop ? "14px" : "10px" , fontWeight: "bold" }}
                opacity={isQueued ? 0.5 : 1}
              >
                {displayIndex ? hex.index.toString() : ""}
              </text>
            </g>
          );
        })}
        {removedHexes
          .sort((a, b) => (a.removedIndex! - b.removedIndex!))
          .map((hex, pileIndex) => (
          <polygon
            key={hex.index}
            ref={(el) => (hexRefs.current[hex.index] = el)}
            points={`0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`}
            style={{
              fill: colors[hex.color],
              stroke: "black",
              strokeWidth: "1px",
              cursor: "pointer",
              transition: "transform 0.3s ease",
              filter: pileIndex%2 === 1 ? "drop-shadow(0 0 2px white)" : undefined, 
            }}
          />
        ))}
      </svg>
    </>
  );
};

export default HexGrid;
