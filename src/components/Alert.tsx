/**
 * Componente de Alerta (Erro, Sucesso, Aviso)
 */

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const colors = {
  error: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' },
  success: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
  warning: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
  info: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
};

export function Alert({ type, message, onClose }: AlertProps) {
  const color = colors[type];

  return (
    <div
      className={`${color.bg} border-l-4 ${color.border} ${color.text} p-4 rounded mb-4 flex justify-between items-center`}
    >
      <p className="text-sm">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className={`${color.text} hover:opacity-70 font-bold text-lg`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
