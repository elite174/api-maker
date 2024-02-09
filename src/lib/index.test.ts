import { describe, test, expect, beforeEach, vi } from "vitest";
import { APIMaker } from ".";

describe("SimpleAPI", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => ({ name: "John Doe" }),
      text: () => "User",
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
    expect(logger.info).toHaveBeenCalledWith("[API_MAKER]: Making a mock GET request to /users/1");
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
      const api = new APIMaker({
        base: "https://jsonplaceholder.typicode.com",
        defaultResponseHandler: (response) => response.text(),
      });

      const getUser = api.create<unknown, number>((id) => ({
        path: `/users/${id}`,
      }));

      const user = await getUser(1);

      expect(user).toEqual("User");
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
});
