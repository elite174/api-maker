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
