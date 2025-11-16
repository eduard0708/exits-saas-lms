declare module 'capacitor-secure-storage-plugin' {
  interface SecureStorageSetOptions {
    key: string;
    value: string;
  }

  interface SecureStorageGetOptions {
    key: string;
  }

  interface SecureStorageRemoveOptions {
    key: string;
  }

  interface SecureStorageGetResult {
    value?: string;
  }

  export const SecureStoragePlugin: {
    set(options: SecureStorageSetOptions): Promise<void>;
    get(options: SecureStorageGetOptions): Promise<SecureStorageGetResult>;
    remove(options: SecureStorageRemoveOptions): Promise<void>;
    clear(): Promise<void>;
  };
}
