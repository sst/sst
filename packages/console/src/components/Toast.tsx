import { styled } from "~/stitches.config";
import { Stack } from "./Stack";

export const Root = styled("div", {
  position: "fixed",
  bottom: 0,
  right: 0,
  padding: "$lg",
});

export const Card = styled("div", {
  minWidth: 300,
  borderRadius: 6,
  padding: "$md $lg",
  variants: {
    color: {
      danger: {
        background: "$red5",
        color: "$red10",
      },
      neutral: {
        background: "$gray6",
        color: "$gray11",
      },
    },
  },
});

export const Title = styled("div", {
  fontWeight: 600,
});
