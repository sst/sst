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
import { IconType } from "react-icons";

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
  fontFamily: "$sans",

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

interface SidePanelItemProps {
  to: string;
  label: string;
  icon: IconType;
}

export function Panel() {
  const [expand, setExpand] = useAtom(expandedAtom);
  const params = useParams<{
    stage: string;
    app: string;
  }>();
  const dm = useDarkMode();
  const live = useRealtimeState((s) => s.live);

  const SidePanelItem = (props: SidePanelItemProps) => (
    <Tooltip.Root>
      <Tooltip.Trigger disabled={expand}>
        <MenuItem to={props.to}>
          {props.icon({})}
          <MenuLabel>{props.label}</MenuLabel>
        </MenuItem>
      </Tooltip.Trigger>
      <Tooltip.Content side="right">{props.label}</Tooltip.Content>
    </Tooltip.Root>
  );

  return (
    <Root expand={expand}>
      <LogoContainer to={`/`} expand={expand}>
        {!expand && <Favicon />}
        {expand && <Logo />}
      </LogoContainer>
      <Menu space="0">
        {live && (
          <SidePanelItem to="local" label="Local" icon={BsTerminalFill} />
        )}
        <SidePanelItem to="stacks" label="Stacks" icon={BsStack} />
        <SidePanelItem
          to="functions"
          label="Functions"
          icon={BsFillLightningChargeFill}
        />
        <SidePanelItem to="api" label="API" icon={BsGlobe2} />
        <SidePanelItem to="dynamodb" label="DynamoDB" icon={FaTable} />
        <SidePanelItem to="rds" label="RDS" icon={FaDatabase} />
        <SidePanelItem to="buckets" label="Buckets" icon={BsFillArchiveFill} />
        <SidePanelItem to="graphql" label="GraphQL" icon={GrGraphQl} />
        <SidePanelItem to="cognito" label="Cognito" icon={BsPeopleFill} />
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
