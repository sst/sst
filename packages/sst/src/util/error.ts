export abstract class SSTError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
