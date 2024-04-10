import { createSessionBuilder } from "sst/auth";

export const session = createSessionBuilder<{
  user: {
    email?: string;
  };
}>();
