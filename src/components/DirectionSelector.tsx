import React from "react";
import styled from "styled-components";
import { ActionsType } from "../types";

type DirectionSelectorPropsType = {
  initialPullDirection: number;
  setInitialPullDirection: (direction: number) => void;
  isClockwise: boolean | null;
  setIsClockwise: (isClockwise: boolean | null) => void;
  tapAction: ActionsType;
  setTapAction: (action: ActionsType) => void;
};

const directions = [
  { value: 1, label: "↑ top" },
  { value: 2, label: "↗ upper right" },
  { value: 3, label: "↘ lower right" },
  { value: 4, label: "↓ bottom" },
  { value: 5, label: "↙ lower left" },
  { value: 6, label: "↖ upper left" },
];

const DirectionSelector: React.FC<DirectionSelectorPropsType> = ({ initialPullDirection, setInitialPullDirection, isClockwise, setIsClockwise, tapAction, setTapAction }) => {
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
        <label>
          <input
            type="radio"
            name="rotation"
            value="clockwise"
            checked={isClockwise === true}
            onChange={() => setIsClockwise(true)}
          />
          Clockwise
        </label>

        <label>
          <input
            type="radio"
            name="rotation"
            value="counter-clockwise"
            checked={isClockwise === false}
            onChange={() => setIsClockwise(false)}
          />
          Counter-clockwise
        </label>

        <label>
          <input
            type="radio"
            name="rotation"
            value="straight"
            checked={isClockwise === null}
            onChange={() => setIsClockwise(null)}
          />
          Straight
        </label>
      </div>
      <StyledButton onClick={() => {setTapAction("pull")}} style={{borderColor: tapAction==="pull" ? "#646cff" : "transparent"}}>Pull</StyledButton>
      <StyledButton onClick={() => {setTapAction("collect")}} style={{borderColor: tapAction==="collect" ? "#646cff" : "transparent"}}>Collect</StyledButton>
    </div>
  );
};

export default DirectionSelector;

// Styled button with margin
const StyledButton = styled.button`
  margin: 0 1rem;
  border-width: 3px;
`;