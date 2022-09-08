import { execSync } from 'child_process';
import { expect, test } from 'vitest';

test('extracts schema', async () => {
  const res = execSync('node ./pothos.mjs', {
    cwd: __dirname,
    encoding: 'utf8',
  });
  expect(res).toMatchSnapshot();
});
