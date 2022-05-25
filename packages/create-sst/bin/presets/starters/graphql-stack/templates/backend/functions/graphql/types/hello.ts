import { builder } from "../builder";

const HelloType = builder.objectRef<string>("Hello").implement({
  fields: (t) => ({
    message: t.string({
      resolve: (parent) => parent,
    }),
  }),
});

builder.queryField("hello", (t) =>
  t.field({
    type: HelloType,
    resolve: () => "Hello world",
  })
);
