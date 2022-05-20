export function truncate(obj, options) {
  let newString = JSON.stringify(truncateField(obj, options));

  // As a sanity check, ensure JSON.stringify produced a string. If not, set response
  // to "null". This should never happen.
  if (typeof newString !== "string") {
    return "null";
  }

  // If string is still longer than the limit, just truncate the original string.
  // This is because we don't want to show double truncated output
  // ie. "[1,2,\"... 1 more ite..."
  if (newString.length > options.totalLength * 1.1) {
    const oriString = JSON.stringify(obj);
    newString =
      oriString.substring(0, options.totalLength) +
      `... ${oriString.length - options.totalLength} more characters`;
  }

  return newString;
}

export function truncateField(field, options) {
  // Truncate strings
  if (typeof field === "string") {
    const length = field.length;
    if (length > options.stringLength * 1.1) {
      return (
        field.substring(0, options.stringLength) +
        `... ${length - options.stringLength} more characters`
      );
    }
  }
  // Truncate arrays
  else if (Array.isArray(field)) {
    const length = field.length;
    let newResponse;
    if (length > options.arrayLength * 1.1) {
      newResponse = field
        .slice(0, options.arrayLength)
        .map((per) => truncateField(per, options));
      newResponse.push(`... ${length - options.arrayLength} more items`);
    } else {
      newResponse = field.map((per) => truncateField(per, options));
    }
    return newResponse;
  }
  // Truncate objects
  else if (typeof field === "object" && field !== null) {
    const newResponse = {};
    Object.keys(field).forEach((key) => {
      newResponse[key] = truncateField(field[key], options);
    });
    return newResponse;
  }
  return field;
}
