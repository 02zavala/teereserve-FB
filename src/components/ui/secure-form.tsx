"use client";

import React, { useState, useCallback } from 'react';
import { useSecureForm, useFileValidation, useContentValidation } from '@/hooks/useCSRF';
import { useSecureForm as useFormValidation } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

interface SecureFormProps {
  schema: z.ZodSchema<any>;
  onSubmit: (data: any) => Promise<void>;
  submitUrl?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  children: React.ReactNode;
  className?: string;
}

export function SecureForm({ 
  schema, 
  onSubmit, 
  submitUrl, 
  method = 'POST', 
  children, 
  className = '' 
}: SecureFormProps) {
  const { submitForm, csrfToken } = useSecureForm();
  const { sanitizeAndValidate } = useFormValidation(schema);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);
    setSuccess(false);

    try {
      const formData = new FormData(event.currentTarget);
      const data = Object.fromEntries(formData.entries());

      // Validar y sanitizar datos
      const validation = sanitizeAndValidate(data);
      
      if (!validation.success) {
        const errorMessages = validation.errors?.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ) || ['Error de validación'];
        setErrors(errorMessages);
        return;
      }

      // Enviar datos
      if (submitUrl) {
        await submitForm(submitUrl, validation.data, method);
      } else {
        await onSubmit(validation.data);
      }

      setSuccess(true);
      // Resetear formulario
      event.currentTarget.reset();
    } catch (error) {
      console.error('Error enviando formulario:', error);
      setErrors([error instanceof Error ? error.message : 'Error desconocido']);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitForm, sanitizeAndValidate, onSubmit, submitUrl, method]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Indicador de seguridad */}
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Shield className="h-4 w-4" />
        <span>Formulario protegido con CSRF</span>
        {csrfToken && (
          <span className="text-xs opacity-60">
            Token: {csrfToken.substring(0, 8)}...
          </span>
        )}
      </div>

      {/* Mensajes de error */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje de éxito */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Formulario enviado exitosamente
          </AlertDescription>
        </Alert>
      )}

      {/* Contenido del formulario */}
      {children}

      {/* Botón de envío */}
      <Button 
        type="submit" 
        disabled={isSubmitting || !csrfToken}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar'
        )}
      </Button>
    </form>
  );
}

// Componente de input seguro con validación en tiempo real
interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  validateContent?: boolean;
}

export function SecureInput({ 
  label, 
  error, 
  validateContent = false, 
  onChange, 
  ...props 
}: SecureInputProps) {
  const { validateContent: checkContent, sanitizeContent } = useContentValidation();
  const [localError, setLocalError] = useState<string>('');

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    if (validateContent) {
      const validation = checkContent(value);
      if (!validation.isValid) {
        setLocalError(validation.error || 'Contenido no válido');
        return;
      } else {
        setLocalError('');
      }
    }

    if (onChange) {
      onChange(event);
    }
  }, [validateContent, checkContent, onChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <Input
        {...props}
        onChange={handleChange}
        className={error || localError ? 'border-red-500' : ''}
      />
      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || localError}
        </p>
      )}
    </div>
  );
}

// Componente de textarea seguro
interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  maxLength?: number;
}

export function SecureTextarea({ 
  label, 
  error, 
  maxLength = 1000, 
  onChange, 
  ...props 
}: SecureTextareaProps) {
  const { validateContent, sanitizeContent } = useContentValidation();
  const [localError, setLocalError] = useState<string>('');
  const [charCount, setCharCount] = useState(0);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setCharCount(value.length);
    
    if (value.length > maxLength) {
      setLocalError(`Máximo ${maxLength} caracteres`);
      return;
    }
    
    const validation = validateContent(value);
    if (!validation.isValid) {
      setLocalError(validation.error || 'Contenido no válido');
      return;
    } else {
      setLocalError('');
    }

    if (onChange) {
      onChange(event);
    }
  }, [validateContent, maxLength, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className={`text-xs ${
          charCount > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'
        }`}>
          {charCount}/{maxLength}
        </span>
      </div>
      <Textarea
        {...props}
        onChange={handleChange}
        maxLength={maxLength}
        className={error || localError ? 'border-red-500' : ''}
      />
      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || localError}
        </p>
      )}
    </div>
  );
}

// Componente de upload de archivos seguro
interface SecureFileUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  error?: string;
}

export function SecureFileUpload({ 
  label, 
  accept = 'image/*', 
  multiple = false, 
  onFilesSelected, 
  error 
}: SecureFileUploadProps) {
  const { validateFiles } = useFileValidation();
  const [localError, setLocalError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validation = validateFiles(files);
    
    if (!validation.allValid) {
      setLocalError(validation.errors.join(', '));
      return;
    }
    
    setLocalError('');
    onFilesSelected(validation.validFiles);
  }, [validateFiles, onFilesSelected]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    const validation = validateFiles(files);
    
    if (!validation.allValid) {
      setLocalError(validation.errors.join(', '));
      return;
    }
    
    setLocalError('');
    onFilesSelected(validation.validFiles);
  }, [validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 dark:border-gray-600'
        } ${error || localError ? 'border-red-500' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-2">
            <div className="text-gray-600 dark:text-gray-400">
              Arrastra archivos aquí o haz clic para seleccionar
            </div>
            <div className="text-xs text-gray-500">
              Máximo 5MB por archivo. Formatos: JPG, PNG, WebP, SVG
            </div>
          </div>
        </label>
      </div>
      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || localError}
        </p>
      )}
    </div>
  );
}