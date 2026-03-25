/**
 * Hook customizado para gerenciar agendamentos
 * Encapsula toda a lógica de estado e operações
 */

import { useState, useCallback, useEffect } from 'react';
import { getDb } from '@/app/lib/firebase';
import { Agendamento, AgendamentoDados } from '@/src/types';
import { AgendamentoService } from '@/src/services/agendamentoService';

export function useAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<AgendamentoService | null>(null);

  // Inicializar serviço
  useEffect(() => {
    try {
      const db = getDb();
      setService(new AgendamentoService(db));
    } catch (err) {
      setError('Falha ao inicializar serviço de agendamentos');
    }
  }, []);

  const listar = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    setError(null);
    try {
      const dados = await service.listar();
      setAgendamentos(dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const criar = useCallback(
    async (dados: AgendamentoDados) => {
      if (!service) throw new Error('Serviço não inicializado');
      setLoading(true);
      setError(null);
      try {
        const id = await service.criar(dados);
        await listar(); // Recarregar lista
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar agendamento';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service, listar]
  );

  const atualizar = useCallback(
    async (id: string, dados: Partial<AgendamentoDados>) => {
      if (!service) throw new Error('Serviço não inicializado');
      setLoading(true);
      setError(null);
      try {
        await service.atualizar(id, dados);
        await listar();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar agendamento';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service, listar]
  );

  const deletar = useCallback(
    async (id: string) => {
      if (!service) throw new Error('Serviço não inicializado');
      setLoading(true);
      setError(null);
      try {
        await service.deletar(id);
        await listar();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao deletar agendamento';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service, listar]
  );

  const buscarPorVeiculoEMatricula = useCallback(
    async (veiculoId: string, matricula: string) => {
      if (!service) return [];
      try {
        return await service.buscarPorVeiculoEMatricula(veiculoId, matricula);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro na busca');
        return [];
      }
    },
    [service]
  );

  return {
    agendamentos,
    loading,
    error,
    listar,
    criar,
    atualizar,
    deletar,
    buscarPorVeiculoEMatricula,
  };
}
