# ⚡ Atalhos e Dicas de Desenvolvimento

## 📋 Templates Rápidos

### Template 1: Nova Página com Lista + CRUD

```tsx
'use client';

import { useEffect } from 'react';
import { useAgendamentos, useForm } from '@/hooks';
import { Card, Button, Input, Loading, Alert } from '@/components';
import { AgendamentoDados } from '@/types';

const initialValues: AgendamentoDados = { /* ... */ };

export default function ListaPage() {
  const { agendamentos, loading, error, listar, criar, deletar } = useAgendamentos();
  const form = useForm(initialValues);

  useEffect(() => {
    listar();
  }, [listar]);

  const onSubmit = form.handleSubmit(async (dados) => {
    await criar(dados);
    form.reset();
  });

  if (loading) return <Loading />;

  return (
    <Card title="Minha Lista">
      {error && <Alert type="error" message={error} />}

      <form onSubmit={onSubmit} className="space-y-4 mb-8">
        <Input label="Campo 1" name="campo1" />
        <Button type="submit">Adicionar</Button>
      </form>

      <div className="space-y-2">
        {agendamentos.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-3 border rounded">
            <p>{item.destino}</p>
            <Button 
              variant="danger" 
              size="small" 
              onClick={() => deletar(item.id)}
            >
              Deletar
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

### Template 2: Página só de Leitura

```tsx
'use client';

import { useEffect } from 'react';
import { useVeiculos } from '@/hooks';
import { Card, Loading, Alert } from '@/components';

export default function Leitura() {
  const { veiculos, loading, error, listar } = useVeiculos();

  useEffect(() => {
    listar();
  }, [listar]);

  if (loading) return <Loading />;
  if (error) return <Alert type="error" message={error} />;

  return (
    <Card title="Veículos">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {veiculos.map((veiculo) => (
          <div key={veiculo.id} className="p-4 border rounded">
            <h3 className="font-bold">{veiculo.placa}</h3>
            <p className="text-sm text-gray-600">{veiculo.modelo}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

### Template 3: Apenas Criar

```tsx
'use client';

import { useAgendamentos, useForm } from '@/hooks';
import { Card, Button, Input, Alert } from '@/components';
import { AgendamentoDados } from '@/types';

export default function Criar() {
  const { criar, error } = useAgendamentos();
  const form = useForm({ /* initialValues */ } as AgendamentoDados);

  const onSubmit = form.handleSubmit(async (dados) => {
    await criar(dados);
    form.reset();
    alert('Criado com sucesso!');
  });

  return (
    <Card title="Criar Nova">
      {error && <Alert type="error" message={error} />}
      <form onSubmit={onSubmit}>
        {/* campos do formulário */}
        <Button type="submit">Criar</Button>
      </form>
    </Card>
  );
}
```

## 🎨 Componentes Prontos

### Tabela Simples
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm border-collapse">
    <thead className="bg-gray-100">
      <tr>
        <th className="border p-2 text-left">Coluna 1</th>
        <th className="border p-2 text-left">Coluna 2</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id}>
          <td className="border p-2">{item.nome}</td>
          <td className="border p-2">{item.valor}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Grid de Cards
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id} title={item.nome}>
      {/* Conteúdo do card */}
    </Card>
  ))}
</div>
```

### Filtro de Busca
```tsx
import { useState } from 'react';
import { Input } from '@/components';
import { filtrarPorBusca } from '@/lib/utils';

export function ComBusca() {
  const [termo, setTermo] = useState('');
  const resultados = filtrarPorBusca(items, termo, ['nome', 'descricao']);

  return (
    <>
      <Input 
        placeholder="Buscar..."
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
      />
      {resultados.map(item => <div key={item.id}>{item.nome}</div>)}
    </>
  );
}
```

### Modal/Dialog Simples
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card className="w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Título do Modal</h2>
      {/* Conteúdo */}
      <div className="flex gap-2">
        <Button onClick={() => setShowModal(false)}>Cancelar</Button>
        <Button variant="primary">Confirmar</Button>
      </div>
    </Card>
  </div>
)}
```

## 🔧 Snippets VS Code

Adicione em `.vscode/settings.json`:

```json
{
  "editor.snippetSuggestions": "inline",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 🚀 Comandos Úteis

### Buscar uso de 'any'
```bash
grep -r "any" src/
```

### Buscar componentes não tipados
```bash
grep -r ": any" src/
```

### Validar imports
```bash
grep -r "@/" src/ | head -20
```

## 💬 Padrões de Nomes

### Variáveis
```tsx
// ✅ Bom
const agendamentos: Agendamento[] = [];
const isLoading: boolean = false;
const handleDelete = () => {};

// ❌ Ruim
const agend = [];
const loading = 0;
const delete = () => {};
```

### Funções
```tsx
// ✅ Bom
function formatarData() {}
async function buscarAgendamentos() {}
const handleClickButton = () => {};

// ❌ Ruim
function fmt() {}
function get() {}
const onClick = () => {};
```

### Serviços
```tsx
// ✅ Bom
export class AgendamentoService {}
export class VeiculoService {}

// ❌ Ruim
export class Agendamento {}
export class Service {}
```

## 🎯 Antes de Commitar

- [ ] Não tem `any` no código novo
- [ ] Imports usando paths aliases
- [ ] Componentes menores que 200 linhas
- [ ] Tipos sempre especificados
- [ ] Sem console.log()
- [ ] Sem código comentado desnecessário

## 📊 Checklist Code Review

Ao revisar código novo:

```
- [ ] Usa hooks customizados?
- [ ] Está muito grande (>200 linhas)?
- [ ] Tem tipos definidos?
- [ ] Reutiliza componentes?
- [ ] Sem lógica duplicada?
- [ ] Sem 'any'?
- [ ] Está testável?
- [ ] Segue padrão de nomes?
```

## 🔍 Debugging Rápido

### Ver estado do hook
```tsx
const { dados, loading, error } = useAgendamentos();
console.log({ dados, loading, error });
```

### Ver props do componente
```tsx
const Button = (props) => {
  console.log('Button props:', props);
  return <button {...props} />;
};
```

### Teste no console
```tsx
// No browser dev tools
let teste = await agendamentoService.listar();
```

## 🧪 Testes Rápidos

### Testar hook
```tsx
// Em um componente teste
const { listar, agendamentos } = useAgendamentos();
useEffect(() => {
  (async () => {
    await listar();
    console.log(agendamentos);
  })();
}, []);
```

### Testar serviço
```tsx
import { AgendamentoService } from '@/services';
import { getDb } from '@/app/lib/firebase';

const service = new AgendamentoService(getDb());
service.listar().then(console.log);
```

## 🎨 Tailwind Atalhos

### Botões
```tsx
// Primário
className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"

// Secundário  
className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"

// Perigo
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
```

### Inputs
```tsx
className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
```

### Cards
```tsx
className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
```

### Alertas
```tsx
// Erro
className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"

// Sucesso
className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4"
```

## 💾 Salvar Snippets Pessoais

```tsx
// arquivo.ts
export const SNIPPETS = {
  FORMA_LISTA: `forma com lista e CRUD aqui`,
  FORMA_TABELA: `forma com tabela aqui`,
  FORMA_GRID: `forma com grid aqui`,
};
```

## 📱 Responsividade

Sempre use:
```tsx
// Mobile first
<div className="p-4 sm:p-6 md:p-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

---

**Dica**: Salve este arquivo e consulte quando precisar!
