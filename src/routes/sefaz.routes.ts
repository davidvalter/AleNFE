// src/routes/sefaz.routes.ts
import { FastifyInstance } from "fastify";
import { importarNotasController } from "../controllers/sefaz.controller";

export default async function sefazRoutes(app: FastifyInstance) {
  app.post("/importar/:empresaId", importarNotasController);
}
