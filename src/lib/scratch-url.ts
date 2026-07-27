export type ScratchPayload = {
  grammarText: string;
  inputText: string;
};

type EncodedScratchPayload = {
  v: 1;
  g: string;
  i: string;
};

const COMPRESSION_FORMAT = "gzip";

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

const base64UrlToBytes = (encoded: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) return null;

  const padded = encoded
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
};

const readStream = async (stream: ReadableStream<Uint8Array>) =>
  new Uint8Array(await new Response(stream).arrayBuffer());

const compress = async (text: string): Promise<Uint8Array> => {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream(COMPRESSION_FORMAT));
  return readStream(stream);
};

const decompress = async (bytes: Uint8Array): Promise<string | null> => {
  try {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const stream = new Blob([buffer])
      .stream()
      .pipeThrough(new DecompressionStream(COMPRESSION_FORMAT));
    return await new Response(stream).text();
  } catch {
    return null;
  }
};

const isEncodedScratchPayload = (
  value: unknown,
): value is EncodedScratchPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    typeof payload.g === "string" &&
    typeof payload.i === "string"
  );
};

export const encodeScratchPayload = async ({
  grammarText,
  inputText,
}: ScratchPayload): Promise<string> =>
  bytesToBase64Url(
    await compress(JSON.stringify({ v: 1, g: grammarText, i: inputText })),
  );

export const decodeScratchPayload = async (
  encoded: string | null,
): Promise<ScratchPayload | null> => {
  if (!encoded) return null;

  const bytes = base64UrlToBytes(encoded);
  if (!bytes) return null;

  const text = await decompress(bytes);
  if (!text) return null;

  try {
    const payload: unknown = JSON.parse(text);
    if (!isEncodedScratchPayload(payload)) return null;
    return {
      grammarText: payload.g,
      inputText: payload.i,
    };
  } catch {
    return null;
  }
};
