// TODO: get region from regexp in isLambdaFunctionUrl
export const getRegionFromLambdaUrl = (url: string): string => {
  const region = url.split(".").at(2);
  if (!region)
    throw new Error("Region couldn't be extracted from Lambda Function URL");
  return region;
};
