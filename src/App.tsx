import React, { useState, useEffect, useRef } from 'react';
import DirectionSelector from './components/DirectionSelector';
import { HexPatternsType, HexType } from './types';
import { getNeighborCoords } from './utils/NeighborUtils';
import { detectLinesAndLoops } from './utils/detectLinesAndLoops';

const NUMBER_OF_COLUMNS = 7;
const NUMBER_OF_ROWS = 12;
const HEX_HEIGHT = 40;
const HEX_MARGIN = 2;
const HEX_RATIO = 2 / Math.sqrt(3); // Ratio of hex width to height
const HEX_WIDTH = HEX_HEIGHT * HEX_RATIO; // Width of a hex
const COLUMN_WIDTH = HEX_WIDTH * 0.75 + HEX_MARGIN; // Width of a column
const ROW_HEIGHT = HEX_HEIGHT + HEX_MARGIN; // Height of a row
//const colors = ['red', 'blue', 'gray', 'yellow', 'purple'];
const opacity = 0.75;
const colors = [`rgba(255,0,0,${opacity})`, `rgba(0,0,255,${opacity})`, `rgba(128,128,128,${opacity})`, `rgba(255,255,0,${opacity})`, `rgba(64,0,128,${opacity})`];

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

//  const getNeighborHex = (x: number, y: number, direction: number): HexType | null => {
//    const coords = getNeighborCoords(x, y, direction);
//    if (!coords) return null;
//    return hexes.find((loc) => loc.x === coords.x && loc.y === coords.y) || null;
//  }

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
          index: hexes.length,
          x: currentX,
          y: currentY,
          color: Math.floor(Math.random() * colors.length),
          removedIndex: null,
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
    const removedTiles = hexes
      .filter((tile) => tile.removedIndex !== null)
      .sort((a, b) => (a.removedIndex! - b.removedIndex!));
    hexes.forEach((hex) => {
      const hexRef = hexRefs.current[hex.index];
      if (hexRef) {
        if (hex.x !== null && hex.y !== null) {
          const xPos = hex.x * COLUMN_WIDTH + HEX_WIDTH * 1;
          const yPos = hex.y * ROW_HEIGHT + (hex.x % 2 === 0 ? ROW_HEIGHT / 2 : 0);
          hexRef.setAttribute('transform', `translate(${xPos}, ${yPos})`);
        } else {
          const yOffset = removedTiles.findIndex((tile) => tile.removedIndex === hex.removedIndex) * HEX_HEIGHT * 0.67;
          hexRef.setAttribute('transform', `translate(0, ${yOffset})`);
        }
      }
    });

    
    setHexPatterns(detectLinesAndLoops(hexes));

  }, [hexes]);

  const totalWidth = (2 + NUMBER_OF_COLUMNS) * COLUMN_WIDTH; // +2 is for the stack of used tiles on the right, it's 0.5 more than it needs to be
  const totalHeight = (1 + NUMBER_OF_ROWS) * ROW_HEIGHT; // +1 is for the stagger of tiles in a row, it's 0.5 more than it needs to be

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
          const evenColumn = hex.x! % 2 === 0;
          const isEdge = hexPattern && hexPattern.edge;
          const isLine = hexPattern && hexPattern.line;
          const isLoop = hexPattern && hexPattern.loop;
          const isCore = hexPattern && hexPattern.core;
          const strokeOpacity = isEdge ? 0.8 : 1;
          return (
            <g key={hex.index}>
              <polygon
                ref={(el) => (hexRefs.current[hex.index] = el)}
                points={`0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`}
                style={{
                  fill: colors[hex.color],
                  stroke: isLine ? `rgba(0,255,0,${strokeOpacity})` : isCore ? `rgba(255,255,255,${strokeOpacity})` : isLoop ? colors[hex.color] : `rgba(0,0,0,${strokeOpacity})`,
                  strokeWidth: isCore ? '10px' : (isLine || isLoop) ? '3px' : '0px',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                }}
                onClick={() => handleHexClick(hex.x!, hex.y!)}
              />
              <text
                x={((hex.x ?? 0) + 1.9) * (COLUMN_WIDTH+2)}
                y={((hex.y ?? 0) + 0) * (HEX_HEIGHT+2) + (HEX_HEIGHT / (evenColumn ? 1 : 2))}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={"transparent"/*isEdge ? "#aaa" : "white"*/}
                style={{ pointerEvents: 'none', fontSize: isLoop ? '14px' : '8px' , fontWeight: 'bold' }}
              >
                {hex.index.toString()}
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
