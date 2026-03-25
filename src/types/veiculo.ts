/**
 * Tipos relacionados a veículos
 */

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  disponivel: boolean;
  status?: {
    disponivel: boolean;
  };
}

export interface VeiculoComStatus extends Veiculo {
  agendasAtivas?: number;
  ultimoUso?: string;
}
