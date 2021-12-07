export type EventHandler<T> = (arg: T) => void;

export class EventDelegate<T> {
  private handlers: EventHandler<T>[] = [];

  public add(handler: EventHandler<T>) {
    this.handlers.push(handler);
    return handler;
  }

  public remove(handler: EventHandler<T>) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  public trigger(input: T) {
    for (const h of this.handlers) {
      h(input);
    }
  }
}
