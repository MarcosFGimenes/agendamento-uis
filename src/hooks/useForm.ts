/**
 * Hook customizado para gerenciar formulários de forma simples
 */

import { useState, useCallback } from 'react';

export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      
      setValues((prev) => ({
        ...prev,
        [name]: finalValue,
      }));

      // Limpar erro do campo quando usuário começa a editar
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    (callback: (values: T) => Promise<void>) => {
      return async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          await callback(values);
        } catch (error) {
          setErrors({
            submit: error instanceof Error ? error.message : 'Erro ao enviar formulário',
          });
        }
      };
    },
    [values]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    reset,
    setValue,
    setErrors,
  };
}
