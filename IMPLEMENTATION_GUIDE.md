# Guia de Implementação da Nova Arquitetura

## 🎯 Benefícios Imediatos

### Antes vs Depois

#### ANTES (600+ linhas em 1 componente)
```tsx
export default function AgendarPage() {
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [dados, setDados] = useState<AgendamentoDados>({ /* ... */ });
  const [erro, setErro] = useState<string>('');
  const [erroMatricula, setErroMatricula] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  // ... 20+ estados
  
  // Hundreds of lines of JSX and logic mixed together
}
```

#### DEPOIS (150 linhas, muito limpo)
```tsx
export default function AgendarPageNova() {
  const agendamentos = useAgendamentos();
  const veiculos = useVeiculos();
  const motoristas = useMotoristas();
  const form = useForm(initialValues);

  useEffect(() => {
    veiculos.listar();
    motoristas.listar();
  }, []);

  // Código muito mais legível e fácil de manter
}
```

## 📋 Checklist de Migração

### Fase 1: Novos Componentes ✅ COMPLETO
- [x] Estrutura de pastas criada
- [x] Tipos centralizados
- [x] Serviços de dados
- [x] Hooks customizados
- [x] Componentes reutilizáveis

### Fase 2: Migrar Páginas (TODO)
- [ ] Refatorar `app/agendar/page.tsx`
- [ ] Refatorar `app/administracao/page.tsx`
- [ ] Refatorar `app/veiculos/page.tsx`
- [ ] Refatorar `app/historico/page.tsx`
- [ ] Refatorar `app/gerenciar-agendamentos/page.tsx`

### Fase 3: Atualizar App Antiga (TODO)
- [ ] Remover `app/lib/` (tudo movido para `src/services/`)
- [ ] Remover `app/context/` (usar hooks em vez disso)
- [ ] Atualizar imports

### Fase 4: Testes (TODO)
- [ ] Testar cada página migrada
- [ ] Validar funcionalidades
- [ ] Testar Firebase integração

## 📚 Padrões de Uso

### Como Usar Hooks Customizados

```tsx
'use client';

import { useAgendamentos } from '@/src/hooks';

export default function MyComponent() {
  const { 
    agendamentos, 
    loading, 
    error, 
    listar, 
    criar, 
    deletar 
  } = useAgendamentos();

  useEffect(() => {
    listar();
  }, [listar]);

  const handleCreate = async () => {
    try {
      await criar({
        saida: '2024-01-01',
        chegada: '2024-01-02',
        // ... dados
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {loading && <Loading />}
      {error && <Alert type="error" message={error} />}
      {/* ... */}
    </div>
  );
}
```

### Como Usar Formulários

```tsx
const form = useForm({
  name: '',
  email: '',
  phone: '',
});

const handleSubmit = form.handleSubmit(async (values) => {
  await api.create(values);
});

return (
  <form onSubmit={handleSubmit}>
    <Input
      label="Nome"
      name="name"
      value={form.values.name}
      onChange={form.handleChange}
      error={form.errors.name}
    />
    <Button type="submit" loading={loading}>
      Enviar
    </Button>
  </form>
);
```

### Como Usar Componentes

```tsx
import { Card, Button, Alert } from '@/src/components';

return (
  <Card 
    title="Título da Card"
    subtitle="Subtítulo opcional"
    padding="large"
  >
    <p>Conteúdo aqui</p>
    <Button variant="primary" size="medium">
      Clique me
    </Button>
  </Card>
);
```

## 🔄 Estrutura de Tipos

Todos os tipos estão em `src/types/`. Importe assim:

```tsx
// Importar tudo
import { Agendamento, Veiculo, Motorista } from '@/src/types';

// Ou imports específicos
import type { AgendamentoDados } from '@/src/types/agendamento';
```

## 🛠️ Próximos Passos

### Migrar agendar/page.tsx

1. Copie o código de `src/EXEMPLO_PAGE_REFATORADA.tsx`
2. Adapte para seu caso de uso específico
3. Teste com dados reais
4. Valide funcionalidades

### Adicionar Novas Funcionalidades

Para adicionar uma nova feature:

1. **Criar hook** em `src/hooks/useNewFeature.ts`
2. **Criar serviço** em `src/services/newFeatureService.ts`
3. **Criar tipos** em `src/types/newFeature.ts`
4. **Criar componentes** em `src/components/`
5. **Usar na página** com o novo hook

## ✨ Melhorias Implementadas

### ✅ Tipagem Forte
- Removido uso de `any`
- Tipos centralizados
- Interface bem definidas

### ✅ Separação de Responsabilidades
- Componentes só têm UI
- Lógica em hooks
- Dados em serviços

### ✅ Reutilização de Código
- Componentes genéricos
- Hooks compartilhados
- Serviços centralizados

### ✅ Fácil Manutenção
- Código mais legível
- Componentes pequenos
- Padrão consistente

### ✅ Testabilidade
- Hooks podem ser testados isoladamente
- Serviços sem dependências de UI
- Componentes simples

## 🎓 Lessons Learned

### O que Melhorou

1. **Arquivos menores** - máx 200 linhas por componente
2. **Código mais legível** - nomes claros e simples
3. **Menos bugs** - lógica centralizada
4. **Mais fácil de testar** - separação clara
5. **Onboarding mais fácil** - padrão consistente

### O que Manter

1. Sempre tipidade forte
2. Sempre separar UI de lógica
3. Sempre reutilizar componentes
4. Sempre centralizar tipos
5. Sempre manter padrão de nomenclatura

## 📞 Suporte

Se tiver dúvidas ao migrar:

1. Compare com `src/EXEMPLO_PAGE_REFATORADA.tsx`
2. Verifique os hooks em `src/hooks/`
3. Use tipos de `src/types/`
4. Reutilize componentes de `src/components/`
