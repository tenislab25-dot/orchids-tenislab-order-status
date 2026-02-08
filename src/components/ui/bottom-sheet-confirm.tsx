"use client";

import { useEffect } from "react";

interface BottomSheetConfirmProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BottomSheetConfirm({
  show,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmColor = "bg-blue-600 hover:bg-blue-700",
  onConfirm,
  onCancel,
}: BottomSheetConfirmProps) {
  // Bloquear scroll do body quando o bottom sheet está aberto
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 pb-8 animate-slide-up safe-area-bottom">
        {/* Indicador de arraste */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Título */}
        <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>

        {/* Mensagem */}
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{message}</p>

        {/* Botões */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`w-full py-4 rounded-xl text-white font-bold text-base transition-all ${confirmColor}`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-base transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>

      {/* Animação CSS */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: max(2rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
