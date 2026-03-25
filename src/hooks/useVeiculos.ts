/**
 * Hook customizado para gerenciar veículos
 */

import { useState, useCallback, useEffect } from 'react';
import { getDb } from '@/app/lib/firebase';
import { Veiculo, VeiculoComStatus } from '@/src/types';
import { VeiculoService } from '@/src/services/veiculoService';

export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<VeiculoService | null>(null);

  useEffect(() => {
    try {
      const db = getDb();
      setService(new VeiculoService(db));
    } catch (err) {
      setError('Falha ao inicializar serviço de veículos');
    }
  }, []);

  const listar = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    setError(null);
    try {
      const dados = await service.listar();
      setVeiculos(dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar veículos');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const listarComStatus = useCallback(async () => {
    if (!service) return [];
    setLoading(true);
    setError(null);
    try {
      const dados = await service.listarComStatus();
      setVeiculos(dados as any);
      return dados;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar veículos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [service]);

  const criar = useCallback(
    async (dados: Omit<Veiculo, 'id'>) => {
      if (!service) throw new Error('Serviço não inicializado');
      setLoading(true);
      setError(null);
      try {
        const id = await service.criar(dados);
        await listar();
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar veículo';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service, listar]
  );

  const atualizar = useCallback(
    async (id: string, dados: Partial<Veiculo>) => {
      if (!service) throw new Error('Serviço não inicializado');
      try {
        await service.atualizar(id, dados);
        await listar();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar veículo';
        setError(message);
        throw err;
      }
    },
    [service, listar]
  );

  const deletar = useCallback(
    async (id: string) => {
      if (!service) throw new Error('Serviço não inicializado');
      try {
        await service.deletar(id);
        await listar();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao deletar veículo';
        setError(message);
        throw err;
      }
    },
    [service, listar]
  );

  return {
    veiculos,
    loading,
    error,
    listar,
    listarComStatus,
    criar,
    atualizar,
    deletar,
  };
}
