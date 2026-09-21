import { describe, expect, it } from "vitest";
import { userFacingError } from "./userFacingError";

describe("userFacingError", () => {
  it("hides validation internals from the interface", () => {
    const technical = `[{
      "code": "invalid_value",
      "message": "Invalid option: expected one of request|accept"
    }]`;

    expect(userFacingError({ message: technical }, "Aviso amigável.")).toBe("Aviso amigável.");
  });

  it("preserves safe business messages", () => {
    expect(userFacingError({ message: "Esta conexão está indisponível." })).toBe(
      "Esta conexão está indisponível.",
    );
  });
});
