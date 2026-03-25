/**
 * Serviço para gerenciar agendamentos
 * Simplificado e sem duplicação de lógica
 */

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import { Agendamento, AgendamentoDados } from '@/src/types';

export class AgendamentoService {
  private db: Firestore;
  private colName = 'agendamentos';

  constructor(db: Firestore) {
    this.db = db;
  }

  async criar(dados: AgendamentoDados): Promise<string> {
    const docRef = await addDoc(collection(this.db, this.colName), {
      ...dados,
      concluido: false,
    });
    return docRef.id;
  }

  async listar(): Promise<Agendamento[]> {
    try {
      const snapshot = await getDocs(collection(this.db, this.colName));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Agendamento[];
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      throw new Error('Falha ao buscar agendamentos');
    }
  }

  async buscarPorVeiculoEMatricula(
    veiculoId: string,
    matricula: string
  ): Promise<Agendamento[]> {
    const matriculaNormalizada = matricula.trim();

    if (!veiculoId || !matriculaNormalizada) {
      return [];
    }

    const filtro = query(
      collection(this.db, this.colName),
      where('veiculoId', '==', veiculoId),
      where('matricula', '==', matriculaNormalizada)
    );

    const snapshot = await getDocs(filtro);
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Agendamento[]
  }

  async atualizar(id: string, dados: Partial<AgendamentoDados>): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    const dadosLimpos: Record<string, unknown> = {};
    
    Object.entries(dados).forEach(([key, value]) => {
      if (value !== undefined) {
        dadosLimpos[key] = value;
      }
    });

    await updateDoc(docRef, dadosLimpos);
  }

  async deletar(id: string): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    await deleteDoc(docRef);
  }

  async marcarConcluido(id: string): Promise<void> {
    await this.atualizar(id, { concluido: true } as any);
  }
}
