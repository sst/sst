const objectUtil = require("../../lib/object");

test("object", async () => {
  const options = {
    totalLength: 50,
    arrayLength: 2,
    stringLength: 10,
  };

  // Test null value
  expect(objectUtil.truncate({ key: null }, options)).toEqual('{"key":null}');

  // Test truncate total string
  expect(objectUtil.truncate({ key: "abc" }, options)).toEqual('{"key":"abc"}');

  expect(
    objectUtil.truncate(
      {
        key: "abcdefg",
        key2: "abcdefg",
        key3: "abcdefg",
        key4: "abcdefg",
        key5: "abcdefg",
      },
      options
    )
  ).toEqual(
    '{"key":"abcdefg","key2":"abcdefg","key3":"abcdefg"... 35 more characters'
  );

  // Test truncate array
  expect(objectUtil.truncate([1, 2], options)).toEqual("[1,2]");

  expect(objectUtil.truncate([1, 2, 3], options)).toEqual(
    '[1,2,"... 1 more items"]'
  );

  // Test truncate string
  expect(objectUtil.truncate({ key: "abc" }, options)).toEqual('{"key":"abc"}');

  expect(objectUtil.truncate({ key: "abcdefghijklmn" }, options)).toEqual(
    '{"key":"abcdefghij... 4 more characters"}'
  );

  // Test truncate string and total string
  expect(
    objectUtil.truncate(
      {
        key: "abcdefghijklmnop",
        key2: "abcdefghijklmnop",
        key3: "abcdefghijklmnop",
        key4: "abcdefghijklmnop",
        key5: "abcdefghijklmnop",
      },
      options
    )
  ).toEqual(
    '{"key":"abcdefghijklmnop","key2":"abcdefghijklmnop... 80 more characters'
  );
});
