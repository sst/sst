export default function handler(req, res) {
  res.status(200).json({
    text: `Hello! process.env.NEXT_PUBLIC_API_URL="${process.env.NEXT_PUBLIC_API_URL}" AND process.env.API_URL="${process.env.API_URL}"`,
  });
}
