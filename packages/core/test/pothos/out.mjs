const DUMMY_RESOLVER = { serialize: x => x, parseValue: x => x }; 
class DUMMY_CLASS {}; 
var MyEnum = (MyEnum2 => {
    MyEnum2[MyEnum2['FOO'] = 0] = 'FOO';
    MyEnum2[MyEnum2['BAR'] = 1] = 'BAR';
    return MyEnum2;
})(MyEnum || {});
import SchemaBuilder from '@pothos/core';
var builder = new SchemaBuilder({});
builder.scalarType('AddScalarType', DUMMY_RESOLVER);
builder.scalarType('ScalarType', DUMMY_RESOLVER);
builder.objectType(class AlphaClass {
}, {
    name: 'AlphaClass',
    fields: t => ({ test: t.exposeID('id') })
});
builder.objectType(class BetaClass {
}, {
    name: 'BetaClass',
    fields: t => ({ test: t.exposeID('id') })
});
builder.enumType(MyEnum, { name: 'MyEnum' });
builder.queryType({});
builder.mutationType({});
var schema = builder.toSchema({});
export {
    schema
};