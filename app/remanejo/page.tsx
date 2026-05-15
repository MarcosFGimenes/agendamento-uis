'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import SidebarMenu from '../components/SidebarMenu';
import { Agendamento, atualizarAgendamento, criarAgendamento, listarAgendamentos } from '@/app/lib/agendamentos';
import { listarVeiculos, Veiculo } from '@/app/lib/veiculos';
import { gerarPlanosRemanejamento, intervaloSobrepoe } from '@/app/lib/remanejamento';
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

type ConferenciaRemanejo = {
  agendamentoId: string;
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

const criarConferenciaInicial = (agendamentoId: string): ConferenciaRemanejo => ({
  agendamentoId,
  responsavelConferencia: '',
  materiaisConferidos: false,
  chaveDocumentoConferidos: false,
  motoristaAvisado: false,
  observacao: '',
});

export default function RemanejoPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(novoAgendamentoInicial);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
  const [conferencias, setConferencias] = useState<ConferenciaRemanejo[]>([]);
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
          .sort((a, b) => new Date(a.saida).getTime() - new Date(b.saida).getTime()),
      );
      setVeiculos(listaVeiculos.filter((veiculo) => veiculo.disponivel !== false));
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

  const getAgendamentoResumo = useCallback(
    (agendamentoId: string) => {
      const agendamento = agendamentos.find((item) => item.id === agendamentoId);
      if (!agendamento) return `Agendamento ${agendamentoId}`;
      return `${agendamento.codigo ? `${agendamento.codigo} · ` : ''}${agendamento.destino || agendamento.motorista || agendamento.id}`;
    },
    [agendamentos],
  );

  const handleMatriculaChange = (matricula: string) => {
    const motoristaEncontrado = motoristas.find((motorista) => motorista.matricula === matricula.trim());

    setNovoAgendamento((atual) => ({
      ...atual,
      matricula,
      motorista: motoristaEncontrado?.nome || '',
      telefone: motoristaEncontrado?.telefone || '',
    }));
  };

  const agendamentosNoPeriodo = useMemo(() => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada) return [];

    return agendamentos.filter((agendamento) =>
      intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
    );
  }, [agendamentos, novoAgendamento.chegada, novoAgendamento.saida]);

  const planos = useMemo(
    () =>
      gerarPlanosRemanejamento({
        agendamentos,
        veiculos,
        saida: novoAgendamento.saida,
        chegada: novoAgendamento.chegada,
        veiculoPreferencialId: novoAgendamento.veiculoId || undefined,
      }),
    [agendamentos, novoAgendamento.chegada, novoAgendamento.saida, novoAgendamento.veiculoId, veiculos],
  );

  const planoSelecionado = useMemo(
    () => planos.find((plano) => plano.id === planoSelecionadoId),
    [planoSelecionadoId, planos],
  );

  useEffect(() => {
    setPlanoSelecionadoId((atual) => (atual && planos.some((plano) => plano.id === atual) ? atual : ''));
  }, [planos]);

  useEffect(() => {
    if (!planoSelecionado) {
      setConferencias([]);
      return;
    }

    setConferencias((atuais) =>
      planoSelecionado.movimentos.map((movimento) => {
        const existente = atuais.find((item) => item.agendamentoId === movimento.agendamentoId);
        return existente || criarConferenciaInicial(movimento.agendamentoId);
      }),
    );
  }, [planoSelecionado]);

  const agendamentosConflitantesPreferencial = useMemo(() => {
    if (!novoAgendamento.veiculoId || !novoAgendamento.saida || !novoAgendamento.chegada) return [];

    return agendamentosNoPeriodo.filter((agendamento) => agendamento.veiculoId === novoAgendamento.veiculoId);
  }, [agendamentosNoPeriodo, novoAgendamento.chegada, novoAgendamento.saida, novoAgendamento.veiculoId]);

  const veiculosComDiagnostico = useMemo(() => {
    if (!novoAgendamento.saida || !novoAgendamento.chegada) {
      return veiculos.map((veiculo) => ({ veiculo, conflitos: [] as Agendamento[] }));
    }

    return veiculos.map((veiculo) => ({
      veiculo,
      conflitos: agendamentosNoPeriodo.filter((agendamento) => agendamento.veiculoId === veiculo.id),
    }));
  }, [agendamentosNoPeriodo, novoAgendamento.chegada, novoAgendamento.saida, veiculos]);

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

    if (novoAgendamento.saida && new Date(novoAgendamento.saida).getTime() <= Date.now()) {
      mensagens.push('A nova demanda deve ter saída futura para permitir simulação e remanejo seguro.');
    }

    if (!planoSelecionado) {
      mensagens.push('Selecione uma das opções calculadas pelo motor de remanejamento.');
    }

    planoSelecionado?.movimentos.forEach((movimento, indice) => {
      const numero = indice + 1;
      const conferencia = conferencias.find((item) => item.agendamentoId === movimento.agendamentoId);

      if (!conferencia?.responsavelConferencia.trim()) mensagens.push(`Movimento ${numero}: informe o responsável pela conferência.`);
      if (!conferencia?.materiaisConferidos) mensagens.push(`Movimento ${numero}: confirme materiais, ferramentas e documentos.`);
      if (!conferencia?.chaveDocumentoConferidos) mensagens.push(`Movimento ${numero}: confirme chave, documento, cartão e itens obrigatórios.`);
      if (!conferencia?.motoristaAvisado) mensagens.push(`Movimento ${numero}: confirme o aviso ao motorista afetado pelo remanejo.`);
    });

    return { ok: mensagens.length === 0, mensagens };
  }, [conferencias, novoAgendamento, planoSelecionado]);

  const resultadoValidacao = useMemo(() => validarPlano(), [validarPlano]);

  const atualizarConferencia = <K extends keyof ConferenciaRemanejo>(agendamentoId: string, campo: K, valor: ConferenciaRemanejo[K]) => {
    setConferencias((atuais) =>
      atuais.map((item) => (item.agendamentoId === agendamentoId ? { ...item, [campo]: valor } : item)),
    );
  };

  const limparPlano = () => {
    setNovoAgendamento(novoAgendamentoInicial);
    setPlanoSelecionadoId('');
    setConferencias([]);
  };

  const aplicarPlano = async () => {
    const validacao = validarPlano();
    if (!validacao.ok || !planoSelecionado) {
      toast.error('Revise o plano de remanejo antes de aplicar.');
      return;
    }

    try {
      setSalvando(true);

      await Promise.all(
        planoSelecionado.movimentos.map((movimento) => {
          const agendamento = agendamentos.find((ag) => ag.id === movimento.agendamentoId);
          const conferencia = conferencias.find((item) => item.agendamentoId === movimento.agendamentoId);
          const observacaoRemanejo = [
            agendamento?.observacoes || '',
            '',
            `REMANEJO ${new Date().toLocaleString('pt-BR')}: veículo alterado de ${getVeiculoNome(movimento.veiculoOrigemId)} para ${getVeiculoNome(movimento.veiculoDestinoId)} para encaixe de demanda prioritária.`,
            `Conferência: materiais=${conferencia?.materiaisConferidos ? 'sim' : 'não'}, chave/documento=${conferencia?.chaveDocumentoConferidos ? 'sim' : 'não'}, motorista avisado=${conferencia?.motoristaAvisado ? 'sim' : 'não'}.`,
            `Responsável pela conferência: ${conferencia?.responsavelConferencia}.`,
            conferencia?.observacao ? `Observação do remanejo: ${conferencia.observacao}` : '',
          ]
            .filter(Boolean)
            .join('\n');

          return atualizarAgendamento(movimento.agendamentoId, {
            veiculoId: movimento.veiculoDestinoId,
            observacoes: observacaoRemanejo,
          }).then(() => {
            console.info('Aviso de remanejamento disparado ao motorista afetado', {
              agendamentoId: movimento.agendamentoId,
              motorista: movimento.motorista,
              telefone: agendamento?.telefone,
              veiculoOrigem: getVeiculoNome(movimento.veiculoOrigemId),
              veiculoDestino: getVeiculoNome(movimento.veiculoDestinoId),
              responsavelConferencia: conferencia?.responsavelConferencia,
            });
          });
        }),
      );

      await criarAgendamento({
        ...novoAgendamento,
        veiculoId: planoSelecionado.novoVeiculoId,
        observacoes: [
          novoAgendamento.observacoes,
          `Criado pela tela de REMANEJO em ${new Date().toLocaleString('pt-BR')}.`,
          `Veículo definido pelo plano selecionado: ${getVeiculoNome(planoSelecionado.novoVeiculoId)}.`,
          planoSelecionado.movimentos.length > 0
            ? `Remanejos vinculados: ${planoSelecionado.movimentos.map((item) => item.agendamentoId).join(', ')}.`
            : 'Sem remanejos necessários.',
        ]
          .filter(Boolean)
          .join('\n'),
      });

      toast.success('Plano de remanejamento aplicado e novo agendamento criado.');
      limparPlano();
      await carregarDados();
    } catch (error) {
      console.error('Erro ao aplicar plano de remanejamento:', error);
      toast.error('Não foi possível aplicar o plano de remanejamento.');
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
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-100">REMANEJO PREDITIVO</p>
              <h1 className="mt-2 text-3xl font-bold">Motor automático de encaixe e troca segura de veículos</h1>
              <p className="mt-3 max-w-4xl text-amber-50">
                Informe a nova demanda, com veículo preferencial opcional. O sistema calcula encaixes diretos e cadeias de remanejamento,
                bloqueando agendamentos já iniciados ou passados como imutáveis.
              </p>
            </header>

            {carregando ? (
              <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">Carregando dados...</div>
            ) : (
              <>
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Veículos disponíveis</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{veiculos.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Agendamentos ativos</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{agendamentos.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Conflitos no preferencial</p>
                    <p className={`mt-2 text-3xl font-bold ${agendamentosConflitantesPreferencial.length ? 'text-red-600' : 'text-green-700'}`}>
                      {agendamentosConflitantesPreferencial.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Planos calculados</p>
                    <p className={`mt-2 text-3xl font-bold ${planos.length ? 'text-green-700' : 'text-amber-700'}`}>{planos.length}</p>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">1. Nova demanda</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      O veículo é opcional: em branco, o motor testa toda a frota; preenchido, a busca inicial fica restrita ao veículo escolhido.
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
                        <span className="text-sm font-medium text-gray-700">Retorno</span>
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
                          <option value="">Sem preferência — testar toda a frota</option>
                          {veiculosComDiagnostico.map(({ veiculo, conflitos }) => (
                            <option key={veiculo.id} value={veiculo.id}>
                              {veiculo.modelo} - {veiculo.placa} {conflitos.length ? `(${conflitos.length} conflito(s))` : '(livre no período)'}
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
                    <h2 className="text-xl font-bold text-gray-900">2. Diagnóstico de disponibilidade</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Agendamentos já iniciados ou passados aparecem como bloqueios fixos e não serão movidos pelo algoritmo.
                    </p>

                    <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                      {veiculosComDiagnostico.map(({ veiculo, conflitos }) => {
                        const bloqueiosFixos = conflitos.filter((item) => new Date(item.saida).getTime() <= Date.now()).length;
                        return (
                          <div
                            key={veiculo.id}
                            className={`rounded-xl border p-4 ${
                              conflitos.length ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">{veiculo.modelo} - {veiculo.placa}</p>
                                <p className={`text-sm font-medium ${conflitos.length ? 'text-red-700' : 'text-green-700'}`}>
                                  {conflitos.length ? `${conflitos.length} agendamento(s) no período` : 'Livre no período informado'}
                                </p>
                                {bloqueiosFixos > 0 && <p className="text-xs font-semibold text-red-800">{bloqueiosFixos} bloqueio(s) fixo(s)</p>}
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${conflitos.length ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {conflitos.length ? 'Conflito' : 'Livre'}
                              </span>
                            </div>

                            {conflitos.length > 0 && (
                              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                                {conflitos.map((agendamento) => (
                                  <li key={agendamento.id} className="rounded-lg bg-white/80 p-3">
                                    <p className="font-semibold">{agendamento.destino || agendamento.motorista}</p>
                                    <p>{formatarDataHora(agendamento.saida)} → {formatarDataHora(agendamento.chegada)}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(agendamento.saida).getTime() > Date.now() ? 'Elegível para remanejo' : 'Bloqueio fixo: já saiu/iniciou ou é passado'}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">3. Opções calculadas pelo motor</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Selecione uma opção. A conferência de segurança aparece somente depois da escolha do plano.
                  </p>

                  {!novoAgendamento.saida || !novoAgendamento.chegada ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                      Informe saída e retorno para calcular as possibilidades automaticamente.
                    </div>
                  ) : planos.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                      Nenhuma combinação viável encontrada. Há bloqueios fixos ou cadeias sem veículo alternativo disponível para o período.
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      {planos.map((plano) => (
                        <label
                          key={plano.id}
                          className={`block cursor-pointer rounded-2xl border p-5 transition ${
                            planoSelecionadoId === plano.id ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-200 bg-white hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="plano-remanejamento"
                              value={plano.id}
                              checked={planoSelecionadoId === plano.id}
                              onChange={() => setPlanoSelecionadoId(plano.id)}
                              className="mt-1 h-4 w-4 border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${plano.direto ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {plano.direto ? 'Encaixe direto' : `${plano.movimentos.length} movimentação(ões) necessária(s)`}
                                </span>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                  Novo agendamento em {getVeiculoNome(plano.novoVeiculoId)}
                                </span>
                              </div>

                              {plano.movimentos.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-700">Nenhum agendamento existente precisa ser movido.</p>
                              ) : (
                                <ol className="mt-4 space-y-3 text-sm text-gray-800">
                                  {plano.movimentos.map((movimento, indice) => (
                                    <li key={movimento.agendamentoId} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                      <p className="font-semibold">
                                        {indice + 1}. Mover {getAgendamentoResumo(movimento.agendamentoId)}
                                      </p>
                                      <p className="mt-1">
                                        De <strong>{getVeiculoNome(movimento.veiculoOrigemId)}</strong> para{' '}
                                        <strong>{getVeiculoNome(movimento.veiculoDestinoId)}</strong>
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatarDataHora(movimento.saida)} → {formatarDataHora(movimento.chegada)}
                                      </p>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </section>

                {planoSelecionado && (
                  <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">4. Conferência obrigatória pós-seleção</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Valide responsável, materiais, chave/documentos e aviso ao motorista para cada remanejo real do plano selecionado.
                    </p>

                    {planoSelecionado.movimentos.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                        Plano direto selecionado: não há motoristas afetados por remanejo, então nenhuma conferência adicional é necessária.
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {planoSelecionado.movimentos.map((movimento, indice) => {
                          const conferencia = conferencias.find((item) => item.agendamentoId === movimento.agendamentoId) || criarConferenciaInicial(movimento.agendamentoId);
                          return (
                            <div key={movimento.agendamentoId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                              <h3 className="font-bold text-gray-900">
                                Movimento {indice + 1}: {getAgendamentoResumo(movimento.agendamentoId)}
                              </h3>
                              <p className="mt-1 text-sm text-gray-700">
                                De {getVeiculoNome(movimento.veiculoOrigemId)} para {getVeiculoNome(movimento.veiculoDestinoId)}.
                              </p>

                              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="text-sm font-medium text-gray-700">Responsável pela conferência</span>
                                  <input
                                    type="text"
                                    value={conferencia.responsavelConferencia}
                                    onChange={(event) => atualizarConferencia(movimento.agendamentoId, 'responsavelConferencia', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    placeholder="Nome de quem conferiu"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-sm font-medium text-gray-700">Observação / aviso registrado</span>
                                  <input
                                    type="text"
                                    value={conferencia.observacao}
                                    onChange={(event) => atualizarConferencia(movimento.agendamentoId, 'observacao', event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                    placeholder="Ex.: motorista avisado por WhatsApp"
                                  />
                                </label>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={conferencia.materiaisConferidos}
                                    onChange={(event) => atualizarConferencia(movimento.agendamentoId, 'materiaisConferidos', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  Materiais, ferramentas, amostras e documentos da viagem foram transferidos.
                                </label>
                                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={conferencia.chaveDocumentoConferidos}
                                    onChange={(event) => atualizarConferencia(movimento.agendamentoId, 'chaveDocumentoConferidos', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  Chave, documento, cartão/combustível e itens obrigatórios foram conferidos.
                                </label>
                                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={conferencia.motoristaAvisado}
                                    onChange={(event) => atualizarConferencia(movimento.agendamentoId, 'motoristaAvisado', event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  Motorista afetado foi avisado sobre veículo, placa e horário.
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">5. Revisão e aplicação</h2>
                  {resultadoValidacao.ok ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                      Plano validado sem conflitos. Ao aplicar, o sistema salva a nova demanda em {getVeiculoNome(planoSelecionado?.novoVeiculoId || '')} e atualiza os remanejos em lote.
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
                      onClick={limparPlano}
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
                      {salvando ? 'Aplicando...' : 'Aplicar plano selecionado e criar agendamento'}
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
