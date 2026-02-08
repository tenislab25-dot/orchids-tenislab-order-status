"use client";

import { useEffect, useState } from "react";

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
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Pequeno delay para trigger da animação
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      document.body.style.overflow = "hidden";
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Overlay escuro */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: animating ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
          transition: "background-color 0.3s ease",
          zIndex: 99999,
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
          padding: "1.5rem",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
          transform: animating ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease-out",
          zIndex: 100000,
        }}
      >
        {/* Indicador de arraste */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div style={{ width: "2.5rem", height: "0.25rem", backgroundColor: "#d1d5db", borderRadius: "9999px" }} />
        </div>

        {/* Título */}
        <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#111827", marginBottom: "0.5rem" }}>
          {title}
        </h3>

        {/* Mensagem */}
        <p style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "1.5rem", whiteSpace: "pre-line" }}>
          {message}
        </p>

        {/* Botões */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.75rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
