"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Ticket,
  Calendar,
  Percent,
  Users,
  TrendingUp,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  expires_at: string;
  total_limit: number;
  times_used: number;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  remaining: number;
  is_expired: boolean;
  is_available: boolean;
}

export default function CuponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    discount_percent: "",
    expires_at: "",
    total_limit: ""
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }
    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/interno/dashboard");
      return;
    }
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      setLoading(true);
      const response = await fetch("/api/coupons", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Erro ao buscar cupons");
      const data = await response.json();
      setCoupons(data);
    } catch (error: any) {
      toast.error("Erro ao carregar cupons: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.code || !formData.discount_percent || !formData.expires_at || !formData.total_limit) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/coupons", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code.toUpperCase().trim(),
          discount_percent: parseFloat(formData.discount_percent),
          expires_at: new Date(formData.expires_at).toISOString(),
          total_limit: parseInt(formData.total_limit)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar cupom");
      }

      toast.success("Cupom criado com sucesso!");
      setShowCreateModal(false);
      setFormData({ code: "", discount_percent: "", expires_at: "", total_limit: "" });
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleCouponStatus(coupon: Coupon) {
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active })
      });

      if (!response.ok) throw new Error("Erro ao atualizar cupom");

      toast.success(coupon.is_active ? "Cupom desativado" : "Cupom ativado");
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!confirm(`Tem certeza que deseja deletar o cupom ${coupon.code}?`)) return;

    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Erro ao deletar cupom");

      toast.success("Cupom deletado");
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR");
  }

  const activeCoupons = coupons.filter(c => c.is_active && !c.is_expired);
  const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);
  const totalDiscount = coupons.reduce((sum, c) => sum + (c.usage_count * c.discount_percent), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-purple-600" />
                  Cupons de Desconto
                </h1>
                <p className="text-sm text-slate-500">Gerencie cupons e promoções</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cupom
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cupons Ativos</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{activeCoupons.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total de Usos</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{totalUsage}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Média de Desconto</span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {coupons.length > 0 ? (totalDiscount / coupons.length).toFixed(0) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Cupons */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-slate-500 mt-4">Carregando cupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <Card className="border-none shadow-sm rounded-3xl">
            <CardContent className="p-12 text-center">
              <Ticket className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum cupom criado</h3>
              <p className="text-slate-500 mb-6">Crie seu primeiro cupom de desconto</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Cupom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className={`border-none shadow-lg rounded-3xl overflow-hidden ${
                  !coupon.is_active ? 'opacity-50' :
                  coupon.is_expired ? 'bg-red-50' :
                  coupon.remaining === 0 ? 'bg-orange-50' :
                  'bg-gradient-to-br from-purple-50 to-blue-50'
                }`}>
                  <CardContent className="p-6">
                    {/* Status badges */}
                    <div className="flex items-center gap-2 mb-4">
                      {!coupon.is_active && (
                        <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                          Desativado
                        </span>
                      )}
                      {coupon.is_expired && (
                        <span className="px-2 py-1 bg-red-200 text-red-700 rounded-full text-xs font-bold">
                          Expirado
                        </span>
                      )}
                      {coupon.remaining === 0 && !coupon.is_expired && (
                        <span className="px-2 py-1 bg-orange-200 text-orange-700 rounded-full text-xs font-bold">
                          Esgotado
                        </span>
                      )}
                      {coupon.is_available && (
                        <span className="px-2 py-1 bg-green-200 text-green-700 rounded-full text-xs font-bold">
                          Disponível
                        </span>
                      )}
                    </div>

                    {/* Código do cupom */}
                    <div className="mb-4">
                      <h3 className="text-2xl font-black text-slate-900 mb-1">{coupon.code}</h3>
                      <p className="text-3xl font-black text-purple-600">{coupon.discount_percent}% OFF</p>
                    </div>

                    {/* Informações */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Expira em
                        </span>
                        <span className="font-bold text-slate-900">{formatDate(coupon.expires_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Usos
                        </span>
                        <span className="font-bold text-slate-900">
                          {coupon.usage_count} / {coupon.total_limit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Restantes</span>
                        <span className="font-bold text-slate-900">{coupon.remaining}</span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mb-4">
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${(coupon.usage_count / coupon.total_limit) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCouponStatus(coupon)}
                        className="flex-1 rounded-xl"
                      >
                        {coupon.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 mr-1" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCoupon(coupon)}
                        className="rounded-xl text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criar Cupom */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-6">Criar Novo Cupom</h2>
              
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <Label htmlFor="code">Código do Cupom</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: BLACK10"
                    className="rounded-xl"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    placeholder="Ex: 10"
                    min="1"
                    max="100"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="expires">Data de Expiração</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="limit">Quantidade Total</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={formData.total_limit}
                    onChange={(e) => setFormData({ ...formData, total_limit: e.target.value })}
                    placeholder="Ex: 15"
                    min="1"
                    className="rounded-xl"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    {creating ? "Criando..." : "Criar Cupom"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
