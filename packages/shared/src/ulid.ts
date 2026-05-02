import { ulid, monotonicFactory } from "ulid";

const monotonic = monotonicFactory();

export function newId(): string {
  return monotonic();
}

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isValidId(value: string): boolean {
  return ULID_REGEX.test(value);
}

export { ulid as ulidFromTime };
