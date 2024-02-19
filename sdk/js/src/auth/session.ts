import { importSPKI, jwtVerify } from "jose";
import { Resource } from "../resource.js";

export type SessionBuilder = ReturnType<typeof createSessionBuilder>;

export function createSessionBuilder<
  SessionTypes extends Record<string, any> = {},
>() {
  type SessionValue =
    | {
        [type in keyof SessionTypes]: {
          type: type;
          properties: SessionTypes[type];
        };
      }[keyof SessionTypes]
    | {
        type: "public";
        properties: {};
      };

  return {
    async verify(token: string): Promise<SessionValue> {
      const auth = Object.values(Resource).find(
        (value) => value.auth === true && value.publicKey,
      );
      if (!auth) {
        throw new Error("No auth resource found");
      }
      const publicKey = auth.publicKey;
      const result = await jwtVerify(
        token,
        await importSPKI(publicKey, "RS512"),
      );
      return result.payload as any;
    },
    $type: {} as SessionTypes,
    $typeValues: {} as SessionValue,
  };
}
