import { JWTPayload } from "jose";

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
    create<T extends SessionValue["type"]>(
      type: T,
      properties: SessionTypes[T],
      options?: JWTPayload,
    ) {},
    verify(token: string): SessionValue {
      return {} as any;
    },
    $type: {} as SessionTypes,
    $typeValues: {} as SessionValue,
  };
}
