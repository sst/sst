import { SSTConstruct } from "./Construct.js";

type ExtractMetadata<T extends SSTConstruct> = ReturnType<
  T["getConstructMetadata"]
> & { id: string; addr: string; stack: string };

import type { Api } from "./Api.js";
export type ApiMetadata = ExtractMetadata<Api<any>>;

import type { ApiGatewayV1Api } from "./ApiGatewayV1Api.js";
export type ApiGatewayV1ApiMetadata = ExtractMetadata<ApiGatewayV1Api<any>>;

import type { Cognito } from "./Cognito.js";
export type CognitoMetadata = ExtractMetadata<Cognito>;

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

import type { NextjsSite as SlsNextjsSite } from "./deprecated/NextjsSite.js";
export type SlsNextjsMetadata = ExtractMetadata<SlsNextjsSite>;

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

// Sites

import type { NextjsSite } from "./NextjsSite.js";
export type NextjsSiteMetadata = ExtractMetadata<NextjsSite>;

import type { AstroSite } from "./AstroSite.js";
export type AstroSiteMetadata = ExtractMetadata<AstroSite>;

import type { RemixSite } from "./RemixSite.js";
export type RemixSiteMetadata = ExtractMetadata<RemixSite>;

import type { SvelteKitSite } from "./SvelteKitSite.js";
export type SvelteKitSiteMetadata = ExtractMetadata<SvelteKitSite>;

import type { SolidStartSite } from "./SolidStartSite.js";
export type SolidStartSiteMetadata = ExtractMetadata<SolidStartSite>;

export type SSRSiteMetadata =
  | NextjsSiteMetadata
  | AstroSiteMetadata
  | RemixSiteMetadata
  | SolidStartSiteMetadata
  | SvelteKitSiteMetadata;

export type Metadata =
  | ApiMetadata
  | ApiGatewayV1ApiMetadata
  | CognitoMetadata
  | AppSyncApiMetadata
  | BucketMetadata
  | CronMetadata
  | EventBusMetadata
  | FunctionMetadata
  | KinesisStreamMetadata
  | SlsNextjsMetadata
  | QueueMetadata
  | StaticSiteMetadata
  | TableMetadata
  | TopicMetadata
  | WebSocketApiMetadata
  | RDSMetadata
  | SSRSiteMetadata;
