import { describe, test, expect, beforeEach, vi } from "vitest";
import { APIMaker as APIMaker } from "./lib";
import { deepMerge } from "./utils";

describe("APIMaker", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => ({ name: "John Doe" }),
      text: () => "User",
      status: 200,
    });
  });

  test("it works", async () => {
    const api = new APIMaker({
      base: "https://jsonplaceholder.typicode.com",
    });

    const getUser = api.create<unknown, number>((id) => ({
      path: `/users/${id}`,
    }));

    const user = await getUser(1);

    expect(user).toEqual({ name: "John Doe" });
  });

  test("sharedRequestOptions can be a function", async () => {
    const api = new APIMaker({
      base: "https://jsonplaceholder.typicode.com",
      sharedRequestOptions: () => ({ headers: { "Content-Type": "application/json" } }),
    });

    const getUser = api.create<unknown, number>((id) => ({
      path: `/users/${id}`,
    }));

    const user = await getUser(1);

    expect(user).toEqual({ name: "John Doe" });
    expect(globalThis.fetch).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/users/1", {
      headers: { "Content-Type": "application/json" },
    });
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

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
        mock: {
          handler: async (id) => ({
            name: `User: ${id}: John Doe`,
          }),
        },
      }));

      const user = await getUser(1, { mock: { enabled: true } });

      expect(user).toEqual({ name: "User: 1: John Doe" });
    });

    test("it works with mocked data provided in api call", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
        mock: {
          handler: async (id) => ({
            name: `User: ${id}: John Doe`,
          }),
        },
      }));

      const user = await getUser(1, {
        mock: {
          enabled: true,
          handler: async () => ({ name: "MOCK" }),
        },
      });

      expect(user).toEqual({ name: "MOCK" });
    });

    test("it works with mocked data if apimaker instance is in mock mode", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      api.MOCK_MODE_ENABLED = true;

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
        mock: {
          handler: async () => ({ name: `User: ${id}: John Doe` }),
        },
      }));

      const user = await getUser(1);

      expect(user).toEqual({ name: "User: 1: John Doe" });
    });

    test("it works with mocked data if apimaker instance is in mock mode and mock handler provided in api call", async () => {
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
      });

      api.MOCK_MODE_ENABLED = true;

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
        mock: {
          handler: async () => ({ name: `User: ${id}: John Doe` }),
        },
      }));

      const user = await getUser(1, { mock: { handler: async () => ({ name: "MOCK" }) } });

      expect(user).toEqual({ name: "MOCK" });
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

      const getUser = api.create((id: number) => ({
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

      const getUser = api.create((id: number) => ({
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

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1, {
        customResponseHandler: (response) => response.text(),
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
        requestInit: { method: "PUT" },
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
        customRequestInit: { method: "POST" },
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

      const getUser = api.create((id: number) => ({
        path: `/users/${id}`,
        responseHandler: async (response) => {
          console.log(response.text());

          return response;
        },
      }));

      await getUser(1);

      expect(fn.mock.lastCall[0].requestURL).toBe("https://jsonplaceholder.typicode.com/users/1");
      expect(fn.mock.lastCall[0].requestParams).toEqual({ method: "GET" });
    });
  });
});
