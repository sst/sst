export const getRegionFromCustomDomainName = (domainName: string): string | undefined => {
  const functionUrlRegExp = /^[a-z0-9]+\.lambda-url\.([a-z0-9-]+)\.on\.aws$/;

  const m = domainName.match(functionUrlRegExp);

  if (m !== null) {
    return m[1];
  }
};
