import { describe, expect, it } from "vitest";
import * as client from "./fonts";
import * as server from "../../../server/src/utils/fonts";

// The PDF server and the client each carry the registry (separate packages). They must stay identical.
describe("client/server font registry parity", () => {
  it("has identical fonts", () => {
    expect(client.FONTS).toEqual(server.FONTS);
  });

  it("has identical template defaults", () => {
    expect(client.TEMPLATE_DEFAULT_FONT).toEqual(server.TEMPLATE_DEFAULT_FONT);
  });
});
