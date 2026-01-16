"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date-utils";
import { Printer, ArrowLeft, Smartphone, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintOSPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'thermal' | 'tag'>('thermal');

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            plus_code,
            coordinates,
            complement
          )
        `)
        .eq("os_number", osNumber)
        .single();

      if (error) {
        setOrder(null);
      } else {
        setOrder(data);
      }
    } catch (err: any) {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [osNumber, router]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/interno/login");
        return;
      }

      fetchOrder();
    };

    checkAuthAndFetch();
  }, [fetchOrder, router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!order) return <div className="p-8 text-center">OS não encontrada</div>;

  const trackingLink = `${window.location.origin}/consulta?os=${order.os_number}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingLink)}`;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex flex-col items-center">
      <div className="no-print w-full max-w-2xl bg-slate-900 p-4 rounded-2xl mb-4 flex flex-wrap justify-between items-center gap-4">
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button 
            variant={printMode === 'thermal' ? 'default' : 'outline'}
            className={`gap-2 ${printMode === 'thermal' ? 'bg-blue-600' : 'bg-transparent text-white border-white/30'}`}
            onClick={() => setPrintMode('thermal')}
          >
            <Smartphone className="w-4 h-4" /> Térmica
          </Button>
          <Button 
            variant={printMode === 'tag' ? 'default' : 'outline'}
            className={`gap-2 ${printMode === 'tag' ? 'bg-blue-600' : 'bg-transparent text-white border-white/30'}`}
            onClick={() => setPrintMode('tag')}
          >
            <Tag className="w-4 h-4" /> Etiqueta
          </Button>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>

      {printMode === 'tag' ? (
        <div className="tag-print-container flex flex-col gap-8 print:gap-0">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="tag-print bg-white border border-slate-200 shadow-sm overflow-hidden" style={{ width: '90mm', height: '50mm', padding: '5mm', boxSizing: 'border-box' }}>
              <div className="flex justify-between items-start h-full gap-4">
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div>
                    <h1 className="text-sm font-black tracking-tighter leading-none mb-1">TENISLAB</h1>
                    <p className="text-[14px] font-bold text-slate-800 leading-tight mb-2 truncate uppercase">{order.clients?.name}</p>
                    <div className="space-y-1">
                      <p className="text-[12px] font-black text-blue-600">OS: #{order.os_number}</p>
                      <p className="text-[10px] font-bold text-slate-700">Item: {item.itemNumber || `Par #${idx + 1}`}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">Serviços:</p>
                    <p className="text-[10px] font-medium text-slate-600 leading-tight line-clamp-2">
                      {item.services.map((s: any) => s.name).join(', ')}
                      {item.customService?.name && `, ${item.customService.name}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                  <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rastrear</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="thermal-print bg-white p-4 shadow-lg" style={{ width: '80mm', minHeight: '200mm' }}>
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h1 className="text-lg font-black tracking-tighter">TENISLAB</h1>
            <p className="text-[8px] uppercase tracking-widest text-slate-500">O Laboratório do seu Tênis</p>
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[8px] text-slate-500 uppercase">ORDEM DE SERVIÇO</p>
                <p className="text-xl font-black text-blue-600">#{order.os_number}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-slate-500">ENTRADA</p>
                <p className="text-xs font-bold">{formatDate(order.entry_date)}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <p className="text-[8px] text-slate-500 uppercase mb-1">CLIENTE</p>
            <p className="text-sm font-bold">{order.clients?.name}</p>
            <p className="text-xs text-slate-600">{order.clients?.phone}</p>
            {order.clients?.address && <p className="text-[9px] text-slate-500 mt-1">{order.clients.address}</p>}
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <p className="text-[8px] text-slate-500 uppercase mb-1">PREVISÃO DE ENTREGA</p>
            <p className="text-sm font-bold">
              {order.delivery_date ? formatDate(order.delivery_date) : 'A definir'}
            </p>
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <p className="text-[8px] text-slate-500 uppercase mb-2">ITENS E SERVIÇOS</p>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="mb-2 pl-2 border-l-2 border-slate-200">
                <p className="text-xs font-bold">{item.itemNumber || `Par #${idx + 1}`}</p>
                {item.services.map((s: any, sIdx: number) => (
                  <div key={sIdx} className="flex justify-between text-[9px] text-slate-600">
                    <span>• {s.name}</span>
                    <span>R$ {Number(s.price).toFixed(2)}</span>
                  </div>
                ))}
                {item.customService?.name && (
                  <div className="flex justify-between text-[9px] text-blue-600">
                    <span>• {item.customService.name} (Extra)</span>
                    <span>R$ {Number(item.customService.price).toFixed(2)}</span>
                  </div>
                )}
                {item.notes && (
                  <p className="text-[8px] italic text-slate-500 mt-1">Obs: {item.notes}</p>
                )}
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">R$ {Number(order.items.reduce((acc: number, i: any) => acc + (i.subtotal || 0), 0)).toFixed(2)}</span>
            </div>
            {order.discount_percent > 0 && (
              <div className="flex justify-between text-xs mb-1 text-red-600">
                <span>Desconto ({order.discount_percent}%)</span>
                <span className="font-bold">- R$ {((order.items.reduce((acc: number, i: any) => acc + (i.subtotal || 0), 0) * order.discount_percent) / 100).toFixed(2)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Taxa Entrega</span>
                <span className="font-bold">+ R$ {Number(order.delivery_fee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black mt-2 pt-2 border-t border-slate-200">
              <span>TOTAL</span>
              <span>R$ {Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-500 mt-1">
              <span>Pagamento</span>
              <span>{order.payment_method} ({order.pay_on_entry ? 'Pago' : 'A pagar'})</span>
            </div>
          </div>

          <div className="text-center mt-4">
            <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 mx-auto mb-2" />
            <p className="text-[7px] text-slate-400 uppercase">Escaneie para rastrear</p>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
            <p className="text-[7px] text-slate-400 leading-relaxed">
              1. Prazo conta após aceite digital.<br/>
              2. Não nos responsabilizamos por danos pré-existentes.<br/>
              3. Itens não retirados em 90 dias serão doados.
            </p>
          </div>

          <div className="mt-4 pt-2">
            <div className="border-b border-slate-300 h-8 mb-1"></div>
            <p className="text-[7px] text-center text-slate-400 uppercase tracking-widest">Assinatura do Cliente</p>
          </div>

          <p className="text-center text-[7px] text-slate-400 uppercase tracking-widest mt-4">
            WWW.TENISLAB.APP.BR
          </p>
        </div>
      )}
    </div>
  );
}