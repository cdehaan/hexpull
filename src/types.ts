export type HexType = {
    index: number;
    x: number | null;
    y: number | null;
    color: number;
    removedIndex: number | null;
};

export type HexPatternsType = {
    index: number;
    edge: boolean;
    line: number[];
    loop: boolean | null;
    core: boolean | null;
};

export type ActionsType = "pull" | "line" | "ring" | "select";
