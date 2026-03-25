/**
 * Tipos relacionados a agendamentos
 */

export interface AgendamentoDados {
  saida: string;
  chegada: string;
  veiculoId: string;
  motorista: string;
  matricula: string;
  telefone: string;
  destino: string;
  observacoes: string;
  codigo?: string;
  nomeAgendador?: string;
}

export interface Agendamento extends AgendamentoDados {
  id: string;
  concluido: boolean;
}

export interface AgendamentoFiltro {
  veiculoId?: string;
  matricula?: string;
  dataInicio?: string;
  dataFim?: string;
}
