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
// You can specify types: create<TParams, TResult>
const getUser = api.create<number, unknown>((id) => ({
  path: `/users/${id}`,
}));

// Call api route!
getUser(1).then(console.log);

//-----------------

// If your BE is not ready yet you can make a fetcher with mocked data
const getUserMocked = api.create((id: number) => ({
  path: `/users/${id}`,
  // Tree shaking will remove this code in production
  mock: {
    handler: import.meta.env.PROD ? undefined : async (id) => ({ name: `User: ${id}: John Doe` }),
  },
}));

// Call api route!
getUserMocked(1, {
  mock: {
    enabled: true,
  },
  // You may override the mock handler provided in api creation
  // mockHandler: async () => ({ name: "This handler will be used" }),
}).then(console.log);

//-----------------

// You can override default response handler
const getUserCustomResponseHandler = api.create((id: number) => ({
  path: `/users/${id}`,
  responseHandler: async (response) => response.text(),
}));

// Call api route!
getUserCustomResponseHandler(1, {
  // You may also override responseHandler during api call
  //customResponseHandler: (response) => String(response.blob()),
}).then(console.log);

//-----------------

// You may add some listeners to handle specific status codes
api.on(404, () => console.log("404 error!"));
api.on(200, (data) => {
  console.log("wow, 200!", data);
});

//-----------------
// There's support for XHR requests!
const getUserXHR = api.createXHR((id: number) => ({
  path: `/users/${id}`,
  responseHandler: async (data) => data,
}));

getUserXHR(1)
  .sendRequest()
  .then((data) => console.log("from xhr:", data));
```

See more examples in the [test file](https://github.com/elite174/api-maker/blob/master/src/lib/index.test.ts).

## Types

```ts
export declare class APIMaker {
  private config;
  private static DEFAULTS;
  constructor(config: APIMakerConfig);
  private getFullPath;
  private getMockHandler;
  /** If enabled, mock responses will be used instead of real API calls where possible */
  MOCK_MODE_ENABLED: boolean;
  setSharedRequestOptions(requestInit: RequestInit | ((currentOptions: RequestInit) => RequestInit)): void;
  private statusHandlers;
  on(status: number, handler: StatusEventHandler): void;
  off(status: number, handler?: StatusEventHandler): void;
  create<TParams, TResult = any>(requestCreator: FetchRequestCreator<TParams, TResult>): Fetcher<TParams, TResult>;
  createXHR<TParams, TResult>(requestCreator: XHRFetchRequestCreator<TParams, TResult>): XHRFetcher<TParams, TResult>;
}

export declare type APIMakerConfig = {
  base?: string;
  sharedRequestOptions?: RequestInit | (() => RequestInit);
  defaultResponseHandler?: ResponseHandler<any>;
};

export declare function deepMerge<T = any>(...objects: (Record<string, any> | undefined)[]): T;

export declare type Fetcher<TParams, TResult> = (
  params: TParams,
  options?: {
    customRequestInit?: RequestInit;
    customResponseHandler?: ResponseHandler<TResult>;
    mock?: MockObject<TParams, TResult>;
  }
) => Promise<TResult>;

export declare type FetchRequestCreator<TParams, TResult> = (params: TParams) => {
  path: string;
  requestInit?: RequestInit;
  mock?: MockObject<TParams, TResult>;
  responseHandler?: ResponseHandler<TResult>;
};

export declare const getSharedRequestOptions: (
  sharedRequestOptions: NonNullable<APIMakerConfig["sharedRequestOptions"]>
) => RequestInit;

export declare const makeLogMessage: (message: string) => string;

export declare type MockHandler<TParams, TResult> = (params: TParams) => TResult | Promise<TResult>;

export declare type MockObject<TParams, TResult> = {
  enabled?: boolean;
  handler?: MockHandler<TParams, TResult>;
};

export declare type ResponseHandler<TResult> = (
  response: Response,
  requestURL: string,
  requestParams: RequestInit
) => TResult | Promise<TResult>;

export declare type StatusEventHandler = (
  params: (
    | {
        requestType: "fetch";
        response: Response;
      }
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

export declare type XHRFetcher<TParams, TResult> = (
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

export declare type XHRFetchRequestCreator<TParams, TResult> = (params: TParams) => ReturnType<
  FetchRequestCreator<TParams, TResult>
> & {
  responseHandler: ResponseHandler<TResult>;
};

export {};
```

## Lisence

MIT
