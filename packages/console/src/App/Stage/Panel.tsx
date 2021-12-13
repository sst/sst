import {
  BsArrow90DegRight,
  BsFillLightningChargeFill,
  BsPeopleFill,
} from "react-icons/bs";
import { NavLink, useParams } from "react-router-dom";
import { Logo } from "~/components";
import { Stack } from "~/components/Stack";
import { useDarkMode } from "~/data/theme";
import { styled } from "~/stitches.config";
import { usePanel } from "./hooks";

const PanelLogo = styled(Logo, {
  width: "200px",
  padding: "0 $lg",
  transition: "$fast",
});

const MenuLink = styled(NavLink, {
  display: "flex",
  alignItems: "center",
  padding: "$md 0",
  fontSize: "$md",
  borderRadius: "14px",
  color: "white",
  fontWeight: 600,
  overflow: "hidden",

  "& svg": {
    marginRight: "$md",
    marginLeft: "$md",
    flexShrink: 0,
    width: "18px",
    height: "18px",
  },

  "& span": {
    transition: "$fast",
  },

  "&.active": {
    background: "$highlight",
  },
});

const Stage = styled("div", {
  padding: "$md $lg",
  fontSize: "$md",
  borderRadius: "14px",
  background: "$gray",
  transition: "$fast",
});

const StageName = styled("div", {
  fontWeight: 600,
});
const StageApp = styled("div", {
  color: "$grayLight",
  fontSize: "$sm",
  fontWeight: 500,
});

const Root = styled("div", {
  background: "$grayDark",
  flexShrink: 0,
  color: "white",
  padding: "$lg $md",
  borderRight: "1px solid $border",
  transition: "$default",
  width: "280px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  variants: {
    open: {
      true: {},
      false: {
        width: "84px",
        [`& ${PanelLogo}`]: {
          opacity: 0,
        },
        [`& ${Stage}`]: {
          opacity: 0,
        },
        [`& ${MenuLink}`]: {
          "& span": {
            opacity: 0,
          },
        },
      },
    },
  },
});

const Menu = styled("nav", {
  defaultVariants: {
    space: "sm",
  },
});

export function Panel() {
  const params = useParams<{
    stage: string;
    app: string;
  }>();

  const panel = usePanel();
  const [, setDarkMode] = useDarkMode();

  return (
    <Root open={panel.open}>
      <Stack space="xxl">
        <PanelLogo onClick={() => setDarkMode((x) => !x)} />
        <Menu>
          <MenuLink to="functions">
            <BsFillLightningChargeFill />
            <span>Functions</span>
          </MenuLink>
          <MenuLink to="cognito">
            <BsPeopleFill />
            <span>Cognito</span>
          </MenuLink>
          <MenuLink to="api">
            <BsArrow90DegRight />
            <span>API</span>
          </MenuLink>
        </Menu>
      </Stack>
      <Stage onClick={() => panel.toggle()}>
        <Stack space="xs">
          <StageName>{params.stage}</StageName>
          <StageApp>{params.app}</StageApp>
        </Stack>
      </Stage>
    </Root>
  );
}
