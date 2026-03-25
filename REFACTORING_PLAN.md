# Plano de Refatoração - Sistema de Agendamento

## Problemas Identificados

### 1. **Arquitetura Desorganizada**
- Tipos espalhados em múltiplos arquivos
- Libs dentro de `app/lib` (misturado com componentes)
- Interfaces duplicadas em diferentes páginas
- Imports complexos com paths inadequados

### 2. **Componentes Muito Grandes**
- `agendar/page.tsx` - 600+ linhas
- `administracao/page.tsx` - 400+ linhas  
- `rastreamento/3sat/page.tsx` - 700+ linhas
- Falta separação de responsabilidades

### 3. **Tipagem Fraca**
- Uso excessivo de `any`
- Interfaces duplicadas
- Tipos genéricos desnecessários
- Falta de validação de dados

### 4. **Lógica de Negócio Misturada**
- Estados complexos em componentes
- Falta hooks customizados
- Duplicação de lógica
- Sem padrão claro de estado

### 5. **Padrões Inconsistentes**
- Imports variados de localidades diferentes
- Sem padrão de nomenclatura de arquivo
- Componentes cliente/servidor misturados
- Sem separação clara de responsabilidades

---

## Nova Arquitetura Proposta

```
src/
├── types/              # Tipos centralizados
│   ├── index.ts       # Exportar todos types
│   ├── usuario.ts
│   ├── veiculo.ts
│   ├── agendamento.ts
│   └── 3sat.ts
├── lib/               # Lógica compartilhada
│   ├── firebase.ts
│   ├── api.ts
│   └── utils.ts
├── services/          # Serviços de dados
│   ├── agendamentoService.ts
│   ├── veiculoService.ts
│   ├── motoristasService.ts
│   └── 3satService.ts
├── hooks/            # Hooks customizados
│   ├── useAuth.ts
│   ├── useAgendamentos.ts
│   ├── useVeiculos.ts
│   └── useForm.ts
├── components/       # Componentes reutilizáveis
│   ├── shared/       # Componentes globais
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Button.tsx
│   ├── forms/        # Componentes de formulário
│   │   ├── AgendamentoForm.tsx
│   │   └── VeiculoForm.tsx
│   └── containers/   # Componentes container
│       ├── AgendamentoContainer.tsx
│       └── VeiculoContainer.tsx
├── app/              # Pages do Next.js
│   ├── page.tsx
│   ├── layout.tsx
│   ├── agendar/
│   │   └── page.tsx
│   ├── veiculos/
│   │   └── page.tsx
│   └── ...
└── constants/        # Constantes do app
    └── config.ts
```

## Melhorias Implementadas

### ✅ Tipos Centralizados
- Um único arquivo para cada tipo
- Reexportação em `types/index.ts`
- Remove duplicação

### ✅ Hooks Customizados
```typescript
// useAgendamentos.ts
export function useAgendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listar = async () => { /* ... */ };
  const criar = async (dados) => { /* ... */ };
  const atualizar = async (id, dados) => { /* ... */ };
  const deletar = async (id) => { /* ... */ };

  return { agendamentos, loading, error, listar, criar, atualizar, deletar };
}
```

### ✅ Componentes Pequenos
- Máximo 200 linhas por componente
- Single responsibility principle
- Reutilizável e testável

### ✅ Serviços Independentes
- Lógica de dados separada
- Cache integrado
- Tratamento de erro centralizado

### ✅ Padrão de Nomeação
- `useX.ts` - Hooks
- `XService.ts` - Serviços
- `X.tsx` - Componentes
- `x.ts` - Tipos

---

## Cronograma de Implementação

1. **Fase 1**: Criar nova estrutura de pasta
2. **Fase 2**: Migrar tipos para centralizar
3. **Fase 3**: Criar hooks customizados
4. **Fase 4**: Criar serviços de dados
5. **Fase 5**: Refatorar componentes grandes
6. **Fase 6**: Testar e validar
