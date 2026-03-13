"use client";

import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="flex gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isDestructive ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}>
            <AlertTriangle size={24} />
          </div>
          
          <div className="flex-1 pt-1">
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 ${
              isDestructive 
                ? "bg-red-600 shadow-md shadow-red-500/20 hover:bg-red-700" 
                : "bg-blue-600 shadow-md shadow-blue-500/20 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
