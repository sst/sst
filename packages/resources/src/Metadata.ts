import { SSTConstruct } from "./Construct";

type ExtractMetadata<T extends SSTConstruct> = ReturnType<
  T["getConstructMetadata"]
> & { id: string; addr: string; stack: string };

import { Api } from "./Api";
export type ApiMetadata = ExtractMetadata<Api>;

import { GraphQLApi } from "./GraphQLApi";
export type GraphQLApiMetadata = ExtractMetadata<GraphQLApi>;

import { ApiGatewayV1Api } from "./ApiGatewayV1Api";
export type ApiGatewayV1ApiMetadata = ExtractMetadata<ApiGatewayV1Api>;

import { Auth } from "./Auth";
export type AuthMetadata = ExtractMetadata<Auth>;

import { AppSyncApi } from "./AppSyncApi";
export type AppSyncApiMetadata = ExtractMetadata<AppSyncApi>;

import { Bucket } from "./Bucket";
export type BucketMetadata = ExtractMetadata<Bucket>;

import { Cron } from "./Cron";
export type CronMetadata = ExtractMetadata<Cron>;

import { EventBus } from "./EventBus";
export type EventBusMetadata = ExtractMetadata<EventBus>;

import { Function as Fn } from "./Function";
export type FunctionMetadata = ExtractMetadata<Fn>;

import { KinesisStream } from "./KinesisStream";
export type KinesisStreamMetadata = ExtractMetadata<KinesisStream>;

import { NextjsSite } from "./NextjsSite";
export type NextjsMetadata = ExtractMetadata<NextjsSite>;

import { Queue } from "./Queue";
export type QueueMetadata = ExtractMetadata<Queue>;

import { StaticSite } from "./StaticSite";
export type StaticSiteMetadata = ExtractMetadata<StaticSite>;

import { Table } from "./Table";
export type TableMetadata = ExtractMetadata<Table>;

import { Topic } from "./Topic";
export type TopicMetadata = ExtractMetadata<Topic>;

import { WebSocketApi } from "./WebSocketApi";
export type WebSocketApiMetadata = ExtractMetadata<WebSocketApi>;

import { RDS } from "./RDS";
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
