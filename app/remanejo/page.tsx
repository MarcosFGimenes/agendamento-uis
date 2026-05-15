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

type AlocacaoSimulada = {
  id: string;
  saida: string;
  chegada: string;
  veiculoId: string;
  destino: string;
  motorista: string;
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

const itemRemanejoInicial: ItemRemanejo = {
  agendamentoId: '',
  novoVeiculoId: '',
  responsavelConferencia: '',
  materiaisConferidos: false,
  chaveDocumentoConferidos: false,
  motoristaAvisado: false,
  observacao: '',
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

export default function RemanejoPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(novoAgendamentoInicial);
  const [itensRemanejo, setItensRemanejo] = useState<ItemRemanejo[]>([{ ...itemRemanejoInicial }]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [somentePeriodo, setSomentePeriodo] = useState(true);

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
    if (!novoAgendamento.saida || !novoAgendamento.chegada) return agendamentos;

    return agendamentos.filter((agendamento) =>
      intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
    );
  }, [agendamentos, novoAgendamento.chegada, novoAgendamento.saida]);

  const agendamentosParaSelecao = somentePeriodo ? agendamentosNoPeriodo : agendamentos;

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
      return veiculos.map((veiculo) => ({ veiculo, conflitos: [] as Agendamento[] }));
    }

    return veiculos.map((veiculo) => ({
      veiculo,
      conflitos: agendamentos.filter(
        (agendamento) =>
          agendamento.veiculoId === veiculo.id &&
          intervaloSobrepoe(agendamento.saida, agendamento.chegada, novoAgendamento.saida, novoAgendamento.chegada),
      ),
    }));
  }, [agendamentos, novoAgendamento.chegada, novoAgendamento.saida, veiculos]);

  const validarPlano = useCallback((): ResultadoValidacao => {
    const mensagens: string[] = [];

    if (!novoAgendamento.saida) mensagens.push('Informe a saída do novo agendamento.');
    if (!novoAgendamento.chegada) mensagens.push('Informe o retorno do novo agendamento.');
    if (!novoAgendamento.veiculoId) mensagens.push('Escolha o veículo que atenderá o novo agendamento.');
    if (!novoAgendamento.motorista) mensagens.push('Informe uma matrícula válida para preencher o motorista.');
    if (!novoAgendamento.destino) mensagens.push('Informe o destino do novo agendamento.');

    if (novoAgendamento.saida && novoAgendamento.chegada) {
      const saida = new Date(novoAgendamento.saida).getTime();
      const chegada = new Date(novoAgendamento.chegada).getTime();
      if (Number.isNaN(saida) || Number.isNaN(chegada) || saida >= chegada) {
        mensagens.push('A saída deve ser anterior ao retorno do novo agendamento.');
      }
    }

    const remanejosValidos = itensRemanejo.filter((item) => item.agendamentoId || item.novoVeiculoId);
    const idsRemanejados = new Set<string>();

    remanejosValidos.forEach((item, indice) => {
      const numero = indice + 1;
      const agendamento = agendamentos.find((ag) => ag.id === item.agendamentoId);

      if (!item.agendamentoId) mensagens.push(`Linha ${numero}: selecione o agendamento que será remanejado.`);
      if (!item.novoVeiculoId) mensagens.push(`Linha ${numero}: selecione o novo veículo do agendamento remanejado.`);
      if (!item.responsavelConferencia.trim()) mensagens.push(`Linha ${numero}: informe quem conferiu materiais/documentos.`);
      if (!item.materiaisConferidos) mensagens.push(`Linha ${numero}: confirme a transferência dos materiais.`);
      if (!item.chaveDocumentoConferidos) mensagens.push(`Linha ${numero}: confirme chave, documento e itens obrigatórios.`);
      if (!item.motoristaAvisado) mensagens.push(`Linha ${numero}: confirme que o motorista foi avisado da troca.`);
      if (item.agendamentoId && idsRemanejados.has(item.agendamentoId)) {
        mensagens.push(`Linha ${numero}: o mesmo agendamento foi escolhido mais de uma vez.`);
      }
      if (item.agendamentoId) idsRemanejados.add(item.agendamentoId);
      if (agendamento && item.novoVeiculoId === agendamento.veiculoId) {
        mensagens.push(`Linha ${numero}: escolha um veículo diferente do veículo atual.`);
      }
    });

    const alocacoes: AlocacaoSimulada[] = agendamentos.map((agendamento) => {
      const remanejo = remanejosValidos.find((item) => item.agendamentoId === agendamento.id);
      return {
        id: agendamento.id,
        saida: agendamento.saida,
        chegada: agendamento.chegada,
        veiculoId: remanejo?.novoVeiculoId || agendamento.veiculoId,
        destino: agendamento.destino,
        motorista: agendamento.motorista,
      };
    });

    if (novoAgendamento.saida && novoAgendamento.chegada && novoAgendamento.veiculoId) {
      alocacoes.push({
        id: 'novo-agendamento',
        saida: novoAgendamento.saida,
        chegada: novoAgendamento.chegada,
        veiculoId: novoAgendamento.veiculoId,
        destino: novoAgendamento.destino,
        motorista: novoAgendamento.motorista,
      });
    }

    for (let i = 0; i < alocacoes.length; i += 1) {
      for (let j = i + 1; j < alocacoes.length; j += 1) {
        const atual = alocacoes[i];
        const comparado = alocacoes[j];

        if (
          atual.veiculoId &&
          atual.veiculoId === comparado.veiculoId &&
          intervaloSobrepoe(atual.saida, atual.chegada, comparado.saida, comparado.chegada)
        ) {
          mensagens.push(
            `Conflito no plano: ${getVeiculoNome(atual.veiculoId)} ficaria em dois agendamentos ao mesmo tempo (${atual.destino || atual.motorista} x ${comparado.destino || comparado.motorista}).`,
          );
        }
      }
    }

    return { ok: mensagens.length === 0, mensagens };
  }, [agendamentos, getVeiculoNome, itensRemanejo, novoAgendamento]);

  const resultadoValidacao = useMemo(() => validarPlano(), [validarPlano]);

  const adicionarLinhaRemanejo = () => {
    setItensRemanejo((atual) => [...atual, { ...itemRemanejoInicial }]);
  };

  const removerLinhaRemanejo = (indice: number) => {
    setItensRemanejo((atual) => atual.filter((_, itemIndice) => itemIndice !== indice));
  };

  const atualizarItemRemanejo = <K extends keyof ItemRemanejo>(indice: number, campo: K, valor: ItemRemanejo[K]) => {
    setItensRemanejo((atual) =>
      atual.map((item, itemIndice) => (itemIndice === indice ? { ...item, [campo]: valor } : item)),
    );
  };

  const aplicarPlano = async () => {
    const validacao = validarPlano();
    if (!validacao.ok) {
      toast.error('Revise o plano de remanejo antes de aplicar.');
      return;
    }

    const remanejosValidos = itensRemanejo.filter((item) => item.agendamentoId && item.novoVeiculoId);

    try {
      setSalvando(true);

      await Promise.all(
        remanejosValidos.map((item) => {
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
        observacoes: [
          novoAgendamento.observacoes,
          `Criado pela tela de REMANEJO em ${new Date().toLocaleString('pt-BR')}.`,
          remanejosValidos.length > 0
            ? `Remanejos vinculados: ${remanejosValidos.map((item) => item.agendamentoId).join(', ')}.`
            : 'Sem remanejos necessários.',
        ]
          .filter(Boolean)
          .join('\n'),
      });

      toast.success('Plano de remanejo aplicado e novo agendamento criado.');
      setNovoAgendamento(novoAgendamentoInicial);
      setItensRemanejo([{ ...itemRemanejoInicial }]);
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
              <h1 className="mt-2 text-3xl font-bold">Central de encaixe e troca segura de veículos</h1>
              <p className="mt-3 max-w-4xl text-amber-50">
                Monte o plano antes de trocar um carro: veja conflitos, escolha quem será realocado,
                confirme materiais/documentos e registre a mudança para evitar saídas sem equipamentos.
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
                    <p className="text-sm text-gray-500">Agendamentos ativos</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{agendamentos.length}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Conflitos no veículo escolhido</p>
                    <p className={`mt-2 text-3xl font-bold ${agendamentosConflitantes.length ? 'text-red-600' : 'text-green-700'}`}>
                      {agendamentosConflitantes.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Status do plano</p>
                    <p className={`mt-2 text-lg font-bold ${resultadoValidacao.ok ? 'text-green-700' : 'text-amber-700'}`}>
                      {resultadoValidacao.ok ? 'Pronto para aplicar' : 'Pendente de revisão'}
                    </p>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">1. Novo agendamento prioritário</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Use esta área para cadastrar a demanda que precisa ser encaixada, como deslocamentos de gerente.
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
                        <span className="text-sm font-medium text-gray-700">Veículo que atenderá a nova demanda</span>
                        <select
                          value={novoAgendamento.veiculoId}
                          onChange={(event) => setNovoAgendamento((atual) => ({ ...atual, veiculoId: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                        >
                          <option value="">Selecione o veículo</option>
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
                      Confira quais veículos já estão comprometidos no período escolhido antes de montar o remanejo.
                    </p>

                    <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                      {veiculosComDiagnostico.map(({ veiculo, conflitos }) => (
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
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${conflitos.length ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {conflitos.length ? 'Ocupado' : 'Disponível'}
                            </span>
                          </div>
                          {conflitos.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {conflitos.map((agendamento) => (
                                <div key={agendamento.id} className="rounded-lg bg-white p-3 text-sm text-gray-700 shadow-sm">
                                  <p className="font-semibold text-gray-900">{agendamento.destino}</p>
                                  <p>{formatarDataHora(agendamento.saida)} até {formatarDataHora(agendamento.chegada)}</p>
                                  <p>Motorista: {agendamento.motorista || '-'}</p>
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">3. Plano de remanejo com conferência obrigatória</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Cada linha troca o veículo de um agendamento existente. A aplicação só é liberada após confirmar materiais,
                        chave/documentos e aviso ao motorista.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={somentePeriodo}
                        onChange={(event) => setSomentePeriodo(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      Mostrar somente agendamentos do período
                    </label>
                  </div>

                  <div className="mt-5 space-y-5">
                    {itensRemanejo.map((item, indice) => {
                      const agendamentoSelecionado = agendamentos.find((agendamento) => agendamento.id === item.agendamentoId);

                      return (
                        <div key={indice} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <label className="block">
                              <span className="text-sm font-medium text-gray-700">Agendamento que será remanejado</span>
                              <select
                                value={item.agendamentoId}
                                onChange={(event) => atualizarItemRemanejo(indice, 'agendamentoId', event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                              >
                                <option value="">Selecione o agendamento</option>
                                {agendamentosParaSelecao.map((agendamento) => (
                                  <option key={agendamento.id} value={agendamento.id}>
                                    {formatarDataHora(agendamento.saida)} | {getVeiculoNome(agendamento.veiculoId)} | {agendamento.destino}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-sm font-medium text-gray-700">Novo veículo para este agendamento</span>
                              <select
                                value={item.novoVeiculoId}
                                onChange={(event) => atualizarItemRemanejo(indice, 'novoVeiculoId', event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                              >
                                <option value="">Selecione o novo veículo</option>
                                {veiculos.map((veiculo) => (
                                  <option key={veiculo.id} value={veiculo.id}>
                                    {veiculo.modelo} - {veiculo.placa}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {agendamentoSelecionado && (
                            <div className="mt-4 rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
                              <p className="font-semibold text-gray-900">Agendamento original</p>
                              <p>Veículo atual: {getVeiculoNome(agendamentoSelecionado.veiculoId)}</p>
                              <p>Destino: {agendamentoSelecionado.destino}</p>
                              <p>Motorista: {agendamentoSelecionado.motorista || '-'}</p>
                              <p>Período: {formatarDataHora(agendamentoSelecionado.saida)} até {formatarDataHora(agendamentoSelecionado.chegada)}</p>
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

                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removerLinhaRemanejo(indice)}
                              disabled={itensRemanejo.length === 1}
                              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remover linha
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={adicionarLinhaRemanejo}
                    className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    + Adicionar outro remanejo
                  </button>
                </section>

                <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">4. Revisão e aplicação</h2>
                  {resultadoValidacao.ok ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                      Plano validado sem conflitos. Ao aplicar, o sistema atualiza os agendamentos remanejados e cria a nova demanda.
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
                        setItensRemanejo([{ ...itemRemanejoInicial }]);
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
