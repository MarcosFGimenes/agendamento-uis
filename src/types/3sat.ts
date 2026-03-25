/**
 * Tipos relacionados à API 3SAT de rastreamento
 */

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export interface Dispositivo3Sat {
  id: string;
  placa: string;
  nome: string;
  grupo: string;
  motorista: string;
  local: string;
}

export interface Posicao3Sat {
  id: string;
  timestamp: string;
  velocidade: number | null;
  coordenadas: Coordenadas;
  status: 'online' | 'offline' | 'unknown';
}

export interface Dispositivo3SatComPosicao extends Dispositivo3Sat {
  ultimaPosicao?: Posicao3Sat;
}
