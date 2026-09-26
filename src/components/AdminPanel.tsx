import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  User, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Wrench, 
  Calendar, 
  Import, 
  Sparkles, 
  Copy, 
  Check, 
  Flame, 
  Globe, 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Save, 
  RefreshCw,
  Building2,
  DollarSign,
  Tag,
  FileText,
  AlertCircle
} from 'lucide-react';
import { studyService } from '../services/studyService';
import { UserProfile, UserSubscription, LandingPageConfig, Concurso } from '../types';
import { cn, safeFormatDistanceToNow } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function UserPlanBadge({ plan }: { plan: string }) {
  const getPlanLabel = () => {
    switch (plan) {
      case 'elite': return 'Elite (R$ 100,00)';
      case 'pro': return 'Pro (R$ 50,00)';
      default: return 'Gratuito';
    }
  };

  return (
    <span className={cn(
      "px-2 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase tracking-wider",
      plan === 'elite' ? "bg-amber-100 text-amber-800 border border-amber-200" :
      plan === 'pro' ? "bg-indigo-100 text-indigo-800 border border-indigo-200" :
      "bg-slate-100 text-slate-800 border border-slate-200"
    )}>
      {getPlanLabel()}
    </span>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'concursos' | 'cms' | 'maintenance'>('users');
  
  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  // Concursos state
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [concursoSearch, setConcursoSearch] = useState('');
  const [isEditingConcurso, setIsEditingConcurso] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Partial<Concurso> | null>(null);
  const [isSyncingPresets, setIsSyncingPresets] = useState(false);

  // CMS state
  const [cmsConfig, setCmsConfig] = useState<LandingPageConfig>({
    heroBadge: "⚡ Plataforma #1 em Aprovação Rápida",
    heroTitle: "Sua Aprovação em Concursos Públicos Começa Aqui",
    heroSubtitle: "Estude de forma estratégica com o maior ecossistema integrado: banco de questões atualizado, gabaritos comentados, flashcards com repetição espaçada (SRS), cronograma inteligente e editais verticalizados.",
    ctaPrimaryText: "Começar Gratuitamente",
    ctaSecondaryText: "Conhecer Planos e Preços",
    announcementText: "🎁 Bônus Exclusivo: Ganhe 10 Dias de Teste Grátis em Todos os Planos ao se cadastrar hoje!",
    statsTitle: "META",
    statsUsers: "+15.000",
    statsUsersLabel: "Estudantes Ativos",
    statsQuestions: "+60.000",
    statsQuestionsLabel: "Questões Filtradas",
    statsApproval: "94%",
    statsApprovalLabel: "Índice de Eficiência",
    whatsappLink: "https://wa.me/5598988888888",
    instagramLink: "https://www.instagram.com/sqconcursos_"
  });
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [cmsSavedToast, setCmsSavedToast] = useState(false);

  const updateProgress = (p: { current: number; total: number }) => {
    setProgress(prev => ({ ...prev, current: p.current, total: p.total }));
  };

  useEffect(() => {
    const unsubscribeUsers = studyService.subscribeToAllUsers(setUsers);
    
    const unsubscribeSubs = studyService.subscribeToAllSubscriptions((subs) => {
      const subMap: Record<string, UserSubscription> = {};
      subs.forEach(sub => {
        if (sub.uid) subMap[sub.uid] = sub;
      });
      setSubscriptions(subMap);
    });

    const unsubscribeConcursos = studyService.subscribeToAllConcursos(setConcursos);

    const unsubscribeCms = studyService.subscribeToLandingPageConfig((config) => {
      if (config) {
        setCmsConfig(prev => ({ ...prev, ...config }));
      }
    });
    
    return () => {
      unsubscribeUsers();
      unsubscribeSubs();
      unsubscribeConcursos();
      unsubscribeCms();
    };
  }, []);

  const handleUpdateRole = async (uid: string, role: 'admin' | 'user' | 'colaborador') => {
    await studyService.updateUserRole(uid, role);
  };

  const handleUpdatePlan = async (uid: string, plan: 'free' | 'pro' | 'elite') => {
    await studyService.updatePlan(uid, plan);
  };

  const handleUpdateExpiration = async (uid: string, date: string) => {
    const expiresAt = date ? new Date(date).getTime() : null;
    const currentPlan = subscriptions[uid]?.plan || 'free';
    await studyService.updatePlan(uid, currentPlan, expiresAt);
  };

  const handleSanitizeQuestions = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: 'Iniciando varredura de questões...' });
    try {
      await studyService.sanitizeAllQuestions(updateProgress);
      alert('Varredura de questões concluída com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro na varredura. Verifique o console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSanitizeFlashcards = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, status: 'Iniciando varredura de flashcards...' });
    try {
      await studyService.sanitizeAllFlashcards(updateProgress);
      alert('Varredura de flashcards concluída com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro na varredura. Verifique o console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getExpirationDateString = (uid: string) => {
    const expiresAt = subscriptions[uid]?.expiresAt;
    if (!expiresAt || isNaN(new Date(expiresAt).getTime())) return '';
    try {
      return new Date(expiresAt).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Concursos handlers
  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await studyService.toggleConcursoFeatured(id, !current);
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar destaque.");
    }
  };

  const handleDeleteConcurso = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este concurso?")) return;
    try {
      await studyService.deleteConcurso(id);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir concurso.");
    }
  };

  const handleSaveConcurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConcurso?.title || !editingConcurso?.institution) {
      alert("Título e Órgão/Instituição são obrigatórios.");
      return;
    }
    try {
      if (editingConcurso.id) {
        await studyService.updateConcurso(editingConcurso.id, editingConcurso);
      } else {
        await studyService.addConcurso({
          title: editingConcurso.title,
          institution: editingConcurso.institution,
          banca: editingConcurso.banca || 'A Definir',
          status: editingConcurso.status || 'Edital Publicado',
          vagas: editingConcurso.vagas || 'Vagas Imediatas + CR',
          remuneracao: editingConcurso.remuneracao || 'A definir',
          escolaridade: editingConcurso.escolaridade || 'Nível Médio',
          dataProva: editingConcurso.dataProva || 'A definir',
          inscricaoPeriodo: editingConcurso.inscricaoPeriodo || 'Consulte o edital',
          editalUrl: editingConcurso.editalUrl || '',
          isFeatured: editingConcurso.isFeatured ?? true,
          featuredOrder: editingConcurso.featuredOrder ?? 1,
          description: editingConcurso.description || ''
        });
      }
      setIsEditingConcurso(false);
      setEditingConcurso(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar concurso.");
    }
  };

  const handleSyncPresets = async () => {
    setIsSyncingPresets(true);
    try {
      const added = await studyService.syncDefaultConcursosFromPresets();
      alert(`Sincronização concluída! ${added} novos editais predefinidos foram adicionados à base de dados.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao sincronizar editais predefinidos.");
    } finally {
      setIsSyncingPresets(false);
    }
  };

  const filteredConcursos = useMemo(() => {
    return concursos.filter(c => 
      c.title?.toLowerCase().includes(concursoSearch.toLowerCase()) ||
      c.institution?.toLowerCase().includes(concursoSearch.toLowerCase()) ||
      c.banca?.toLowerCase().includes(concursoSearch.toLowerCase())
    );
  }, [concursos, concursoSearch]);

  // CMS Handlers
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCms(true);
    try {
      await studyService.updateLandingPageConfig(cmsConfig);
      setCmsSavedToast(true);
      setTimeout(() => setCmsSavedToast(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações da página inicial.");
    } finally {
      setIsSavingCms(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-orange-600" />
          Painel Administrativo
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-colors relative whitespace-nowrap cursor-pointer flex items-center gap-2",
            activeTab === 'users' ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Users size={16} />
          Usuários ({users.length})
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
        </button>

        <button
          onClick={() => setActiveTab('concursos')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-colors relative whitespace-nowrap cursor-pointer flex items-center gap-2",
            activeTab === 'concursos' ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Flame size={16} className="text-orange-500" />
          Vitrine de Concursos ({concursos.length})
          {activeTab === 'concursos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
        </button>

        <button
          onClick={() => setActiveTab('cms')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-colors relative whitespace-nowrap cursor-pointer flex items-center gap-2",
            activeTab === 'cms' ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Globe size={16} />
          Página Inicial (CMS)
          {activeTab === 'cms' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-colors relative whitespace-nowrap cursor-pointer flex items-center gap-2",
            activeTab === 'maintenance' ? "text-orange-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Wrench size={16} />
          Manutenção
          {activeTab === 'maintenance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />}
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar usuários por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-[1000px] w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acesso / Validade</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.photoURL ? (
                            <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{user.displayName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-bold rounded-full",
                        user.role === 'admin' ? "bg-purple-100 text-purple-800" :
                        user.role === 'colaborador' ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'colaborador' ? 'Colaborador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <UserPlanBadge plan={subscriptions[user.uid]?.plan || 'free'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 flex flex-col gap-1">
                        <div className="flex items-center gap-1" title="Último Acesso">
                          <Clock size={12} />
                          {safeFormatDistanceToNow(user.lastAccess)}
                        </div>
                        {subscriptions[user.uid]?.expiresAt && !isNaN(new Date(subscriptions[user.uid].expiresAt!).getTime()) && (
                          <div className="flex items-center gap-1 font-bold text-rose-500" title="Data de Expiração">
                            <Calendar size={12} />
                            {new Date(subscriptions[user.uid].expiresAt!).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex flex-col gap-2 items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold w-12">Função:</span>
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 py-1"
                          >
                            <option value="user">Usuário</option>
                            <option value="colaborador">Colaborador</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold w-12">Plano:</span>
                          <select
                            value={subscriptions[user.uid]?.plan || 'free'}
                            onChange={(e) => handleUpdatePlan(user.uid, e.target.value as any)}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 py-1"
                          >
                            <option value="free">Gratuito</option>
                            <option value="pro">Pro</option>
                            <option value="elite">Elite</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold w-12">Validade:</span>
                          <input
                            type="date"
                            value={getExpirationDateString(user.uid)}
                            onChange={(e) => handleUpdateExpiration(user.uid, e.target.value)}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 py-0.5 px-1 w-32"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: VITRINE DE CONCURSOS */}
      {activeTab === 'concursos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Flame className="text-orange-500 fill-orange-500" size={20} />
                Gestão da Vitrine de Concursos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre editais ou marque com "Destaque" para exibir automaticamente na página inicial em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncPresets}
                disabled={isSyncingPresets}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Puxa editais dos presets e cadastra no banco"
              >
                <RefreshCw size={14} className={isSyncingPresets ? "animate-spin" : ""} />
                Sincronizar Editais Predefinidos
              </button>
              <button
                onClick={() => {
                  setEditingConcurso({
                    title: '',
                    institution: '',
                    banca: '',
                    status: 'Edital Publicado',
                    vagas: '',
                    remuneracao: '',
                    escolaridade: 'Nível Médio',
                    isFeatured: true,
                    featuredOrder: (concursos.length || 0) + 1,
                    description: '',
                    editalUrl: ''
                  });
                  setIsEditingConcurso(true);
                }}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus size={16} />
                Novo Concurso
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por título, órgão ou banca..."
              value={concursoSearch}
              onChange={(e) => setConcursoSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Concursos Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="min-w-[900px] w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Destaque na Home</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Órgão / Concurso</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Banca</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vagas & Salário</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConcursos.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFeatured(c.id, c.isFeatured)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                          c.isFeatured
                            ? "bg-orange-100 text-orange-800 border border-orange-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        <Flame size={12} className={c.isFeatured ? "fill-orange-600 text-orange-600" : "text-slate-400"} />
                        {c.isFeatured ? 'Em Destaque' : 'Não Destacado'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wide block">{c.institution}</span>
                      <span className="text-sm font-black text-slate-900">{c.title}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {c.banca || 'A Definir'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {c.status || 'Previsto'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                      <div><strong className="text-slate-800">Vagas:</strong> {c.vagas || 'CR'}</div>
                      <div><strong className="text-slate-800">Salário:</strong> {c.remuneracao || 'A definir'}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingConcurso(c);
                            setIsEditingConcurso(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteConcurso(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredConcursos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      Nenhum concurso encontrado. Clique em "Sincronizar Editais Predefinidos" para preencher automaticamente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Edit/Create Concurso Modal */}
          {isEditingConcurso && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 relative">
                <h3 className="text-xl font-black text-slate-900 mb-4">
                  {editingConcurso?.id ? 'Editar Concurso / Edital' : 'Novo Concurso em Destaque'}
                </h3>

                <form onSubmit={handleSaveConcurso} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Título do Concurso / Cargos *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Soldado e Oficial da Polícia Militar"
                        value={editingConcurso?.title || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Órgão / Instituição *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: PMMA / CBMMA"
                        value={editingConcurso?.institution || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, institution: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Banca Examinadora</label>
                      <input
                        type="text"
                        placeholder="Ex: FGV, Cebraspe, FCC"
                        value={editingConcurso?.banca || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, banca: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Status da Etapa</label>
                      <select
                        value={editingConcurso?.status || 'Edital Publicado'}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      >
                        <option value="Edital Publicado">Edital Publicado</option>
                        <option value="Inscrições Abertas">Inscrições Abertas</option>
                        <option value="Banca Definida">Banca Definida</option>
                        <option value="Comissão Formada">Comissão Formada</option>
                        <option value="Autorizado">Autorizado</option>
                        <option value="Previsto">Previsto</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Número de Vagas</label>
                      <input
                        type="text"
                        placeholder="Ex: 2.000 vagas"
                        value={editingConcurso?.vagas || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, vagas: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Remuneração / Salário</label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 5.200,00"
                        value={editingConcurso?.remuneracao || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, remuneracao: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Escolaridade Exigida</label>
                      <input
                        type="text"
                        placeholder="Ex: Nível Médio / Superior"
                        value={editingConcurso?.escolaridade || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, escolaridade: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Link Oficial do Edital (PDF/Página)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={editingConcurso?.editalUrl || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, editalUrl: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Breve Descrição / Detalhes</label>
                      <textarea
                        rows={3}
                        placeholder="Breve resumo da oportunidade..."
                        value={editingConcurso?.description || ''}
                        onChange={(e) => setEditingConcurso(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingConcurso?.isFeatured ?? true}
                          onChange={(e) => setEditingConcurso(prev => ({ ...prev, isFeatured: e.target.checked }))}
                          className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Exibir em Destaque na Vitrine da Página Inicial
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingConcurso(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      Salvar Concurso
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PÁGINA INICIAL (CMS) */}
      {activeTab === 'cms' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Globe className="text-orange-600" size={22} />
                Gestão da Página Inicial (CMS)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Altere textos, chamadas, banners e links da página inicial sem precisar alterar código-fonte.
              </p>
            </div>

            {cmsSavedToast && (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 size={14} /> Salvo com sucesso!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCms} className="space-y-6">
            {/* Announcement Banner */}
            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-600" />
                Faixa de Anúncio Superior (Topo da Página)
              </h4>
              <input
                type="text"
                placeholder="Texto da barra superior de avisos..."
                value={cmsConfig.announcementText || ''}
                onChange={(e) => setCmsConfig(prev => ({ ...prev, announcementText: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Hero Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                Seção Principal (Hero da Capa)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Badge de Destaque (Acima do título)</label>
                  <input
                    type="text"
                    value={cmsConfig.heroBadge || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, heroBadge: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Texto do Botão Principal (CTA 1)</label>
                  <input
                    type="text"
                    value={cmsConfig.ctaPrimaryText || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, ctaPrimaryText: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Título Principal (H1) *</label>
                  <input
                    type="text"
                    required
                    value={cmsConfig.heroTitle || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, heroTitle: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subtítulo / Proposta de Valor *</label>
                  <textarea
                    rows={3}
                    required
                    value={cmsConfig.heroSubtitle || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                Números e Métricas da Plataforma
              </h4>

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 block mb-1">Título da Seção de Métricas (ex: META)</label>
                <input
                  type="text"
                  placeholder="META"
                  value={cmsConfig.statsTitle || ''}
                  onChange={(e) => setCmsConfig(prev => ({ ...prev, statsTitle: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">Métrica 1 (Alunos)</label>
                  <input
                    type="text"
                    value={cmsConfig.statsUsers || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsUsers: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Legenda"
                    value={cmsConfig.statsUsersLabel || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsUsersLabel: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">Métrica 2 (Questões)</label>
                  <input
                    type="text"
                    value={cmsConfig.statsQuestions || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsQuestions: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-orange-600"
                  />
                  <input
                    type="text"
                    placeholder="Legenda"
                    value={cmsConfig.statsQuestionsLabel || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsQuestionsLabel: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">Métrica 3 (Aprovação/Satisfação)</label>
                  <input
                    type="text"
                    value={cmsConfig.statsApproval || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsApproval: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600"
                  />
                  <input
                    type="text"
                    placeholder="Legenda"
                    value={cmsConfig.statsApprovalLabel || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, statsApprovalLabel: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Social & Contact Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                Links e Redes Sociais
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Link do Instagram</label>
                  <input
                    type="url"
                    value={cmsConfig.instagramLink || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, instagramLink: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Link do WhatsApp de Suporte</label>
                  <input
                    type="url"
                    value={cmsConfig.whatsappLink || ''}
                    onChange={(e) => setCmsConfig(prev => ({ ...prev, whatsappLink: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingCms}
                className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-orange-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                {isSavingCms ? 'Salvando Alterações...' : 'Salvar Página Inicial'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Ferramentas de Manutenção</h2>
              <p className="text-sm text-slate-500">Ações de limpeza e correção em massa no banco de dados.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-2">Correção de Codificação (Caracteres)</h3>
              <p className="text-sm text-slate-600 mb-4">
                Corrige erros de codificação em massa (ex: 'Ã¡' virando 'á') em todas as questões e flashcards. 
                Utilize após importar arquivos CSV com problemas de acentuação.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSanitizeQuestions}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  Corrigir Questões
                </button>
                <button
                  onClick={handleSanitizeFlashcards}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  Corrigir Flashcards
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 animate-pulse">
                <p className="text-sm font-bold text-orange-700 mb-2">{progress.status}</p>
                <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-600 h-full transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-orange-500 mt-2">
                  {progress.current} de {progress.total} registros processados
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
