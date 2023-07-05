import { ContainerImageAssetHandler } from "./container-images.js";
import { FileAssetHandler } from "cdk-assets/lib/private/handlers/files.js";
import {
  AssetManifest,
  DockerImageManifestEntry,
  FileManifestEntry,
  IManifestEntry,
} from "cdk-assets/lib/asset-manifest.js";
import {
  IAssetHandler,
  IHandlerHost,
  // TODO: remove after PR is merged
  IHandlerOptions,
} from "../asset-handler.js";

export function makeAssetHandler(
  manifest: AssetManifest,
  asset: IManifestEntry,
  host: IHandlerHost,
  // TODO: remove after PR is merged
  options: IHandlerOptions
): IAssetHandler {
  if (asset instanceof FileManifestEntry) {
    // TODO: remove after PR is merged
    // @ts-ignore
    return new FileAssetHandler(manifest.directory, asset, host);
  }
  if (asset instanceof DockerImageManifestEntry) {
    return new ContainerImageAssetHandler(
      manifest.directory,
      asset,
      host,
      // TODO: remove after PR is merged
      options
    );
  }

  throw new Error(`Unrecognized asset type: '${asset}'`);
}
