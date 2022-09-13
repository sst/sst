import { createGlobalTheme } from "@vanilla-extract/css";

export const constants = {
  mobileWidth: "600px",
}

const colors = {
  brand: "#E27152",
  black: "#162328",
  divider: "#EAE7E6",
  primary: "#395C6B",
  secondary: "#F4ECE8",
  background: "#FFFBF9",

  text: {
    normal: "#383736",
    dimmed: "#706F6C"
  }
};

const root = createGlobalTheme(":root", {
  colors: colors,
  fonts: {
    body: '"Source Sans Pro", sans-serif',
    code: '"Source Code Pro", monospace',
    heading: '"Roboto Slab", serif',
  },
  buttons: {
    primary: {
      color: colors.primary,
      hover: "#33525F",
      active: "#2C4753",
    },
    secondary: {
      color: "white",
      hover: "white",
      active: "#F6F6F6",
    },
  },
});

export const vars = { ...root };