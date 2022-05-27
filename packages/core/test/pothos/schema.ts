import SchemaBuilder from "@pothos/core";

const builder = new SchemaBuilder({} as any);

builder.addScalarType("AddScalarType" as any, {} as any, {});
builder.scalarType("ScalarType" as any, {
  serialize: (x) => x,
  parseValue: () => 5,
});

class MyClass {
  public readonly id: string;
}

builder.objectType(MyClass, {
  name: "MyClass",
  fields: (t) => ({
    test: t.exposeID("id"),
  }),
});

enum MyEnum {
  FOO,
  BAR,
}

builder.enumType(MyEnum, {
  name: "MyEnum",
});

builder.queryType({});
builder.mutationType({});

export const schema = builder.toSchema({});
