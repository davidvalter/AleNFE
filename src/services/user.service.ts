import { prisma } from "../config/database";
import * as bcrypt from 'bcrypt';

export class UserService {
  private readonly SALT_ROUNDS = 10;

  async criarUsuario(nome: string, usuario: string, senha: string, role: string) {
    const hashedPassword = await bcrypt.hash(senha, this.SALT_ROUNDS);
    const { senha: _, ...user } = await prisma.user.create({
      data: { nome, usuario, senha: hashedPassword, role },
    });
    return user;
  }

  async buscarTodos() {
    return await prisma.user.findMany({
      select: { id: true, nome: true, usuario: true, role: true },
    });
  }

  async buscarPorId(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { senha: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async buscarPorUsuario(usuario: string) {
    return await prisma.user.findUnique({ where: { usuario } });
  }

  async atualizarUsuario(id: string, dados: any) {
    const { senha, ...rest } = dados;
    const updated = await prisma.user.update({
      where: { id },
      data: rest,
    });
    const { senha: _, ...user } = updated;
    return user;
  }

  async deletarUsuario(id: string) {
    return await prisma.user.delete({ where: { id } });
  }

  async validarLogin(usuario: string, senha: string) {
    const user = await prisma.user.findUnique({ where: { usuario } });
    if (!user) return null;
    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) return null;
    const { senha: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async alterarSenha(id: string, senhaAtual: string, senhaNova: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');
    const isMatch = await bcrypt.compare(senhaAtual, user.senha);
    if (!isMatch) throw new Error('Senha atual incorreta');
    const hashedPassword = await bcrypt.hash(senhaNova, this.SALT_ROUNDS);
    await prisma.user.update({
      where: { id },
      data: { senha: hashedPassword },
    });
    return true;
  }
}