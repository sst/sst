export interface RunProps {
    jobName: string;
    payload?: any;
}
declare function run({ jobName, payload }: RunProps): Promise<void>;
export declare const Job: {
    run: typeof run;
};
export {};
