import { styled } from "~/stitches.config";

export const Row = styled("div", {
  display: "flex",
  width: "100%",
  gap: "0 $sm",
  variants: {
    alignHorizontal: {
      center: {
        justifyContent: "center",
      },
      end: {
        justifyContent: "flex-end",
      },
      start: {
        justifyContent: "flex-start",
      },
      justify: {
        justifyContent: "space-between",
      },
    },
    alignVertical: {
      center: {
        alignItems: "center",
      },
      end: {
        alignItems: "flex-end",
      },
      start: {
        alignItems: "flex-start",
      },
    },
  },
});
