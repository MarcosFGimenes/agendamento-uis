import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Firestore,
} from 'firebase/firestore';
import { Veiculo, VeiculoComStatus } from '@/src/types';

export class VeiculoService {
  private db: Firestore;
  private colName = 'veiculos';

  constructor(db: Firestore) {
    this.db = db;
  }

  async listar(): Promise<Veiculo[]> {
    try {
      const snapshot = await getDocs(collection(this.db, this.colName));
      return snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<Veiculo, 'id'>),
      })) as Veiculo[];
    } catch (error) {
      console.error('Erro ao listar veículos:', error);
      throw new Error('Falha ao buscar veículos');
    }
  }

  async listarComStatus(): Promise<VeiculoComStatus[]> {
    // TODO: Implementar lógica de status (se for usar `listarVeiculosComStatus` no futuro)
    return this.listar() as Promise<VeiculoComStatus[]>;
  }

  async criar(dados: Omit<Veiculo, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.db, this.colName), dados);
    return docRef.id;
  }

  async atualizar(id: string, dados: Partial<Veiculo>): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    await updateDoc(docRef, dados);
  }

  async deletar(id: string): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    await deleteDoc(docRef);
  }

  async buscarPorId(id: string): Promise<Veiculo | null> {
    const veiculos = await this.listar();
    return veiculos.find((veiculo) => veiculo.id === id) || null;
  }
}
