import { useProject } from "../../project.js";

export function stackNameToId(stack: string) {
  const project = useProject();
  const prefix = `${project.config.stage}-${project.config.name}-`;
  return stack.startsWith(prefix) ? stack.substring(prefix.length) : stack;
}
