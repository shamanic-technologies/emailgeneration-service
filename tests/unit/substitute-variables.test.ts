import { describe, it, expect } from "vitest";
import { substituteVariables, coerceToString } from "../../src/lib/anthropic-client";

describe("substituteVariables", () => {
  it("replaces single variable", () => {
    const result = substituteVariables("Hello {{name}}", { name: "Alice" });
    expect(result).toBe("Hello Alice");
  });

  it("replaces multiple variables", () => {
    const result = substituteVariables(
      "Dear {{name}}, welcome to {{company}}.",
      { name: "Bob", company: "Acme" }
    );
    expect(result).toBe("Dear Bob, welcome to Acme.");
  });

  it("replaces same variable appearing multiple times", () => {
    const result = substituteVariables(
      "{{name}} is great. Everyone loves {{name}}.",
      { name: "Alice" }
    );
    expect(result).toBe("Alice is great. Everyone loves Alice.");
  });

  it("leaves unmatched placeholders as-is", () => {
    const result = substituteVariables(
      "Hello {{name}}, your role is {{role}}.",
      { name: "Alice" }
    );
    expect(result).toBe("Hello Alice, your role is {{role}}.");
  });

  it("handles empty variables object", () => {
    const result = substituteVariables("Hello {{name}}", {});
    expect(result).toBe("Hello {{name}}");
  });

  it("handles multiline values (e.g. JSON blobs)", () => {
    const json = JSON.stringify({ firstName: "John", company: "Acme" }, null, 2);
    const result = substituteVariables("## Recipient\n{{data}}", { data: json });
    expect(result).toContain('"firstName": "John"');
    expect(result).toContain("## Recipient");
  });

  it("handles template with no placeholders", () => {
    const result = substituteVariables("No variables here", { name: "Alice" });
    expect(result).toBe("No variables here");
  });

  it("coerces string arrays to comma-separated strings", () => {
    const result = substituteVariables("Titles: {{titles}}", {
      titles: ["Executive Director", "Program Manager", "Community Leader"],
    });
    expect(result).toBe("Titles: Executive Director, Program Manager, Community Leader");
  });

  it("coerces objects to JSON strings", () => {
    const result = substituteVariables("Params: {{params}}", {
      params: { personTitles: ["CEO"], qKeywords: "blockchain" },
    });
    expect(result).toContain('"personTitles"');
    expect(result).toContain('"qKeywords"');
  });

  it("coerces numbers and booleans to strings", () => {
    const result = substituteVariables("Count: {{count}}, Active: {{active}}", {
      count: 42,
      active: true,
    });
    expect(result).toBe("Count: 42, Active: true");
  });

  it("handles mixed string and non-string variables", () => {
    const result = substituteVariables(
      "Name: {{name}}, Tags: {{tags}}",
      { name: "Alice", tags: ["sales", "outreach"] }
    );
    expect(result).toBe("Name: Alice, Tags: sales, outreach");
  });
});

describe("coerceToString", () => {
  it("passes strings through unchanged", () => {
    expect(coerceToString("hello")).toBe("hello");
  });

  it("comma-joins string arrays", () => {
    expect(coerceToString(["a", "b", "c"])).toBe("a, b, c");
  });

  it("JSON-stringifies objects", () => {
    expect(coerceToString({ key: "value" })).toBe('{"key":"value"}');
  });

  it("JSON-stringifies mixed arrays", () => {
    expect(coerceToString([1, "two", true])).toBe('[1,"two",true]');
  });

  it("stringifies null", () => {
    expect(coerceToString(null)).toBe("null");
  });

  it("stringifies numbers", () => {
    expect(coerceToString(42)).toBe("42");
  });
});
