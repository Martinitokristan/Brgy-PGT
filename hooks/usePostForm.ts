import { useState, useRef } from "react";
import { PostFormState } from "@/lib/types";

export function usePostForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState<PostFormState>({
    title: "",
    description: "",
    purpose: "general",
    urgency: "low",
    selectedMedia: null,
    mediaPreview: null,
    mediaType: null,
    isSubmitting: false,
    uploadProgress: 0,
    setTitle: (value: string) => setFormState(prev => ({ ...prev, title: value })),
    setDescription: (value: string) => setFormState(prev => ({ ...prev, description: value })),
    setPurpose: (value: string) => setFormState(prev => ({ ...prev, purpose: value })),
    setUrgency: (value: string) => setFormState(prev => ({ ...prev, urgency: value })),
  });

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = (file.type || "").startsWith("video/") ? "video" : "image";
      setFormState(prev => ({ ...prev, selectedMedia: file, mediaType: type }));

      if (type === "image") {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormState(prev => ({ ...prev, mediaPreview: reader.result as string }));
        };
        reader.readAsDataURL(file);
      } else {
        const url = URL.createObjectURL(file);
        setFormState(prev => ({ ...prev, mediaPreview: url }));
      }
    }
  };

  const removeMedia = () => {
    setFormState(prev => ({ 
      ...prev, 
      selectedMedia: null,
      mediaPreview: null,
      mediaType: null,
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (formData: FormData) => {
    setFormState(prev => ({ ...prev, isSubmitting: true, uploadProgress: 0 }));

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/posts");

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFormState(prev => ({ ...prev, uploadProgress: progress }));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Reset form state
          setFormState(prev => ({
            ...prev,
            title: "",
            description: "",
            purpose: "general",
            urgency: "low",
            selectedMedia: null,
            mediaPreview: null,
            mediaType: null,
            isSubmitting: false,
            uploadProgress: 0,
          }));
          if (fileInputRef.current) fileInputRef.current.value = "";
          resolve();
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        setFormState(prev => ({ ...prev, isSubmitting: false, uploadProgress: 0 }));
        reject(new Error("Upload error"));
      });

      xhr.send(formData);
    });
  };

  return {
    ...formState,
    fileInputRef,
    handleMediaSelect,
    removeMedia,
    handleSubmit,
  };
}
