import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// chrome-aws-lambda handles loading locally vs from the Layer

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

// This is the path to the local Chromium binary
const YOUR_LOCAL_CHROMIUM_PATH = "/tmp/localChromium/chromium/mac-1165945/chrome-mac/Chromium.app/Contents/MacOS/Chromium";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Get the url and dimensions from the query string
  const { url, width, height } = event.queryStringParameters!;
  console.log(url, width, height);
  if (!url) {
    return {
      statusCode: 400,
      body: "Please provide a url",
    };
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: process.env.IS_LOCAL
      ? YOUR_LOCAL_CHROMIUM_PATH
      : await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  if (width && height) {
    await page.setViewport({
      width: Number(width),
      height: Number(height),
    });
  }

  // Navigate to the url
  await page.goto(url!);

  // Take the screenshot
  const screenshot = (await page.screenshot({ encoding: "base64" })) as string;

  const pages = await browser.pages();
  for (let i = 0; i < pages.length; i++) {
    await pages[i].close();
  }

  await browser.close();

  return {
    statusCode: 200,
    // Return as binary data
    isBase64Encoded: true,
    headers: { "Content-Type": "image/png" },
    body: screenshot,
  };
};
