type AppSyncEvent = {
  info: {
    fieldName: string;
  };
};

export async function main(
  event: AppSyncEvent
): Promise<Record<string, unknown>[] | string | null | undefined> {
  console.log(event);
}
