import React from 'react';

type DirectionSelectorPropsType = {
  initialPullDirection: number;
  setInitialPullDirection: (direction: number) => void;
  isClockwise: boolean;
  setIsClockwise: (isClockwise: boolean) => void;
};

const directions = [
  { value: 1, label: '↑ top' },
  { value: 2, label: '↗ upper right' },
  { value: 3, label: '↘ lower right' },
  { value: 4, label: '↓ bottom' },
  { value: 5, label: '↙ lower left' },
  { value: 6, label: '↖ upper left' },
];

const DirectionSelector: React.FC<DirectionSelectorPropsType> = ({ initialPullDirection, setInitialPullDirection, isClockwise, setIsClockwise }) => {
  return (
    <div>
      <label htmlFor="direction-select">Select Pull Direction: </label>
      <select
        id="direction-select"
        value={initialPullDirection}
        onChange={(e) => setInitialPullDirection(Number(e.target.value))}
      >
        {directions.map((direction) => (
          <option key={direction.value} value={direction.value}>
            {direction.label}
          </option>
        ))}
      </select>
      <div>
        <label htmlFor="clockwise-checkbox">Clockwise</label>
        <input
          type="checkbox"
          id="clockwise-checkbox"
          checked={isClockwise}
          onChange={(e) => setIsClockwise(e.target.checked)}
        />
      </div>
    </div>
  );
};

export default DirectionSelector;
