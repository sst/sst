/**
 * A reimplementation of JS AWS SDK's SharedIniFile class
 *
 * We need that class to parse the ~/.aws/config file to determine the correct
 * region at runtime, but unfortunately it is private upstream.
 */

import * as os from 'os';
import * as path from 'path';
import * as AWS from 'aws-sdk';
import * as fs from 'fs-extra';

export interface SharedIniFileOptions {
  isConfig?: boolean;
  filename?: string;
}

export class SharedIniFile {
  private readonly isConfig: boolean;
  private readonly filename: string;
  private parsedContents?: { [key: string]: { [key: string]: string } };

  constructor(options?: SharedIniFileOptions) {
    options = options || {};
    this.isConfig = options.isConfig === true;
    this.filename = options.filename || this.getDefaultFilepath();
  }

  public async getProfile(profile: string) {
    await this.ensureFileLoaded();

    const profileIndex = profile !== (AWS as any).util.defaultProfile && this.isConfig ?
      'profile ' + profile : profile;

    return this.parsedContents![profileIndex];
  }

  private getDefaultFilepath(): string {
    return path.join(
      os.homedir(),
      '.aws',
      this.isConfig ? 'config' : 'credentials',
    );
  }

  private async ensureFileLoaded() {
    if (this.parsedContents) {
      return;
    }

    if (!await fs.pathExists(this.filename)) {
      this.parsedContents = {};
      return;
    }

    const contents: string = (await fs.readFile(this.filename)).toString();
    this.parsedContents = (AWS as any).util.ini.parse(contents);
  }
}
