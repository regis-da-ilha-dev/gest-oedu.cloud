import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, ExternalLink, Loader2, PackageOpen, MoreVertical, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { studyService } from '../services/studyService';
import { StoreProduct, UserProfile } from '../types';

interface StoreProps {
  userProfile: UserProfile | null;
}

export default function Store({ userProfile }: StoreProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<StoreProduct | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: '',
    link: ''
  });


  const isAdmin = userProfile?.role === 'admin' || userProfile?.email === 'oeditordeimagens@gmail.com';

  useEffect(() => {
    const unsubscribe = studyService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatUrl = (url: string) => {
    if (!url || url === '000') return '#';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    return `https://${url}`;
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.imageUrl || !newProduct.link || !newProduct.category) return;

    setIsSubmitting(true);
    try {
      const formattedProduct = {
        ...newProduct,
        link: formatUrl(newProduct.link)
      };
      await studyService.addProduct(formattedProduct);
      setNewProduct({ title: '', description: '', category: '', imageUrl: '', link: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      await studyService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setActiveMenu(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Erro ao excluir produto. Verifique suas permissões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" />
            Loja
          </h2>
          <p className="text-slate-500">Materiais e ferramentas recomendadas para sua aprovação.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Carregando loja...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          <PackageOpen size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">A loja ainda não possui produtos.</p>
          {isAdmin && <p className="text-sm">Clique em "Novo Produto" para começar.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {products.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300"
              >
                {/* Image Section */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 flex items-center justify-center border-b border-slate-100">
                  {product.imageUrl && product.imageUrl !== '000' ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title || 'Produto'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <PackageOpen size={48} strokeWidth={1} />
                      <span className="text-[10px] uppercase font-black tracking-widest">Sem imagem</span>
                    </div>
                  )}

                  {/* Settings Menu Button (Always visible if admin) */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 z-30">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenu(activeMenu === product.id ? null : product.id);
                        }}
                        className="p-1.5 bg-white/90 backdrop-blur-sm text-slate-600 rounded-full hover:bg-white shadow-md border border-slate-100 transition-all active:scale-95"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === product.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveMenu(null);
                              }}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                            >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setProductToDelete(product);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-xs font-bold"
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-tight">
                      {product.category || 'Geral'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 mt-1 leading-tight min-h-[2.5rem]">
                      {product.title || 'Produto sem título'}
                    </h3>
                  </div>

                  {/* Buttons Section (Matching model image) */}
                  <div className="mt-auto pt-2 flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className="flex-1 px-2 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:border-indigo-100 hover:bg-slate-50 transition-all text-xs text-center"
                    >
                      Mostrar detalhes
                    </button>
                    
                    {product.link && product.link !== '000' && (
                      <a
                        href={formatUrl(product.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-2.5 bg-[#3b66cf] text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Acessar</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Novo Produto */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900">Novo Produto</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Título do Produto</label>
                    <input
                      required
                      type="text"
                      value={newProduct.title}
                      onChange={e => setNewProduct(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Livro de Colorir Lendas do Brasil"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                    <input
                      required
                      type="text"
                      value={newProduct.category}
                      onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: E-Books e documentos"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                    <textarea
                      required
                      value={newProduct.description}
                      onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva os benefícios do produto..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL da Imagem</label>
                    <input
                      required
                      type="url"
                      value={newProduct.imageUrl}
                      onChange={e => setNewProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://exemplo.com/imagem.png"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Link de Venda/Acesso</label>
                    <input
                      required
                      type="url"
                      value={newProduct.link}
                      onChange={e => setNewProduct(prev => ({ ...prev, link: e.target.value }))}
                      placeholder="https://exemplo.com/produto"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus size={20} />
                      )}
                      <span>Cadastrar Produto</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Detalhes do Produto */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="relative aspect-video">
                {selectedProduct.imageUrl && selectedProduct.imageUrl !== '000' ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <PackageOpen size={48} className="text-slate-300" />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-slate-900 rounded-full hover:bg-white shadow-lg"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2 block">{selectedProduct.category}</span>
                <h3 className="text-2xl font-black text-slate-900 mb-6 leading-tight">{selectedProduct.title}</h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{selectedProduct.description}</p>
                </div>
              </div>
              <div className="p-8 pt-0 flex gap-4 mt-auto">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
                >
                  Fechar
                </button>
                {selectedProduct.link && selectedProduct.link !== '000' && (
                  <a
                    href={formatUrl(selectedProduct.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-[2] bg-[#3b66cf] text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all text-center text-sm shadow-lg shadow-blue-100"
                  >
                    Acessar Produto
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação de Exclusão */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Excluir Produto?</h3>
              <p className="text-slate-500 mb-8">Esta ação não pode ser desfeita. Tem certeza que deseja remover "{productToDelete.title}"?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
