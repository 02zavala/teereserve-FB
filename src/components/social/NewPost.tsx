"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { SecureForm, SecureTextarea, SecureFileUpload } from "@/components/ui/secure-form";
import { uploadPostImage, addUserPost } from "@/lib/data";
import type { ReviewMediaItem, PostInput } from "@/types";

const postSchema = z.object({
  text: z.string().min(1, "El texto es requerido").max(2000, "Máximo 2000 caracteres"),
});

interface NewPostProps {
  onPosted?: (postId: string) => void;
}

export default function NewPost({ onPosted }: NewPostProps) {
  const { user, profile } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalToUpload, setTotalToUpload] = useState(0);

  if (!user) {
    return null;
  }

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const onSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      setError("");

      const mediaItems: ReviewMediaItem[] = [];
      setUploadCount(0);
      setTotalToUpload(selectedFiles.length);
      for (const file of selectedFiles) {
        const url = await uploadPostImage(user.uid, file);
        mediaItems.push({ url, type: file.type } as any);
        setUploadCount((prev) => prev + 1);
      }

      const input: PostInput = {
        userId: user.uid,
        userName: user.displayName || user.email || "Usuario",
        userAvatar: profile?.photoURL || user.photoURL || null,
        text: String(data.text || ""),
        media: mediaItems,
      };

      const id = await addUserPost(input);

      if (typeof onPosted === 'function') onPosted(id);
      setSelectedFiles([]);
      setUploadCount(0);
      setTotalToUpload(0);
    } catch (e: any) {
      setError(e?.message || 'Error al publicar');
      // Re-lanzar el error para que SecureForm muestre el estado de error y no el de éxito
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = totalToUpload > 0 ? Math.round((uploadCount / totalToUpload) * 100) : 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Crear publicación</CardTitle>
      </CardHeader>
      <CardContent>
        <SecureForm schema={postSchema} onSubmit={onSubmit} className="space-y-4" showSubmitButton={false}>
          <SecureTextarea name="text" label="¿Qué quieres compartir?" maxLength={2000} placeholder="Escribe algo..." />

          <div className="flex items-center gap-4">
            <SecureFileUpload label="Añadir imágenes" multiple accept="image/*" onFilesSelected={handleFilesSelected} />
            {selectedFiles.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" /> {selectedFiles.length} archivo(s) seleccionado(s)</span>
              </div>
            )}
          </div>

          {submitting && totalToUpload > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Subiendo imágenes: {uploadCount}/{totalToUpload} ({progressPercent}%)</div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...</>) : "Publicar"}
            </Button>
          </div>
        </SecureForm>
      </CardContent>
    </Card>
  );
}