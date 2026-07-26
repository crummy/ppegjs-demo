export type OutputMode = "tree" | "trace" | "json";

export type UrlState = {
  selectedExample: string | null;
  scratchEnabled: boolean;
  outputMode: OutputMode;
};

export type WritableUrlState = {
  selectedExample: string;
  scratchEnabled: boolean;
  outputMode: OutputMode;
};

const parseOutputMode = (mode: string | null): OutputMode => {
  if (mode === "trace" || mode === "json") {
    return mode;
  }
  return "tree";
};

export const parseUrlState = (hash: string): UrlState => {
  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );

  return {
    selectedExample: params.get("example"),
    scratchEnabled: params.get("scratch") === "true",
    outputMode: parseOutputMode(params.get("mode")),
  };
};

export const formatUrlHash = (state: WritableUrlState): string => {
  const params = new URLSearchParams();
  params.set("example", state.selectedExample);
  if (state.scratchEnabled) {
    params.set("scratch", "true");
  }
  if (state.outputMode !== "tree") {
    params.set("mode", state.outputMode);
  }

  return `#${params.toString()}`;
};

export const readUrlState = (location: Pick<Location, "hash">): UrlState =>
  parseUrlState(location.hash);

export const writeUrlState = (
  location: Pick<Location, "pathname" | "search">,
  history: Pick<History, "replaceState">,
  state: WritableUrlState,
) => {
  const nextUrl = location.pathname + location.search + formatUrlHash(state);
  history.replaceState(null, "", nextUrl);
};
