
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
  { id: "1", name: "Higienização Basic", category: "Higienização", defaultPrice: 38, status: "Active" },
  { id: "2", name: "Higienização Basic - 24h", category: "Higienização", defaultPrice: 85, status: "Active" },
  { id: "3", name: "Higienização Basic - 72h", category: "Higienização", defaultPrice: 55, status: "Active" },
  { id: "4", name: "Higienização Pro", category: "Higienização", defaultPrice: 55, status: "Active" },
  { id: "5", name: "Higienização Pro - 24h", category: "Higienização", defaultPrice: 110, status: "Active" },
  { id: "6", name: "Higienização Pro - 72h", category: "Higienização", defaultPrice: 70, status: "Active" },
  { id: "7", name: "Higienização Premium", category: "Higienização", defaultPrice: 70, status: "Active" },
  { id: "8", name: "Higienização Premium - 24h", category: "Higienização", defaultPrice: 125, status: "Active" },
  { id: "9", name: "Higienização Premium - 72h", category: "Higienização", defaultPrice: 85, status: "Active" },
  
  // Pintura
  { id: "10", name: "Pintura Parcial", category: "Pintura", defaultPrice: 85, status: "Active" },
  { id: "11", name: "Pintura Completa", category: "Pintura", defaultPrice: 120, status: "Active" },
  
  // Costura
  { id: "12", name: "Costura Cabedal", category: "Costura", defaultPrice: 75, status: "Active" },
  
  // Restauração
  { id: "13", name: "Clareamento da Mid (Entre Sola)", category: "Restauração", defaultPrice: 80, status: "Active" },
  { id: "14", name: "Colagem Simples", category: "Restauração", defaultPrice: 70, status: "Active" },
  { id: "15", name: "Remoção de Crease", category: "Restauração", defaultPrice: 30, status: "Active" },
  
  // Extra / Avulso
  { id: "16", name: "Impermeabilização", category: "Extra / Avulso", defaultPrice: 25, status: "Active" },
  { id: "17", name: "Taxa de entrega", category: "Extra / Avulso", defaultPrice: 0, status: "Active", isEditable: true },
  { id: "18", name: "Serviço personalizado", category: "Extra / Avulso", defaultPrice: 0, status: "Active", isEditable: true },
];
