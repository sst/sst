import { readFile, writeFile } from "fs/promises";

export async function increment() {
  // read the counter file from EFS
  let oldValue = 0;
  try {
    oldValue = parseInt(await readFile("/mnt/efs/counter", "utf8"));
    oldValue = isNaN(oldValue) ? 0 : oldValue;
  } catch (e) {
    // file doesn't exist
  }

  // increment the counter
  const newValue = oldValue + 1;

  // write the counter file to EFS
  await writeFile("/mnt/efs/counter", newValue.toString());

  return newValue;
}
