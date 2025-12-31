"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function PrintOSPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            address
          )
        `)
        .eq("os_number", osNumber)
        .single();

      if (!error) setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [osNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!order) return <div className="p-8 text-center">OS não encontrada</div>;

  const trackingLink = `${window.location.origin}/consulta?os=${order.os_number}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingLink)}`;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-3xl overflow-hidden mb-8 print:shadow-none print:rounded-none print:m-0">
        
        {/* Toolbar - hidden on print */}
        <div className="bg-slate-900 p-4 flex justify-between items-center print:hidden">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir OS
          </Button>
        </div>

        {/* OS Content */}
        <div className="p-8 space-y-8" id="printable-os">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-6 border-slate-100">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">TENISLAB</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">O Laboratório do seu Tênis</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ordem de Serviço</span>
              <h2 className="text-2xl font-black text-blue-600 tracking-tight">#{order.os_number}</h2>
              <p className="text-sm font-bold text-slate-700">{new Date(order.entry_date).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Client & Info Grid */}
          <div className="grid grid-cols-2 gap-8 py-2">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cliente</span>
                <p className="font-bold text-slate-800 text-lg leading-tight">{order.clients?.name}</p>
                <p className="text-sm text-slate-600 font-medium">{order.clients?.phone}</p>
                {order.clients?.address && <p className="text-xs text-slate-500 mt-1">{order.clients.address}</p>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Previsão de Entrega</span>
                <p className="font-bold text-slate-800">
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : 'A definir'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end text-right">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                  <img src={qrCodeUrl} alt="QR Code Rastreio" className="w-24 h-24" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Escaneie para rastrear</span>
                </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Itens e Serviços</h3>
            <div className="space-y-6">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black shrink-0 text-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <p className="font-bold text-slate-800">{item.itemNumber || `Par #${idx + 1}`}</p>
                      {item.price && <p className="font-bold text-slate-700">R$ {Number(item.price).toFixed(2)}</p>}
                    </div>
                    <ul className="space-y-1">
                      {item.services.map((s: any, sIdx: number) => (
                        <li key={sIdx} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          {s.name}
                        </li>
                      ))}
                      {item.customService?.name && (
                        <li className="text-sm text-blue-600 font-medium flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-blue-300" />
                          {item.customService.name} (Extra)
                        </li>
                      )}
                    </ul>
                    {item.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 pt-6 flex flex-col items-end gap-2">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-700">R$ {Number(order.total - (order.delivery_fee || 0)).toFixed(2)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxa de Entrega</span>
                  <span className="font-bold text-slate-700">R$ {Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">R$ {Number(order.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-1">
                <span>Pagamento</span>
                <span>{order.payment_method} ({order.pay_on_entry ? 'Pago' : 'A pagar'})</span>
              </div>
            </div>
          </div>

          {/* Terms Footer */}
          <div className="pt-8 text-[9px] text-slate-400 space-y-4 border-t border-slate-50">
            <div className="grid grid-cols-2 gap-8 items-end">
              <div className="space-y-2">
                <p className="font-bold text-slate-500 uppercase">TERMOS DE SERVIÇO</p>
                <p className="leading-tight">
                  1. O prazo de entrega começa a contar após o aceite digital da OS.<br/>
                  2. Não nos responsabilizamos por danos pré-existentes não identificados.<br/>
                  3. Itens não retirados em 90 dias serão doados.
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-full border-b border-slate-300 h-8" />
                <span className="font-bold uppercase tracking-widest">Assinatura do Cliente</span>
              </div>
            </div>
            <p className="text-center font-bold tracking-widest pt-4">WWW.TENISLAB.COM.BR</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:m-0 { margin: 0 !important; }
          #printable-os { width: 100%; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
