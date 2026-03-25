/**
 * Hook customizado para gerenciar motoristas
 */

import { useState, useCallback, useEffect } from 'react';
import { getDb } from '@/app/lib/firebase';
import { Motorista } from '@/src/types';
import { MotoristaService } from '@/src/services/motoristaService';

export function useMotoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<MotoristaService | null>(null);

  useEffect(() => {
    try {
      const db = getDb();
      setService(new MotoristaService(db));
    } catch (err) {
      setError('Falha ao inicializar serviço de motoristas');
    }
  }, []);

  const listar = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    setError(null);
    try {
      const dados = await service.listar();
      setMotoristas(dados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar motoristas');
    } finally {
      setLoading(false);
    }
  }, [service]);

  const criar = useCallback(
    async (dados: Omit<Motorista, 'id'>) => {
      if (!service) throw new Error('Serviço não inicializado');
      try {
        const id = await service.criar(dados);
        await listar();
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar motorista';
        setError(message);
        throw err;
      }
    },
    [service, listar]
  );

  const atualizar = useCallback(
    async (id: string, dados: Partial<Motorista>) => {
      if (!service) throw new Error('Serviço não inicializado');
      try {
        await service.atualizar(id, dados);
        await listar();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar motorista';
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
        const message = err instanceof Error ? err.message : 'Erro ao deletar motorista';
        setError(message);
        throw err;
      }
    },
    [service, listar]
  );

  const buscarPorMatricula = useCallback(
    async (matricula: string) => {
      if (!service) return null;
      try {
        return await service.buscarPorMatricula(matricula);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro na busca');
        return null;
      }
    },
    [service]
  );

  return {
    motoristas,
    loading,
    error,
    listar,
    criar,
    atualizar,
    deletar,
    buscarPorMatricula,
  };
}
