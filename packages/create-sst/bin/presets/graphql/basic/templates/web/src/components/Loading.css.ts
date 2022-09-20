import { style, keyframes } from "@vanilla-extract/css";

const rotate = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" }
});

export const spinner = style({
  opacity: 0.35,
  fontSize: "2rem",
  verticalAlign: "middle",
  marginRight: "0.3125rem",
  marginBottom: "0.0625rem",
  animation: `3s infinite ${rotate}`,
});

export const loading = style({
  width: "100%",
  height: "300px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
