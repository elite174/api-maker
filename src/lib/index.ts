export type ResponseHandler<TResult = any> = (
  response: Response,
  url: string,
  requestParams: RequestInit
) => Promise<TResult>;
export type StatusHandler = (response: Response, url: string, requestParams: RequestInit) => void;
export type MockHandler<TParams, TResult> = (requestParams: TParams) => Promise<TResult>;

interface Logger {
  info(message: string): void;
}

export type APIControllerConfig = {
  /** Base URL */
  base?: string;
  /**
   * Shared request options which are used for all the requests
   * @default { method: 'GET' }
   */
  sharedRequestOptions?: RequestInit;
  /**
   * Response handler which is used for all fetch requests
   * @default response => response.json()
   */
  defaultResponseHandler?: ResponseHandler;
};

/**
 * Represents a function that creates an XHR request.
 * @template TParams The type of the request parameters.
 * @template TResult The type of the request result.
 * @param params The request parameters.
 * @returns An object containing the request path, optional request options, and a mock handler.
 */
export type XHRRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestOptions?: RequestInit;
  mockHandler?: MockHandler<TParams, TResult>;
};

/**
 * Represents a function that creates a fetch request.
 * @template TParams The type of the request parameters.
 * @template TResult The type of the request result.
 * @param params The request parameters.
 * @returns An object containing the request path, optional request options, mock handler, and response handler.
 */
export type FetchRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestOptions?: RequestInit;
  mockHandler?: MockHandler<TParams, TResult>;
  responseHandler?: ResponseHandler<TResult>;
};

/**
 * Represents a function that fetches data using XMLHttpRequest.
 * @template TParams - The type of the API parameters.
 * @template TResult - The type of the API result.
 * @param apiParams - The API parameters.
 * @param options - The options for the fetcher.
 * @param options.customRequestOptions - Custom request options for the XMLHttpRequest.
 * @param options.useMockedData - Indicates whether to use mocked data.
 * @param options.mockHandler - The mock handler for generating mocked data.
 * @returns An object containing the XMLHttpRequest and a function to send the request and get the result.
 */
export type XHRFetcher<TParams, TResult> = (
  apiParams: TParams,
  options?: {
    customRequestOptions?: RequestInit;
    useMockedData?: boolean;
    mockHandler?: MockHandler<TParams, TResult>;
  }
) => {
  xhr: XMLHttpRequest;
  sendRequest: () => Promise<TResult>;
};

/**
 * Represents a function that fetches data from an API.
 * @template TParams The type of the API parameters.
 * @template TResult The type of the API response.
 * @param apiParams The parameters to be passed to the API.
 * @param options Additional options for the fetcher.
 * @param options.customRequestOptions Custom request options to be passed to the fetch function.
 * @param options.useMockedData Specifies whether to use mocked data instead of making a real API request.
 * @param options.mockHandler A function that handles the mocked API request and returns the mocked response.
 * @param options.responseHandler A function that handles the API response and returns the processed result.
 * @returns A promise that resolves to the API response.
 */
export type Fetcher<TParams, TResult> = (
  apiParams: TParams,
  options?: {
    customRequestOptions?: RequestInit;
    useMockedData?: boolean;
    mockHandler?: MockHandler<TParams, TResult>;
    responseHandler?: ResponseHandler<TResult>;
  }
) => Promise<TResult>;

export const DEFAULT_API_MAKER_CONFIG = {
  base: "",
  sharedRequestOptions: { method: "GET" },
  defaultResponseHandler: (response) => response.json(),
} satisfies APIControllerConfig;

export function deepMerge<T = any>(...objects: (Record<string, any> | undefined)[]) {
  const out: any = {};

  for (const object of objects) {
    for (let key in object) {
      const value = object[key];

      out[key] = key in out && typeof value == "object" ? deepMerge(out[key], value) : value;
    }
  }

  return out as T;
}

export const makeLogMessage = (message: string) => `[API_MAKER]: ${message}`;

/**
 * We have 3 layers:
 * 1. API service creation
 * 2. API route creation
 * 3. API call
 *
 * Things you can override at each layer:
 * 1. RequestInit params
 * 2. Mock handler (only on 2 and 3 layer)
 * 3. Response handler
 */

/**
 * The APIMaker class is responsible for creating and managing API requests.
 */
export class APIMaker {
  private statusHandlers: Record<number, Set<StatusHandler>> = {};

  private config: Required<APIControllerConfig>;

  private getFullPath(path: string) {
    return this.config.base + path;
  }

  private log(method: string, path: string, message: string) {
    this.logger?.info(makeLogMessage(`(${method} ${path}) ${message}`));
  }

  constructor(config?: APIControllerConfig, private logger?: Logger) {
    this.config = { ...DEFAULT_API_MAKER_CONFIG, ...config };
  }

  /** When enabled mock handlers are used where possible */
  mockModeEnabled = false;

  /**
   * Sets the shared request options for all the requests.
   * If an object is passed, it will override the options defined in the constructor.
   * You may pass a function that receives the current shared request options and returns the new options.
   */
  setSharedRequestOptions(requestOptions: RequestInit | ((currentSharedRequestOptions: RequestInit) => RequestInit)) {
    if (typeof requestOptions === "function")
      this.config.sharedRequestOptions = requestOptions(this.config.sharedRequestOptions);
    else this.config.sharedRequestOptions = requestOptions;
  }

  on(statusCode: number, statusHandler: StatusHandler) {
    if (this.statusHandlers[statusCode]) this.statusHandlers[statusCode].add(statusHandler);
    else this.statusHandlers[statusCode] = new Set([statusHandler]);
  }

  off(statusCode: number, statusHandler: StatusHandler) {
    this.statusHandlers[statusCode]?.delete(statusHandler);

    // delete empty set
    if (this.statusHandlers[statusCode]?.size === 0) delete this.statusHandlers[statusCode];
  }

  createXHR<TResult, TParams = void>(
    requestCreator: XHRRequestCreator<TParams, TResult>
  ): XHRFetcher<TParams, TResult> {
    return (apiParams, { customRequestOptions, useMockedData = false, mockHandler: apiCallMockHandler } = {}) => {
      const { path, requestOptions, mockHandler: apiCreationMockHandler } = requestCreator(apiParams);

      const resolvedRequestParams = deepMerge(
        {},
        this.config.sharedRequestOptions,
        requestOptions,
        customRequestOptions
      );

      const xhr = new XMLHttpRequest();
      xhr.open(resolvedRequestParams.method, this.getFullPath(path));

      // Set extra stuff for XHR
      const { headers } = resolvedRequestParams;
      if (headers instanceof Object)
        Object.entries(headers).forEach(([header, value]) => {
          if (typeof value === "string") xhr.setRequestHeader(header, value);
        });
      if (resolvedRequestParams?.credentials === "include") xhr.withCredentials = true;

      if (this.mockModeEnabled || useMockedData) {
        const handler = apiCallMockHandler ?? apiCreationMockHandler;

        if (!handler)
          this.log(
            resolvedRequestParams.method,
            this.getFullPath(path),
            "No mocked handler provided, using default xhr"
          );
        else {
          this.log(resolvedRequestParams.method, this.getFullPath(path), `Making a mock request`);

          return {
            xhr,
            sendRequest: () => handler(apiParams),
          };
        }
      }

      return {
        xhr,
        sendRequest: () =>
          new Promise<TResult>((resolve, reject) => {
            const body = resolvedRequestParams.body;

            if (body instanceof ReadableStream) {
              reject(makeLogMessage("Cannot send readable stream via XMLHTTPRequest"));
              return;
            }

            xhr.addEventListener("abort", reject);
            xhr.addEventListener("error", reject);
            xhr.addEventListener(
              "loadend",
              async () => {
                this.statusHandlers[xhr.status]?.forEach((handler) =>
                  handler(xhr.response, this.getFullPath(path), resolvedRequestParams)
                );

                return resolve(xhr.response);
              },
              { once: true }
            );

            xhr.send(body);
          }),
      };
    };
  }

  create<TResult, TParams = void>(requestCreator: FetchRequestCreator<TParams, TResult>): Fetcher<TParams, TResult> {
    return async (
      apiParams,
      {
        customRequestOptions,
        useMockedData = false,
        mockHandler: apiCallMockHandler,
        responseHandler: apiCallResponseHandler,
      } = {}
    ) => {
      const {
        path,
        requestOptions,
        responseHandler: apiCreationResponseHandler,
        mockHandler: apiCreationMockHandler,
      } = requestCreator(apiParams);

      const resolvedRequestParams: RequestInit = deepMerge(
        {},
        this.config.sharedRequestOptions,
        requestOptions,
        customRequestOptions
      );

      if (this.mockModeEnabled || useMockedData) {
        const handler = apiCallMockHandler ?? apiCreationMockHandler;

        if (!handler)
          this.log(
            resolvedRequestParams.method ?? "GET",
            this.getFullPath(path),
            "No mocked handler provided, using default fetch"
          );
        else {
          this.log(resolvedRequestParams.method ?? "GET", this.getFullPath(path), `Making a mock request`);

          return handler(apiParams);
        }
      }

      const responseHandler =
        apiCallResponseHandler ?? apiCreationResponseHandler ?? this.config.defaultResponseHandler;

      return fetch(this.getFullPath(path), resolvedRequestParams).then((response) => {
        this.statusHandlers[response.status]?.forEach((handler) =>
          handler(response, this.getFullPath(path), resolvedRequestParams)
        );

        return responseHandler(response, this.getFullPath(path), resolvedRequestParams);
      });
    };
  }
}
