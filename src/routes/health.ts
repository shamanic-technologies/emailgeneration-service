import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  // #swagger.tags = ['Health']
  // #swagger.summary = 'Health check'
  // #swagger.responses[200] = { description: 'Service is healthy', schema: { status: 'ok', service: 'emailgeneration-service' } }
  res.json({ status: "ok", service: "emailgeneration-service" });
});

export default router;
