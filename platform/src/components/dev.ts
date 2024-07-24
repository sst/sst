import { Input } from "./input";

export interface DevArgs {
  dev?: {
    url?: Input<string>;
    command?: Input<string>;
    autostart?: Input<boolean>;
    directory?: Input<string>;
  };
}
