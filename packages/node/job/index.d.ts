export interface JobNames {
}
export interface JobTypes {
}
export declare type JobProps<C extends Extract<keyof JobTypes, keyof JobNames>> = {
    payload?: JobTypes[C];
};
declare function run<C extends keyof JobNames>(name: C, props?: JobProps<C>): Promise<void>;
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
export declare function JobHandler<C extends keyof JobNames>(name: C, cb: (payload: JobTypes[C]) => void): (event: any) => void;
export declare const Job: {
    run: typeof run;
};
export {};
