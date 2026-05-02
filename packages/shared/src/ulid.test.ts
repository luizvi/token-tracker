import { describe, expect, it } from "vitest";
import { newId, isValidId } from "./ulid.js";

describe("ulid", () => {
  it("gera ID de 26 chars Crockford base32", () => {
    const id = newId();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("IDs gerados em sequência são monotonicamente crescentes", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("isValidId aceita ULID válido", () => {
    expect(isValidId(newId())).toBe(true);
  });

  it("isValidId rejeita strings inválidas", () => {
    expect(isValidId("")).toBe(false);
    expect(isValidId("not-a-ulid")).toBe(false);
    expect(isValidId("01ARZ3NDEKTSV4RRFFQ69G5FA")).toBe(false);
  });
});
