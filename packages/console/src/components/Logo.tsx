import { styled } from "@stitches/react";

const Image = styled("img", {
  height: "auto",
});

export function Logo(props: React.ComponentProps<typeof Image>) {
  return <Image src="/logo.svg" alt="logo" {...props} />;
}

export function Favicon(props: React.ComponentProps<typeof Image>) {
  return <Image src="/favicon.svg" alt="logo" {...props} />;
}
