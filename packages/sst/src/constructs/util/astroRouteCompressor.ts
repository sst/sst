import type { BuildMetaConfig } from "astro-sst/build-meta";

type TreeNode = {
  branches: Record<string, TreeNode>;
  nodes: BuildMetaConfig["routes"][number][];
};

type FlattenedRoute =
  | [string]
  | [string, 1, string | undefined, number | undefined];
type FlattenedRouteTree = Array<FlattenedRoute | [string, FlattenedRouteTree]>;

function buildRouteTree(routes: BuildMetaConfig["routes"], level = 0) {
  const routeTree = routes.reduce<TreeNode>(
    (tree, route) => {
      const routePatternWithoutCaptureGroups = route.pattern
        .replace(/\((?:\?:)?(.*?[^\\])\)/g, (_, content) => content.trim())
        .replace(/\/\^/g, "")
        .replace(/\$\//g, "");
      const routeParts = routePatternWithoutCaptureGroups
        .split(/(?=\\\/)/g)
        .filter((part) => part !== "/^" && part !== "/$/");

      tree.branches[routeParts[level]] = tree.branches[routeParts[level]] || {
        branches: {},
        nodes: [],
      };
      tree.branches[routeParts[level]].nodes.push(route);
      return tree;
    },
    { branches: {}, nodes: [] }
  );

  for (const [key, branch] of Object.entries(routeTree.branches)) {
    if (
      !branch.nodes.some(
        (node) =>
          (node.type === "page" && node.prerender) || node.type === "redirect"
      )
    ) {
      delete routeTree.branches[key];
    } else if (branch.nodes.length > 1) {
      routeTree.branches[key] = buildRouteTree(branch.nodes, level + 1);
      branch.nodes = [];
    }
  }

  return routeTree;
}

export function flattenRouteTree(tree: TreeNode, parentKey = "") {
  const flatTree: FlattenedRouteTree = [];
  for (const [key, branch] of Object.entries(tree.branches)) {
    if (branch.nodes.length === 1) {
      const node = branch.nodes[0];
      if (node.type === "page") {
        flatTree.push([node.pattern]);
      } else if (node.type === "redirect") {
        flatTree.push([
          node.pattern,
          1,
          node.redirectPath,
          node.redirectStatus,
        ]);
      }
    } else {
      const flatKey = parentKey + key;
      flatTree.push([flatKey, flattenRouteTree(branch, flatKey)]);
    }
  }
  return flatTree;
}

function stringifyFlattenedRouteTree(tree: FlattenedRouteTree): string {
  return `[${tree
    .map((tuple) => {
      if (Array.isArray(tuple[1])) {
        return `[/^${tuple[0]}/,${stringifyFlattenedRouteTree(tuple[1])}]`;
      }
      if (typeof tuple[1] === "undefined") {
        return `[${tuple[0]}]`;
      }
      return `[${tuple[0]},1,"${tuple[2]}"${tuple[3] ? `,${tuple[3]}` : ""}]`;
    })
    .join(",")}]`;
}

export function getStringifiedRouteTree(routes: BuildMetaConfig["routes"]) {
  const tree = buildRouteTree(routes);
  const flatTree = flattenRouteTree(tree);
  return stringifyFlattenedRouteTree(flatTree);
}
