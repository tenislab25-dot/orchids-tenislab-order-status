"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, ArrowLeft, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintOSPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

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
            <Smartphone className="w-4 h-4" /> Térmica 80mm
          </Button>
          <Button 
            variant={printMode === 'a4' ? 'default' : 'outline'}
            className={`gap-2 ${printMode === 'a4' ? 'bg-blue-600' : 'bg-transparent text-white border-white/30'}`}
            onClick={() => setPrintMode('a4')}
          >
            <Monitor className="w-4 h-4" /> A4
          </Button>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>

      {printMode === 'thermal' ? (
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
                <p className="text-xs font-bold">{new Date(order.entry_date).toLocaleDateString('pt-BR')}</p>
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
              {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : 'A definir'}
            </p>
          </div>

          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <p className="text-[8px] text-slate-500 uppercase mb-2">ITENS E SERVIÇOS</p>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="mb-2 pl-2 border-l-2 border-slate-200">
                <p className="text-xs font-bold">{item.itemNumber || `Par #${idx + 1}`}</p>
                {item.services.map((s: any, sIdx: number) => (
                  <p key={sIdx} className="text-[9px] text-slate-600">• {s.name}</p>
                ))}
                {item.customService?.name && (
                  <p className="text-[9px] text-blue-600">• {item.customService.name} (Extra)</p>
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
              <span className="font-bold">R$ {Number(order.total - (order.delivery_fee || 0)).toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Taxa Entrega</span>
                <span className="font-bold">R$ {Number(order.delivery_fee).toFixed(2)}</span>
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
            www.tenislab.com.br
          </p>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white shadow-xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none">
          <div className="p-8 space-y-8" id="printable-os">
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
      )}

      <style jsx global>{`
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .thermal-print {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page {
            size: ${printMode === 'thermal' ? '80mm auto' : 'A4'};
            margin: ${printMode === 'thermal' ? '0' : '10mm'};
          }
        }
      `}</style>
    </div>
  );
}
