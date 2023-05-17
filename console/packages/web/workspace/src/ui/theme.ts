import {
  createGlobalTheme,
  createThemeContract,
  createTheme,
} from "@macaron-css/core";

export const [lightClass, theme] = createTheme({
  color: {
    danger: {
      border: "hsl(2deg 84% 43%)",
      surface: "hsl(2deg 84% 55%)",
      foreground: "hsl(0deg 0% 100% / 93%)",
      shadow:
        "hsl(2.11deg 84.52% 67.06% / 80%) 0px 1px 0px 0px inset, hsl(240deg 29.41% 10% / 10%) 0px 1px 1px 0px, hsl(240deg 29.41% 10% / 10%) 0px 2px 2px 0px",
      hover: {
        surface: "hsl(2deg 84% 61%)",
        border: "hsl(2deg 84% 49%)",
      },
      active: {
        surface: "hsl(2deg 84% 49%)",
        border: "transparent",
      },
    },
  },
  font: {
    mono: "IBM Plex Mono",
  },
  space: {
    px: "1px",
    0: "0px",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    3.5: "0.875rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    11: "2.75rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    28: "7rem",
    32: "8rem",
    36: "9rem",
    40: "10rem",
    44: "11rem",
    48: "12rem",
    52: "13rem",
    56: "14rem",
    60: "15rem",
    64: "16rem",
    72: "18rem",
    80: "20rem",
    96: "24rem",
  },
});

export const darkClass = createTheme(theme, {
  ...theme,
});
