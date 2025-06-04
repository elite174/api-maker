# 1.2.0

- You can pass a function to `sharedRequestOptions`:

```ts
const api = new APIMaker({
  base: "https://jsonplaceholder.typicode.com",
  sharedRequestOptions: () => ({
    credentials: "include",
  }),
});
```

# 1.1.3

- Passed `url` to response handler:

```ts
type ResponseHandler<TResult = any> = (response: Response, url: string, requestParams: RequestInit) => Promise<TResult>;
```

# 1.1.2

- Improved log messages
- Passed extra params to status handler:

```ts
type StatusHandler = (response: Response, url: string, requestParams: RequestInit) => void;
```

# 1.1.1

- Passed requestParams as the second argument for `responseHandler` function.

```ts
const getUserCustomResponseHandler = api.create<unknown, number>((id) => ({
  path: `/users/${id}`,
  // Now you can access requestParams here!
  responseHandler: async (response, requestParams) => response.text(),
}));
```

# 1.1.0

- Supported setter function as a parameter for `setSharedOptions` method.

Now you may pass a function which will return new request options for all the requests.

```ts
test("if pass a function it will override options defined in constructor", async () => {
  const api = new APIMaker({
    base: "https://jsonplaceholder.typicode.com",
    sharedRequestOptions: {
      credentials: "include",
    },
  });

  api.setSharedRequestOptions((currentSharedRequestOptions) => ({
    ...currentSharedRequestOptions,
    headers: { "Content-Type": "application/json" },
  }));

  const getUser = api.create<unknown, number>((id) => ({
    path: `/users/${id}`,
  }));

  const user = await getUser(1);

  expect(user).toEqual({ name: "John Doe" });
  expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
});
```
