// Browser safe entry point: types and key rules only, no node APIs.

export type { ObjectStorage, PutOptions, StoredObject, StoredObjectInfo } from "./types.ts";
export { StorageKeyError, StorageNotConfiguredError, assertValidStorageKey, assertValidStoragePrefix } from "./types.ts";
