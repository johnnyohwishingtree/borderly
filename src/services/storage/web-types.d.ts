/**
 * Minimal Web API type declarations for browser storage implementations.
 *
 * We can't use `/// <reference lib="dom" />` because it conflicts with
 * React Native's type declarations (e.g., Window redeclaration in
 * monitoring types). Instead, we declare only the APIs we actually use.
 */

// IndexedDB
declare interface IDBDatabase {
  objectStoreNames: DOMStringList;
  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore;
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
  close(): void;
}

declare interface IDBObjectStoreParameters {
  keyPath?: string | string[];
  autoIncrement?: boolean;
}

declare type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange';

declare interface IDBTransaction {
  objectStore(name: string): IDBObjectStore;
}

declare interface IDBObjectStore {
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
  get(key: IDBValidKey): IDBRequest;
  getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
  getAllKeys(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
  put(value: unknown, key?: IDBValidKey): IDBRequest;
  delete(key: IDBValidKey | IDBKeyRange): IDBRequest;
  clear(): IDBRequest;
  index(name: string): IDBIndex;
}

declare interface IDBIndexParameters {
  unique?: boolean;
  multiEntry?: boolean;
}

declare interface IDBIndex {
  getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest;
}

declare interface IDBRequest<T = unknown> {
  result: T;
  error: DOMException | null;
  onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
  onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null;
}

declare interface IDBOpenDBRequest extends IDBRequest<IDBDatabase> {
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null;
}

declare interface IDBVersionChangeEvent extends Event {
  oldVersion: number;
  newVersion: number | null;
}

declare type IDBValidKey = number | string | Date | BufferSource | IDBValidKey[];

declare interface IDBKeyRange {
  readonly lower: unknown;
  readonly upper: unknown;
}

declare interface DOMStringList {
  contains(string: string): boolean;
  item(index: number): string | null;
  readonly length: number;
}

// Web Crypto
declare interface SubtleCrypto {
  importKey(
    format: string,
    keyData: BufferSource,
    algorithm: AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: string[],
  ): Promise<CryptoKey>;
  encrypt(
    algorithm: AlgorithmIdentifier,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
  decrypt(
    algorithm: AlgorithmIdentifier,
    key: CryptoKey,
    data: BufferSource,
  ): Promise<ArrayBuffer>;
}

declare interface CryptoKey {
  readonly algorithm: KeyAlgorithm;
  readonly extractable: boolean;
  readonly type: string;
  readonly usages: string[];
}

declare interface KeyAlgorithm {
  name: string;
}

declare type AlgorithmIdentifier = string | { name: string; iv?: BufferSource; length?: number };
declare type BufferSource = ArrayBufferView | ArrayBuffer;
