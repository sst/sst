type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {};
};

export async function main(
  event: AppSyncEvent
): Promise<Record<string, unknown>[] | string | null | undefined> {
  console.log(event);
}
