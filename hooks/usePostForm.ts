import { useState, useRef } from "react";
import { PostFormState } from "@/lib/types";

export function usePostForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState<PostFormState>({
    title: "",
    description: "",
    purpose: "general",
    urgency: "low",
    selectedImage: null,
    imagePreview: null,
    isSubmitting: false,
    uploadProgress: 0,
    setTitle: (value: string) => setFormState(prev => ({ ...prev, title: value })),
    setDescription: (value: string) => setFormState(prev => ({ ...prev, description: value })),
    setPurpose: (value: string) => setFormState(prev => ({ ...prev, purpose: value })),
    setUrgency: (value: string) => setFormState(prev => ({ ...prev, urgency: value })),
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormState(prev => ({ ...prev, selectedImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, imagePreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormState(prev => ({ 
      ...prev, 
      selectedImage: null, 
      imagePreview: null 
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
            selectedImage: null,
            imagePreview: null,
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
    handleImageSelect,
    removeImage,
    handleSubmit,
  };
}
