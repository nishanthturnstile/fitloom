export class BodyReadError extends Error {
  readonly status: 400 | 408 | 413;
  constructor(status: 400 | 408 | 413) {
    super(
      status === 413
        ? "Request too large"
        : status === 408
          ? "Request timed out"
          : "Invalid request body",
    );
    this.status = status;
  }
}

/** Bound bytes and total read time, including a client that never sends the next chunk. */
export async function readBoundedBody(
  request: Request,
  options: { maxBytes: number; timeoutMs: number },
): Promise<Buffer> {
  if (Number(request.headers.get("content-length") ?? 0) > options.maxBytes)
    throw new BodyReadError(413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  let rejectAbort: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    rejectAbort(new BodyReadError(408));
    void reader.cancel().catch(() => {});
  };
  const timer = setTimeout(abort, options.timeoutMs);
  request.signal.addEventListener("abort", abort, { once: true });
  try {
    if (request.signal.aborted) throw new BodyReadError(408);
    for (;;) {
      const chunk = await Promise.race([reader.read(), aborted]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > options.maxBytes) throw new BodyReadError(413);
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error instanceof BodyReadError ? error : new BodyReadError(400);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
