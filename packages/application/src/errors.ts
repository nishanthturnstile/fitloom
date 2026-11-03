type Category = "validation" | "access" | "conflict" | "temporary";
export class CommandError extends Error {
  readonly category: Category;
  constructor(category: Category, message: string) {
    super(message);
    this.name = "CommandError";
    this.category = category;
  }
}
export function sqlState(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return sqlState(error.cause);
}
