import {
  BsTerminalFill,
  BsFillLightningChargeFill,
  BsPeopleFill,
  BsStack,
  BsFillArchiveFill,
  BsSun,
  BsMoon,
  BsGlobe2,
} from "react-icons/bs";
import { FaTable, FaDatabase } from "react-icons/fa";
import { GrGraphQl } from "react-icons/gr";
import { Favicon, Logo, Stack, Tooltip } from "~/components";
import { styled } from "~/stitches.config";
import { Link, NavLink, useParams } from "react-router-dom";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { useDarkMode, useRealtimeState } from "~/data/global";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

const Menu = styled(Stack, {
  flexGrow: 1,
});

const MenuItem = styled(NavLink, {
  paddingLeft: "$md",
  display: "flex",
  height: 50,
  alignItems: "center",
  // borderLeft: "2px solid transparent",
  color: "$hiContrast",

  "&.active": {
    borderColor: "$highlight",
    color: "$highlight",
  },

  "& svg": {
    display: "block",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
});

const MenuLabel = styled("div", {
  fontSize: "$sm",
  fontWeight: 600,
  marginLeft: "$md",
  fontFamily: "$sans",
});

const LogoContainer = styled(Link, {
  height: 50,
  padding: "0 $md",
  display: "flex",
  alignItems: "center",
  "& img": {
    width: 20,
  },
  variants: {
    expand: {
      true: {
        justifyContent: "start",
        "& img": {
          width: 50,
        },
      },
    },
  },
});

const DarkMode = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  color: "$highlight",
  cursor: "pointer",
  "& svg": {
    width: 20,
    height: 20,
  },
});

const Footer = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "end",
  padding: "$md",
  background: "$accent",
  position: "relative",
});

const FooterStage = styled("div", {
  fontWeight: 600,
  padding: "0 $md",
  position: "absolute",
  display: "flex",
  alignItems: "center",
  left: 0,
  height: "100%",
  width: 200,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  opacity: 0,
  fontSize: "$sm",
  pointerEvents: "none",
  transition: "200ms opacity",
});

const FooterArrow = styled(ArrowRightIcon, {
  display: "block",
  width: "20px",
  height: "20px",
  flexShrink: 0,
  cursor: "pointer",
  transition: "200ms transform",
});

const Root = styled("div", {
  background: "$loContrast",
  flexShrink: 0,
  borderRight: "1px solid $border",
  overflow: "hidden",
  width: 53,
  display: "flex",
  flexDirection: "column",
  transition: "200ms width",
  variants: {
    expand: {
      true: {
        width: 200,

        [`& ${FooterStage}`]: {
          opacity: 1,
          pointerEvents: "all",
        },
        [`& ${FooterArrow}`]: {
          transform: "rotate(-180deg)",
        },
      },
    },
  },
});

const expandedAtom = atomWithStorage("panelExpanded", true);

export function Panel() {
  const [expand, setExpand] = useAtom(expandedAtom);
  const params = useParams<{
    stage: string;
    app: string;
  }>();
  const dm = useDarkMode();
  const live = useRealtimeState((s) => s.live);
  const links = [
    {
      to: "stacks",
      label: "Stacks",
      icon: BsStack,
    },
    {
      to: "functions",
      label: "Functions",
      icon: BsFillLightningChargeFill,
    },
    {
      to: "dynamodb",
      label: "DynamoDB",
      icon: FaTable,
    },
    {
      to: "rds",
      label: "RDS",
      icon: FaDatabase,
    },
    {
      to: "buckets",
      label: "Buckets",
      icon: BsFillArchiveFill,
    },
    {
      to: "graphql",
      label: "GraphQL",
      icon: GrGraphQl,
    },
    {
      to: "cognito",
      label: "Cognito",
      icon: BsPeopleFill,
    },
  ];
  return (
    <Root expand={expand}>
      <LogoContainer to={`/`} expand={expand}>
        {!expand && <Favicon />}
        {expand && <Logo />}
      </LogoContainer>
      <Menu space="0">
        {live && (
          <Tooltip.Root>
            <Tooltip.Trigger disabled={expand}>
              <MenuItem to="local">
                <BsTerminalFill />
                <MenuLabel>Local</MenuLabel>
              </MenuItem>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">Local</Tooltip.Content>
          </Tooltip.Root>
        )}
        {links.map((link) => (
          <Tooltip.Root delayDuration={400} key={link.to}>
            <Tooltip.Trigger disabled={expand}>
              <MenuItem to={link.to}>
                {link.icon({})}
                <MenuLabel>{link.label}</MenuLabel>
              </MenuItem>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">{link.label}</Tooltip.Content>
          </Tooltip.Root>
        ))}
      </Menu>
      {!expand && (
        <DarkMode onClick={dm.toggle}>
          {!dm.enabled ? <BsMoon /> : <BsSun />}
        </DarkMode>
      )}
      <Footer>
        <FooterStage>{params.stage}</FooterStage>
        <FooterArrow onClick={() => setExpand(!expand)} />
      </Footer>
    </Root>
  );
}
