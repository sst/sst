import chalk from "chalk";

let last: "line" | "gap" = "gap";

export const Colors = {
  line: (message?: any, ...optionalParams: any[]) => {
    last = "line";
    console.log(message, ...optionalParams);
  },
  mode(input: typeof last) {
    last = input;
  },
  gap() {
    if (last === "line") {
      last = "gap";
      console.log();
    }
  },
  hex: chalk.hex,
  primary: chalk.hex("#E27152"),
  link: chalk.cyan,
  success: chalk.green,
  danger: chalk.red,
  warning: chalk.yellow,
  dim: chalk.dim,
  bold: chalk.bold,
  all: chalk,
  prefix: chalk.bold("| "),
};
