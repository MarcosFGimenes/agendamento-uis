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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [reverseGeocodeAddress, setReverseGeocodeAddress] = useState<string | null>(null);

  // Reverse geocoding function using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AgendamentoUIS/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Falha na geocodificação reversa');
      }

      const data = await response.json();
      return data.display_name || 'Endereço não encontrado';
    } catch (error) {
      console.error('Erro na geocodificação reversa:', error);
      return 'Erro ao obter endereço';
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Erro ao obter localização do usuário:', error);
        },
        { timeout: 10000 }
      );
    }
  }, []);

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

  useEffect(() => {
    if (posicao && userLocation) {
      const lat = typeof posicao.latitude === 'number' ? posicao.latitude : parseFloat(posicao.latitude as string);
      const lng = typeof posicao.longitude === 'number' ? posicao.longitude : parseFloat(posicao.longitude as string);

      if (!isNaN(lat) && !isNaN(lng)) {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        setDistance(Math.round(dist * 10) / 10); // Round to 1 decimal place
      }
    }
  }, [posicao, userLocation]);

  useEffect(() => {
    const obterEnderecoPreciso = async () => {
      if (posicao) {
        const lat = typeof posicao.latitude === 'number' ? posicao.latitude : parseFloat(posicao.latitude as string);
        const lng = typeof posicao.longitude === 'number' ? posicao.longitude : parseFloat(posicao.longitude as string);

        if (!isNaN(lat) && !isNaN(lng)) {
          const endereco = await reverseGeocode(lat, lng);
          setReverseGeocodeAddress(endereco);
        }
      }
    };

    obterEnderecoPreciso();
  }, [posicao]);

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
  const address = reverseGeocodeAddress || posicao.address || 'Endereço não disponível';

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
        {!(isNaN(latitude) || isNaN(longitude)) && (
          <p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Abrir no Google Maps
            </a>
          </p>
        )}
        <p><strong>Velocidade:</strong> {speed} km/h</p>
        {distance !== null && (
          <p><strong>Distância:</strong> {distance} km da sua localização</p>
        )}
        <p><strong>Última atualização:</strong> {posicao.localDateTime || posicao.dateTime}</p>
      </div>

      <div className="h-48 w-full rounded-md overflow-hidden">
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
                {distance !== null && (
                  <p><strong>Distância:</strong> {distance} km</p>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default VehicleLocation;