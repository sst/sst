import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./vars.css";

globalStyle("body", {
  margin: 0,

  fontFamily: vars.fonts.body,
  color: vars.colors.text.normal,
  background: vars.colors.background,

  fontSynthesis: "none",
  textRendering: "optimizeLegibility",
  WebkitTextSizeAdjust: "100%",
  MozOsxFontSmoothing: "grayscale",
  WebkitFontSmoothing: "antialiased",
});

globalStyle("h1, h2, h3, h4, h5, h6", {
  margin: 0,
  fontFamily: vars.fonts.heading,
});

globalStyle("a", {
  textDecoration: "none",
});

globalStyle("code", {
  fontFamily: vars.fonts.code,
});

globalStyle("input[type=text], textarea", {
  padding: "0.375rem 0.75rem",
  lineHeight: 1.5,
  fontSize: "1rem",
  appearance: "none",
  borderRadius: "0.25rem",
  boxSizing: "border-box",
  backgroundColor: "white",
  fontFamily: vars.fonts.body,
  border: "1px solid #CED4DA",
  backgroundClip: "padding-box",
  transition: "border-color .15s ease-in-out"
    + ", box-shadow .15s ease-in-out",
});
globalStyle("input[type=text]:focus, textarea:focus", {
  outline: 0,
  borderColor: "#86B7FE",
  boxShadow: "0 0 0 0.25rem rgb(13 110 253 / 25%)",
});