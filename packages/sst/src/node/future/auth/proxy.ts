import { createProxy } from "../../util/index.js";

export interface AuthResources {}

export const Auth = /* @__PURE__ */ createProxy<AuthResources>("Auth");