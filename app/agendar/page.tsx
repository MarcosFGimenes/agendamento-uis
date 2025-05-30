'use client';

import { useState, useEffect } from 'react';
import { listarVeiculosComStatus } from '@/app/lib/veiculos';
import { criarAgendamento } from '@/app/lib/agendamentos';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { useRouter } from 'next/navigation';
import Comprovante from '../confirmacao/comprovante';

type AgendamentoDados = {
  saida: string;
  chegada: string;
  veiculoId: string;
  motorista: string;
  matricula: string;
  telefone: string;
  destino: string;
  observacoes: string;
};

export default function AgendarPage() {
  const router = useRouter();
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [dados, setDados] = useState<AgendamentoDados>({
    saida: '',
    chegada: '',
    veiculoId: '',
    motorista: '',
    matricula: '',
    telefone: '',
    destino: '',
    observacoes: '',
  });
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mostrarDisponiveis, setMostrarDisponiveis] = useState<boolean>(true);
  const [datasMaximas, setDatasMaximas] = useState<{ [key: string]: string }>({});
  const [mostrarComprovante, setMostrarComprovante] = useState<boolean>(false);
  const [dadosComprovante, setDadosComprovante] = useState<any>(null);

  useEffect(() => {
    const carregarVeiculos = async () => {
      if (!dados.saida) {
        setVeiculos([]);
        setDados((prev) => ({ ...prev, veiculoId: '' }));
        return;
      }

      setCarregando(true);
      try {
        const lista = await listarVeiculosComStatus(dados.saida);
        setVeiculos(lista); // Carrega todos os veículos, disponíveis ou não
      } catch (error) {
        setErro('Erro ao carregar veículos. Tente novamente.');
        console.error('Erro ao carregar veículos:', error);
      } finally {
        setCarregando(false);
      }
    };
    carregarVeiculos();
  }, [dados.saida]);

  useEffect(() => {
    const carregarDatasMaximas = async () => {
      const colAgendamentos = collection(db, 'agendamentos');
      const agendamentosSnap = await getDocs(colAgendamentos);
      const agendamentos = agendamentosSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as { veiculoId: string; saida: string; chegada: string; concluido: boolean }),
      }));

      const novasDatasMaximas: { [key: string]: string } = {};
      veiculos.forEach((veiculo) => {
        const agendamentosVeiculo = agendamentos
          .filter(
            (ag) =>
              ag.veiculoId === veiculo.id &&
              !ag.concluido &&
              new Date(ag.saida) >= new Date(dados.saida)
          )
          .sort((a, b) => new Date(a.saida).getTime() - new Date(b.saida).getTime());

        if (agendamentosVeiculo.length > 0) {
          const proximoAgendamento = agendamentosVeiculo[0];
          const saidaProxima = new Date(proximoAgendamento.saida);
          novasDatasMaximas[veiculo.id] = saidaProxima.toLocaleString('pt-BR');
        } else {
          novasDatasMaximas[veiculo.id] = veiculo.status?.disponivel
            ? 'Disponível sem restrições'
            : 'Indisponível no momento';
        }
      });

      setDatasMaximas(novasDatasMaximas);
    };

    if (veiculos.length > 0 && dados.saida) {
      carregarDatasMaximas();
    }
  }, [veiculos, dados.saida]);

  const formatarTelefone = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 2) return apenasNumeros;
    if (apenasNumeros.length <= 7) return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
    if (apenasNumeros.length <= 11)
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7, 11)}`;
  };

  const validarAgendamento = async () => {
    const camposObrigatorios = [
      { nome: 'Data e Hora de Saída', valor: dados.saida },
      { nome: 'Data e Hora de Chegada', valor: dados.chegada },
      { nome: 'Veículo', valor: dados.veiculoId },
      { nome: 'Motorista', valor: dados.motorista },
      { nome: 'Matrícula', valor: dados.matricula },
      { nome: 'Telefone', valor: dados.telefone },
      { nome: 'Destino', valor: dados.destino },
    ];

    const camposFaltando = camposObrigatorios
      .filter((campo) => !campo.valor)
      .map((campo) => campo.nome);

    if (camposFaltando.length > 0) {
      return `Por favor, preencha os campos obrigatórios: ${camposFaltando.join(', ')}.`;
    }

    const agora = new Date();
    const saida = new Date(dados.saida);
    const chegada = new Date(dados.chegada);
    if (saida < agora) {
      return 'A data de saída não pode ser anterior à data atual.';
    }
    if (chegada <= saida) {
      return 'A data de chegada deve ser posterior à data de saída.';
    }

    const telefoneLimpo = dados.telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      return 'O número de telefone deve ter 10 ou 11 dígitos.';
    }

    const colAgendamentos = collection(db, 'agendamentos');
    const agendamentosSnap = await getDocs(colAgendamentos);
    const agendamentos = agendamentosSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as { veiculoId: string; saida: string; chegada: string; concluido: boolean }),
    }));

    const agendamentoConflitante = agendamentos.find((ag) => {
      if (ag.veiculoId !== dados.veiculoId || ag.concluido) return false;
      const novaSaida = new Date(dados.saida);
      const novaChegada = new Date(dados.chegada);
      const agSaida = new Date(ag.saida);
      const agChegada = new Date(ag.chegada);

      const horaMinimaEntrega = new Date(agSaida.getTime() - 60 * 60 * 1000);
      return novaChegada > horaMinimaEntrega && novaSaida < agChegada;
    });

    if (agendamentoConflitante) {
      const saidaConflito = new Date(agendamentoConflitante.saida).toLocaleString('pt-BR');
      const horaMinimaEntrega = new Date(
        new Date(agendamentoConflitante.saida).getTime() - 60 * 60 * 1000
      ).toLocaleString('pt-BR');
      return `Conflito: Este veículo está agendado com saída em ${saidaConflito}. A entrega deve ser até ${horaMinimaEntrega}.`;
    }

    const veiculoSelecionado = veiculos.find((v) => v.id === dados.veiculoId);
    if (!veiculoSelecionado || !veiculoSelecionado.status?.disponivel) {
      return 'O veículo selecionado não está disponível para o horário escolhido.';
    }

    return '';
  };

  const handleSubmit = async () => {
    setErro('');
    setCarregando(true);
    try {
      const mensagemErro = await validarAgendamento();
      if (mensagemErro) {
        setErro(mensagemErro);
        setCarregando(false);
        return;
      }

      await criarAgendamento(dados);
      setDadosComprovante({
        motorista: dados.motorista,
        matricula: dados.matricula,
        telefone: dados.telefone,
        destino: dados.destino,
        observacoes: dados.observacoes,
        veiculo: veiculos.find((v) => v.id === dados.veiculoId)?.modelo || 'Desconhecido',
        placa: veiculos.find((v) => v.id === dados.veiculoId)?.placa || 'Não informada',
        saida: dados.saida,
        chegada: dados.chegada,
      });
      setMostrarComprovante(true);
      setDados({
        saida: '',
        chegada: '',
        veiculoId: '',
        motorista: '',
        matricula: '',
        telefone: '',
        destino: '',
        observacoes: '',
      });
    } catch (error) {
      setErro('Erro ao criar agendamento. Tente novamente.');
      console.error('Erro ao criar agendamento:', error);
    } finally {
      setCarregando(false);
    }
  };

  const veiculosFiltrados = mostrarDisponiveis
    ? veiculos.filter((v) => v.status?.disponivel)
    : veiculos;

  const getMinDate = () => {
    if (typeof window === 'undefined') return '';
    return new Date().toISOString().slice(0, 16);
  };

  return (
    <>
      <main className="min-h-screen bg-green-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold text-green-800 mb-6 sm:mb-8">
            Solicitação de Agendamento
          </h1>

          {erro && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-sm flex justify-between items-center">
              {erro}
              <button
                onClick={() => setErro('')}
                className="text-red-700 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-medium text-green-700 mb-3">Seleção de Veículo</h2>
            <div className="flex items-center mb-4">
              <label className="mr-3 text-sm font-medium text-green-700">
                Mostrar apenas disponíveis
              </label>
              <input
                type="checkbox"
                checked={mostrarDisponiveis}
                onChange={() => setMostrarDisponiveis(!mostrarDisponiveis)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded"
              />
            </div>
            {carregando ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
              </div>
            ) : veiculosFiltrados.length === 0 ? (
              <p className="text-green-600 text-sm">
                {mostrarDisponiveis
                  ? 'Nenhum veículo disponível para a data selecionada.'
                  : 'Nenhum veículo encontrado.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {veiculosFiltrados.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => v.status.disponivel && setDados({ ...dados, veiculoId: v.id })}
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ${
                      v.status.disponivel
                        ? dados.veiculoId === v.id
                          ? 'bg-green-200 border-green-400'
                          : 'bg-white border-green-200 hover:bg-green-100'
                        : 'bg-gray-100 border-gray-200 cursor-not-allowed'
                    } border`}
                  >
                    <p className="font-semibold text-green-900 text-sm sm:text-base">{v.modelo}</p>
                    <p className="text-xs sm:text-sm text-green-600">{v.placa}</p>
                    <p className="text-xs text-green-500 mt-1">
                      {v.status.disponivel
                        ? `Disponível até: ${datasMaximas[v.id] || 'Carregando...'}`
                        : `Indisponível até: ${v.status.indisponivelAte ? new Date(v.status.indisponivelAte).toLocaleString('pt-BR') : 'Carregando...'}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-green-200 mb-20 sm:mb-8">
            <h2 className="text-lg font-medium text-green-700 mb-4">Detalhes do Agendamento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Data e Hora de Saída
                </label>
                <input
                  type="datetime-local"
                  value={dados.saida}
                  onChange={(e) => setDados({ ...dados, saida: e.target.value })}
                  min={getMinDate()}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Data e Hora de Chegada
                </label>
                <input
                  type="datetime-local"
                  value={dados.chegada}
                  onChange={(e) => setDados({ ...dados, chegada: e.target.value })}
                  min={dados.saida || getMinDate()}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Motorista
                </label>
                <input
                  type="text"
                  value={dados.motorista}
                  onChange={(e) => setDados({ ...dados, motorista: e.target.value })}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  placeholder="Nome do motorista"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={dados.matricula}
                  onChange={(e) => setDados({ ...dados, matricula: e.target.value })}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  placeholder="Matrícula"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Telefone do motorista
                </label>
                <input
                  type="tel"
                  value={dados.telefone}
                  onChange={(e) => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  placeholder="(XX) 9XXXX-XXXX"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Destino
                </label>
                <input
                  type="text"
                  value={dados.destino}
                  onChange={(e) => setDados({ ...dados, destino: e.target.value })}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  placeholder="Destino"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={dados.observacoes}
                  onChange={(e) => setDados({ ...dados, observacoes: e.target.value })}
                  className="w-full p-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                  placeholder="Notas ou informações adicionais"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-green-50 sm:static sm:p-0 sm:bg-transparent sm:flex sm:space-x-4">
            <button
              onClick={handleSubmit}
              disabled={carregando}
              className={`w-full sm:w-auto bg-green-600 text-white py-2 px-4 rounded-md transition-colors duration-200 text-sm sm:text-base ${
                carregando ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              {carregando ? 'Processando...' : 'Solicitar Agendamento'}
            </button>
            <button
              onClick={() => router.push('/veiculos')}
              className="w-full sm:w-auto bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200 text-sm sm:text-base mt-2 sm:mt-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      </main>
      {mostrarComprovante && dadosComprovante && (
        <Comprovante
          agendamento={dadosComprovante}
          onClose={() => setMostrarComprovante(false)}
        />
      )}
    </>
  );
}