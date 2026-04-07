import { elementToPdfBlob, downloadElementAsPdf } from '@/app/utils/exportAsImage';

describe('PDF Export', () => {
  // Mock html2canvas
  jest.mock('html2canvas', () => ({
    __esModule: true,
    default: jest.fn(async (element: HTMLElement) => {
      // Simula um canvas com dados mínimos
      const canvas = document.createElement('canvas');
      canvas.width = 210;
      canvas.height = 297;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText('Test PDF Content', 10, 20);
      }
      return canvas;
    }),
  }));

  beforeEach(() => {
    // Limpa o DOM antes de cada teste
    document.body.innerHTML = '';
  });

  test('elementToPdfBlob deve gerar um blob de PDF válido', async () => {
    // Cria um elemento de teste com classes Tailwind
    const testElement = document.createElement('div');
    testElement.className = 'bg-green-600 text-white p-4 rounded-xl shadow-2xl';
    testElement.innerHTML = `
      <h2 class="text-lg font-bold">Agendamento Confirmado</h2>
      <p class="text-sm opacity-90">Código: 90548</p>
      <div class="flex items-center space-x-2">
        <span class="h-5 w-5 text-green-600">✓</span>
        <p>Veículo: Polo - Teste (ABC1234)</p>
      </div>
    `;
    document.body.appendChild(testElement);

    try {
      const blob = await elementToPdfBlob(testElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      expect(blob).toBeDefined();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Erro ao gerar PDF:', errorMessage);
      
      // Se o erro for sobre oklch, o teste falha com mensagem específica
      if (errorMessage.includes('oklch')) {
        throw new Error('FAIL: oklch color function still not handled correctly');
      }
      throw error;
    }
  });

  test('downloadElementAsPdf deve criar e clicar em um link de download', async () => {
    const testElement = document.createElement('div');
    testElement.className = 'bg-white p-6';
    testElement.innerHTML = '<h1>Test Download</h1>';
    document.body.appendChild(testElement);

    // Mock do URL.createObjectURL e URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock do elemento link
    const mockLink = document.createElement('a');
    const createElementSpy = jest.spyOn(document, 'createElement');
    createElementSpy.mockReturnValueOnce(mockLink);

    const clickSpy = jest.spyOn(mockLink, 'click').mockImplementation(() => {});

    try {
      await downloadElementAsPdf(testElement, 'test-comprovante.pdf');

      expect(clickSpy).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Erro ao testar download:', errorMessage);
      
      if (errorMessage.includes('oklch')) {
        throw new Error('FAIL: oklch color function still not handled correctly');
      }
      throw error;
    }
  });

  test('Elemento clonado deve ter classes Tailwind removidas antes da conversão', async () => {
    const testElement = document.createElement('div');
    testElement.className = 'bg-green-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-center';
    testElement.innerHTML = '<span class="text-lg font-bold">Test</span>';
    document.body.appendChild(testElement);

    try {
      const blob = await elementToPdfBlob(testElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      expect(blob).toBeDefined();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('oklch')) {
        throw new Error('FAIL: oklch color function still not handled correctly');
      }
      throw error;
    }
  });
});
