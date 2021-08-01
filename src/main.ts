const STORAGE_VERSION = 11;

interface Storage {
  version: number;
  blocks: Record<number, number>;
}

function newStorage(): Storage {
  return { version: STORAGE_VERSION, blocks: {} };
}
