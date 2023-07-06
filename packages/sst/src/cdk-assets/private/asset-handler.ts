import { DockerFactory } from "./docker.js";
import { IAws } from "cdk-assets/lib/aws.js";
import { EventType } from "cdk-assets/lib/progress.js";

/**
 * Handler for asset building and publishing.
 */
export interface IAssetHandler {
  /**
   * Build the asset.
   */
  build(): Promise<void>;

  /**
   * Publish the asset.
   */
  publish(): Promise<void>;

  /**
   * Return whether the asset already exists
   */
  isPublished(): Promise<boolean>;
}

export interface IHandlerHost {
  readonly aws: IAws;
  readonly aborted: boolean;
  readonly dockerFactory: DockerFactory;

  emitMessage(type: EventType, m: string): void;
}

// TODO: remove after PR is merged
export interface IHandlerOptions {
  readonly quiet?: boolean;
}
