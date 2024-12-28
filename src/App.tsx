import React, { useState, useEffect, useRef } from 'react';

// Define the grid dimensions
const GRID_WIDTH = 20; // Number of columns
const GRID_HEIGHT = 20; // Number of rows
const HEX_HEIGHT = 40;
const HEX_RATIO = 2 / Math.sqrt(3); // Ratio of hex width to height
const HEX_WIDTH = HEX_HEIGHT * HEX_RATIO; // Width of a hex
const COLUMN_WIDTH = HEX_WIDTH * 0.75; // Width of a column
const colors = ['red', 'blue', 'gray', 'yellow', 'purple'];

type HexLocationType = { x: number; y: number, color: number }; // To represent logical location of a hex

const HexGrid: React.FC = () => {
  // State for logical hex locations
  const [hexLocations, setHexLocations] = useState<HexLocationType[]>(
    Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, (_, i) => ({
      x: i % GRID_WIDTH,
      y: Math.floor(i / GRID_WIDTH),
      color: Math.floor(Math.random() * colors.length),
    }))
  );

  // Array of refs for hex tiles
  const hexRefs = useRef<HTMLDivElement[] | null[]>(
    Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, () => null)
  );

  // Function to move a hex
  const moveHex = (index: number, newX: number, newY: number) => {
    setHexLocations((prev) =>
      prev.map((loc, i) => (i === index ? { x: newX, y: newY, color: loc.color } : loc))
    );
  };

  const findHex = (x: number, y: number): HTMLDivElement[] => {
    return hexLocations
      .map((loc, index) => (loc.x === x && loc.y === y ? hexRefs.current[index] : null))
      .filter((ref): ref is HTMLDivElement => ref !== null);
  };

  useEffect(() => {
    // Reset positions in the DOM whenever the logical locations update
    hexLocations.forEach((hex, index) => {
      const hexRef = hexRefs.current[index];
      if (hexRef) {
        hexRef.style.transform = `translate(${hex.x * COLUMN_WIDTH + hex.x * 2}px, ${hex.y * HEX_HEIGHT + (hex.x % 2 === 0 ? HEX_HEIGHT / 2 : 0) + hex.y * 2}px)`;
      }
    });
  }, [hexLocations]);

  return (
    <div className="hex-grid" style={{ position: 'relative', margin: "1rem"}}>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => moveHex(0, 5, 5)}>
          Move Hex 0 to (5, 5)
        </button>
        <button onClick={() => findHex(5, 5).forEach((hex) => (hex.style.backgroundColor = 'red'))}>
          Find Hex at (5, 5)
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
        >
          {hex.x}, {hex.y}
        </div>
      ))}
    </div>
  );
};

export default HexGrid;

const hexTileStyle = {
  width: `${HEX_HEIGHT * HEX_RATIO}px`, // 1.1547 is the approximate ratio for a hex width-to-height
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
