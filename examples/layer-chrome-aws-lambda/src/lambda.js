import chrome from "chrome-aws-lambda";

// chrome-aws-lambda handles loading locally vs from the Layer
const puppeteer = chrome.puppeteer;

export async function handler(event) {
  // Get the url and dimensions from the query string
  const { url, width, height } = event.queryStringParameters;

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: Number(width),
    height: Number(height),
  });

  // Navigate to the url
  await page.goto(url);

  return {
    statusCode: 200,
    // Return as binary data
    isBase64Encoded: true,
    headers: { "Content-Type": "image/png" },
    body: await page.screenshot({ encoding: "base64" }),
  };
}
