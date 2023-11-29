const bootstrapBuckets: Record<string, Promise<string>> = {};

export const AWS = {
  bootstrap: {
    forRegion(region: string) {
      if (bootstrapBuckets[region]) {
        return bootstrapBuckets[region]!;
      }

      const bucket = new Promise<string>((resolve, reject) => {
        // do some stuff
      });

      return (bootstrapBuckets[region] = bucket);
    },
  },
};
