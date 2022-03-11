import { css, styled } from "~/stitches.config";

const styles = css({
  background: "$loContrast",
  color: "$hiContrast",
  display: "block",
  width: "100%",
  height: 32,
  border: "1px solid $border",
  borderRadius: 4,
  fontFamily: "$sans",
  padding: "0 12px",
  "&:disabled": {
    background: "$loContrast",
    color: "$gray11",
  },
  "&:hover:not(:disabled)": {
    borderColor: "$gray7",
  },
  "&:focus:not(:disabled)": {
    outline: "none",
    borderColor: "$highlight",
  },
});

export const Input = styled("input", styles);

export const Select = styled("select", styles);
