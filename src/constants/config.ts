/**
 * Constantes da aplicação
 * Centralize valores que se repetem no sistema
 */

// URLs da aplicação
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AGENDAR: '/agendar',
  VEICULOS: '/veiculos',
  MOTORISTAS: '/motoristas',
  HISTORICO: '/historico',
  ADMINISTRACAO: '/administracao',
  GERENCIAR_AGENDAMENTOS: '/gerenciar-agendamentos',
  RESUMO_DIARIO: '/resumo-diario',
  RASTREAMENTO: '/rastreamento',
  RASTREAMENTO_3SAT: '/rastreamento/3sat',
} as const;

// Mensagens comuns
export const MENSAGENS = {
  CARREGANDO: 'Carregando...',
  ERRO_GERAL: 'Ocorreu um erro. Tente novamente.',
  SUCESSO: 'Operação realizada com sucesso!',
  CONFIRMA_DELECAO: 'Tem certeza que deseja deletar?',
  NENHUM_RESULTADO: 'Nenhum resultado encontrado.',
  CAMPO_OBRIGATORIO: 'Este campo é obrigatório.',
} as const;

// Status de agendamento
export const STATUS_AGENDAMENTO = {
  PENDENTE: 'pendente',
  ATIVO: 'ativo',
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado',
} as const;

// Status de veículo
export const STATUS_VEICULO = {
  DISPONIVEL: 'disponivel',
  INDISPONIVEL: 'indisponivel',
  MANUTENCAO: 'manutencao',
} as const;

// Paginação
export const PAGINACAO = {
  ITEMS_POR_PAGINA: 10,
  ITEMS_POR_PAGINA_MOBILE: 5,
} as const;

// Validações
export const VALIDACAO = {
  TELEFONE_MIN_DIGITS: 10,
  TELEFONE_MAX_DIGITS: 11,
  MATRICULA_MIN_LENGTH: 3,
  MATRICULA_MAX_LENGTH: 20,
  PLACA_LENGTH: 8,
} as const;

// Cores do sistema (Tailwind)
export const CORES = {
  PRIMARY: '#16a34a', // green-600
  SECONDARY: '#6b7280', // gray-500
  DANGER: '#dc2626', // red-600
  WARNING: '#f59e0b', // amber-500
  SUCCESS: '#10b981', // emerald-600
  INFO: '#3b82f6', // blue-600
} as const;

// Nomes de coleções Firebase
export const COLECOES = {
  AGENDAMENTOS: 'agendamentos',
  VEICULOS: 'veiculos',
  MOTORISTAS: 'motoristas',
  USUARIOS: 'usuarios',
  DISPOSITIVOS_3SAT: 'dispositivos_3sat',
} as const;

// Tempos (em ms)
export const TEMPOS = {
  DEBOUNCE_BUSCA: 300,
  TIMEOUT_REQUISICAO: 30000,
  INTERVALO_ATUALIZACAO: 5000,
  DURACAO_TOAST: 3000,
} as const;

// Padrões de formatação
export const FORMATOS = {
  DATA: 'dd/MM/yyyy',
  HORA: 'HH:mm',
  DATA_HORA: 'dd/MM/yyyy HH:mm',
  TELEFONE: '(XX) XXXXX-XXXX',
  PLACA: 'XXX-9999 ou XXX9X99',
} as const;

// Limites
export const LIMITES = {
  TAMANHO_MAXIMO_ARQUIVO_MB: 10,
  TAMANHO_MAXIMO_DESCRICAO: 1000,
  TAMANHO_MAXIMO_OBSERVACOES: 500,
  MAXIMO_AGENDAMENTOS_DIA: 100,
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[keyof typeof STATUS_AGENDAMENTO];
export type StatusVeiculo = (typeof STATUS_VEICULO)[keyof typeof STATUS_VEICULO];
