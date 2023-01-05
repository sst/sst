export declare const Context: {
    create: typeof create;
    reset: typeof reset;
    memo: typeof memo;
};
declare function create<C>(cb?: () => C): {
    use(): C;
    provide(value: C): void;
};
declare function reset(): void;
export declare function memo<C>(cb: () => C): () => C;
export {};
