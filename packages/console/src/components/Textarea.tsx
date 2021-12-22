import { styled } from "~/stitches.config";

export const Textarea = styled("textarea", {
  border: "1px solid $border",
  padding: "$sm",
  fontSize: "$sm",
  background: "$loContrast",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 4,
  minWidth: "100%",
  maxWidth: "100%",
});
