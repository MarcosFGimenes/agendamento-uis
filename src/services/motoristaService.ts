/**
 * Serviço para gerenciar motoristas
 */

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Firestore,
} from 'firebase/firestore';
import { Motorista } from '@/src/types';

export class MotoristaService {
  private db: Firestore;
  private colName = 'motoristas';

  constructor(db: Firestore) {
    this.db = db;
  }

  async listar(): Promise<Motorista[]> {
    try {
      const snapshot = await getDocs(collection(this.db, this.colName));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Motorista[];
    } catch (error) {
      console.error('Erro ao listar motoristas:', error);
      throw new Error('Falha ao buscar motoristas');
    }
  }

  async criar(dados: Omit<Motorista, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.db, this.colName), dados);
    return docRef.id;
  }

  async atualizar(id: string, dados: Partial<Motorista>): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    await updateDoc(docRef, dados);
  }

  async deletar(id: string): Promise<void> {
    const docRef = doc(this.db, this.colName, id);
    await deleteDoc(docRef);
  }

  async buscarPorMatricula(matricula: string): Promise<Motorista | null> {
    const motoristas = await this.listar();
    return motoristas.find((m) => m.matricula === matricula) || null;
  }
}
