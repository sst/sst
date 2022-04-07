import { PropsWithChildren } from "react";
import { VariantProps } from "@stitches/react";
import { styled } from "~/stitches.config";
import { Row } from "./Row";
import { BiErrorCircle, BiCheckCircle } from "react-icons/bi";
import { Spacer } from "./Spacer";
import { atom, useAtom } from "jotai";

const Root = styled("div", {
  position: "fixed",
  bottom: 0,
  right: 0,
  fontSize: "$sm",
  padding: "$lg",
  display: "flex",
  flexDirection: "column",
  alignItems: "end",
  gap: "$md",
});

export const Card = styled("div", {
  borderRadius: 6,
  height: 50,
  padding: "0 $md",
  display: "flex",
  alignItems: "center",
  variants: {
    color: {
      danger: {
        background: "$red5",
        border: "1px solid $red10",
        color: "$red10",
      },
      success: {
        border: "2px solid $green10",
        background: "$green5",
        color: "$green10",
      },
      neutral: {
        background: "$border",
        color: "$hiContrast",
      },
    },
  },
});

export const Content = styled("div", {
  display: "flex",
  alignItems: "center",
});

type CardVariants = VariantProps<typeof Card>;

export function Simple(
  props: PropsWithChildren<{
    type: CardVariants["color"];
  }>
) {
  return (
    <Card color={props.type}>
      <Row alignVertical="center">
        {props.type === "danger" && <BiErrorCircle size={20} />}
        {props.type === "success" && <BiCheckCircle size={20} />}
        {props.type !== "neutral" && <Spacer horizontal="sm" />}
        <Content>{props.children}</Content>
      </Row>
    </Card>
  );
}

type CreateOpts = {
  type: CardVariants["color"];
  text: string;
};

const ToastsAtom = atom([] as CreateOpts[]);

export function use() {
  const [, setToasts] = useAtom(ToastsAtom);

  return {
    create(opts: CreateOpts) {
      setToasts((x) => [...x, opts]);
      setTimeout(() => setToasts((x) => x.filter((i) => i !== opts)), 3000);
    },
  };
}

export function Provider(props: PropsWithChildren<any>) {
  const [toasts] = useAtom(ToastsAtom);
  return (
    <Root>
      {toasts.map((opts, index) => (
        <Simple key={index} type={opts.type}>
          {opts.text}
        </Simple>
      ))}
      {props.children}
    </Root>
  );
}
