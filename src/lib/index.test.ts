import { describe, test, expect, beforeEach, vi } from "vitest";
import { APIMaker, deepMerge } from ".";

describe("SimpleAPI", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => ({ name: "John Doe" }),
      text: () => "User",
      status: 200,
    });
  });

  test("it works", async () => {
    const api = new APIMaker(
      {
        base: "https://jsonplaceholder.typicode.com",
      },
      console
    );

    const getUser = api.create<unknown, number>((id) => ({
      path: `/users/${id}`,
    }));

    const user = await getUser(1);

    expect(user).toEqual({ name: "John Doe" });
  });

  test("it works with logger", async () => {
    const logger = {
      info: vi.fn(),
    };

    const api = new APIMaker(
      {
        base: "https://jsonplaceholder.typicode.com",
      },
      logger
    );

    const getUser = api.create<unknown, number>((id) => ({
      path: `/users/${id}`,
    }));

    const user = await getUser(1, { useMockedData: true, mockHandler: async () => ({ name: "John Doe" }) });

    expect(user).toEqual({ name: "John Doe" });
    expect(logger.info).toHaveBeenCalledWith(
      "[API_MAKER]: (GET https://jsonplaceholder.typicode.com/users/1) Making a mock request"
    );
  });

  describe("setSharedRequestOptions method", () => {
    test("if pass an object it will override options defined in constructor", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        sharedRequestOptions: {
          credentials: "include",
        },
      });

      api.setSharedRequestOptions({ headers: { "Content-Type": "application/json" } });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1);

      expect(user).toEqual({ name: "John Doe" });
      expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
        headers: { "Content-Type": "application/json" },
      });
    });

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

    test("if pass a function it will override options defined in constructor (deepMerge)", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        sharedRequestOptions: {
          credentials: "include",
        },
      });

      api.setSharedRequestOptions((currentSharedRequestOptions) =>
        deepMerge(currentSharedRequestOptions, { headers: { "Content-Type": "application/json" } })
      );

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
  });

  describe("mocked data", () => {
    test("it works with mocked data provided in api creation", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        mockHandler: async (id) => ({
          name: `User: ${id}: John Doe`,
        }),
      }));

      const user = await getUser(1, { useMockedData: true });

      expect(user).toEqual({ name: "User: 1: John Doe" });
    });

    test("it works with mocked data provided in api call", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        mockHandler: async (id) => ({
          name: `User: ${id}: John Doe`,
        }),
      }));

      const user = await getUser(1, { useMockedData: true, mockHandler: async () => ({ mock: true }) });

      expect(user).toEqual({ mock: true });
    });

    test("it works with mocked data if apimaker instance is in mock mode", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      api.mockModeEnabled = true;

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        mockHandler: async () => ({ name: `User: ${id}: John Doe` }),
      }));

      const user = await getUser(1);

      expect(user).toEqual({ name: "User: 1: John Doe" });
    });

    test("it works with mocked data if apimaker instance is in mock mode and mock handler provided in api call", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      api.mockModeEnabled = true;

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        mockHandler: async () => ({ name: `User: ${id}: John Doe` }),
      }));

      const user = await getUser(1, { mockHandler: async () => ({ mock: true }) });

      expect(user).toEqual({ mock: true });
    });
  });

  describe("custom response handler", () => {
    test("it works with custom response handler provided in constructor", async () => {
      const responseArgsChecker = vi.fn();
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        defaultResponseHandler: (response, ...rest) => {
          responseArgsChecker(...rest);
          return response.text();
        },
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1);

      expect(user).toEqual("User");
      expect(responseArgsChecker).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
        method: "GET",
      });
    });

    test("it works with custom response handler provided in api creation", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        defaultResponseHandler: (response) => response.json(),
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        responseHandler: (response) => response.text(),
      }));

      const user = await getUser(1);

      expect(user).toEqual("User");
    });

    test("it works with custom response handler provided in request", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        defaultResponseHandler: (response) => response.json(),
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1, {
        responseHandler: (response) => response.text(),
      });

      expect(user).toEqual("User");
    });
  });

  describe("custom request options", () => {
    test("it works with custom request options provided in constructor", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        sharedRequestOptions: { method: "PATCH" },
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1);

      expect(user).toEqual({ name: "John Doe" });
      expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
        method: "PATCH",
      });
    });

    test("it works with custom request options provided in api creation", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        sharedRequestOptions: { method: "PATCH" },
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        requestOptions: { method: "PUT" },
      }));

      const user = await getUser(1);

      expect(user).toEqual({ name: "John Doe" });
      expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
        method: "PUT",
      });
    });

    test("it works with custom request options provided in request", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1, {
        customRequestOptions: { method: "POST" },
      });

      expect(user).toEqual({ name: "John Doe" });
      expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
        method: "POST",
      });
    });
  });

  describe("status code handlers", () => {
    test("it works with status code handlers", async () => {
      const fn = vi.fn();

      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      api.on(200, fn);

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
        responseHandler: async (response) => {
          console.log(response.text());

          return response;
        },
      }));

      await getUser(1);

      expect(fn.mock.lastCall[1]).toBe("https://jsonplaceholder.typicode.com/users/1");
      expect(fn.mock.lastCall[2]).toEqual({ method: "GET" });
    });
  });
});
