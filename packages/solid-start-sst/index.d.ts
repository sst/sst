import { Adapter } from "solid-start/vite";
type AdapterConfig = {
  edge?: boolean;
};

export default function (props?: AdapterConfig): string | Adapter | undefined;
