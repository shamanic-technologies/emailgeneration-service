import swaggerAutogen from "swagger-autogen";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const doc = {
  info: {
    title: "EmailGeneration Service",
    description: "Generates personalized cold sales emails using Claude AI",
    version: "1.0.0",
  },
  host: process.env.SERVICE_URL || "http://localhost:3005",
  basePath: "/",
  schemes: ["https"],
};

const outputFile = join(projectRoot, "openapi.json");
const routes = [
  join(projectRoot, "src/routes/health.ts"),
  join(projectRoot, "src/routes/generate.ts"),
  join(projectRoot, "src/routes/stats.ts"),
];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc).then(() => {
  console.log("openapi.json generated");
});
