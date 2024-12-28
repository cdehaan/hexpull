import React, { useState, useEffect, useRef } from 'react';

const GRID_WIDTH = 20; // Number of columns
const GRID_HEIGHT = 20; // Number of rows
const HEX_HEIGHT = 40;
const HEX_RATIO = 2 / Math.sqrt(3); // Ratio of hex width to height
const HEX_WIDTH = HEX_HEIGHT * HEX_RATIO; // Width of a hex
const COLUMN_WIDTH = HEX_WIDTH * 0.75; // Width of a column
const colors = ['red', 'blue', 'gray', 'yellow', 'purple'];

type HexLocationType = { x: number; y: number; color: number }; // To represent logical location of a hex

const HexGrid: React.FC = () => {
  const [hexLocations, setHexLocations] = useState<HexLocationType[]>(
    Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, i) => ({
      x: i % GRID_WIDTH,
      y: Math.floor(i / GRID_WIDTH),
      color: Math.floor(Math.random() * colors.length),
    }))
  );

  const hexRefs = useRef<HTMLDivElement[] | null[]>(
    Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, () => null)
  );

  const moveHex = (index: number, newX: number, newY: number) => {
    setHexLocations((prev) =>
      prev.map((loc, i) => (i === index ? { x: newX, y: newY, color: loc.color } : loc))
    );
  };

  const findHexIndex = (x: number, y: number): number | null => {
    const index = hexLocations.findIndex((loc) => loc.x === x && loc.y === y);
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

  const handleHexClick = (x: number, y: number, pullDirection: number, clockwise: boolean) => {
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
      if (neighborIndex === null) break;

      moveHex(neighborIndex, currentX, currentY);
      currentX = neighbor.x;
      currentY = neighbor.y;
      steps++;

      if (steps >= length) {
        steps = 0;
        if (grow) length++;
        grow = !grow;
        direction = clockwise ? (direction % 6) + 1 : (direction - 2 + 6) % 6 + 1;
      }
    }
  };

  useEffect(() => {
    hexLocations.forEach((hex, index) => {
      const hexRef = hexRefs.current[index];
      if (hexRef) {
        hexRef.style.transform = `translate(${hex.x * COLUMN_WIDTH + hex.x * 2}px, ${hex.y * HEX_HEIGHT + (hex.x % 2 === 0 ? HEX_HEIGHT / 2 : 0) + hex.y * 2}px)`;
      }
    });
  }, [hexLocations]);

  return (
    <div className="hex-grid" style={{ position: 'relative', margin: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => handleHexClick(10, 10, 2, true)}>
          Trigger Hex Movement
        </button>
      </div>
      {hexLocations.map((hex, index) => (
        <div
          key={index}
          className="hex-tile"
          ref={(el) => (hexRefs.current[index] = el)}
          style={{
            ...hexTileStyle,
            position: 'absolute',
            backgroundColor: colors[hex.color],
          }}
          onClick={() => handleHexClick(hex.x, hex.y, 2, true)}
        >
          {hex.x}, {hex.y}
        </div>
      ))}
    </div>
  );
};

export default HexGrid;

const hexTileStyle = {
  width: `${HEX_HEIGHT * HEX_RATIO}px`,
  height: `${HEX_HEIGHT}px`,
  color: 'black',
  fontSize: '0.8rem',
  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: '0px solid black',
  transition: 'transform 0.3s ease',
};
