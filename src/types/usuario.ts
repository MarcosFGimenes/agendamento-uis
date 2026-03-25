/**
 * Tipos relacionados a usuários/motoristas do sistema
 */

export interface Usuario {
  id: string;
  nome: string;
  email?: string;
  setor: string;
}

export interface Motorista {
  id: string;
  nome: string;
  matricula: string;
  setor: string;
  cargo: string;
  telefone: string;
}
