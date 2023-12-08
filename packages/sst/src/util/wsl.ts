import process from "process";
import { release, networkInterfaces, NetworkInterfaceInfo } from "os";

export const isWSL = () => {
  return (
    process.platform == "linux" &&
    release().toLowerCase().includes("microsoft")
  );
};

export const getInternalHost = () => {
  return ([] as Array<NetworkInterfaceInfo | undefined>)
    .concat(...Object.values(networkInterfaces()))
    .find((x) => !x?.internal && x?.family === "IPv4")?.address;
};
