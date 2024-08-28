import sharp from "sharp";
import { promises as fs } from "fs";

export async function handler() {
  const imagePath = "logo.png";

  try {
    // Read the image file
    const imageBuffer = await fs.readFile(imagePath);

    // Resize the image
    const resizedImage = await sharp(imageBuffer)
      .resize(100, 100) // Resize to 100x100
      .toBuffer();

    // Convert the buffer to base64
    const body = resizedImage.toString("base64");

    console.log("Successfully resized logo.png");

    return {
      body,
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline"
      },
      isBase64Encoded: true
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify("Error resizing image: " + error.message),
    };
  }
}
