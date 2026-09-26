import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Zap, 
  Star, 
  Check, 
  Sparkles, 
  Flame, 
  HelpCircle, 
  Layers, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Users, 
  Award, 
  ChevronDown, 
  TrendingUp,
  Target,
  MessageCircle,
  Instagram,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  X,
  ArrowLeft,
  FileText,
  BarChart3,
  CalendarCheck
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { studyService } from '../services/studyService';
import { LandingPageConfig, Concurso } from '../types';
import FeaturedConcursosShowcase from './FeaturedConcursosShowcase';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onLogin: () => void;
  isLoading?: boolean;
  loginError?: string | null;
  onClearError?: () => void;
}

export default function LandingPage({
  onLogin,
  isLoading,
  loginError,
  onClearError
}: LandingPageProps) {
  // CMS Configuration State (with high-converting default copy)
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

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Subscribe to real-time CMS config from Firestore
  useEffect(() => {
    const unsub = studyService.subscribeToLandingPageConfig((config) => {
      if (config) {
        setCmsConfig(prev => ({ ...prev, ...config }));
      }
    });
    return () => unsub();
  }, []);

  const openAuthWithMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setLocalError(null);
    setLocalSuccess(null);
    setIsAuthModalOpen(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }
    setLocalLoading(true);
    setLocalError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setLocalError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('Formato de e-mail inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setLocalError('Muitas tentativas. Acesso temporariamente bloqueado.');
      } else {
        setLocalError(err.message || 'Erro ao realizar login.');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setLocalError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }
    setLocalLoading(true);
    setLocalError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await studyService.ensureUserProfile(userCredential.user.uid, email, displayName);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setLocalError('Este e-mail já está sendo utilizado por outra conta.');
      } else {
        setLocalError(err.message || 'Erro ao criar conta.');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setLocalError('Por favor, informe seu e-mail.');
      return;
    }
    setLocalLoading(true);
    setLocalError(null);
    setLocalSuccess(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setLocalSuccess('Link de recuperação enviado com sucesso para seu e-mail!');
    } catch (err: any) {
      setLocalError(err.message || 'Erro ao enviar link de recuperação.');
    } finally {
      setLocalLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: '0',
      period: 'mês',
      badge: '🎁 10 Dias Grátis no Início',
      description: 'Ideal para conhecer a metodologia e organizar os primeiros ciclos de estudos.',
      features: [
        '🎁 10 Dias de Teste Grátis de Todos os Recursos',
        'Controle de estudos ilimitado',
        'Até 50 flashcards pessoais',
        '10 questões/dia no Banco',
        'Filtros básicos de questões',
        'Cronômetro de estudos Pomodoro'
      ],
      icon: BookOpen,
      color: 'bg-slate-100 text-slate-700',
      btnText: 'Cadastrar com 10 Dias Grátis'
    },
    {
      id: 'pro',
      name: 'Estudante Pro',
      price: '50,00',
      period: 'ano',
      badge: 'Mais Popular • 10 Dias Grátis',
      description: 'Para concurseiros focados que buscam alto rendimento e resolução contínua.',
      features: [
        '🎁 10 Dias de Teste Grátis para Testar',
        'Até 1.000 flashcards ativos',
        'Acesso ILIMITADO ao Banco de Questões',
        'Filtros completos (Banca, Ano, Dificuldade)',
        'Gabaritos comentados detalhados',
        'Estatísticas de acertos e histórico'
      ],
      icon: Zap,
      color: 'bg-indigo-600 text-white',
      highlight: true,
      btnText: 'Testar Pro por 10 Dias Grátis'
    },
    {
      id: 'elite',
      name: 'Concurseiro Elite',
      price: '100,00',
      period: 'ano',
      badge: '🎁 10 Dias Grátis no Cadastro',
      description: 'Experiência máxima sem nenhuma limitação, com recursos VIP e suporte dedicado.',
      features: [
        '🎁 10 Dias de Teste Grátis Automático',
        'Flashcards ILIMITADOS com algoritmo SRS',
        'Questões ILIMITADAS e Simulados',
        'Edital verticalizado interativo',
        'Suporte prioritário via WhatsApp',
        'Acesso a todas as futuras atualizações'
      ],
      icon: Star,
      color: 'bg-amber-500 text-white',
      btnText: 'Testar Elite por 10 Dias Grátis'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white" id="landing-page-root">
      {/* Top Announcement Bar */}
      {cmsConfig.announcementText && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white py-2.5 px-4 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
          <Sparkles size={16} className="shrink-0 fill-current animate-bounce" />
          <span>{cmsConfig.announcementText}</span>
          <button 
            onClick={() => openAuthWithMode('register')}
            className="underline underline-offset-2 ml-2 hover:opacity-90 font-black cursor-pointer hidden sm:inline-block"
          >
            Aproveitar Agora &rarr;
          </button>
        </div>
      )}

      {/* Main Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-orange-500 border-2 border-b-4 border-orange-700 rounded-2xl flex items-center justify-center text-white shadow-md">
              <BookOpen size={24} />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight block leading-none">
                GestãoEdu
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">
                Plataforma de Concursos
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#concursos-destaque" className="hover:text-orange-600 transition-colors">
              Concursos
            </a>
            <a href="#recursos" className="hover:text-orange-600 transition-colors">
              Recursos
            </a>
            <a href="#planos" className="hover:text-orange-600 transition-colors">
              Planos & Preços
            </a>
            <a href="#depoimentos" className="hover:text-orange-600 transition-colors">
              Depoimentos
            </a>
            {cmsConfig.instagramLink && (
              <a 
                href={cmsConfig.instagramLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-orange-600 hover:text-orange-700 flex items-center gap-1 font-extrabold"
              >
                <Instagram size={16} />
                @{cmsConfig.instagramLink.replace(/\/$/, '').split('/').pop() || 'sqconcursos_'}
              </a>
            )}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuthWithMode('login')}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={() => openAuthWithMode('register')}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-md shadow-orange-100 cursor-pointer active:scale-95"
            >
              Cadastre-se Grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-orange-50/25 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {cmsConfig.heroBadge && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/70 border border-orange-200 text-orange-800 text-xs font-black uppercase tracking-wider">
                  <Flame size={15} className="text-orange-600 fill-orange-500" />
                  {cmsConfig.heroBadge}
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                {cmsConfig.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {cmsConfig.heroSubtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => openAuthWithMode('register')}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <span>{cmsConfig.ctaPrimaryText || 'Começar Gratuitamente'}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#planos"
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{cmsConfig.ctaSecondaryText || 'Conhecer Planos'}</span>
                  <ChevronDown size={16} />
                </a>
              </div>

              {/* Trust Indicators / Stats (Nossa Meta) */}
              <div className="pt-8 border-t border-slate-200/80 max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <Target size={14} className="text-orange-600" />
                    <span>{cmsConfig.statsTitle || 'META'}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
                      {cmsConfig.statsUsers}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {cmsConfig.statsUsersLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-orange-600 block">
                      {cmsConfig.statsQuestions}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {cmsConfig.statsQuestionsLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 block">
                      {cmsConfig.statsApproval}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {cmsConfig.statsApprovalLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup Preview */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Background decorative glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-orange-400 to-amber-300 rounded-[2.5rem] blur-2xl opacity-30 animate-pulse" />

                {/* Main Card UI Preview */}
                <div className="relative bg-white rounded-3xl border-2 border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                        Q1
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Direito Constitucional</span>
                        <h4 className="text-sm font-black text-slate-900">Art. 5º • Direitos e Garantias</h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                      FGV 2024
                    </span>
                  </div>

                  {/* Sample Question Content */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    "Segundo a Constituição Federal de 1988, homens e mulheres são iguais em direitos e obrigações nos termos desta Constituição..."
                  </p>

                  {/* Sample Alternatives */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-500 flex items-center justify-center font-bold text-[10px]">A</span>
                      <span>Princípio da Isonomia e Legalidade Estrita</span>
                    </div>
                    <div className="p-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[10px]">B</span>
                        <span>Princípio da Igualdade em Direitos e Deveres</span>
                      </div>
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-500 flex items-center justify-center font-bold text-[10px]">C</span>
                      <span>Prerrogativa exclusiva de servidores públicos</span>
                    </div>
                  </div>

                  {/* SRS Flashcard Floating Badge */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Algoritmo SRS Ativo</span>
                      <p className="text-xs font-bold text-slate-800">Próxima revisão em 3 dias com espaçamento ideal</p>
                    </div>
                  </div>

                  {/* Quick Action */}
                  <button
                    onClick={() => openAuthWithMode('register')}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Experimentar na Prática</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* VITRINE DE CONCURSOS EM DESTAQUE (AUTOMATIZADA & TEMPO REAL) */}
      <div className="bg-white border-y border-slate-200/80">
        <FeaturedConcursosShowcase 
          onSelectConcurso={(c) => {
            openAuthWithMode('register');
          }}
        />
      </div>

      {/* PLATFORM FEATURES & VALUE PROPOSITION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="recursos">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Metodologia Comprovada
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tudo o que você precisa para ser nomeado
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Elimine a desorganização. Nós combinamos questões reais de bancas, técnicas modernas de memorização e métricas de desempenho em um único lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
              <HelpCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Banco de Questões Inteligente</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Filtre por disciplina, assunto, banca examinadora, ano, órgão e cargo. Resolva com gabarito comentado na hora e eliminação com a ferramenta tesourinha.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Flashcards com Algoritmo SRS</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Nunca mais esqueça artigos de lei ou prazos processuais. O algoritmo de repetição espaçada agenda suas revisões no momento exato da curva do esquecimento.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
              <CalendarCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Edital Verticalizado & Tópicos</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Acompanhe seu avanço em teoria, exercícios e revisões tópico por tópico do edital. Saiba com precisão cirúrgica a porcentagem do programa que já concluiu.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Pomodoro Timer Integrado</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Monitore suas horas líquidas de estudo com contagem regressiva, pausas automáticas programadas e histórico diário e semanal de produtividade.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Gráficos de Desempenho Real</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Identifique suas fraquezas e pontos fortes por matéria e assunto. Tome decisões baseadas em números e dados reais dos seus simulados e exercícios.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Garantia & Suporte Especializado</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Criado e mantido por especialistas em concursos (@sqconcursos_). Suporte ágil e foco total nas suas necessidades práticas de estudo.
            </p>
          </div>
        </div>
      </section>

      {/* PLANOS E PREÇOS (CONFORME REQUISITO EXPLÍCITO) */}
      <section className="py-20 bg-slate-100/80 border-t border-slate-200" id="planos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-100/70 px-3 py-1 rounded-full border border-orange-200">
              10 Dias Grátis em Todos os Planos
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Planos e Preços Transparentes
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Todos os planos contam com 10 dias de teste grátis sem burocracia e sem cartão de crédito para você experimentar todas as ferramentas na prática.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "bg-white rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative border-2",
                  plan.highlight 
                    ? "border-orange-500 shadow-2xl shadow-orange-100 ring-4 ring-orange-500/10 lg:-translate-y-2"
                    : "border-slate-200 shadow-sm hover:shadow-lg"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Header */}
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-2xl", plan.color)}>
                      <plan.icon size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="py-2 border-y border-slate-100 flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-slate-400">R$</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                    <span className="text-xs font-bold text-slate-500">/{plan.period}</span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                        <div className="p-0.5 bg-emerald-100 text-emerald-600 rounded-full mt-0.5 shrink-0">
                          <Check size={12} />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Plan Action CTA */}
                <div className="pt-8">
                  <button
                    onClick={() => openAuthWithMode('register')}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2",
                      plan.highlight
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    <span>{plan.btnText}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 10-Day Free Trial & Guarantee Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto flex items-center gap-4 sm:gap-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">10 Dias Grátis em Todos os Planos & Garantia Total</h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                Você pode testar qualquer recurso do GestãoEdu por 10 dias gratuitamente. Risco zero para você focar no que realmente importa: a sua aprovação.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF & TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="depoimentos">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Histórias Reais
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            O que dizem os nossos alunos aprovados
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">
            Pessoas reais que transformaram sua rotina e conquistaram a estabilidade pública.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex text-amber-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-current" />
              ))}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "Os flashcards com algoritmo SRS mudaram meu jogo no Direito Constitucional e Penal. Eu errava sempre prazos e conceitos literais, e com as revisões diárias o acerto foi para 92% na prova!"
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm">
                LC
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900">Lucas Cavalcanti</h5>
                <span className="text-[11px] text-slate-400 font-bold">Aprovado Soldado PMMA</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex text-amber-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-current" />
              ))}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "A interface limpa sem distrações é perfeita. O banco de questões é super veloz e a ferramenta de eliminar alternativas me ajudou a treinar exatamente no modelo da FGV e Cebraspe."
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                MA
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900">Mariana Andrade</h5>
                <span className="text-[11px] text-slate-400 font-bold">Aprovada Técnico Judiciário</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex text-amber-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-current" />
              ))}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "Excelente custo-benefício. Ter cronômetro pomodoro, controle de questões e edital verticalizado em uma única plataforma me poupou semanas de planejamento em planilhas chatas."
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                RS
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900">Rodrigo Silva</h5>
                <span className="text-[11px] text-slate-400 font-bold">Estudante Concurseiro Elite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-600/30 via-slate-900 to-slate-900" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black uppercase tracking-wider">
            Comece Hoje Mesmo
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pronto para transformar seus estudos e ver seu nome no Diário Oficial?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Junte-se a milhares de concurseiros que estudam com método e disciplina. Cadastre-se e ganhe 10 dias de teste grátis para experimentar qualquer plano sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => openAuthWithMode('register')}
              className="w-full sm:w-auto px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-950/50 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <span>Cadastrar Agora Grátis</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => openAuthWithMode('login')}
              className="w-full sm:w-auto px-8 py-5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-sm rounded-2xl transition-all cursor-pointer"
            >
              Já tenho uma conta
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="font-black text-base text-slate-900 block leading-tight">GestãoEdu</span>
              <span className="text-[10px] text-slate-400 font-bold">© {new Date().getFullYear()} Todos os direitos reservados.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-500">
            <a href="#concursos-destaque" className="hover:text-slate-900 transition-colors">Concursos</a>
            <a href="#planos" className="hover:text-slate-900 transition-colors">Planos</a>
            <a href="#recursos" className="hover:text-slate-900 transition-colors">Recursos</a>
            {cmsConfig.instagramLink && (
              <a 
                href={cmsConfig.instagramLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-orange-600 hover:text-orange-700 font-black flex items-center gap-1"
              >
                <Instagram size={14} />
                @{cmsConfig.instagramLink.replace(/\/$/, '').split('/').pop() || 'sqconcursos_'}
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* AUTH POPUP MODAL (Google + Email) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {authMode === 'login' ? 'Acesse sua Conta' : authMode === 'register' ? 'Crie sua Conta Grátis' : 'Recuperar Senha'}
              </h3>
              <p className="text-xs text-slate-500">
                {authMode === 'login' 
                  ? 'Entre para continuar seu cronograma de estudos.'
                  : authMode === 'register'
                  ? 'Ganhe 10 dias de teste grátis em todos os planos automaticamente ao se cadastrar.'
                  : 'Digite seu e-mail para receber o link de redefinição.'}
              </p>
            </div>

            {/* Error notifications */}
            {(loginError || localError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{loginError || localError}</span>
              </div>
            )}

            {localSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
                <Check size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{localSuccess}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            {authMode !== 'forgot_password' && (
              <>
                <button
                  onClick={onLogin}
                  disabled={isLoading || localLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-orange-300 transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-sm text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                  ) : (
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Conectando...' : 'Entrar com Google (1 Clique)'}</span>
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-[1px] bg-slate-200 flex-1" />
                  <span className="text-[11px] text-slate-400 uppercase font-black tracking-wider">ou utilize e-mail</span>
                  <div className="h-[1px] bg-slate-200 flex-1" />
                </div>
              </>
            )}

            {/* Email Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Senha</label>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot_password'); setLocalError(null); }}
                      className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Esqueceu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {localLoading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar com E-mail'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Novo por aqui? </span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setLocalError(null); }}
                    className="text-xs font-black text-orange-600 hover:underline cursor-pointer"
                  >
                    Criar conta grátis
                  </button>
                </div>
              </form>
            )}

            {/* Email Register Form */}
            {authMode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Seu Nome Completo</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Ana Clara"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Crie sua Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {localLoading ? <Loader2 size={16} className="animate-spin" /> : 'Cadastrar e Ganhar 10 Dias Elite'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Já tem uma conta? </span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setLocalError(null); }}
                    className="text-xs font-black text-orange-600 hover:underline cursor-pointer"
                  >
                    Fazer Login
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setLocalError(null); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Voltar para login
                </button>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">E-mail Cadastrado</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {localLoading ? <Loader2 size={16} className="animate-spin" /> : 'Enviar Link de Redefinição'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
