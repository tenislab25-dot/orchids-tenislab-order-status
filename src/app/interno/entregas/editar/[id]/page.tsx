"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function EditarEntregaPage() {
  const router = useRouter();
  const params = useParams();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pedido, setPedido] = useState<any>(null);
  const [form, setForm] = useState({
    observations: '',
    pickup_date: '',
    delivery_date: '',
    client_name: '',
    client_phone: '',
    client_plus_code: '',
    client_coordinates: '',
    client_complement: ''
  });

  useEffect(() => {
    fetchPedido();
  }, [params.id]);

  const fetchPedido = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            id,
            name,
            phone,
            plus_code,
            coordinates,
            complement
          )
        `)
        .eq('id', params.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Entrega não encontrada');
        router.push('/interno/entregas');
        return;
      }

      setPedido(data);
      setForm({
        observations: data.observations || '',
        pickup_date: data.pickup_date ? data.pickup_date.split('T')[0] : '',
        delivery_date: data.delivery_date ? data.delivery_date.split('T')[0] : '',
        client_name: data.clients?.name || '',
        client_phone: data.clients?.phone || '',
        client_plus_code: data.clients?.plus_code || '',
        client_coordinates: data.clients?.coordinates || '',
        client_complement: data.clients?.complement || ''
      });
    } catch (error: any) {
      console.error('Erro ao carregar entrega:', error);
      toast.error('Erro ao carregar entrega');
      router.push('/interno/entregas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações antes de iniciar loading
    if (!form.client_name.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Atualizar dados do cliente
      if (pedido.clients?.id) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            name: form.client_name.toUpperCase(),
            phone: form.client_phone,
            plus_code: form.client_plus_code,
            coordinates: form.client_coordinates,
            complement: form.client_complement
          })
          .eq('id', pedido.clients.id);

        if (clientError) throw clientError;
      }

      // Atualizar dados da OS
      const { error: osError } = await supabase
        .from('service_orders')
        .update({
          observations: form.observations,
          pickup_date: form.pickup_date || null,
          delivery_date: form.delivery_date || null
        })
        .eq('id', params.id);

      if (osError) throw osError;

      toast.success('Entrega atualizada com sucesso!');
      router.push('/interno/entregas');
    } catch (error: any) {
      toast.error('Erro ao salvar alterações: ' + (error.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Confirmar exclusão da OS #${pedido.os_number}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Entrega excluída com sucesso!');
      router.push('/interno/entregas');
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir entrega: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/interno/entregas')}
              className="text-white hover:bg-slate-800"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">Editar Entrega</h1>
              <p className="text-sm text-slate-400">OS #{pedido?.os_number}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto w-full space-y-4 mt-4">
        <Card className="border-none shadow-lg shadow-slate-200/50 rounded-2xl bg-white">
          <CardContent className="p-6 space-y-4">
            {/* Informações da Entrega */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-900">Informações da Entrega</h2>
              
              {pedido?.status === 'Coleta' && (
                <div>
                  <label className="block text-sm font-bold text-purple-700 mb-2">
                    Data da Coleta (quando vai buscar)
                  </label>
                  <input
                    type="date"
                    value={form.pickup_date}
                    onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-green-700 mb-2">
                  Data de Entrega (quando vai devolver)
                </label>
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-green-200 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Observações sobre a entrega..."
                />
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="space-y-4 pt-4 border-t-2 border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Informações do Cliente</h2>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none uppercase"
                  placeholder="NOME DO CLIENTE"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Plus Code
                </label>
                <input
                  type="text"
                  value={form.client_plus_code}
                  onChange={(e) => setForm({ ...form, client_plus_code: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: 7C2V+2X São Paulo"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Coordenadas
                </label>
                <input
                  type="text"
                  value={form.client_coordinates}
                  onChange={(e) => setForm({ ...form, client_coordinates: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: -23.5505, -46.6333"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={form.client_complement}
                  onChange={(e) => setForm({ ...form, client_complement: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Apto 101, Bloco B"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-5 h-5 mr-2" />
                Excluir
              </>
            )}
          </Button>
          <Button
            className="flex-[2] h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg"
            onClick={handleSave}
            disabled={saving || deleting}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
