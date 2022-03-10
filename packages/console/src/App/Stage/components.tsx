import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { Anchor, DropdownMenu } from "~/components";
import { styled } from "~/stitches.config";

export const H1 = styled("div", {
  fontSize: "$xxl",
  fontWeight: 600,
});

export const H2 = styled("div", {
  fontSize: "$xl",
  fontWeight: 600,
});

export const H3 = styled("div", {
  fontSize: "$lg",
  fontWeight: 600,
});

export const Header = styled("div", {
  height: 70,
  padding: "0 $lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid $border",
  flexShrink: 0,
});

export const HeaderTitle = styled("div", {
  fontWeight: 500,
  fontFamily: "$sans",
  fontSize: "$lg",
  userSelect: "none",
});

const HeaderSwitcherValue = styled("div", {
  padding: "0 $md",
  cursor: "pointer",
  height: 32,
  fontSize: "$sm",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  border: "1px solid $border",
  borderRadius: 6,
  userSelect: "none",
  "&:hover": {
    borderColor: "$gray7",
  },
});

const HeaderSwitcherFilter = styled("div", {
  padding: "0 $md",
  height: 36,
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid $border",
  "& input": {
    outline: 0,
    border: 0,
    fontFamily: "$sans",
    fontSize: "$sm",
  },
});

export const HeaderGroup = styled("div", {
  display: "flex",
  alignItems: "center",
  "& > *": {
    marginLeft: "$md",
  },
  "& > *:first-child": {
    marginLeft: 0,
  },
});

export function HeaderPortal(props: React.PropsWithChildren<{}>) {
  const toolbar = document.querySelector("#outlet");
  if (!toolbar) return null;
  return ReactDOM.createPortal(props.children, toolbar);
}

type HeaderSwitcherProps = {
  value: string;
};

export const HeaderSwitcherLabel = styled(DropdownMenu.Label, {});

export const HeaderSwitcherGroup = styled(DropdownMenu.Group, {});

const HeaderSwitcherItemRoot = styled("div", {
  color: "$hiContrast",
});

export function HeaderSwitcherItem(
  props: React.PropsWithChildren<{ to: string }>
) {
  return (
    <Link to={props.to}>
      <DropdownMenu.Item>
        <HeaderSwitcherItemRoot>{props.children}</HeaderSwitcherItemRoot>
      </DropdownMenu.Item>
    </Link>
  );
}

export function HeaderSwitcher(
  props: React.PropsWithChildren<HeaderSwitcherProps>
) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <HeaderSwitcherValue>{props.value}</HeaderSwitcherValue>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom" align="start">
        {/*
        <HeaderSwitcherFilter>
          <input autoFocus placeholder="Filter..." />
        </HeaderSwitcherFilter>
        */}
        {props.children}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
