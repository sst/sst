import { SSTConstruct } from "./Construct";

type ExtractMetadata<T extends SSTConstruct> = ReturnType<
  T["getConstructMetadata"]
> & { id: string; addr: string; stack: string };

import type { Api } from "./Api.js";
export type ApiMetadata = ExtractMetadata<Api<any>>;

import { GraphQLApi } from "./GraphQLApi.js";
export type GraphQLApiMetadata = ExtractMetadata<GraphQLApi>;

import type { ApiGatewayV1Api } from "./ApiGatewayV1Api.js";
export type ApiGatewayV1ApiMetadata = ExtractMetadata<ApiGatewayV1Api<any>>;

import type { Auth } from "./Auth.js";
export type AuthMetadata = ExtractMetadata<Auth>;

import type { AppSyncApi } from "./AppSyncApi.js";
export type AppSyncApiMetadata = ExtractMetadata<AppSyncApi>;

import type { Bucket } from "./Bucket.js";
export type BucketMetadata = ExtractMetadata<Bucket>;

import type { Cron } from "./Cron.js";
export type CronMetadata = ExtractMetadata<Cron>;

import type { EventBus } from "./EventBus.js";
export type EventBusMetadata = ExtractMetadata<EventBus>;

import type { Function as Fn } from "./Function.js";
export type FunctionMetadata = ExtractMetadata<Fn>;

import type { KinesisStream } from "./KinesisStream.js";
export type KinesisStreamMetadata = ExtractMetadata<KinesisStream>;

import type { NextjsSite } from "./NextjsSite.js";
export type NextjsMetadata = ExtractMetadata<NextjsSite>;

import type { Queue } from "./Queue.js";
export type QueueMetadata = ExtractMetadata<Queue>;

import type { StaticSite } from "./StaticSite.js";
export type StaticSiteMetadata = ExtractMetadata<StaticSite>;

import type { Table } from "./Table.js";
export type TableMetadata = ExtractMetadata<Table>;

import type { Topic } from "./Topic.js";
export type TopicMetadata = ExtractMetadata<Topic>;

import type { WebSocketApi } from "./WebSocketApi.js";
export type WebSocketApiMetadata = ExtractMetadata<WebSocketApi>;

import type { RDS } from "./RDS.js";
export type RDSMetadata = ExtractMetadata<RDS>;

export type Metadata =
  | ApiMetadata
  | ApiGatewayV1ApiMetadata
  | AuthMetadata
  | AppSyncApiMetadata
  | BucketMetadata
  | CronMetadata
  | EventBusMetadata
  | FunctionMetadata
  | KinesisStreamMetadata
  | NextjsMetadata
  | QueueMetadata
  | StaticSiteMetadata
  | TableMetadata
  | TopicMetadata
  | WebSocketApiMetadata
  | GraphQLApiMetadata
  | RDSMetadata;
