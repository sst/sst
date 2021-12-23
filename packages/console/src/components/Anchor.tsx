import { styled } from "~/stitches.config";

export const Anchor = styled("a", {
  fontSize: "$sm",
  fontWeight: 600,
  cursor: "pointer",
  color: "$hiContrast",
  "&:hover": {
    textDecoration: "underline",
  },
});
