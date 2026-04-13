'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { consultarUltimaPosicao, Posicao3Sat } from '@/app/lib/3sat';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VehicleLocationProps {
  placa: string;
}

const VehicleLocation = ({ placa }: VehicleLocationProps) => {
  const [posicao, setPosicao] = useState<Posicao3Sat | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const buscarPosicao = async () => {
      try {
        setCarregando(true);
        setErro(null);
        const posicoes = await consultarUltimaPosicao();
        const posicaoVeiculo = posicoes.find(p => p.deviceName === placa);
        setPosicao(posicaoVeiculo || null);
      } catch (error) {
        console.error('Erro ao buscar posição do veículo:', error);
        setErro('Erro ao carregar localização');
      } finally {
        setCarregando(false);
      }
    };

    if (placa) {
      buscarPosicao();
    }
  }, [placa]);

  if (carregando) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Carregando localização...</p>
      </div>
    );
  }

  if (erro || !posicao) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-sm text-gray-600">
          {erro || 'Localização não disponível'}
        </p>
      </div>
    );
  }

  const latitude = typeof posicao.latitude === 'number' ? posicao.latitude : parseFloat(posicao.latitude as string);
  const longitude = typeof posicao.longitude === 'number' ? posicao.longitude : parseFloat(posicao.longitude as string);
  const speed = typeof posicao.speed === 'number' ? posicao.speed : parseFloat(posicao.speed as string) || 0;

  if (isNaN(latitude) || isNaN(longitude)) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Coordenadas inválidas</p>
      </div>
    );
  }

  const isMoving = speed > 0;
  const status = isMoving ? 'Em movimento' : 'Parado';
  const address = posicao.address || 'Endereço não disponível';

  return (
    <div className="bg-gray-100 p-4 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Localização do Veículo</h4>
        <span className={`px-2 py-1 text-xs rounded-full ${isMoving ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {status}
        </span>
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Endereço:</strong> {address}</p>
        <p><strong>Velocidade:</strong> {speed} km/h</p>
        <p><strong>Última atualização:</strong> {posicao.localDateTime || posicao.dateTime}</p>
      </div>

      <div className="h-32 w-full rounded-md overflow-hidden">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]}>
            <Popup>
              <div className="text-xs">
                <p><strong>Placa:</strong> {placa}</p>
                <p><strong>Status:</strong> {status}</p>
                <p><strong>Endereço:</strong> {address}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default VehicleLocation;