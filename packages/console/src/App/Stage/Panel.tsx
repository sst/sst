import {
  BsArrow90DegRight,
  BsFillLightningChargeFill,
  BsPeopleFill,
  BsStack,
} from "react-icons/bs";
import { Stack } from "~/components/Stack";
import { styled } from "~/stitches.config";
import { NavLink } from "react-router-dom";

const Root = styled("div", {
  background: "$loContrast",
  flexShrink: 0,
  width: "81px",
  borderRight: "1px solid $border",
});

const Menu = styled(Stack, {});

const MenuItem = styled(NavLink, {
  height: "80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderLeft: "2px solid transparent",
  color: "$hiContrast",

  "&.active": {
    borderColor: "$highlight",
    color: "$highlight",
  },

  "& svg": {
    display: "block",
    width: "18px",
    height: "18px",
  },
});

const MenuLabel = styled("div", {
  fontSize: "$sm",
  fontWeight: 600,
  marginTop: "$sm",
});

export function Panel() {
  return (
    <Root>
      <Menu space="0">
        <MenuItem to="stacks">
          <BsStack />
          <MenuLabel>Stacks</MenuLabel>
        </MenuItem>
        <MenuItem to="functions">
          <BsFillLightningChargeFill />
          <MenuLabel>Lambda</MenuLabel>
        </MenuItem>
        <MenuItem to="cognito">
          <BsPeopleFill />
          <MenuLabel>Cognito</MenuLabel>
        </MenuItem>
      </Menu>
    </Root>
  );
}
