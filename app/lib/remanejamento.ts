import type { Agendamento } from '@/app/lib/agendamentos';
import type { Veiculo } from '@/app/lib/veiculos';

export type MovimentoRemanejamento = {
  agendamentoId: string;
  veiculoOrigemId: string;
  veiculoDestinoId: string;
  saida: string;
  chegada: string;
  motorista: string;
  destino: string;
};

export type PlanoRemanejamento = {
  id: string;
  novoVeiculoId: string;
  movimentos: MovimentoRemanejamento[];
  direto: boolean;
};

type Intervalo = {
  saida: string;
  chegada: string;
};

type AgendamentoSimulavel = Agendamento & {
  saidaMs: number;
  chegadaMs: number;
  movivel: boolean;
};

type EstadoBusca = {
  alocacoes: Map<string, string>;
  movimentos: Map<string, MovimentoRemanejamento>;
  movendo: Set<string>;
};

const LIMITE_PLANOS_PADRAO = 80;
const PROFUNDIDADE_PADRAO = 8;

export const intervaloSobrepoe = (inicioA: string, fimA: string, inicioB: string, fimB: string) => {
  const aInicio = new Date(inicioA).getTime();
  const aFim = new Date(fimA).getTime();
  const bInicio = new Date(inicioB).getTime();
  const bFim = new Date(fimB).getTime();

  if ([aInicio, aFim, bInicio, bFim].some(Number.isNaN)) return false;

  return aFim > bInicio && aInicio < bFim;
};

const mesmoIntervaloConflitante = (agendamento: AgendamentoSimulavel, intervalo: Intervalo) =>
  intervaloSobrepoe(agendamento.saida, agendamento.chegada, intervalo.saida, intervalo.chegada);

const criarChavePlano = (novoVeiculoId: string, movimentos: MovimentoRemanejamento[]) =>
  [novoVeiculoId, ...movimentos.map((movimento) => `${movimento.agendamentoId}:${movimento.veiculoOrigemId}>${movimento.veiculoDestinoId}`)].join('|');

const ordenarMovimentos = (movimentos: MovimentoRemanejamento[]) =>
  [...movimentos].sort((a, b) => new Date(a.saida).getTime() - new Date(b.saida).getTime() || a.agendamentoId.localeCompare(b.agendamentoId));

const clonarEstado = (estado: EstadoBusca): EstadoBusca => ({
  alocacoes: new Map(estado.alocacoes),
  movimentos: new Map(estado.movimentos),
  movendo: new Set(estado.movendo),
});

export function gerarPlanosRemanejamento({
  agendamentos,
  veiculos,
  saida,
  chegada,
  veiculoPreferencialId,
  agora = new Date(),
  limitePlanos = LIMITE_PLANOS_PADRAO,
  profundidadeMaxima = PROFUNDIDADE_PADRAO,
}: {
  agendamentos: Agendamento[];
  veiculos: Veiculo[];
  saida: string;
  chegada: string;
  veiculoPreferencialId?: string;
  agora?: Date;
  limitePlanos?: number;
  profundidadeMaxima?: number;
}): PlanoRemanejamento[] {
  const saidaNovaMs = new Date(saida).getTime();
  const chegadaNovaMs = new Date(chegada).getTime();

  if (!saida || !chegada || Number.isNaN(saidaNovaMs) || Number.isNaN(chegadaNovaMs) || saidaNovaMs >= chegadaNovaMs) {
    return [];
  }

  const idsVeiculos = veiculos.map((veiculo) => veiculo.id).filter(Boolean);
  const candidatosIniciais = veiculoPreferencialId ? idsVeiculos.filter((id) => id === veiculoPreferencialId) : idsVeiculos;
  const agoraMs = agora.getTime();

  const agendamentosSimulaveis: AgendamentoSimulavel[] = agendamentos
    .filter((agendamento) => agendamento.concluido !== true && agendamento.veiculoId)
    .map((agendamento) => {
      const saidaMs = new Date(agendamento.saida).getTime();
      const chegadaMs = new Date(agendamento.chegada).getTime();
      return {
        ...agendamento,
        saidaMs,
        chegadaMs,
        movivel: !Number.isNaN(saidaMs) && saidaMs > agoraMs,
      };
    })
    .filter((agendamento) => !Number.isNaN(agendamento.saidaMs) && !Number.isNaN(agendamento.chegadaMs));

  const baseAlocacoes = new Map(agendamentosSimulaveis.map((agendamento) => [agendamento.id, agendamento.veiculoId]));
  const planos = new Map<string, PlanoRemanejamento>();

  const conflitosNoVeiculo = (estado: EstadoBusca, veiculoId: string, intervalo: Intervalo, ignorarId?: string) =>
    agendamentosSimulaveis.filter(
      (agendamento) =>
        agendamento.id !== ignorarId &&
        estado.alocacoes.get(agendamento.id) === veiculoId &&
        mesmoIntervaloConflitante(agendamento, intervalo),
    );

  const resolverConflitos = (
    estado: EstadoBusca,
    veiculoId: string,
    intervalo: Intervalo,
    profundidade: number,
    ignorarId?: string,
  ): EstadoBusca[] => {
    if (profundidade > profundidadeMaxima || planos.size >= limitePlanos) return [];

    const conflitos = conflitosNoVeiculo(estado, veiculoId, intervalo, ignorarId);
    if (conflitos.length === 0) return [estado];

    const [conflito] = conflitos;
    if (!conflito.movivel || estado.movendo.has(conflito.id)) return [];

    const resultados: EstadoBusca[] = [];
    const veiculoAtual = estado.alocacoes.get(conflito.id) || conflito.veiculoId;
    const destinos = idsVeiculos.filter((id) => id !== veiculoAtual);

    for (const destinoId of destinos) {
      if (resultados.length + planos.size >= limitePlanos) break;

      const proximoEstado = clonarEstado(estado);
      proximoEstado.movendo.add(conflito.id);
      proximoEstado.alocacoes.set(conflito.id, destinoId);
      proximoEstado.movimentos.set(conflito.id, {
        agendamentoId: conflito.id,
        veiculoOrigemId: conflito.veiculoId,
        veiculoDestinoId: destinoId,
        saida: conflito.saida,
        chegada: conflito.chegada,
        motorista: conflito.motorista,
        destino: conflito.destino,
      });

      const estadosAposDestino = resolverConflitos(
        proximoEstado,
        destinoId,
        { saida: conflito.saida, chegada: conflito.chegada },
        profundidade + 1,
        conflito.id,
      );

      estadosAposDestino.forEach((estadoResolvido) => {
        estadoResolvido.movendo.delete(conflito.id);
        const estadosAposVeiculoOriginal = resolverConflitos(estadoResolvido, veiculoId, intervalo, profundidade + 1);
        resultados.push(...estadosAposVeiculoOriginal);
      });
    }

    return resultados;
  };

  for (const veiculoInicialId of candidatosIniciais) {
    const estadoInicial: EstadoBusca = {
      alocacoes: new Map(baseAlocacoes),
      movimentos: new Map(),
      movendo: new Set(),
    };

    const estadosResolvidos = resolverConflitos(estadoInicial, veiculoInicialId, { saida, chegada }, 0);

    for (const estado of estadosResolvidos) {
      if (planos.size >= limitePlanos) break;
      const movimentos = ordenarMovimentos([...estado.movimentos.values()]);
      const chave = criarChavePlano(veiculoInicialId, movimentos);

      if (!planos.has(chave)) {
        planos.set(chave, {
          id: chave,
          novoVeiculoId: veiculoInicialId,
          movimentos,
          direto: movimentos.length === 0,
        });
      }
    }
  }

  return [...planos.values()].sort(
    (a, b) =>
      a.movimentos.length - b.movimentos.length ||
      a.novoVeiculoId.localeCompare(b.novoVeiculoId) ||
      a.id.localeCompare(b.id),
  );
}
