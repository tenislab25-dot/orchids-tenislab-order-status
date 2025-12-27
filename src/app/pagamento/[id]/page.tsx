"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  CheckCircle2, 
  Copy, 
  QrCode, 
  Smartphone, 
  Receipt,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

interface OrderData {
  id: string;
  os_number: string;
  total: number;
  delivery_fee: number;
  payment_confirmed: boolean;
  clients: {
    name: string;
  } | null;
}

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const pixKey = "63614509000144"; // CNPJ

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          id,
          os_number,
          total,
          delivery_fee,
          payment_confirmed,
          clients (
            name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrder(data as any);
    } catch (error: any) {
      console.error("Erro ao carregar OS:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">Pedido não encontrado</h1>
        <p className="text-slate-500">Verifique o link ou entre em contato conosco.</p>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/consulta">Consultar Status</Link>
        </Button>
      </div>
    );
  }

  if (order.payment_confirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">Pagamento Confirmado!</h1>
          <p className="text-slate-500">Obrigado pela preferência, {order.clients?.name}!</p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl h-12 px-8">
          <Link href={`/consulta?os=${order.os_number.replace("/", "")}`}>Ver detalhes da OS</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-100 px-6 py-8 flex flex-col items-center gap-4">
        <img 
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766845000340.PNG?width=800" 
          alt="TENISLAB" 
          className="h-20 w-auto"
        />
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Pagamento do Pedido</h1>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">OS #{order.os_number}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6"
        >
          <div className="flex flex-col items-center gap-2 border-b border-slate-50 pb-6">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total a Pagar</span>
            <span className="text-4xl font-black text-slate-900 tracking-tighter">
              R$ {Number(order.total).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{order.clients?.name}</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">Pagamento via PIX</span>
                <span className="text-xs text-slate-500">Aprovação imediata</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chave PIX (CNPJ)</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-slate-700">63.614.509/0001-44</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleCopyPix}
                    className={`h-8 rounded-lg font-bold text-xs gap-1.5 transition-all ${copied ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"}`}
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Favorecido</span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">TENISLAB</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 text-xs text-slate-500">
              <Smartphone className="w-4 h-4 shrink-0 text-blue-500" />
              <p>Copie o CNPJ acima e utilize a opção <strong>PIX</strong> no app do seu banco.</p>
            </div>
            <div className="flex items-start gap-3 text-xs text-slate-500">
              <Receipt className="w-4 h-4 shrink-0 text-blue-500" />
              <p>Após o pagamento, envie o comprovante pelo WhatsApp para agilizarmos a baixa.</p>
            </div>
          </div>
        </motion.section>

        <section className="flex flex-col gap-3">
          <Button 
            className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
            onClick={handleCopyPix}
          >
            Copiar Chave PIX
          </Button>
          
          <Button 
            variant="ghost" 
            asChild
            className="h-12 rounded-2xl text-slate-400 font-bold"
          >
            <Link href="/consulta">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Detalhes
            </Link>
          </Button>
        </section>
      </main>

      <footer className="text-center p-8 space-y-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          tenislab. o laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
