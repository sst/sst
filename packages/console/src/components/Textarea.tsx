import { styled } from "~/stitches.config";

export const Textarea = styled("textarea", {
  border: "0",
  fontSize: "$sm",
  background: "transparent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 4,
  width: "100%",
  resize: "none",
  "&:focus": {
    outline: "none",
  },
});
