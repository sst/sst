import { expect, matchTemplate, MatchStyle } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import %name.PascalCased%Stack from "../lib/%name.PascalCased%Stack";

test('Empty Stack', () => {
  const app = new sst.App();
  // WHEN
  const stack = new %name.PascalCased%Stack(app, 'MyTestStack');
  // THEN
  expect(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});
