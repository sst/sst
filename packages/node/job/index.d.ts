export interface JobResources {
}
export interface JobTypes {
}
export declare type JobProps<C> = {
    payload?: JobTypes[C extends Extract<keyof JobTypes, keyof JobResources> ? JobTypes[C] : any];
};
export declare const Job: {};
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
export declare function JobHandler<C extends keyof JobResources>(name: C, cb: (payload: JobTypes[C]) => void): (event: any) => void;
