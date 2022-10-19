export interface JobResources {
}
export interface JobTypes {
}
export declare type JobRunProps<T extends keyof JobResources> = {
    payload?: JobTypes[T];
};
export declare type JobType = {
    [T in keyof JobResources]: ReturnType<typeof JobControl<T>>;
};
export declare const Job: JobType;
declare function JobControl<Name extends keyof JobResources>(name: Name): {
    run(props: JobRunProps<Name>): Promise<void>;
};
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
export {};
