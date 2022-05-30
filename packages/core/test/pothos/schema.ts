import SchemaBuilder from "@pothos/core";

const builder = new SchemaBuilder({} as any);

builder.addScalarType("AddScalarType" as any, {} as any, {});
builder.scalarType("ScalarType" as any, {
  serialize: x => x,
  parseValue: () => 5
});

class AlphaClass {
  public readonly id: string;
}

class BetaClass {
  public readonly id: string;
}

builder.objectType(AlphaClass, {
  name: "AlphaClass",
  fields: t => ({
    test: t.exposeID("id")
  })
});

builder.objectType(BetaClass, {
  name: "BetaClass",
  fields: t => ({
    test: t.exposeID("id")
  })
});

enum MyEnum {
  FOO,
  BAR
}

builder.enumType(MyEnum, {
  name: "MyEnum"
});

builder.queryType({});
builder.mutationType({});

export const schema = builder.toSchema({});
