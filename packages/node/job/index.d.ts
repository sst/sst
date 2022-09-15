export interface JobNames {
}
export interface JobTypes {
}
export declare type JobProps = {
    [type in Extract<keyof JobTypes, keyof JobNames>]: {
        jobName: type;
        payload?: JobTypes[type];
    };
}[Extract<keyof JobTypes, keyof JobNames>];
declare function run({ jobName, payload }: JobProps): Promise<void>;
/**
 * Create a new job handler.
 *
 * @example
 * ```ts
 * declare module "@serverless-stack/node/job" {
 *   export interface JobTypes {
 *     MyJob: {
 *       title: string;
 *     };
 *   }
 * }
 *
 * export const handler = JobHandler("MyJob", async (payload) => {
 *   console.log(payload.title);
 * })
 * ```
 */
export declare function JobHandler<C>(name: keyof JobNames, cb: (payload: JobTypes[keyof JobNames]) => C): (event: any) => C;
export declare const Job: {
    run: typeof run;
    JobHandler: typeof JobHandler;
};
export {};
