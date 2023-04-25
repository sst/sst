import { styled } from "@macaron-css/solid";
import type { Component } from "solid-js";
import { theme } from "./ui/theme";

const Test = styled("div", {
  base: {
    color: theme.color.primary,
  },
});
console.log(import.meta.env.VITE_API_URL);
export const App: Component = () => {
  return <Test>Hello World</Test>;
};
