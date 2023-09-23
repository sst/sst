import ora, { Options, Ora } from "ora";
import { Colors } from "./colors.js";
import { lazy } from "../util/lazy.js";

export const useSpinners = lazy(() => {
  const spinners: Ora[] = [];
  return spinners;
});

export function createSpinner(options: Options | string) {
  const spinners = useSpinners();
  const next = ora(options);
  spinners.push(next);
  Colors.mode("line");
  return next;
}
