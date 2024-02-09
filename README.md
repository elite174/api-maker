# simple-api

Highly customizable small lib with 0 dependencies allows you to build API functions with mocks.

## Installation

```
pnpm i api-maker
```

## Examples

```ts
import { APIMaker } from "api-maker";

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

# Lisence

MIT
