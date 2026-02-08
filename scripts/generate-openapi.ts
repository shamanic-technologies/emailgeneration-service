import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "../src/schemas.js";
import * as fs from "fs";

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Email Generation Service",
    description: "AI-powered cold email generation service",
    version: "1.0.0",
  },
  servers: [
    {
      url:
        process.env.EMAIL_GENERATION_SERVICE_URL ||
        "https://email-generation.mcpfactory.org",
    },
  ],
});

fs.writeFileSync("openapi.json", JSON.stringify(document, null, 2));
console.log("Generated openapi.json");
