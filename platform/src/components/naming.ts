import crypto from "crypto";

export function logicalName(name: string) {
  name = name.replace(/[^a-zA-Z0-9]/g, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function physicalName(
  maxLength: number,
  name: string,
  suffix: string = "",
) {
  // This function does the following:
  // - Removes all non-alphanumeric characters
  // - Prefixes the name with the app name and stage
  // - Truncates the name if it's too long

  name = name.replace(/[^a-zA-Z0-9]/g, "");

  const prefixedName = (() => {
    const L = maxLength - suffix.length;
    const appLen = $app.name.length;
    const stageLen = $app.stage.length;
    const nameLen = name.length;

    if (appLen + stageLen + nameLen + 2 <= L) {
      return `${$app.name}-${$app.stage}-${name}`;
    }

    if (stageLen + nameLen + 1 <= L) {
      const appTruncated = $app.name.substring(0, L - stageLen - nameLen - 2);
      return appTruncated === ""
        ? `${$app.stage}-${name}`
        : `${appTruncated}-${$app.stage}-${name}`;
    }

    const stageTruncated = $app.stage.substring(
      0,
      Math.max(8, L - nameLen - 1),
    );
    const nameTruncated = name.substring(0, L - stageTruncated.length - 1);
    return `${stageTruncated}-${nameTruncated}`;
  })();

  return `${prefixedName}${suffix}`;
}

export function hashNumberToPrettyString(number: number, length: number) {
  const charLength = PRETTY_CHARS.length;
  let hash = "";
  while (number > 0) {
    hash = PRETTY_CHARS[number % charLength] + hash;
    number = Math.floor(number / charLength);
  }

  // Padding with 's'
  hash = hash.slice(0, length);
  while (hash.length < length) {
    hash = "s" + hash;
  }

  return hash;
}

export function hashStringToPrettyString(str: string, length: number) {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  const num = Number("0x" + hash.digest("hex").substring(0, 16));
  return hashNumberToPrettyString(num, length);
}

export const PRETTY_CHARS = "abcdefhkmnorstuvwxz";
