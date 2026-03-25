/**
 * Utilitários e helpers para o sistema
 * Funções comuns reutilizáveis
 */

/**
 * Formatar data no padrão brasileiro
 */
export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formatar hora
 */
export function formatarHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formatar data e hora juntos
 */
export function formatarDataHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR');
}

/**
 * Validar email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validar telefone
 */
export function validarTelefone(telefone: string): boolean {
  const regex = /^(\d{2})\s?(\d{4,5})\s?(\d{4})$/;
  return regex.test(telefone);
}

/**
 * Formatar telefone para padrão brasileiro
 */
export function formatarTelefone(telefone: string): string {
  const cleaned = telefone.replace(/\D/g, '');
  if (cleaned.length !== 11) return telefone;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

/**
 * Validar placa de veículo
 */
export function validarPlaca(placa: string): boolean {
  // Placa antiga: ABC-1234 ou nova: ABC1D23
  const oldPlate = /^[A-Z]{3}-\d{4}$/;
  const newPlate = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  return oldPlate.test(placa) || newPlate.test(placa);
}

/**
 * Comparar datas
 */
export function compararDatas(data1: Date, data2: Date): number {
  return data1.getTime() - data2.getTime();
}

/**
 * Verificar se data é válida
 */
export function dataValida(data: string | Date): boolean {
  const d = new Date(data);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Delay/sleep para testes assíncronos
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fazer retry de operação com falha
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opcoes = { tentativas: 3, delay: 1000 }
): Promise<T> {
  let ultimoErro: Error | undefined;

  for (let i = 0; i < opcoes.tentativas; i++) {
    try {
      return await fn();
    } catch (erro) {
      ultimoErro = erro as Error;
      if (i < opcoes.tentativas - 1) {
        await delay(opcoes.delay);
      }
    }
  }

  throw ultimoErro || new Error('Operação falhou após múltiplas tentativas');
}

/**
 * Normalizar string para busca
 */
export function normalizarBusca(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
}

/**
 * Filtrar array por busca de texto
 */
export function filtrarPorBusca<T extends Record<string, any>>(
  items: T[],
  termo: string,
  campos: (keyof T)[]
): T[] {
  const termoBuscaNormalizado = normalizarBusca(termo);

  return items.filter((item) =>
    campos.some((campo) => {
      const valor = String(item[campo] || '');
      return normalizarBusca(valor).includes(termoBuscaNormalizado);
    })
  );
}

/**
 * Agrupar array por propriedade
 */
export function agrupar<T extends Record<string, any>, K extends keyof T>(
  items: T[],
  chave: K
): Record<string | number | symbol, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = item[chave];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string | number | symbol, T[]>
  );
}

/**
 * Clonar objeto (deep copy)
 */
export function clonarObjeto<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Mesclar objetos
 */
export function mesclarObjetos<T extends Record<string, any>>(
  ...objetos: Partial<T>[]
): T {
  return Object.assign({}, ...objetos) as T;
}
