
export type Category = "Higienização" | "Pintura" | "Costura" | "Restauração" | "Extra / Avulso";

export interface Service {
  id: string;
  name: string;
  category: Category;
  defaultPrice: number;
  status: "Active" | "Inactive";
  isEditable?: boolean;
}

export const INITIAL_SERVICES: Service[] = [
  // Higienização
  { id: "1", name: "Higienização Basic", category: "Higienização", defaultPrice: 35, status: "Active" },
  { id: "2", name: "Higienização Pro", category: "Higienização", defaultPrice: 65, status: "Active" },
  { id: "3", name: "Higienização Premium", category: "Higienização", defaultPrice: 90, status: "Active" },
  // Pintura
  { id: "4", name: "Pintura Parcial", category: "Pintura", defaultPrice: 80, status: "Active" },
  { id: "5", name: "Pintura Completa", category: "Pintura", defaultPrice: 120, status: "Active" },
  { id: "6", name: "Pintura de Midsole", category: "Pintura", defaultPrice: 60, status: "Active" },
  { id: "7", name: "Retoque de Pintura", category: "Pintura", defaultPrice: 40, status: "Active" },
  // Costura
  { id: "8", name: "Costura simples de cabedal", category: "Costura", defaultPrice: 60, status: "Active" },
  { id: "9", name: "Reforço estrutural", category: "Costura", defaultPrice: 80, status: "Active" },
  { id: "10", name: "Costura interna", category: "Costura", defaultPrice: 50, status: "Active" },
  // Restauração
  { id: "11", name: "Remoção de amarelado", category: "Restauração", defaultPrice: 70, status: "Active" },
  { id: "12", name: "Hidratação de couro", category: "Restauração", defaultPrice: 40, status: "Active" },
  { id: "13", name: "Revitalização de camurça/nobuck", category: "Restauração", defaultPrice: 50, status: "Active" },
  { id: "14", name: "Remoção de crease", category: "Restauração", defaultPrice: 30, status: "Active" },
  { id: "15", name: "Colagem de solado", category: "Restauração", defaultPrice: 90, status: "Active" },
  // Extra / Avulso
  { id: "16", name: "Impermeabilização", category: "Extra / Avulso", defaultPrice: 25, status: "Active" },
  { id: "17", name: "Taxa de urgência", category: "Extra / Avulso", defaultPrice: 30, status: "Active" },
  { id: "18", name: "Taxa de entrega", category: "Extra / Avulso", defaultPrice: 0, status: "Active", isEditable: true },
  { id: "19", name: "Serviço personalizado", category: "Extra / Avulso", defaultPrice: 0, status: "Active", isEditable: true },
];
