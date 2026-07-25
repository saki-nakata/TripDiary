import { AsyncLocalStorage } from "node:async_hooks";

export type RequestLogContext = {
  requestId: string;
  method?: string;
  path?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestContext<T>(context: RequestLogContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestLogContext | undefined {
  return requestContextStorage.getStore();
}
