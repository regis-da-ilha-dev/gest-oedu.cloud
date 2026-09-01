import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, ListTodo, History, Timer, BarChart3, LogOut, User, Layers, ShoppingBag, Zap, Shield, PlusCircle, Headset, Menu, X, AlertTriangle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, UserSubscription } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  userProfile: UserProfile | null;
  subscription: UserSubscription | null;
  onLogout: () => void;
  onSwitchToFree?: () => void;
}

export default function Layout({ children, user, userProfile, subscription, onLogout, onSwitchToFree }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const { showExpiringSoon, isExpired, daysRemaining } = React.useMemo(() => {
    const now = Date.now();
    const expiresAt = subscription?.expiresAt;
    const remaining = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;
    return {
      daysRemaining: remaining,
      showExpiringSoon: remaining !== null && remaining <= 5 && remaining > 0,
      isExpired: remaining !== null && remaining <= 0
    };
  }, [subscription?.expiresAt]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/subjects', label: 'Matérias', icon: BookOpen },
    { path: '/topics', label: 'Tópicos', icon: ListTodo },
    { path: '/questions', label: 'Questões', icon: ListTodo },
    { path: '/flashcards', label: 'Flashcards', icon: Layers },
    { path: '/pricing', label: 'Planos', icon: Zap },
    { path: '/history', label: 'Histórico', icon: History },
    { path: '/stats', label: 'Estatísticas', icon: BarChart3 },
    { path: '/store', label: 'Loja', icon: ShoppingBag },
    { path: '/support', label: 'Suporte', icon: Headset },
  ];

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email === 'oeditordeimagens@gmail.com';

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Sidebar Toggle Button (Desktop Only) */}
      <button
        onClick={() => {
          const newState = !isSidebarCollapsed;
          setIsSidebarCollapsed(newState);
          try {
            localStorage.setItem('sidebar_collapsed', String(newState));
          } catch (e) {
            console.error(e);
          }
        }}
        className={cn(
          "hidden md:flex fixed top-6 z-50 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-md cursor-pointer transition-all duration-300",
          isSidebarCollapsed ? "left-4" : "left-[242px]"
        )}
        title={isSidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}
      >
        {isSidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b-2 border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-500 border-2 border-b-4 border-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm">
            <BookOpen size={18} />
          </div>
          <h1 className="font-black text-xl text-slate-800 tracking-tight">GestãoEdu</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-0 z-40 md:sticky md:top-0 md:h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
        isSidebarCollapsed 
          ? "w-full md:w-0 md:opacity-0 md:pointer-events-none md:overflow-hidden md:border-r-0" 
          : "w-full md:w-64 md:opacity-100 md:pointer-events-auto",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-500 border-2 border-b-4 border-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-sm">
              <BookOpen size={24} />
            </div>
            <h1 className="font-black text-2xl text-slate-800 tracking-tight">GestãoEdu</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto mt-14 md:mt-0">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all duration-100 border-2",
                isActive
                  ? "bg-indigo-50/60 text-indigo-700 border-indigo-200 border-b-4 shadow-sm"
                  : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="px-4 py-2 mb-4 bg-slate-50/80 rounded-2xl border-2 border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Proprietário</p>
            <a 
              href="https://www.instagram.com/sdeconcursos_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              @sdeconcursos_
            </a>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                <User size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 min-w-0">
        <div className="max-w-6xl mx-auto">
          {(showExpiringSoon || isExpired) && (
            <div className={cn(
              "mb-6 p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm",
              isExpired ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0",
                  isExpired ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                )}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 className={cn(
                    "text-sm font-extrabold",
                    isExpired ? "text-red-900" : "text-amber-900"
                  )}>
                    {isExpired 
                      ? "Seu período de 10 dias de teste do Plano Elite expirou!" 
                      : `Sua degustação do Plano Elite expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`}
                  </h4>
                  <p className={cn(
                    "text-xs mt-0.5 leading-relaxed",
                    isExpired ? "text-red-700" : "text-amber-700"
                  )}>
                    {isExpired 
                      ? "Seu prazo de degustação terminou. Atualize seu plano para manter o acesso ilimitado ou mude para o Plano Gratuito." 
                      : "Aproveite todos os recursos ilimitados durante o seu período de teste grátis."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
                {isExpired && onSwitchToFree && (
                  <button
                    onClick={onSwitchToFree}
                    className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Usar Plano Gratuito
                  </button>
                )}
                <NavLink 
                  to="/pricing"
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm whitespace-nowrap",
                    isExpired 
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-red-100" 
                      : "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100"
                  )}
                >
                  {isExpired ? "Atualizar Plano" : "Ver Planos"}
                  <ExternalLink size={14} />
                </NavLink>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
