'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import SidebarMenu from '../components/SidebarMenu';
import { Agendamento, atualizarAgendamento, criarAgendamento, listarAgendamentos } from '@/app/lib/agendamentos';
import { listarVeiculos, Veiculo } from '@/app/lib/veiculos';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '@/app/lib/firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Motorista = {
  id?: string;
  nome: string;
  matricula: string;
  setor?: string;
  cargo?: string;
  telefone?: string;
};

type NovoAgendamento = Omit<Agendamento, 'id' | 'concluido'> & {
  concluido: boolean;
};

type ItemRemanejo = {
  agendamentoId: string;
  novoVeiculoId: string;
  responsavelConferencia: string;
  materiaisConferidos: boolean;
  chaveDocumentoConferidos: boolean;
  motoristaAvisado: boolean;
  observacao: string;
};

type ResultadoValidacao = {
  ok: boolean;
  mensagens: string[];
};

type AgendamentoSimulado = {
  id: string;
  saida: string;
  chegada: string;
  veiculoId: string;
  destino: string;
  motorista: string;
  original?: Agendamento;
  novo?: boolean;
};

type EstadoBusca = {
  atribuicoes: Record<string, string>;
};

type ConflitoSimulado = {
  primeiro: AgendamentoSimulado;
  segundo: AgendamentoSimulado;
  veiculoId: string;
};

type MudancaPlano = {
  agendamento: Agendamento;
  veiculoAtualId: string;
  novoVeiculoId: string;
};

type PlanoRemanejo = {
  id: string;
  novoVeiculoId: string;
  mudancas: MudancaPlano[];
  conflitosResolvidos: number;
};

const NOVO_AGENDAMENTO_ID = '__novo_agendamento__';
const LIMITE_PLANOS = 8;
const LIMITE_ESTADOS_BUSCA = 2500;

const novoAgendamentoInicial: NovoAgendamento = {
  saida: '',
  chegada: '',
  veiculoId: '',
  motorista: '',
  matricula: '',
  telefone: '',
  destino: '',
  observacoes: '',
  concluido: false,
  codigo: '',
  nomeAgendador: '',
};

const formatarDataHora = (valor: string) => {
  if (!valor) return '-';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const intervaloSobrepoe = (inicioA: string, fimA: string, inicioB: string, fimB: string) => {
  const aInicio = new Date(inicioA).getTime();
  const aFim = new Date(fimA).getTime();
  const bInicio = new Date(inicioB).getTime();
  const bFim = new Date(fimB).getTime();

  return aFim > bInicio && aInicio < bFim;
};

const dataValida = (valor: string) => {
  const data = new Date(valor);
  return !Number.isNaN(data.getTime());
};

const ordenarPorSaida = (a: Agendamento, b: Agendamento) =>
  new Date(a.saida).getTime() - new Date(b.saida).getTime();

export default function RemanejoPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(novoAgendamentoInicial);
  const [itensRemanejo, setItensRemanejo] = useState<ItemRemanejo[]>([]);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const [listaAgendamentos, listaVeiculos, motoristasSnap] = await Promise.all([
        listarAgendamentos(),
        listarVeiculos(),
        getDocs(collection(getDb(), 'motoristas')),
      ]);

      setAgendamentos(
        listaAgendamentos
          .filter((agendamento) => agendamento.concluido !== true)
          .filter((agendamento) => dataValida(agendamento.saida) && dataValida(agendamento.chegada))
          .sort(ordenarPorSaida),
      );
      setVeiculos(listaVeiculos);
      setMotoristas(
        motoristasSnap.docs.map((registro) => ({
          id: registro.id,
          ...registro.data(),
        })) as Motorista[],
      );
    } catch (error) {
      console.error('Erro ao carregar dados de remanejo:', error);
      toast.error('Não foi possível carregar os dados para remanejo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const getVeiculoNome = useCallback(
    (veiculoId: string) => {
      const veiculo = veiculos.find((item) => item.id === veiculoId);
      return veiculo ? `${veiculo.modelo} - ${veiculo.placa}` : 'Veículo não encontrado';
    },
    [veiculos],
  );

  const agendamentoAindaNaoSaiu = useCallback((agendamento: Agendamento | AgendamentoSimulado) => {
    const saida = new Date(agendamento.saida).getTime();
    return dataValida(agendamento.saida) && saida > Date.now();
  }, []);

  const handleMatriculaChange = (matricula: string) => {
    const motoristaEncontrado = motoristas.find((motorista) => motorista.matricula === matricula.trim());

    setNovoAgendamento((atual) => ({
      ...atual,
      matricula,
      motorista: motoristaEncontrado?.nome || '',
      telefone: motoristaEncontrado?.telefone || '',
    }));
  };

  const resetarPlanoSelecionado = () => {
    setPlanoSelecionadoId('');
    setItensRemanejo([]);
  };

  const agendamentosAindaNaoSairam = useMemo(
    () => agendamentos.filter((agendamento) => agendamentoAindaNaoSaiu(agendamento)),
    [agendamentoAindaNaoSaiu, agendamentos],
  );

  const agendamentosEmUsoOuPassados = useMemo(
    () => agendamentos.filter((agendamento) => !agendamentoAindaNaoSaiu(agendamento)),
    [agendamentoAindaNaoSaiu, agendamentos],
  );

  const agendamentosNoPeriodo = useMemo(() => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada) return [];

    return agendamentos.filter((agendamento) =>
      intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
    );
  }, [agendamentos, novoAgendamento.chegada, novoAgendamento.saida]);

  const agendamentosConflitantes = useMemo(() => {
    if (!novoAgendamento.veiculoId || !novoAgendamento.saida || !novoAgendamento.chegada) return [];

    return agendamentos.filter(
      (agendamento) =>
        agendamento.veiculoId === novoAgendamento.veiculoId &&
        intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
    );
  }, [agendamentos, novoAgendamento.chegada, novoAgendamento.saida, novoAgendamento.veiculoId]);

  const veiculosComDiagnostico = useMemo(() => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada) {
      return veiculos.map((veiculo) => ({ veiculo, conflitos: [] as Agendamento[], bloqueiosFixos: [] as Agendamento[] }));
    }

    return veiculos.map((veiculo) => {
      const conflitos = agendamentos.filter(
        (agendamento) =>
          agendamento.veiculoId === veiculo.id &&
          intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
      );

      return {
        veiculo,
        conflitos,
        bloqueiosFixos: conflitos.filter((agendamento) => !agendamentoAindaNaoSaiu(agendamento)),
      };
    });
  }, [agendamentoAindaNaoSaiu, agendamentos, novoAgendamento.chegada, novoAgendamento.saida, veiculos]);

  const montarItensSimulados = useCallback((): AgendamentoSimulado[] => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada) return [];

    const existentes = agendamentos.map((agendamento) => ({
      id: agendamento.id,
      saida: agendamento.saida,
      chegada: agendamento.chegada,
      veiculoId: agendamento.veiculoId,
      destino: agendamento.destino,
      motorista: agendamento.motorista,
      original: agendamento,
    }));

    return [
      ...existentes,
      {
        id: NOVO_AGENDAMENTO_ID,
        saida: novoAgendamento.saida,
        chegada: novoAgendamento.chegada,
        veiculoId: novoAgendamento.veiculoId,
        destino: novoAgendamento.destino || 'Novo agendamento',
        motorista: novoAgendamento.motorista,
        novo: true,
      },
    ];
  }, [agendamentos, novoAgendamento]);

  const encontrarConflito = useCallback(
    (itens: AgendamentoSimulado[], estado: EstadoBusca): ConflitoSimulado | null => {
      const veiculoAtual = (item: AgendamentoSimulado) => estado.atribuicoes[item.id] || item.veiculoId;
      const foiAlterado = (item: AgendamentoSimulado) =>
        item.id === NOVO_AGENDAMENTO_ID || Boolean(estado.atribuicoes[item.id] && estado.atribuicoes[item.id] !== item.veiculoId);

      for (let i = 0; i < itens.length; i += 1) {
        for (let j = i + 1; j < itens.length; j += 1) {
          const primeiro = itens[i];
          const segundo = itens[j];
          const primeiroVeiculo = veiculoAtual(primeiro);
          const segundoVeiculo = veiculoAtual(segundo);

          if (
            primeiroVeiculo &&
            primeiroVeiculo === segundoVeiculo &&
            intervaloSobrepoe(primeiro.saida, primeiro.chegada, segundo.saida, segundo.chegada) &&
            (foiAlterado(primeiro) || foiAlterado(segundo))
          ) {
            return { primeiro, segundo, veiculoId: primeiroVeiculo };
          }
        }
      }

      return null;
    },
    [],
  );

  const gerarPlanosParaVeiculo = useCallback(
    (novoVeiculoId: string): PlanoRemanejo[] => {
      const itens = montarItensSimulados();
      if (!itens.length) return [];

      const fila: EstadoBusca[] = [{ atribuicoes: { [NOVO_AGENDAMENTO_ID]: novoVeiculoId } }];
      const visitados = new Set<string>();
      const planos: PlanoRemanejo[] = [];
      const veiculoIds = veiculos.map((veiculo) => veiculo.id);
      let estadosAnalisados = 0;

      const assinaturaEstado = (estado: EstadoBusca) =>
        Object.entries(estado.atribuicoes)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, veiculoId]) => `${id}:${veiculoId}`)
          .join('|');

      const criarPlano = (estado: EstadoBusca): PlanoRemanejo => {
        const mudancas = agendamentos
          .filter((agendamento) => estado.atribuicoes[agendamento.id] && estado.atribuicoes[agendamento.id] !== agendamento.veiculoId)
          .map((agendamento) => ({
            agendamento,
            veiculoAtualId: agendamento.veiculoId,
            novoVeiculoId: estado.atribuicoes[agendamento.id],
          }))
          .sort((a, b) => new Date(a.agendamento.saida).getTime() - new Date(b.agendamento.saida).getTime());

        return {
          id: `${novoVeiculoId}-${mudancas.map((mudanca) => `${mudanca.agendamento.id}:${mudanca.novoVeiculoId}`).join('-') || 'direto'}`,
          novoVeiculoId,
          mudancas,
          conflitosResolvidos: mudancas.length,
        };
      };

      while (fila.length > 0 && planos.length < LIMITE_PLANOS && estadosAnalisados < LIMITE_ESTADOS_BUSCA) {
        const estado = fila.shift()!;
        const assinatura = assinaturaEstado(estado);
        if (visitados.has(assinatura)) continue;
        visitados.add(assinatura);
        estadosAnalisados += 1;

        const conflito = encontrarConflito(itens, estado);
        if (!conflito) {
          planos.push(criarPlano(estado));
          continue;
        }

        const candidatos = [conflito.primeiro, conflito.segundo].filter(
          (item) => item.id !== NOVO_AGENDAMENTO_ID && item.original && agendamentoAindaNaoSaiu(item),
        );

        candidatos.forEach((candidato) => {
          const veiculoAtual = estado.atribuicoes[candidato.id] || candidato.veiculoId;
          veiculoIds
            .filter((veiculoId) => veiculoId !== veiculoAtual)
            .forEach((veiculoId) => {
              fila.push({
                atribuicoes: {
                  ...estado.atribuicoes,
                  [candidato.id]: veiculoId,
                },
              });
            });
        });
      }

      return planos;
    },
    [agendamentoAindaNaoSaiu, agendamentos, encontrarConflito, montarItensSimulados, veiculos],
  );

  const planosSugeridos = useMemo(() => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada || !dataValida(novoAgendamento.saida) || !dataValida(novoAgendamento.chegada)) {
      return [];
    }

    const saida = new Date(novoAgendamento.saida).getTime();
    const chegada = new Date(novoAgendamento.chegada).getTime();
    if (saida >= chegada) return [];

    const veiculosParaTentar = novoAgendamento.veiculoId
      ? veiculos.filter((veiculo) => veiculo.id === novoAgendamento.veiculoId)
      : veiculos;

    const planos = veiculosParaTentar.flatMap((veiculo) => gerarPlanosParaVeiculo(veiculo.id));
    const unicos = new Map<string, PlanoRemanejo>();

    planos.forEach((plano) => {
      if (!unicos.has(plano.id)) {
        unicos.set(plano.id, plano);
      }
    });

    return [...unicos.values()]
      .sort((a, b) => {
        if (a.mudancas.length !== b.mudancas.length) return a.mudancas.length - b.mudancas.length;
        return getVeiculoNome(a.novoVeiculoId).localeCompare(getVeiculoNome(b.novoVeiculoId));
      })
      .slice(0, LIMITE_PLANOS);
  }, [gerarPlanosParaVeiculo, getVeiculoNome, novoAgendamento.chegada, novoAgendamento.saida, novoAgendamento.veiculoId, veiculos]);

  useEffect(() => {
    resetarPlanoSelecionado();
  }, [novoAgendamento.saida, novoAgendamento.chegada, novoAgendamento.veiculoId]);

  const planoSelecionado = useMemo(
    () => planosSugeridos.find((plano) => plano.id === planoSelecionadoId),
    [planoSelecionadoId, planosSugeridos],
  );

  const selecionarPlano = (plano: PlanoRemanejo) => {
    setPlanoSelecionadoId(plano.id);
    setItensRemanejo(
      plano.mudancas.map((mudanca) => ({
        agendamentoId: mudanca.agendamento.id,
        novoVeiculoId: mudanca.novoVeiculoId,
        responsavelConferencia: '',
        materiaisConferidos: false,
        chaveDocumentoConferidos: false,
        motoristaAvisado: false,
        observacao: '',
      })),
    );
  };

  const atualizarItemRemanejo = <K extends keyof ItemRemanejo>(indice: number, campo: K, valor: ItemRemanejo[K]) => {
    setItensRemanejo((atual) =>
      atual.map((item, itemIndice) => (itemIndice === indice ? { ...item, [campo]: valor } : item)),
    );
  };

  const validarPlano = useCallback((): ResultadoValidacao => {
    const mensagens: string[] = [];

    if (!novoAgendamento.saida) mensagens.push('Informe a saída do novo agendamento.');
    if (!novoAgendamento.chegada) mensagens.push('Informe o retorno do novo agendamento.');
    if (!novoAgendamento.motorista) mensagens.push('Informe uma matrícula válida para preencher o motorista.');
    if (!novoAgendamento.destino) mensagens.push('Informe o destino do novo agendamento.');

    if (novoAgendamento.saida && novoAgendamento.chegada) {
      const saida = new Date(novoAgendamento.saida).getTime();
      const chegada = new Date(novoAgendamento.chegada).getTime();
      if (Number.isNaN(saida) || Number.isNaN(chegada) || saida >= chegada) {
        mensagens.push('A saída deve ser anterior ao retorno do novo agendamento.');
      }
    }

    if (!planoSelecionado) {
      mensagens.push('Selecione uma possibilidade de remanejo gerada pelo sistema.');
    }

    itensRemanejo.forEach((item, indice) => {
      const numero = indice + 1;
      const agendamento = agendamentos.find((ag) => ag.id === item.agendamentoId);

      if (!agendamento) mensagens.push(`Linha ${numero}: agendamento de remanejo não encontrado.`);
      if (agendamento && !agendamentoAindaNaoSaiu(agendamento)) {
        mensagens.push(`Linha ${numero}: este agendamento já saiu da unidade e não pode ser remanejado.`);
      }
      if (!item.responsavelConferencia.trim()) mensagens.push(`Linha ${numero}: informe quem conferiu materiais/documentos.`);
      if (!item.materiaisConferidos) mensagens.push(`Linha ${numero}: confirme a transferência dos materiais.`);
      if (!item.chaveDocumentoConferidos) mensagens.push(`Linha ${numero}: confirme chave, documento e itens obrigatórios.`);
      if (!item.motoristaAvisado) mensagens.push(`Linha ${numero}: confirme que o motorista foi avisado da troca.`);
    });

    return { ok: mensagens.length === 0, mensagens };
  }, [agendamentoAindaNaoSaiu, agendamentos, itensRemanejo, novoAgendamento, planoSelecionado]);

  const resultadoValidacao = useMemo(() => validarPlano(), [validarPlano]);

  const aplicarPlano = async () => {
    const validacao = validarPlano();
    if (!validacao.ok || !planoSelecionado) {
      toast.error('Revise o plano de remanejo antes de aplicar.');
      return;
    }

    try {
      setSalvando(true);

      await Promise.all(
        itensRemanejo.map((item) => {
          const agendamento = agendamentos.find((ag) => ag.id === item.agendamentoId);
          const observacaoRemanejo = [
            agendamento?.observacoes || '',
            '',
            `REMANEJO ${new Date().toLocaleString('pt-BR')}: veículo alterado de ${getVeiculoNome(agendamento?.veiculoId || '')} para ${getVeiculoNome(item.novoVeiculoId)} para encaixe de demanda prioritária.`,
            `Conferência: materiais=${item.materiaisConferidos ? 'sim' : 'não'}, chave/documento=${item.chaveDocumentoConferidos ? 'sim' : 'não'}, motorista avisado=${item.motoristaAvisado ? 'sim' : 'não'}.`,
            `Responsável pela conferência: ${item.responsavelConferencia}.`,
            item.observacao ? `Observação do remanejo: ${item.observacao}` : '',
          ]
            .filter(Boolean)
            .join('\n');

          return atualizarAgendamento(item.agendamentoId, {
            veiculoId: item.novoVeiculoId,
            observacoes: observacaoRemanejo,
          });
        }),
      );

      await criarAgendamento({
        ...novoAgendamento,
        veiculoId: planoSelecionado.novoVeiculoId,
        observacoes: [
          novoAgendamento.observacoes,
          `Criado pela tela de REMANEJO em ${new Date().toLocaleString('pt-BR')}.`,
          itensRemanejo.length > 0
            ? `Remanejos vinculados: ${itensRemanejo.map((item) => item.agendamentoId).join(', ')}.`
            : 'Encaixe direto sem remanejar agendamentos.',
        ]
          .filter(Boolean)
          .join('\n'),
      });

      toast.success('Plano de remanejo aplicado e novo agendamento criado.');
      setNovoAgendamento(novoAgendamentoInicial);
      resetarPlanoSelecionado();
      await carregarDados();
    } catch (error) {
      console.error('Erro ao aplicar plano de remanejo:', error);
      toast.error('Não foi possível aplicar o plano de remanejo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
        <SidebarMenu className="md:min-h-screen" />
        <main className="flex-1 p-6 overflow-x-hidden">
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

          <div className="max-w-7xl mx-auto space-y-6">
            <header className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-100">REMANEJO</p>
              <h1 className="mt-2 text-3xl font-bold">Central de encaixe automático e troca segura</h1>
              <p className="mt-3 max-w-4xl text-amber-50">
                Informe a nova demanda e o sistema calcula as possibilidades, inclusive remanejos em cadeia.
                Apenas agendamentos que ainda não saíram da unidade podem ser movidos.
              </p>
            </header>

            {carregando ? (
              <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">Carregando dados...</div>
            ) : (
              <>
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Veículos cadastrados</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{veiculos.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Podem ser remanejados</p>
                    <p className="mt-2 text-3xl font-bold text-green-700">{agendamentosAindaNaoSairam.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Não podem ser movidos</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">{agendamentosEmUsoOuPassados.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Possibilidades encontradas</p>
                    <p className={`mt-2 text-3xl font-bold ${planosSugeridos.length ? 'text-green-700' : 'text-amber-700'}`}>
                      {planosSugeridos.length}
                    </p>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">1. Nova demanda prioritária</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      O veículo preferencial é opcional. Se ficar em branco, o sistema testa todos os veículos disponíveis para encontrar encaixes.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Saída</span>
                        <input
                          type="datetime-local"
                          value={novoAgendamento.saida}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, saida: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Retorno previsto</span>
                        <input
                          type="datetime-local"
                          value={novoAgendamento.chegada}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, chegada: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-sm font-medium text-gray-700">Veículo preferencial (opcional)</span>
                        <select
                          value={novoAgendamento.veiculoId}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, veiculoId: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Deixar o sistema escolher a melhor possibilidade</option>
                          {veiculosComDiagnostico.map(({ veiculo, conflitos, bloqueiosFixos }) => (
                            <option key={veiculo.id} value={veiculo.id}>
                              {veiculo.modelo} - {veiculo.placa} {conflitos.length ? `(${conflitos.length} conflito(s), ${bloqueiosFixos.length} sem remanejo)` : '(livre no período)'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Matrícula</span>
                        <input
                          type="text"
                          value={novoAgendamento.matricula}
                          onChange={(event) => handleMatriculaChange(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          placeholder="Digite a matrícula"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Motorista</span>
                        <input
                          type="text"
                          value={novoAgendamento.motorista}
                          readOnly
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-700"
                          placeholder="Preenchido pela matrícula"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Telefone</span>
                        <input
                          type="text"
                          value={novoAgendamento.telefone}
                          readOnly
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-700"
                          placeholder="Preenchido pela matrícula"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Responsável pelo agendamento</span>
                        <input
                          type="text"
                          value={novoAgendamento.nomeAgendador || ''}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, nomeAgendador: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          placeholder="Ex.: Gerente / PCM / Portaria"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-sm font-medium text-gray-700">Destino</span>
                        <input
                          type="text"
                          value={novoAgendamento.destino}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, destino: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          placeholder="Ex.: Marechal Cândido Rondon"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-sm font-medium text-gray-700">Observações da nova demanda</span>
                        <textarea
                          value={novoAgendamento.observacoes}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, observacoes: event.target.value }))}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          placeholder="Informe urgência, risco de pernoite, materiais necessários, contatos, etc."
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">2. Diagnóstico do período</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Agendamentos já iniciados bloqueiam o veículo e não entram nas possibilidades de troca.
                    </p>

                    <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                      {veiculosComDiagnostico.map(({ veiculo, conflitos, bloqueiosFixos }) => (
                        <div
                          key={veiculo.id}
                          className={`rounded-xl border p-4 ${
                            bloqueiosFixos.length
                              ? 'border-red-200 bg-red-50'
                              : conflitos.length
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-green-200 bg-green-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{veiculo.modelo} - {veiculo.placa}</p>
                              <p className={`text-sm font-medium ${bloqueiosFixos.length ? 'text-red-700' : conflitos.length ? 'text-amber-700' : 'text-green-700'}`}>
                                {bloqueiosFixos.length
                                  ? 'Bloqueado por uso já iniciado'
                                  : conflitos.length
                                    ? 'Pode exigir remanejo'
                                    : 'Livre no período informado'}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${bloqueiosFixos.length ? 'bg-red-100 text-red-700' : conflitos.length ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {conflitos.length} conflito(s)
                            </span>
                          </div>
                          {conflitos.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {conflitos.map((agendamento) => (
                                <div key={agendamento.id} className="rounded-lg bg-white p-3 text-sm text-gray-700 shadow-sm">
                                  <p className="font-semibold text-gray-900">{agendamento.destino}</p>
                                  <p>{formatarDataHora(agendamento.saida)} até {formatarDataHora(agendamento.chegada)}</p>
                                  <p>Motorista: {agendamento.motorista || '-'}</p>
                                  <p className={agendamentoAindaNaoSaiu(agendamento) ? 'text-green-700' : 'text-red-700'}>
                                    {agendamentoAindaNaoSaiu(agendamento)
                                      ? 'Ainda não saiu: pode entrar no remanejo'
                                      : 'Já saiu/está em uso: não pode ser remanejado'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">3. Possibilidades calculadas pelo sistema</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Selecione uma opção. O sistema pode sugerir encaixe direto ou uma cadeia de remanejos até todos os horários fecharem sem conflito.
                  </p>

                  {!novoAgendamento.saida || !novoAgendamento.chegada ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
                      Informe saída e retorno para gerar as possibilidades.
                    </div>
                  ) : planosSugeridos.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                      Nenhuma possibilidade foi encontrada para o período informado respeitando a regra de não mover veículos que já saíram da unidade.
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {planosSugeridos.map((plano, indice) => {
                        const selecionado = plano.id === planoSelecionadoId;

                        return (
                          <div
                            key={plano.id}
                            className={`rounded-xl border p-4 transition ${selecionado ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-200 bg-white shadow-sm'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Opção {indice + 1}</p>
                                <h3 className="mt-1 text-lg font-bold text-gray-900">Novo agendamento em {getVeiculoNome(plano.novoVeiculoId)}</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                  {plano.mudancas.length === 0
                                    ? 'Encaixe direto, sem trocar agendamentos existentes.'
                                    : `${plano.mudancas.length} remanejo(s) em cadeia.`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => selecionarPlano(plano)}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${selecionado ? 'bg-amber-700 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                              >
                                {selecionado ? 'Selecionado' : 'Selecionar'}
                              </button>
                            </div>

                            {plano.mudancas.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {plano.mudancas.map((mudanca, mudancaIndice) => (
                                  <div key={`${mudanca.agendamento.id}-${mudanca.novoVeiculoId}`} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                                    <p className="font-semibold text-gray-900">
                                      {mudancaIndice + 1}. {mudanca.agendamento.destino}
                                    </p>
                                    <p>{formatarDataHora(mudanca.agendamento.saida)} até {formatarDataHora(mudanca.agendamento.chegada)}</p>
                                    <p>De: {getVeiculoNome(mudanca.veiculoAtualId)}</p>
                                    <p>Para: {getVeiculoNome(mudanca.novoVeiculoId)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">4. Conferência obrigatória do plano selecionado</h2>
                  {!planoSelecionado ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-600">
                      Selecione uma possibilidade acima para liberar a conferência.
                    </div>
                  ) : itensRemanejo.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                      A opção selecionada não troca nenhum agendamento existente. Você pode aplicar o encaixe direto após revisar os dados.
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      {itensRemanejo.map((item, indice) => {
                        const agendamentoSelecionado = agendamentos.find((agendamento) => agendamento.id === item.agendamentoId);

                        return (
                          <div key={item.agendamentoId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            {agendamentoSelecionado && (
                              <div className="rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
                                <p className="font-semibold text-gray-900">Remanejo {indice + 1}</p>
                                <p>Destino: {agendamentoSelecionado.destino}</p>
                                <p>Motorista: {agendamentoSelecionado.motorista || '-'}</p>
                                <p>Período: {formatarDataHora(agendamentoSelecionado.saida)} até {formatarDataHora(agendamentoSelecionado.chegada)}</p>
                                <p>De: {getVeiculoNome(agendamentoSelecionado.veiculoId)}</p>
                                <p>Para: {getVeiculoNome(item.novoVeiculoId)}</p>
                              </div>
                            )}

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
                              <label className="block">
                                <span className="text-sm font-medium text-gray-700">Responsável pela conferência</span>
                                <input
                                  type="text"
                                  value={item.responsavelConferencia}
                                  onChange={(event) => atualizarItemRemanejo(indice, 'responsavelConferencia', event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                  placeholder="Nome de quem conferiu a transferência"
                                />
                              </label>
                              <label className="block">
                                <span className="text-sm font-medium text-gray-700">Observação da troca</span>
                                <input
                                  type="text"
                                  value={item.observacao}
                                  onChange={(event) => atualizarItemRemanejo(indice, 'observacao', event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                  placeholder="Ex.: materiais transferidos para o porta-malas do novo carro"
                                />
                              </label>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={item.materiaisConferidos}
                                  onChange={(event) => atualizarItemRemanejo(indice, 'materiaisConferidos', event.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                Materiais, ferramentas, amostras e documentos da viagem foram transferidos.
                              </label>
                              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={item.chaveDocumentoConferidos}
                                  onChange={(event) => atualizarItemRemanejo(indice, 'chaveDocumentoConferidos', event.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                Chave, documento, cartão/combustível e itens obrigatórios foram conferidos.
                              </label>
                              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={item.motoristaAvisado}
                                  onChange={(event) => atualizarItemRemanejo(indice, 'motoristaAvisado', event.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                Motorista e solicitante foram avisados sobre veículo, placa e horário.
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">5. Revisão e aplicação</h2>
                  {resultadoValidacao.ok ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                      Plano validado. Ao aplicar, o sistema atualiza os remanejos selecionados e cria a nova demanda no veículo definido pela opção escolhida.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-semibold text-amber-900">Pendências encontradas:</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                        {resultadoValidacao.mensagens.slice(0, 8).map((mensagem) => (
                          <li key={mensagem}>{mensagem}</li>
                        ))}
                        {resultadoValidacao.mensagens.length > 8 && <li>Mais {resultadoValidacao.mensagens.length - 8} pendência(s).</li>}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setNovoAgendamento(novoAgendamentoInicial);
                        resetarPlanoSelecionado();
                      }}
                      className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                      Limpar plano
                    </button>
                    <button
                      type="button"
                      onClick={aplicarPlano}
                      disabled={!resultadoValidacao.ok || salvando}
                      className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {salvando ? 'Aplicando...' : 'Aplicar remanejo e criar agendamento'}
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
