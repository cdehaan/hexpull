export type HexType = {
    index: number;
    ref: React.RefObject<SVGGElement>;
    color: number;
    restingLocation: {x: number, y: number} | null;
    powerup: PowerupType | null;
    removedIndex: number | null;
    isQueuedForCollection: boolean;

    animatedValue: number | null;
    animationStartTime: number | null;
    opacityInterpolator: ((progress: number) => number) | null;
    positionInterpolator: ((progress: number) => {x: number, y: number}) | null;
    startingLocation: {x: number, y: number} | null;
};

export type LinePointType = {
    lineId: number;
    step: number;
    length: number;
};

export type HexPatternsType = {
    index: number;
    edge: boolean;
    lines: LinePointType[];
    loop: boolean | null;
    core: boolean | null;
};

export type ActionsType = "pull" | "line" | "ring" | "select" | "collect";

export type PowerupType = {
    effect: PowerupEffectType;
    level: number;
    location: {
        isOnBoard: boolean;
        consumableIndex: number | null;
        lastingIndex: number | null;
        permanentIndex: number | null;
    }
};

export type PowerupEffectType = "bomb" | "cut" | "turns" | "rotate" | "swap" | "clear" | "unknown";