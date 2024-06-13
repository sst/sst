/* tslint:disable */
/* eslint-disable */
import "sst";
declare module "sst" {
  export interface Resource {
    Database: {
      database: string;
      host: string;
      password: string;
      port: number;
      type: "supabase.index/project.Project";
      user: string;
    };
  }
}
export {};
