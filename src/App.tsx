import React, { useState, useEffect, useRef } from "react";
import { ActionsType, AnimationType, HexPatternsType, HexType, PowerupEffectType } from "./types";
import { getNeighborCoords } from "./utils/NeighborUtils";
import { detectLinesAndLoops } from "./utils/detectLinesAndLoops";
import DirectionSelector from "./components/DirectionSelector";

const BOARD_MARGIN = 8;
const REMOVED_HEXES_MARGIN = 8;
const NUMBER_OF_COLUMNS = 7;
const NUMBER_OF_ROWS = 12;
const HEX_HEIGHT = 40;
const HEX_MARGIN = 8;
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
      restingLocation: { x: i % NUMBER_OF_COLUMNS, y: Math.floor(i / NUMBER_OF_COLUMNS) },
      color: Math.floor(Math.random() * colors.length),
      powerup: null,
      removedIndex: null,
      isQueuedForCollection: false,

      animationStartTime: null,
      animationDelay: null,
      animationDuration: null,
      opacityInterpolator: null,
      positionInterpolator: null,
      startingLocation: null,
    }))
  );

  let hexPatterns:HexPatternsType[] = detectLinesAndLoops(hexes);

  const hexRefs = useRef<SVGGElement[] | null[]>(
    Array.from({ length: NUMBER_OF_COLUMNS * NUMBER_OF_ROWS }, () => null)
  );

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
    if (!restingLocation) return;
    const { x, y } = restingLocation;
    if(x === null || y === null) return;
    setHexes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        restingLocation: null,
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
          restingLocation: { x: currentX, y: currentY },
          color: Math.floor(Math.random() * colors.length),
          powerup: null,
          removedIndex: null,
          isQueuedForCollection: false,

          animationStartTime: null,
          animationDelay: null,
          animationDuration: null,
          opacityInterpolator: null,
          positionInterpolator: null,
          startingLocation: null,
        };
        setHexes((prev) => [...prev, newTile]);
        startHexAnimation(newTile.index, currentX, currentY, ((length-1)+(grow?0.5:0)+3) * 100, 300, "enter");
        break;
      }

      startHexAnimation(neighborIndex, currentX, currentY, ((length-1)+(grow?0.5:0)) * 100, 300, "shift");

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

  // When initiating an animation (for example, in moveHex or a similar function):
  const startHexAnimation = (hexIndex: number, targetX: number, targetY: number, offsetMs = 0, durationMs = 300, animation: AnimationType) => {
    let positionInterpolator = (t: number) => t * t * (3 - 2 * t); // default: smoothstep easing
    if (animation === "collapse") {
      positionInterpolator = (t: number) => t * t * t; // cubic easing
    } else if (animation === "enter" || animation === "remove") {
      positionInterpolator = () => 1;
    }

    let opacityInterpolator = (_: number) => 1;
    if (animation === "remove") {
      opacityInterpolator = (t: number) => 1 - t; // reverse linear easing
    } else if (animation === "enter") {
      opacityInterpolator = (t: number) => t; // linear easing
    }

    setHexes((prev) =>
      prev.map((hex) =>
        hex.index === hexIndex && hex.restingLocation !== null
          ? {
              ...hex,
              // Record the current position as the starting point (you may need to compute it from the current DOM or state)
              startingLocation: { ...hex.restingLocation },
              // Set the new target
              restingLocation: { x: targetX, y: targetY },
              // Record animation metadata
              animationStartTime: performance.now(),
              animationDelay: Math.max(0, offsetMs),
              animationDuration: durationMs,
              positionInterpolator: positionInterpolator,
              opacityInterpolator: opacityInterpolator,
            }
          : hex
      )
    );
  };

  useEffect(() => {
    let animationFrame: number;
  
    const animate = () => {
      const now = performance.now();
  
      // Update only hexes that are currently animating.
      hexRefs.current.forEach((hexRef, i) => {
        const hex = hexes[i];
        if (hex && hex.animationStartTime !== null && hex.startingLocation) {
          const duration = hex.animationDuration as number;
          const delay = hex.animationDelay || 0;
          const elapsed = now - hex.animationStartTime;
          let progress = (elapsed - delay) / duration;
          progress = Math.max(0, Math.min(1, progress)); // Clamp progress between 0 and 1

          // Apply easing to the progress value.
          const positionProgress = hex.positionInterpolator ? hex.positionInterpolator(progress) : progress;
          const opacityProgress = hex.opacityInterpolator ? hex.opacityInterpolator(progress) : progress;

          // Calculate starting grid coordinates.
          const startGridX = hex.startingLocation.x;
          const startGridY = hex.startingLocation.y;

          // Calculate target grid coordinates.
          const endGridX = hex.restingLocation!.x;
          const endGridY = hex.restingLocation!.y;

          // Convert the starting grid coordinates to pixel positions.
          const startPixelX = startGridX * COLUMN_WIDTH + HEX_WIDTH * 1 + BOARD_MARGIN + REMOVED_HEXES_MARGIN;
          const startPixelY = startGridY * ROW_HEIGHT + (startGridX % 2 === 0 ? ROW_HEIGHT / 2 : 0);

          // Convert the target grid coordinates to pixel positions.
          const endPixelX = endGridX * COLUMN_WIDTH + HEX_WIDTH * 1 + BOARD_MARGIN + REMOVED_HEXES_MARGIN;
          const endPixelY = endGridY * ROW_HEIGHT + (endGridX % 2 === 0 ? ROW_HEIGHT / 2 : 0);

          // Interpolate between the starting and target pixel positions.
          const xPos = startPixelX + (endPixelX - startPixelX) * positionProgress;
          const yPos = startPixelY + (endPixelY - startPixelY) * positionProgress;

          // Update the transform attribute directly.
          hexRef?.setAttribute("transform", `translate(${xPos}, ${yPos})`);
          hexRef?.setAttribute("opacity", `${opacityProgress}`);


          // If the animation has finished:
          if (progress === 1) {
            // Optionally update state to finalize the resting position and clear animation fields:
            setHexes((prev) =>
              prev.map((h) =>
                h.index === hex.index
                  ? {
                      ...h,
                      animationDelay: null,
                      animationDuration: null,
                      animationStartTime: null,
                      positionInterpolator: null,
                      startingLocation: null,
                    }
                  : h
              )
            );
          }
        }
      });
  
      animationFrame = requestAnimationFrame(animate);
    };
  
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hexes]);
  
  const collectPatterns = (hex: HexType) => {
    console.log("Collecting patterns Hex");
    console.log(hex);
    if(hex.restingLocation === null || hex.removedIndex !== null) return; // could be a removed hex, don't collect patterns from those (should never happen anyway)

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
        if (hex.restingLocation !== null) {
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

    hexPatterns = detectLinesAndLoops(hexes);
  }, [hexes]);

  const totalWidth = (2 + NUMBER_OF_COLUMNS) * COLUMN_WIDTH; // +2 is for the stack of used tiles on the right, it's 0.5 more than it needs to be
  const totalHeight = (1 + NUMBER_OF_ROWS) * ROW_HEIGHT; // +1 is for the stagger of tiles in a row, it's 0.5 more than it needs to be

  const fieldHexes = hexes.filter((hex) => hex.removedIndex === null);
  const removedHexes = hexes.filter((hex) => hex.removedIndex !== null);

  const hexPoints = `0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`;

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
          const isEdge = hexPattern && hexPattern.edge;
          const isLine = hexPattern && hexPattern.lines.length > 0;
          const lineCount = hexPattern ? hexPattern.lines.length : 0;
          const isLoop = hexPattern && hexPattern.loop;
          const isCore = hexPattern && hexPattern.core;
          const isPowerup = hex.powerup !== null;
          const isQueued = hex.isQueuedForCollection;
          const strokeOpacity = isEdge ? 0.8 : 1;
          const displayIndex = true;

          const textX = HEX_WIDTH / 2;
          const textY = HEX_HEIGHT / 2;

          return (
            <g
              key={hex.index}
              ref={(el) => (hexRefs.current[hex.index] = el)}
              //style={{ transition: "transform 0.3s ease" }}
            >
              <polygon
                points={hexPoints}
                style={{
                  fill: colors[hex.color],
                  stroke: (isLine && isCore) ? `rgba(128,255,128,${strokeOpacity})` : isLine ? `rgba(0,255,0,${strokeOpacity})` : isCore ? `rgba(255,255,255,${strokeOpacity})` : isLoop ? colors[hex.color] : `rgba(0,0,0,${strokeOpacity})`,
                  strokeWidth: isCore ? "10px" : `${lineCount*3}px`,
                  cursor: "pointer",
                  opacity: isQueued ? 0.5 : 1,
                }}
                onClick={() => handleHexClick(hex)}
              />
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isPowerup ? "#000" : isEdge ? "#999" : "white"}
                style={{ pointerEvents: "none", fontSize: isLoop ? "14px" : "10px", fontWeight: "bold" }}
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
                filter: pileIndex % 2 === 1 ? "drop-shadow(0 0 2px white)" : undefined,
              }}
            />
          ))}
      </svg>
    </>
  );
};

export default HexGrid;
