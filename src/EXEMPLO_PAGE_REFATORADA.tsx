/**
 * Exemplo de página refatorada - Muito mais simples e fácil de manter
 * 
 * ANTES: agendar/page.tsx tinha 600+ linhas, muita lógica misturada
 * DEPOIS: Usa hooks customizados que encapsulam toda a lógica
 */

'use client';

import { useEffect } from 'react';
import { useAgendamentos, useVeiculos, useMotoristas, useForm } from '@/src/hooks';
import { Card, Button, Input, Select, Alert, Loading } from '@/src/components';
import { AgendamentoDados } from '@/src/types';

const initialValues: AgendamentoDados = {
  saida: '',
  chegada: '',
  veiculoId: '',
  motorista: '',
  matricula: '',
  telefone: '',
  destino: '',
  observacoes: '',
};

/**
 * EXEMPLO DE USO DA NOVA ARQUITETURA
 * Veja como ficou muito mais limpo e legível
 */
export default function AgendarPageNova() {
  // Hooks customizados que encapsulam toda a lógica
  const agendamentos = useAgendamentos();
  const veiculos = useVeiculos();
  const motoristas = useMotoristas();
  const form = useForm(initialValues);

  // Carregar dados iniciais
  useEffect(() => {
    veiculos.listar();
    motoristas.listar();
  }, []);

  // Submeter formulário
  const onSubmit = form.handleSubmit(async (dados) => {
    await agendamentos.criar(dados);
    form.reset();
    // TODO: Mostrar sucesso e redirecionar
  });

  const veiculosOptions = veiculos.veiculos.map((v) => ({
    value: v.id,
    label: `${v.placa} - ${v.modelo}`,
  }));

  const motoristasOptions = motoristas.motoristas.map((m) => ({
    value: m.id,
    label: `${m.nome} (${m.matricula})`,
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Card title="Agendar Veículo" subtitle="Preencha os dados abaixo">
          {/* Mostrar erros */}
          {form.errors.submit && (
            <Alert
              type="error"
              message={form.errors.submit}
              onClose={() => form.setErrors({})}
            />
          )}

          {/* Mostrar loading */}
          {agendamentos.loading && <Loading />}

          {/* Formulário */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Seção: Veículo */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Seleção de Veículo</h3>

              <Select
                label="Veículo"
                name="veiculoId"
                value={form.values.veiculoId}
                onChange={form.handleChange}
                options={veiculosOptions}
                placeholder="Selecione um veículo"
                error={form.errors.veiculoId}
                required
              />
            </div>

            {/* Seção: Motorista */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Dados do Motorista</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome"
                  name="motorista"
                  value={form.values.motorista}
                  onChange={form.handleChange}
                  placeholder="Nome do motorista"
                  error={form.errors.motorista}
                />

                <Input
                  label="Matrícula"
                  name="matricula"
                  value={form.values.matricula}
                  onChange={form.handleChange}
                  placeholder="Matrícula"
                  error={form.errors.matricula}
                />

                <Input
                  label="Telefone"
                  name="telefone"
                  type="tel"
                  value={form.values.telefone}
                  onChange={form.handleChange}
                  placeholder="Telefone"
                  error={form.errors.telefone}
                />
              </div>
            </div>

            {/* Seção: Data e Hora */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Data e Hora</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Saída"
                  name="saida"
                  type="datetime-local"
                  value={form.values.saida}
                  onChange={form.handleChange}
                  error={form.errors.saida}
                  required
                />

                <Input
                  label="Chegada"
                  name="chegada"
                  type="datetime-local"
                  value={form.values.chegada}
                  onChange={form.handleChange}
                  error={form.errors.chegada}
                  required
                />
              </div>
            </div>

            {/* Seção: Detalhes */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Detalhes da Viagem</h3>

              <Input
                label="Destino"
                name="destino"
                value={form.values.destino}
                onChange={form.handleChange}
                placeholder="Destino da viagem"
                error={form.errors.destino}
              />

              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={form.values.observacoes}
                  onChange={(e) =>
                    form.setValue('observacoes' as any, e.target.value)
                  }
                  placeholder="Observações adicionais"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" loading={agendamentos.loading}>
                Agendar Veículo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => form.reset()}
              >
                Limpar
              </Button>
            </div>
          </form>
        </Card>

        {/* Exibir agendamentos criados */}
        {agendamentos.agendamentos.length > 0 && (
          <Card title="Agendamentos Recentes" className="mt-6">
            <div className="space-y-2">
              {agendamentos.agendamentos.slice(0, 5).map((agendar) => (
                <div
                  key={agendar.id}
                  className="p-3 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <p className="font-medium">{agendar.destino}</p>
                  <p className="text-gray-600">
                    {agendar.saida} - {agendar.chegada}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
