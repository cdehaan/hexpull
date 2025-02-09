import React from "react";
import { HexPatternsType, HexType } from "../types";
import { HEX_HEIGHT, HEX_WIDTH, colors } from "../config/consts";

type HexTilePropsType = {
  hex: HexType,
  hexPattern: HexPatternsType,
  handleHexClick: (hex: HexType) => void,
};

const hexPoints = `0,${HEX_HEIGHT / 2} ${HEX_WIDTH / 4},0 ${(HEX_WIDTH * 3) / 4},0 ${HEX_WIDTH},${HEX_HEIGHT / 2} ${(HEX_WIDTH * 3) / 4},${HEX_HEIGHT} ${HEX_WIDTH / 4},${HEX_HEIGHT}`;

export const HexTile: React.FC<HexTilePropsType> = ({ hex, hexPattern, handleHexClick }) => {
  const isEdge = hexPattern && hexPattern.edge;
  const isLine = hexPattern && hexPattern.lines.length > 0;
  const lineCount = hexPattern ? hexPattern.lines.length : 0;
  const isLoop = hexPattern && hexPattern.loop;
  const isCore = hexPattern && hexPattern.core;
  const isPowerup = hex.powerup !== null;
  const isQueued = hex.isQueuedForCollection;
  const strokeOpacity = isEdge ? 0.8 : 1;
  const displayIndex = true;
  const removed = hex.removedIndex !== null;

  const textX = HEX_WIDTH / 2;
  const textY = HEX_HEIGHT / 2;

  return (
    <g
      key={hex.index}
      ref={hex.ref}
      style={{ transition: "transform 0.3s ease" }}
    >
      <polygon
        points={hexPoints}
        style={{
          fill: colors[hex.color],
          stroke: removed ? "black" : (isLine && isCore) ? `rgba(128,255,128,${strokeOpacity})` : isLine ? `rgba(0,255,0,${strokeOpacity})` : isCore ? `rgba(255,255,255,${strokeOpacity})` : isLoop ? colors[hex.color] : `rgba(0,0,0,${strokeOpacity})`,
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
};

