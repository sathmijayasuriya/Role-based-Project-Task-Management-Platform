import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

type ContextStore = {
  userId?: string;
  userEmail?: string;
  roles?: string[];
  [key: string]: unknown;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<ContextStore>();

  run<T>(callback: () => T, seed: ContextStore = {}): T {
    return this.storage.run({ ...seed }, callback);
  }

  set(key: string, value: unknown) {
    const store = this.storage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  get<T = any>(key: string): T | undefined {
    return this.storage.getStore()?.[key] as T | undefined;
  }

  getUserId(): string | undefined {
    return this.get<string>('userId');
  }

  getStore(): ContextStore | undefined {
    return this.storage.getStore();
  }
}
