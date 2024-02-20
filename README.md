# @elite174/api-maker

[![version](https://img.shields.io/npm/v/@elite174/api-maker?style=for-the-badge)](https://www.npmjs.com/package/@elite174/api-maker)
![npm](https://img.shields.io/npm/dw/@elite174/api-maker?style=for-the-badge)

Highly customizable small lib with 0 dependencies allows you to build API functions with mocks.

Features:

- Provide mock handlers if your backend is not ready yet
- Override mock handlers, request parameters and response handlers in 3 layers (api service creation, api function creation, api call)
- Typed parameters
- XHR support

## Installation

```
pnpm i @elite174/api-maker
```

In browser

```html
<script type="module">
  // specify correct version here
  import { APIMaker } from "https://cdn.jsdelivr.net/npm/@elite174/api-maker@latest/dist/index.js";

  const api = new APIMaker({
    base: "https://jsonplaceholder.typicode.com",
  });

  const getData = api.create(() => ({
    path: "/todos",
  }));

  getData().then(console.log);
</script>
```

## Examples

```ts
import { APIMaker } from "@elite174/api-maker";

// Create API controller instance
const api = new APIMaker({
  base: "https://jsonplaceholder.typicode.com",
  // You may specify custom response handler
  // by default for fetch requests it's response.json().
  // Later you may override it during api creation or api call.
  defaultResponseHandler: (response) => response.json(),
  // You may also pass extra options to fetch
  // sharedRequestOptions: { credentials: "include" },
});

// Create api route
// Specify result type (unknown) and params type (number)
const getUser = api.create<unknown, number>((id) => ({
  path: `/users/${id}`,
}));

// Call api route!
getUser(1).then(console.log);

//-----------------

// If your BE is not ready yet you can make a fetcher with mocked data
const getUserMocked = api.create<{ name: string }, number>((id) => ({
  path: `/users/${id}`,
  // Tree shaking will remove this code in production
  mockHandler: import.meta.env.PROD ? undefined : async (id) => ({ name: `User: ${id}: John Doe` }),
}));

// Call api route!
getUserMocked(1, {
  useMockedData: true,
  // You may override the mock handler provided in api creation
  // mockHandler: async () => ({ name: "This handler will be used" }),
}).then(console.log);

//-----------------

// You can override default response handler
const getUserCustomResponseHandler = api.create<unknown, number>((id) => ({
  path: `/users/${id}`,
  responseHandler: async (response) => response.text(),
}));

// Call api route!
getUserCustomResponseHandler(1, {
  // You may also override responseHandler during api call
  // responseHandler: (response) => response.blob(),
}).then(console.log);

//-----------------

// You may add some listeners to handle specific status codes
api.on(404, () => console.log("404 error!"));

//-----------------
// There's support for XHR requests!
const getUserXHR = api.createXHR<any, number>((id) => ({
  path: `/users/${id}`,
}));

getUserXHR(1).sendRequest().then(console.log);
```

See more examples in the [test file](https://github.com/elite174/api-maker/blob/master/src/lib/index.test.ts).

## Types

```ts
export declare type APIControllerConfig = {
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
export declare class APIMaker {
  private logger?;
  private statusHandlers;
  private config;
  private getFullPath;
  constructor(config?: APIControllerConfig, logger?: Logger | undefined);
  /** When enabled mock handlers are used where possible */
  mockModeEnabled: boolean;
  /**
   * Sets the shared request options for all the requests.
   * If an object is passed, it will override the options defined in the constructor.
   * You may pass a function that receives the current shared request options and returns the new options.
   */
  setSharedRequestOptions(
    requestOptions: RequestInit | ((currentSharedRequestOptions: RequestInit) => RequestInit)
  ): void;
  on(statusCode: number, statusHandler: StatusHandler): void;
  off(statusCode: number, statusHandler: StatusHandler): void;
  createXHR<TResult, TParams = void>(requestCreator: XHRRequestCreator<TParams, TResult>): XHRFetcher<TParams, TResult>;
  create<TResult, TParams = void>(requestCreator: FetchRequestCreator<TParams, TResult>): Fetcher<TParams, TResult>;
}

export declare function deepMerge<T = any>(...objects: (Record<string, any> | undefined)[]): T;

export declare const DEFAULT_API_MAKER_CONFIG: {
  base: string;
  sharedRequestOptions: {
    method: string;
  };
  defaultResponseHandler: (response: Response) => Promise<any>;
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
export declare type Fetcher<TParams, TResult> = (
  apiParams: TParams,
  options?: {
    customRequestOptions?: RequestInit;
    useMockedData?: boolean;
    mockHandler?: MockHandler<TParams, TResult>;
    responseHandler?: ResponseHandler<TResult>;
  }
) => Promise<TResult>;

/**
 * Represents a function that creates a fetch request.
 * @template TParams The type of the request parameters.
 * @template TResult The type of the request result.
 * @param params The request parameters.
 * @returns An object containing the request path, optional request options, mock handler, and response handler.
 */
export declare type FetchRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestOptions?: RequestInit;
  mockHandler?: MockHandler<TParams, TResult>;
  responseHandler?: ResponseHandler<TResult>;
};

declare interface Logger {
  info(message: string): void;
}

export declare const makeLogMessage: (message: string) => string;

export declare type MockHandler<TParams, TResult> = (requestParams: TParams) => Promise<TResult>;

export declare type ResponseHandler<TResult = any> = (response: Response) => Promise<TResult>;

export declare type StatusHandler = (response: Response) => void;

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
export declare type XHRFetcher<TParams, TResult> = (
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
 * Represents a function that creates an XHR request.
 * @template TParams The type of the request parameters.
 * @template TResult The type of the request result.
 * @param params The request parameters.
 * @returns An object containing the request path, optional request options, and a mock handler.
 */
export declare type XHRRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestOptions?: RequestInit;
  mockHandler?: MockHandler<TParams, TResult>;
};
```

## Lisence

MIT
