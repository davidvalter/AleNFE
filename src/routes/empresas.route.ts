// src/routes/empresas.route.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import * as tls from 'tls';

const CERT_DIR = process.env.CERT_DIR || '/www/wwwroot/alenfe.alecriminteligente.com.br/certs';

const validarCNPJ = (cnpj: string) => /^\d{14}$/.test(cnpj);

const validarFiscalConfig = (data: any) => {
    const { crt, ambiente, serie, modelo } = data;
    if (crt && ![1, 2, 3].includes(crt)) return false;
    if (ambiente && ![1, 2].includes(ambiente)) return false;
    if (serie && (serie < 1 || serie > 999)) return false;
    if (modelo && modelo !== 55) return false;
    return true;
};

export async function empresaRoutes(app: FastifyInstance) {
    // =========================
    // GET /api/empresas
    // =========================
    app.get('/api/empresas', async () => {
        return await prisma.empresa.findMany({
            select: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
                cnpj: true,
                apiKey: true,
                apiKeyAtiva: true,
                apiKeyGeradaEm: true
            }
        });
    });

    // =========================
    // GET /api/empresas/:id
    // =========================
    app.get('/api/empresas/:id', async (req, reply) => {
        const { id } = req.params as { id: string };
        const empresa = await prisma.empresa.findUnique({ where: { id: Number(id) } });
        if (!empresa) return reply.status(404).send({ message: 'Empresa não encontrada' });
        const { certificadoSenha, ...rest } = empresa;
        return {
            ...rest,
            temCertificado: !!rest.certificadoPath
        };
    });

    // =========================
    // POST /api/empresas
    // =========================
    app.post('/api/empresas', async (req, reply) => {
        const { razaoSocial, cnpj, nomeFantasia } = req.body as any;
        if (!validarCNPJ(cnpj)) return reply.status(400).send({ message: 'CNPJ inválido' });
        try {
            const empresa = await prisma.empresa.create({
                data: {
                    razaoSocial,
                    cnpj,
                    nomeFantasia,
                    certificadoPath: '',    // ← string vazia (será preenchida no upload)
                    certificadoSenha: ''     // ← string vazia
                }
            });
            return reply.status(201).send(empresa);
        } catch (e: any) {
            if (e.code === 'P2002') return reply.status(409).send({ message: 'CNPJ já cadastrado' });
            throw e;
        }
    });

    // =========================
    // PUT /api/empresas/:id
    // =========================
    app.put('/api/empresas/:id', async (req, reply) => {
        const { id } = req.params as { id: string };
        const { razaoSocial, nomeFantasia, cnpj } = req.body as any;

        const data: any = {};
        if (razaoSocial !== undefined) data.razaoSocial = razaoSocial;
        if (nomeFantasia !== undefined) data.nomeFantasia = nomeFantasia;
        if (cnpj !== undefined) {
            if (!validarCNPJ(cnpj)) return reply.status(400).send({ message: 'CNPJ inválido' });
            data.cnpj = cnpj;
        }

        try {
            return await prisma.empresa.update({ where: { id: Number(id) }, data });
        } catch (e: any) {
            if (e.code === 'P2025') return reply.status(404).send({ message: 'Empresa não encontrada' });
            throw e;
        }
    });

    // =========================
    // DELETE /api/empresas/:id
    // =========================
    app.delete('/api/empresas/:id', async (req, reply) => {
        const { id } = req.params as { id: string };

        const empresa = await prisma.empresa.findUnique({ where: { id: Number(id) } });
        if (empresa?.certificadoPath && fs.existsSync(empresa.certificadoPath)) {
            fs.unlinkSync(empresa.certificadoPath);
        }

        try {
            await prisma.empresa.delete({ where: { id: Number(id) } });
            return reply.status(204).send();
        } catch (e: any) {
            if (e.code === 'P2025') return reply.status(404).send({ message: 'Empresa não encontrada' });
            throw e;
        }
    });

    // =========================
    // POST /api/empresas/:id/certificado — upload PFX
    // =========================
    app.post('/api/empresas/:id/certificado', async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        const idNumber = Number(id);

        const empresa = await prisma.empresa.findUnique({ where: { id: idNumber } });
        if (!empresa) return reply.status(404).send({ message: 'Empresa não encontrada' });

        // ✅ Cast para any — req.file() é adicionado pelo @fastify/multipart em runtime
        const data = await (req as any).file();
        if (!data) return reply.status(400).send({ message: 'Arquivo PFX não enviado' });

        const fields = data.fields as any;
        const certificadoSenha = fields.certificadoSenha?.value as string;
        if (!certificadoSenha) return reply.status(400).send({ message: 'Senha do certificado não informada' });

        const originalName = data.filename || '';
        if (!originalName.toLowerCase().endsWith('.pfx')) {
            return reply.status(400).send({ message: 'Arquivo deve ser .pfx' });
        }

        if (!fs.existsSync(CERT_DIR)) {
            fs.mkdirSync(CERT_DIR, { recursive: true });
        }

        const fileName = `${empresa.cnpj}_${Date.now()}.pfx`;
        const filePath = path.join(CERT_DIR, fileName);

        const buffer = await data.toBuffer();
        fs.writeFileSync(filePath, buffer);


        // PFX salvo — validação ocorre no carregarCertificado() durante a emissão

        // Remover certificado antigo
        if (empresa.certificadoPath && fs.existsSync(empresa.certificadoPath)) {
            fs.unlinkSync(empresa.certificadoPath);
        }

        await prisma.empresa.update({
            where: { id: idNumber },
            data: {
                certificadoPath: filePath,
                certificadoSenha
            }
        });

        console.log(`[CERTIFICADO] PFX salvo para empresa ${empresa.cnpj}: ${filePath}`);

        return reply.send({
            success: true,
            message: 'Certificado importado com sucesso'
        });
    });

    // =========================
    // DELETE /api/empresas/:id/certificado
    // =========================
    app.delete('/api/empresas/:id/certificado', async (req, reply) => {
        const { id } = req.params as { id: string };
        const idNumber = Number(id);

        const empresa = await prisma.empresa.findUnique({ where: { id: idNumber } });
        if (!empresa) return reply.status(404).send({ message: 'Empresa não encontrada' });

        if (empresa.certificadoPath && fs.existsSync(empresa.certificadoPath)) {
            fs.unlinkSync(empresa.certificadoPath);
        }

        await prisma.empresa.update({
            where: { id: idNumber },
            data: {
                certificadoPath: '',    // ← string vazia (não pode ser null)
                certificadoSenha: ''
            }
        });

        return reply.send({ success: true, message: 'Certificado removido' });
    });

    // =========================
    // POST /api/empresas/:id/api-key
    // =========================
    app.post('/api/empresas/:id/api-key', async (req, reply) => {
        const { id } = req.params as { id: string };
        const idNumber = Number(id);

        const empresa = await prisma.empresa.findUnique({ where: { id: idNumber } });
        if (!empresa) return reply.status(404).send({ message: 'Empresa não encontrada' });

        const novaChave = 'ak_' + crypto.randomBytes(16).toString('hex');

        await prisma.empresa.update({
            where: { id: idNumber },
            data: {
                apiKey: novaChave,
                apiKeyAtiva: true,
                apiKeyGeradaEm: new Date()
            }
        });

        return reply.send({ success: true, apiKey: novaChave });
    });

    // =========================
    // DELETE /api/empresas/:id/api-key
    // =========================
    app.delete('/api/empresas/:id/api-key', async (req, reply) => {
        const { id } = req.params as { id: string };
        const idNumber = Number(id);

        try {
            await prisma.empresa.update({
                where: { id: idNumber },
                data: { apiKeyAtiva: false }
            });
            return reply.send({ success: true, message: 'API Key revogada' });
        } catch (e: any) {
            if (e.code === 'P2025') return reply.status(404).send({ message: 'Empresa não encontrada' });
            throw e;
        }
    });

    // =========================
    // Fiscal Config — CRUD
    // =========================
    app.get('/api/empresas/:empresaId/fiscal-config', async (req, reply) => {
        const { empresaId } = req.params as { empresaId: string };
        const config = await prisma.empresaFiscalConfig.findUnique({ where: { empresaId: Number(empresaId) } });
        if (!config) return reply.status(404).send({ message: 'Configuração não encontrada' });
        return config;
    });

    app.post('/api/empresas/:empresaId/fiscal-config', async (req, reply) => {
        const { empresaId } = req.params as { empresaId: string };
        const data = req.body as any;
        if (!validarFiscalConfig(data)) return reply.status(400).send({ message: 'Dados inválidos' });
        try {
            const config = await prisma.empresaFiscalConfig.create({ data: { ...data, empresaId: Number(empresaId) } });
            return reply.status(201).send(config);
        } catch (e: any) {
            if (e.code === 'P2002') return reply.status(409).send({ message: 'Configuração já existe' });
            throw e;
        }
    });

    app.put('/api/empresas/:empresaId/fiscal-config', async (req, reply) => {
        const { empresaId } = req.params as { empresaId: string };
        const data = req.body as any;
        if (!validarFiscalConfig(data)) return reply.status(400).send({ message: 'Dados inválidos' });
        try {
            return await prisma.empresaFiscalConfig.update({ where: { empresaId: Number(empresaId) }, data });
        } catch (e: any) {
            if (e.code === 'P2025') return reply.status(404).send({ message: 'Configuração não encontrada' });
            throw e;
        }
    });

    app.delete('/api/empresas/:empresaId/fiscal-config', async (req, reply) => {
        const { empresaId } = req.params as { empresaId: string };
        try {
            await prisma.empresaFiscalConfig.delete({ where: { empresaId: Number(empresaId) } });
            return reply.status(204).send();
        } catch (e: any) {
            if (e.code === 'P2025') return reply.status(404).send({ message: 'Configuração não encontrada' });
            throw e;
        }
    });
}