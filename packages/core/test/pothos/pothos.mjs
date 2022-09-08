import { Pothos } from '../../dist/pothos/index.js';

const schema = await Pothos.extractSchema({
  schema: './schema.ts',
});

console.log(schema);
