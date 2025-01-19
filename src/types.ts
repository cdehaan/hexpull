export type HexType = {
    index: number;
    x: number | null;
    y: number | null;
    color: number;
    removedIndex: number | null;
    isQueuedForCollection: boolean;
};

export type LinePointType = {
    lineIndex: number;
    step: number;
};

export type HexPatternsType = {
    index: number;
    edge: boolean;
    lines: LinePointType[];
    loop: boolean | null;
    core: boolean | null;
};

export type ActionsType = "pull" | "line" | "ring" | "select" | "collect";
