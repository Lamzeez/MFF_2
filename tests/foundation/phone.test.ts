/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePhoneNumber, isValidPhoneNumber } from "../../lib/phone";

test("sanitizePhoneNumber cleans spaces, hyphens, and parentheses while preserving international format", () => {
  // Philippine national mobile format
  assert.equal(sanitizePhoneNumber("0917-123-4567"), "09171234567");
  assert.equal(sanitizePhoneNumber("0917 123 4567"), "09171234567");
  assert.equal(sanitizePhoneNumber("(0917) 123-4567"), "09171234567");

  // International format with leading +
  assert.equal(sanitizePhoneNumber("+63 917 123 4567"), "+639171234567");
  assert.equal(sanitizePhoneNumber("+63-918-234-5678"), "+639182345678");

  // Empty or null cases
  assert.equal(sanitizePhoneNumber(""), "");
  assert.equal(sanitizePhoneNumber(null), "");
  assert.equal(sanitizePhoneNumber(undefined), "");
});

test("isValidPhoneNumber accurately checks Philippine phone length and format", () => {
  assert.equal(isValidPhoneNumber("09171234567"), true);
  assert.equal(isValidPhoneNumber("+639171234567"), true);
  assert.equal(isValidPhoneNumber("0917-123-4567"), true);
  assert.equal(isValidPhoneNumber("+63 918 234 5678"), true);

  // Invalid cases
  assert.equal(isValidPhoneNumber("123"), false);
  assert.equal(isValidPhoneNumber(""), false);
  assert.equal(isValidPhoneNumber(null), false);
  assert.equal(isValidPhoneNumber("not-a-number"), false);
});
