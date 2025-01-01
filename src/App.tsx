import React, { useState, useEffect, useRef } from 'react';
import DirectionSelector from './components/DirectionSelector';

const NUMBER_OF_COLUMNS = 15;
const NUMBER_OF_ROWS = 12;
const HEX_HEIGHT = 40;
const HEX_RATIO = 2 / Math.sqrt(3); // Ratio of hex width to height
const HEX_WIDTH = HEX_HEIGHT * HEX_RATIO; // Width of a hex
const COLUMN_WIDTH = HEX_WIDTH * 0.75; // Width of a column
const colors = ['red', 'blue', 'gray', 'yellow', 'purple'];

type HexType = {  index: number; x: number | null; y: number | null; color: number; removedIndex: number | null; };
type HexPatternsType = { index: number; line: boolean; loop: boolean; core: boolean };

const HexGrid: React.FC = () => {
  const [initialPullDirection, setInitialPullDirection] = useState(1);
  const [isClockwise, setIsClockwise] = useState(true);

  const [hexes, setHexes] = useState<HexType[]>(
    Array.from({ length: NUMBER_OF_COLUMNS * NUMBER_OF_ROWS }, (_, i) => ({
      index: i,
      x: i % NUMBER_OF_COLUMNS,
      y: Math.floor(i / NUMBER_OF_COLUMNS),
      color: Math.floor(Math.random() * colors.length),
      removedIndex: null,
    }))
  );

  const [hexPatterns, setHexPatterns] = useState<HexPatternsType[]>([]);

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

  const getNeighborCoords = (x: number, y: number, direction: number): { x: number; y: number } | null => {
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

  const getNeighborHex = (x: number, y: number, direction: number): HexType | null => {
    const coords = getNeighborCoords(x, y, direction);
    if (!coords) return null;
    return hexes.find((loc) => loc.x === coords.x && loc.y === coords.y) || null;
  }

  const detectLinesAndLoops = () => {
    console.log('Detecting lines and loops');
    const detectedHexPatterns = hexes.map((hex) => ({ index:hex.index, line: false, loop: false, core: false }));

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

          neighborIndex = findHexIndex(neighborCoords.x, neighborCoords.y);
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
          console.log('Line detected', line);
          line.forEach((lineHex) => (lineHex.line = true));
        }
      });
    });

//    // Detect loops
//    const visited = new Set<number>();
//
//    const dfs = (hex: HexType, color: number, path: HexType[]) => {
//      if (visited.has(hex.index)) return false;
//      visited.add(hex.index);
//
//      if (path.length > 1 && path[0].x === hex.x && path[0].y === hex.y) {
//        path.forEach((loopHex) => (loopHex.loop = true));
//        path.slice(1, -1).forEach((coreHex) => (coreHex.core = true));
//        return true;
//      }
//
//      const neighbors = [1, 2, 3, 4, 5, 6]
//        .map((direction) => getNeighborCoords(hex.x!, hex.y!, direction))
//        .filter((coords) => coords !== null)
//        .map(({ x, y }) => hexes.find((h) => h.x === x && h.y === y && h.color === color))
//        .filter((neighbor) => neighbor !== undefined) as HexType[];
//
//      for (const neighbor of neighbors) {
//        if (dfs(neighbor, color, [...path, neighbor])) {
//          return true;
//        }
//      }
//
//      visited.delete(hex.index);
//      return false;
//    };
//
//    hexPatterns.forEach((hex) => {
//      if (!visited.has(hex.index) && hex.x !== null && hex.y !== null) {
//        dfs(hex, hex.color, [hex]);
//      }
//    });

    setHexPatterns(detectedHexPatterns);
  };

  const handleHexClick = (x: number, y: number, pullDirection: number = initialPullDirection) => {
    const clickedIndex = findHexIndex(x, y);
    if (clickedIndex === null || hexes[clickedIndex].removedIndex !== null) return;

    setHexes((prev) => {
      const updated = [...prev];
      updated[clickedIndex] = {
        ...updated[clickedIndex],
        x: null,
        y: null,
        removedIndex: prev.filter((loc) => loc.removedIndex !== null).length,
      };
      return updated;
    });

    let length = 1;
    let steps = 0;
    let direction = pullDirection;
    let grow = false;
    let currentX = x;
    let currentY = y;

    while (true) {
      const neighbor = getNeighborCoords(currentX, currentY, direction);
      if (!neighbor) break;

      const neighborIndex = findHexIndex(neighbor.x, neighbor.y);
      if (neighborIndex === null) {
        const newTile: HexType = {
          x: currentX,
          y: currentY,
          color: Math.floor(Math.random() * colors.length),
          removedIndex: null,
          index: hexes.length,
        };
        setHexes((prev) => [...prev, newTile]);
        break;
      }

      moveHex(neighborIndex, currentX, currentY);
      currentX = neighbor.x;
      currentY = neighbor.y;
      steps++;

      if (steps >= length) {
        steps = 0;
        if (grow) length++;
        grow = !grow;
        direction = isClockwise ? (direction % 6) + 1 : (direction - 2 + 6) % 6 + 1;
      }
    }
  };

  useEffect(() => {
    console.log("useEffect");
    const removedTiles = hexes
      .filter((tile) => tile.removedIndex !== null)
      .sort((a, b) => (a.removedIndex! - b.removedIndex!));
    hexes.forEach((hex) => {
      const hexRef = hexRefs.current[hex.index];
      if (hexRef) {
        if (hex.x !== null && hex.y !== null) {
          const xPos = hex.x * COLUMN_WIDTH + hex.x * 2 + HEX_WIDTH * 1;
          const yPos = hex.y * HEX_HEIGHT + (hex.x % 2 === 0 ? HEX_HEIGHT / 2 : 0) + hex.y * 2;
          hexRef.setAttribute('transform', `translate(${xPos}, ${yPos})`);
        } else {
          const yOffset = removedTiles.findIndex((tile) => tile.removedIndex === hex.removedIndex) * HEX_HEIGHT * 0.67;
          hexRef.setAttribute('transform', `translate(0, ${yOffset})`);
        }
      }
    });
    detectLinesAndLoops();
  }, [hexes]);

  const totalWidth = (2 + NUMBER_OF_COLUMNS) * COLUMN_WIDTH + HEX_WIDTH * 0.25; // +2 is for the stack of used tiles on the right, 0.25 = some margin
  const totalHeight = (1 + NUMBER_OF_ROWS) * HEX_HEIGHT + HEX_HEIGHT * 0.25; // +1 is for the stagger of tiles in a row, 0.25 = some margin

  const fieldHexes = hexes.filter((hex) => hex.removedIndex === null);
  const removedHexes = hexes.filter((hex) => hex.removedIndex !== null);

  return (
    <>
      <div style={{ minHeight: '3rem' }}>
        <DirectionSelector initialPullDirection={initialPullDirection} setInitialPullDirection={setInitialPullDirection} isClockwise={isClockwise} setIsClockwise={setIsClockwise} />
      </div>
      <svg
        className="hex-grid"
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{ position: 'relative', margin: '1rem' }}
      >
        {fieldHexes.map((hex) => {
          const hexPattern = hexPatterns?.find((pattern) => pattern.index === hex.index);
          const isLine = hexPattern && hexPattern.line;
          if (isLine) console.log('Line hex', hex);
          return <polygon
            key={hex.index}
            ref={(el) => (hexRefs.current[hex.index] = el)}
            points={`0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`}
            style={{
              fill: colors[hex.color],
              stroke: isLine ? 'green' : 'black',
              strokeWidth: isLine ? '5px' : '1px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
            }}
            onClick={() => handleHexClick(hex.x!, hex.y!)}
          />
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
              stroke: 'black',
              strokeWidth: '1px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
              filter: pileIndex%2 === 1 ? 'drop-shadow(0 0 2px white)' : undefined, 
            }}
            onClick={() => handleHexClick(hex.x!, hex.y!)}
          />
        ))}
      </svg>
    </>
  );
};

export default HexGrid;
