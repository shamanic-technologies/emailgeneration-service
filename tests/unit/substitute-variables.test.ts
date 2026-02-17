import { describe, it, expect } from "vitest";
import { substituteVariables } from "../../src/lib/anthropic-client";

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
});
