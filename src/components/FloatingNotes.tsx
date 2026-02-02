"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  description: string;
  color: string;
  created_at: string;
}

const COLORS = [
  { name: "Amarelo", value: "yellow", bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-900" },
  { name: "Rosa", value: "pink", bg: "bg-pink-100", border: "border-pink-200", text: "text-pink-900" },
  { name: "Azul", value: "blue", bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-900" },
  { name: "Verde", value: "green", bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-900" },
];

export default function FloatingNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    fetchNotes();
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  async function fetchNotes() {
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Erro ao carregar notas");
      const data = await response.json();
      setNotes(data);
    } catch (error: any) {
      console.error("Erro ao carregar notas:", error);
    }
  }

  async function handleSaveNote() {
    if (!title.trim() || !description.trim()) {
      toast.error("Título e descrição são obrigatórios");
      return;
    }

    try {
      const userId = localStorage.getItem("tenislab_user_id");
      
      if (editingNote) {
        // Atualizar nota existente
        const response = await fetch(`/api/notes/${editingNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.toUpperCase(), description, color: selectedColor }),
        });

        if (!response.ok) throw new Error("Erro ao atualizar nota");
        toast.success("Nota atualizada!");
      } else {
        // Criar nova nota
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.toUpperCase(), description, color: selectedColor, created_by: userId }),
        });

        if (!response.ok) throw new Error("Erro ao criar nota");
        toast.success("Nota criada!");
      }

      fetchNotes();
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  function confirmDelete(noteId: string) {
    setNoteToDelete(noteId);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteNote() {
    if (!noteToDelete) return;
    
    try {
      const response = await fetch(`/api/notes/${noteToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao deletar nota");
      
      toast.success("Nota deletada!");
      fetchNotes();
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  function openModal(note?: Note) {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setDescription(note.description);
      setSelectedColor(note.color);
    } else {
      setEditingNote(null);
      setTitle("");
      setDescription("");
      setSelectedColor("yellow");
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingNote(null);
    setTitle("");
    setDescription("");
    setSelectedColor("yellow");
  }

  const getColorClasses = (colorValue: string) => {
    const color = COLORS.find(c => c.value === colorValue) || COLORS[0];
    return color;
  };

  // Mobile: Botão flutuante
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-500 text-white  hover:bg-amber-600 transition-all flex items-center justify-center"
        >
          <StickyNote className="w-6 h-6" />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {notes.length}
            </span>
          )}
        </button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📝 Notas e Lembretes</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              <Button onClick={() => openModal()} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nova Nota
              </Button>

              {notes.map((note) => {
                const colorClasses = getColorClasses(note.color);
                return (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border-2 ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} relative`}
                  >
                    <button
                      onClick={() => confirmDelete(note.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => openModal(note)}
                      className="absolute -top-2 -right-10 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-blue-50"
                    >
                      <Edit2 className="w-3 h-3 text-blue-500" />
                    </button>
                    <h3 className="font-bold text-sm mb-1">{note.title}</h3>
                    <p className="text-xs opacity-80">{note.description}</p>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de criar/editar */}
        <Dialog open={isModalOpen && (editingNote !== null || title || description)} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNote ? "Editar Nota" : "Nova Nota"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Comprar Material"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o lembrete..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cor</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-10 h-10 rounded-lg ${color.bg} ${color.border} border-2 ${
                        selectedColor === color.value ? "ring-2 ring-slate-900 ring-offset-2" : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNote}>
                {editingNote ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Notas flutuantes no canto
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isExpanded && notes.length > 0 && (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
            {notes.slice(0, 4).map((note, index) => {
              const colorClasses = getColorClasses(note.color);
              return (
                <div
                  key={note.id}
                  className={`w-64 p-4 rounded-xl border-2  ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} relative transition-all `}
                >
                  <button
                    onClick={() => confirmDelete(note.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                  <button
                    onClick={() => openModal(note)}
                    className="absolute -top-2 -right-10 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-blue-500" />
                  </button>
                  <h3 className="font-bold text-sm mb-2">{note.title}</h3>
                  <p className="text-xs opacity-80 leading-relaxed">{note.description}</p>
                  <p className="text-[10px] opacity-60 mt-2">
                    {new Date(note.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          {notes.length > 0 && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full  bg-white"
            >
              {isExpanded ? <X className="w-5 h-5" /> : <StickyNote className="w-5 h-5" />}
            </Button>
          )}
          
          <Button
            onClick={() => openModal()}
            size="icon"
            className="w-12 h-12 rounded-full  bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Modal de criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? "Editar Nota" : "Nova Nota"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Comprar Material"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o lembrete..."
                rows={4}
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cor</label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-lg ${color.bg} ${color.border} border-2 ${
                      selectedColor === color.value ? "ring-2 ring-slate-900 ring-offset-2" : ""
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNote}>
              {editingNote ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de deleção */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Confirmar Deleção</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">Tem certeza que deseja deletar esta nota? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
