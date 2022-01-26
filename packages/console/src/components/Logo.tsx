import { HTMLProps } from "react";
import { styled } from "~/stitches.config";

export function Logo(props: JSX.IntrinsicElements["img"]) {
  return <img src="/logo.svg" alt="logo" {...props} />;
}
