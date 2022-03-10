import type { Router } from "../../../core/src/local/router";
import { createReactQueryHooks } from "@trpc/react";

export const trpc = createReactQueryHooks<Router>();
