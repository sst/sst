export class VisibleError extends Error {
  constructor(...message: string[]) {
    super(message.join("\n"));
  }
}

export class SilentError extends Error {
  constructor(...message: string[]) {
    super(message.join("\n"));
  }
}
