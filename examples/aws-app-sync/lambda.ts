type AppSyncEvent = {
  info: {
    fieldName: string;
  };
};

export async function main(event: AppSyncEvent) {
  console.log(event);
  return { status: "ok" };
}
