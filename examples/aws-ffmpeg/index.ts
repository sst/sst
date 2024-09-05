import path from "path";
import ffmpeg from "ffmpeg-static";
import { promises as fs } from "fs";
import { spawnSync } from "child_process";

export async function handler() {
  const videoPath = "clip.mp4";

  const outputFile = "thumbnail.jpg";
  const outputPath = process.env.SST_DEV
    ? outputFile
    : path.join("/tmp", outputFile);

  const ffmpegParams = [
    "-ss",
    "1",
    "-i",
    videoPath,
    "-vf",
    "thumbnail,scale=960:540",
    "-vframes",
    "1",
    outputPath,
  ];

  spawnSync(ffmpeg, ffmpegParams, { stdio: "pipe" });

  const img = await fs.readFile(outputPath);
  const body = Buffer.from(img).toString("base64");

  return {
    body,
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": "inline",
    },
  };
}
