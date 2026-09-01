import React, { useState, useEffect, useMemo } from 'react';
import { Users, Shield, User, Star, CheckCircle2, XCircle, Clock, Search, Wrench, Calendar, Import, Sparkles, Copy, Check } from 'lucide-react';
import { studyService } from '../services/studyService';
import { UserProfile, UserSubscription } from '../types';
import { cn, safeFormatDistanceToNow } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDocs, addDoc, where } from 'firebase/firestore';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'maintenance'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

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
    
    return () => {
      unsubscribeUsers();
      unsubscribeSubs();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-indigo-600" />
          Painel Administrativo
        </h1>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "pb-4 px-2 text-sm font-medium transition-colors relative",
            activeTab === 'users' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Usuários
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            "pb-4 px-2 text-sm font-medium transition-colors relative",
            activeTab === 'maintenance' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Manutenção
          {activeTab === 'maintenance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar usuários por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-[1000px] w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acesso / Validade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
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
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-indigo-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
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
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1"
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
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1"
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
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-0.5 px-1 w-32"
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
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Wrench className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Ferramentas de Manutenção</h2>
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
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Corrigir Questões
                </button>
                <button
                  onClick={handleSanitizeFlashcards}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Corrigir Flashcards
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
                <p className="text-sm font-bold text-indigo-700 mb-2">{progress.status}</p>
                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-indigo-500 mt-2">
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
