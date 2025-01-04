import React from "react";
import styled from "styled-components";
import { ActionsType } from "../types";

type DirectionSelectorPropsType = {
  initialPullDirection: number;
  setInitialPullDirection: (direction: number) => void;
  isClockwise: boolean;
  setIsClockwise: (isClockwise: boolean) => void;
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
        <label htmlFor="clockwise-checkbox">Clockwise</label>
        <input
          type="checkbox"
          id="clockwise-checkbox"
          checked={isClockwise}
          onChange={(e) => setIsClockwise(e.target.checked)}
        />
      </div>
      <StyledButton onClick={() => {setTapAction("pull")}} style={{borderColor: tapAction==="pull" ? "#646cff" : "transparent"}}>Pull</StyledButton>
      <StyledButton onClick={() => {setTapAction("line")}} style={{borderColor: tapAction==="line" ? "#646cff" : "transparent"}}>Line</StyledButton>
      <StyledButton onClick={() => {setTapAction("ring")}} style={{borderColor: tapAction==="ring" ? "#646cff" : "transparent"}}>Ring</StyledButton>
    </div>
  );
};

export default DirectionSelector;

// Styled button with margin
const StyledButton = styled.button`
  margin: 0 1rem;
  border-width: 3px;
`;