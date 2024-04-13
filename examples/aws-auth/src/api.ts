import { session } from "./session";

export const handler = async (event, context) => {
  const token = event.headers.authorization;
  const result = await session.verify(token);
};
