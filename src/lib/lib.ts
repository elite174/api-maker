import { deepMerge, makeLogMessage } from "./utils";

export type MockHandler<TParams, TResult> = (params: TParams) => TResult | Promise<TResult>;
export type MockObject<TParams, TResult> = {
  enabled?: boolean;
  handler?: MockHandler<TParams, TResult>;
};
export type ResponseHandler<TResult> = (
  response: Response,
  requestURL: string,
  requestParams: RequestInit
) => TResult | Promise<TResult>;
export type APIMakerConfig = {
  base?: string;
  sharedRequestOptions?: RequestInit | (() => RequestInit);
  defaultResponseHandler?: ResponseHandler<any>;
};
export type FetchRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestInit?: RequestInit;
  mock?: MockObject<TParams, TResult>;
  responseHandler?: ResponseHandler<TResult>;
};
export type XHRFetchRequestCreator<TParams, TResult> = (
  params: TParams
) => ReturnType<FetchRequestCreator<TParams, TResult>> & { responseHandler: ResponseHandler<TResult> };
export type StatusEventHandler = (
  params: (
    | { requestType: "fetch"; response: Response }
    | {
        requestType: "xhr";
        /** Parsed response from XMLHttpRequest */
        response: any;
      }
  ) & {
    status: number;
    requestURL: string;
    requestParams: RequestInit;
  }
) => void;

export type Fetcher<TParams, TResult> = (
  params: TParams,
  options?: {
    customRequestInit?: RequestInit;
    customResponseHandler?: ResponseHandler<TResult>;
    mock?: MockObject<TParams, TResult>;
  }
) => Promise<TResult>;
export type XHRFetcher<TParams, TResult> = (
  params: TParams,
  options?: {
    customRequestInit?: RequestInit;
    customResponseHandler: ResponseHandler<TResult>;
    mock?: MockObject<TParams, TResult>;
  }
) => {
  xhr: XMLHttpRequest;
  sendRequest: () => Promise<TResult>;
};

export const getSharedRequestOptions = (
  sharedRequestOptions: NonNullable<APIMakerConfig["sharedRequestOptions"]>
): RequestInit => (typeof sharedRequestOptions === "function" ? sharedRequestOptions() : sharedRequestOptions);

export class APIMaker {
  private static DEFAULTS = Object.freeze({
    requestInit: {
      method: "GET",
    } satisfies RequestInit,
    responseHandler: (response: Response) => response.json(),
  });

  constructor(private config: APIMakerConfig) {}

  private getFullPath(path: string) {
    return new URL(path, this.config.base).toString();
  }

  private getMockHandler<TParams, TResult>(
    requestMock: MockObject<TParams, TResult> | undefined,
    requestCreatorMock: MockObject<TParams, TResult> | undefined
  ): MockHandler<TParams, TResult> | undefined {
    if (this.MOCK_MODE_ENABLED || requestMock?.enabled || requestCreatorMock?.enabled) {
      const mockHandler = requestMock?.handler ?? requestCreatorMock?.handler;
      // don't throw error because if mock mode enabled, we try to return mock if possible
      if (this.MOCK_MODE_ENABLED) return mockHandler;
      if (!mockHandler) throw new Error(makeLogMessage("Mock handler is not provided"));

      return mockHandler;
    }
  }

  /** If enabled, mock responses will be used instead of real API calls where possible */
  MOCK_MODE_ENABLED = false;

  setSharedRequestOptions(requestInit: RequestInit | ((currentOptions: RequestInit) => RequestInit)) {
    this.config.sharedRequestOptions =
      typeof requestInit === "function"
        ? requestInit(getSharedRequestOptions(this.config.sharedRequestOptions ?? {}))
        : requestInit;
  }

  private statusHandlers: Record<number, Set<StatusEventHandler>> = {};
  on(status: number, handler: StatusEventHandler) {
    if (!this.statusHandlers[status]) this.statusHandlers[status] = new Set();
    this.statusHandlers[status].add(handler);
  }
  off(status: number, handler?: StatusEventHandler) {
    if (handler) this.statusHandlers[status]?.delete(handler);
    else delete this.statusHandlers[status];
  }

  create<TParams, TResult = any>(requestCreator: FetchRequestCreator<TParams, TResult>): Fetcher<TParams, TResult> {
    return async (params, options) => {
      const {
        path,
        requestInit,
        mock: requestCreatorMock,
        responseHandler: requestCreatorResponseHandler = this.config.defaultResponseHandler ??
          APIMaker.DEFAULTS.responseHandler,
      } = requestCreator(params);
      const responseHandler = options?.customResponseHandler ?? requestCreatorResponseHandler;
      const requestURL = this.getFullPath(path);
      const resolvedRequestParams: RequestInit = deepMerge(
        {},
        getSharedRequestOptions(this.config.sharedRequestOptions ?? APIMaker.DEFAULTS.requestInit),
        requestInit,
        options?.customRequestInit
      );

      const mockHandler = this.getMockHandler(options?.mock, requestCreatorMock);
      if (mockHandler) return await mockHandler(params);

      return fetch(requestURL, resolvedRequestParams).then((response) => {
        this.statusHandlers[response.status]?.forEach((handler) =>
          handler({
            requestType: "fetch",
            status: response.status,
            response,
            requestURL,
            requestParams: resolvedRequestParams,
          })
        );

        return responseHandler(response, this.getFullPath(path), resolvedRequestParams);
      });
    };
  }

  createXHR<TParams, TResult>(requestCreator: XHRFetchRequestCreator<TParams, TResult>): XHRFetcher<TParams, TResult> {
    return (params, options) => {
      const {
        path,
        requestInit,
        mock: requestCreatorMock,
        responseHandler: requestCreatorResponseHandler,
      } = requestCreator(params);
      const resolvedRequestParams: RequestInit = deepMerge(
        {},
        getSharedRequestOptions(this.config.sharedRequestOptions ?? APIMaker.DEFAULTS.requestInit),
        requestInit,
        options?.customRequestInit
      );
      const responseHandler = options?.customResponseHandler ?? requestCreatorResponseHandler;

      const xhr = new XMLHttpRequest();

      return {
        xhr,
        sendRequest: async () => {
          const mockHandler = this.getMockHandler(options?.mock, requestCreatorMock);
          if (mockHandler) return await mockHandler(params);

          return new Promise<TResult>((resolve, reject) => {
            xhr.open(resolvedRequestParams.method ?? APIMaker.DEFAULTS.requestInit.method, this.getFullPath(path));

            // Set extra stuff for XHR
            const { headers, credentials, body } = resolvedRequestParams;
            if (headers instanceof Object)
              Object.entries(headers).forEach(([header, value]) => {
                if (typeof value === "string") xhr.setRequestHeader(header, value);
              });
            if (credentials === "include") xhr.withCredentials = true;

            if (body instanceof ReadableStream) {
              reject(makeLogMessage("Cannot send readable stream via XMLHTTPRequest"));
              return;
            }

            const requestURL = this.getFullPath(path);

            xhr.addEventListener("abort", reject);
            xhr.addEventListener("error", reject);
            xhr.addEventListener(
              "loadend",
              async () => {
                this.statusHandlers[xhr.status]?.forEach((handler) =>
                  handler({
                    requestType: "xhr",
                    status: xhr.status,
                    response: xhr.response,
                    requestURL: requestURL,
                    requestParams: resolvedRequestParams,
                  })
                );

                return resolve(responseHandler(xhr.response, requestURL, resolvedRequestParams));
              },
              { once: true }
            );

            xhr.send(body);
          });
        },
      };
    };
  }
}
