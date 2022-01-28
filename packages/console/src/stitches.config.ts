import { createStitches, CSS as StitchesCSS } from "@stitches/react";
import * as Colors from "@radix-ui/colors";

/*
 * Use semantic names where possible we can memorize them
 * Keep the number of tokens to minimum so we don't have to pick between them
 */
export const { keyframes, css, styled, globalCss, createTheme, theme, config } =
  createStitches({
    theme: {
      fonts: {
        sans: "JetBrains Mono",
      },
      colors: {
        ...Colors.gray,
        ...Colors.orange,
        ...Colors.green,
        ...Colors.red,
        highlight: "#e27152",
        hiContrast: "#161619",
        loContrast: "white",
        border: Colors.gray.gray4,
      },
      transitions: {
        default: "300ms all",
        fast: "200ms all",
      },
      fontSizes: {
        xs: "11px",
        sm: "14px",
        md: "16px",
        lg: "18px",
        xl: "20px",
        xxl: "23px",
      },
      space: {
        0: "0px",
        px: "1px",
        xxs: "0.125rem",
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        xxl: "4rem",
      },
    },
  });

export type CSS = StitchesCSS<typeof config>;

export const darkTheme = createTheme({
  colors: {
    ...Colors.grayDark,
    ...Colors.orangeDark,
    ...Colors.greenDark,
    ...Colors.redDark,
    hiContrast: "white",
    loContrast: "#161619",
    border: Colors.grayDark.gray3,
    mask: "rgba(22, 22, 25, 1)",
  },
});

export const reset = globalCss({
  "html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, main, menu, nav, output, ruby, section, summary, time, mark, audio, video":
    {
      margin: "0",
      padding: "0",
      border: "0",
      fontSize: "100%",
      font: "inherit",
      verticalAlign: "baseline",
    },
  "article, aside, details, figcaption, figure, footer, header, hgroup, main, menu, nav, section":
    {
      display: "block",
    },
  "*[hidden]": {
    display: "none",
  },
  body: {
    lineHeight: "1",
  },
  "ol, ul": {
    listStyle: "none",
  },
  "blockquote, q": {
    quotes: "none",
  },
  "blockquote:before, blockquote:after, q:before, q:after": {
    content: "none",
  },
  table: {
    borderSpacing: "0",
  },
})();
