import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// This is the path to the local Chromium binary
const YOUR_LOCAL_CHROMIUM_PATH =
  "/tmp/localChromium/chromium/mac_arm-1350406/chrome-mac/Chromium.app/Contents/MacOS/Chromium";

export async function handler() {
  const url = "https://sst.dev";
  const width = 1024;
  const height = 768;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: process.env.SST_DEV
      ? YOUR_LOCAL_CHROMIUM_PATH
      : await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: width,
    height: height,
  });

  await page.goto(url!);

  const screenshot = (await page.screenshot({ encoding: "base64" })) as string;

  return {
    statusCode: 200,
    body: screenshot,
    isBase64Encoded: true,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": "inline",
    },
  };
}
