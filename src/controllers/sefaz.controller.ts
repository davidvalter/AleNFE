import { FastifyRequest, FastifyReply } from "fastify";
import { importarNotas } from "../services/sefaz.service";

export async function importarNotasController(
  req: FastifyRequest<{ Params: { empresaId: string } }>,
  reply: FastifyReply
) {
  const empresaId = Number(req.params.empresaId);
  if (!empresaId) {
    return reply.status(400).send({
      success: false,
      message: "empresaId inválido"
    });
  }

  try {
    const result = await importarNotas(empresaId);
    return reply.send({ success: true, ...result });
  } catch (error: any) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      message: error?.message ?? "Erro na importação de notas"
    });
  }
}