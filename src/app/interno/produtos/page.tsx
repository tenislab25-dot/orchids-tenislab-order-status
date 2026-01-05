"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit2, ShoppingBag, Search, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

    export default function ProductsManagement() {
      const [products, setProducts] = useState<any[]>([]);
      const [categories, setCategories] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState("");
      const [editingProduct, setEditingProduct] = useState<any | null>(null);
      const [isAdding, setIsAdding] = useState(false);
      const [isManagingCategories, setIsAddingCategory] = useState(false);
      const [newCategoryName, setNewCategoryName] = useState("");
      const [newProduct, setNewProduct] = useState({ name: "", category: "", price: 0, stock_quantity: 0, description: "" });
      const [role, setRole] = useState<string | null>(null);
      
      useEffect(() => {
        const storedRole = localStorage.getItem("tenislab_role");
        setRole(storedRole);
        fetchProducts();
        fetchCategories();
      }, []);

      const fetchCategories = async () => {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("type", "Product")
          .order("name");
        
        if (!error && data) {
          setCategories(data);
          if (data.length > 0 && !newProduct.category) {
            setNewProduct(prev => ({ ...prev, category: data[0].name }));
          }
        }
      };

      const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const { data, error } = await supabase
          .from("categories")
          .insert([{ name: newCategoryName.trim(), type: "Product" }])
          .select();
        
        if (error) {
          toast.error("Erro ao adicionar categoria");
        } else {
          setCategories([...categories, data[0]]);
          setNewCategoryName("");
          toast.success("Categoria adicionada");
        }
      };

      const handleDeleteCategory = async (id: string) => {
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id);
        
        if (error) {
          toast.error("Erro ao excluir categoria (pode haver produtos nela)");
        } else {
          setCategories(categories.filter(c => c.id !== id));
          toast.success("Categoria excluída");
        }
      };

      const handleDeleteProduct = async (id: string) => {
        if (!isAdmin) return;
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);
        
        if (error) {
          toast.error("Erro ao excluir produto");
        } else {
          setProducts(products.filter(p => p.id !== id));
          toast.success("Produto excluído permanentemente");
        }
      };

  const isAdmin = role === "ADMIN";

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, status: newStatus } : p
      ));
      toast.success("Status atualizado");
    }
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;
    
    const { error } = await supabase
      .from("products")
      .update({ 
        name: editingProduct.name,
        price: editingProduct.price,
        stock_quantity: editingProduct.stock_quantity,
        description: editingProduct.description,
        category: editingProduct.category
      })
      .eq("id", editingProduct.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
      toast.success("Produto atualizado");
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price < 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert([{
        ...newProduct,
        status: "Active"
      }])
      .select();

    if (error) {
      toast.error("Erro ao adicionar produto");
    } else {
      setProducts(prev => [...prev, data[0]]);
      setIsAdding(false);
      setNewProduct({ name: "", category: "Acessórios", price: 0, stock_quantity: 0, description: "" });
      toast.success("Produto adicionado com sucesso");
      fetchProducts();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-8 mb-8">
          <div className="flex justify-between items-start">
            <Link href="/interno" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
              <ArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </Link>
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
                alt="TENISLAB Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  Gestão de Produtos
                </h1>
                <p className="text-slate-500 font-medium mt-1">Administração de itens para venda na TENISLAB</p>
              </div>
              
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Dialog open={isManagingCategories} onOpenChange={setIsAddingCategory}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold flex items-center gap-2">
                            Categorias
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Gerenciar Categorias de Produto</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                              <Input 
                                placeholder="Nova categoria..." 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                              />
                              <Button onClick={handleAddCategory} className="bg-slate-900 text-white">Adicionar</Button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                              {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                  <span className="font-medium">{cat.name}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                          <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Novo Produto
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Novo Produto</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <label className="text-sm font-bold">Nome do Produto</label>
                              <Input 
                                placeholder="Ex: Cadarço Premium"
                                value={newProduct.name} 
                                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                              />
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-bold">Categoria</label>
                              <select 
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <label className="text-sm font-bold">Preço (R$)</label>
                                <Input 
                                  type="number" 
                                  placeholder="0.00"
                                  value={newProduct.price} 
                                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                                />
                              </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-bold">Estoque</label>
                                <Input 
                                  type="number" 
                                  placeholder="0"
                                  value={newProduct.stock_quantity} 
                                  onChange={(e) => setNewProduct({...newProduct, stock_quantity: Number(e.target.value)})}
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-bold">Descrição</label>
                              <Input 
                                placeholder="Opcional..."
                                value={newProduct.description} 
                                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                            <Button onClick={handleAddProduct} className="bg-slate-900 text-white hover:bg-slate-800">Criar Produto</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar produto..." 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Produto</TableHead>
                <TableHead className="font-bold text-slate-900">Categoria</TableHead>
                <TableHead className="font-bold text-slate-900">Preço</TableHead>
                <TableHead className="font-bold text-slate-900">Estoque</TableHead>
                <TableHead className="font-bold text-slate-900">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map((product) => (
                <TableRow key={product.id} className={product.status === "Inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${product.stock_quantity <= 5 ? "text-red-500" : "text-slate-600"}`}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={product.status === "Active"} 
                        onCheckedChange={() => toggleStatus(product.id, product.status)}
                      />
                      <span className={`text-xs font-bold uppercase ${product.status === "Active" ? "text-green-600" : "text-slate-400"}`}>
                        {product.status === "Active" ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        {editingProduct && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Produto</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <label className="text-sm font-bold">Nome do Produto</label>
                                <Input 
                                  value={editingProduct.name} 
                                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                />
                              </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-bold">Categoria</label>
                                <select 
                                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  value={editingProduct.category}
                                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                                >
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Preço (R$)</label>
                                  <Input 
                                    type="number" 
                                    disabled={!isAdmin}
                                    value={editingProduct.price} 
                                    onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Estoque</label>
                                  <Input 
                                    type="number" 
                                    value={editingProduct.stock_quantity} 
                                    onChange={(e) => setEditingProduct({...editingProduct, stock_quantity: Number(e.target.value)})}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <label className="text-sm font-bold">Descrição</label>
                                <Input 
                                  value={editingProduct.description || ""} 
                                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
                              <Button onClick={handleEditSave}>Salvar Alterações</Button>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>

                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
