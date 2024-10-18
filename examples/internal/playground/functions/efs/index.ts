import { stat, readFile, writeFile } from "fs/promises";

export const handler = async () => {
  const dir = await stat("/mnt/efs");
  console.log("DIR STAT", dir);
  if (!dir.isDirectory()) {
    return {
      statusCode: 500,
      body: "/mnt/efs not mounted",
    };
  }

  let value;
  try {
    const content = await readFile("/mnt/efs/counter", "utf8");
    value = parseInt(content) + 1;
  } catch (e) {
    console.log("READ ERROR", e);
    value = 1;
  }
  await writeFile("/mnt/efs/counter", value.toString());

  return {
    statusCode: 200,
    body: value.toString(),
  };
};
