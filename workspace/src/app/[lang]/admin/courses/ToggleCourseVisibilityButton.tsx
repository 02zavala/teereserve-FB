'use client';

import { useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { updateCourseVisibility } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ToggleCourseVisibilityButtonProps {
  courseId: string;
  courseName: string;
  isHidden: boolean;
}

export function ToggleCourseVisibilityButton({ 
  courseId, 
  courseName, 
  isHidden 
}: ToggleCourseVisibilityButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleVisibility = async () => {
    setIsLoading(true);
    
    try {
      // Actualizar solo el campo hidden del curso
      await updateCourseVisibility(courseId, !isHidden);
      
      const action = isHidden ? 'mostrado' : 'ocultado';
      toast.success(`Curso "${courseName}" ${action} exitosamente`);
      
      // Refrescar la página para mostrar los cambios
      router.refresh();
    } catch (error) {
      console.error('Error toggling course visibility:', error);
      toast.error('Error al cambiar la visibilidad del curso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenuItem 
      onClick={handleToggleVisibility}
      disabled={isLoading}
      className="cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isHidden ? (
        <Eye className="mr-2 h-4 w-4" />
      ) : (
        <EyeOff className="mr-2 h-4 w-4" />
      )}
      {isHidden ? 'Mostrar curso' : 'Ocultar curso'}
    </DropdownMenuItem>
  );
}