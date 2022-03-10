import { styled } from "~/stitches.config";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

const SCROLLBAR_SIZE = 10;

export const Area = styled(ScrollAreaPrimitive.Root, {
  width: "100%",
  height: "100%",
  overflow: "hidden",
});

export const ViewPort = styled(ScrollAreaPrimitive.Viewport, {
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
});

export const Bar = styled(ScrollAreaPrimitive.Scrollbar, {
  display: "flex",
  // ensures no selection
  userSelect: "none",
  // disable browser handling of all panning and zooming gestures on touch devices
  touchAction: "none",
  padding: 2,
  background: "$border",
  transition: "background 160ms ease-out",
  '&[data-orientation="vertical"]': { width: SCROLLBAR_SIZE },
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
    height: SCROLLBAR_SIZE,
  },
});

export const Thumb = styled(ScrollAreaPrimitive.Thumb, {
  flex: 1,
  borderRadius: SCROLLBAR_SIZE,
  background: "$highlight",
  // increase target size for touch devices https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    height: "100%",
    minWidth: 44,
    minHeight: 44,
  },
});

export const Corner = styled(ScrollAreaPrimitive.Corner, {});
