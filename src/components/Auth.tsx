import React, { useState } from 'react';
import { 
  BookOpen, 
  Loader2, 
  AlertCircle, 
  X, 
  Zap, 
  Star, 
  Check, 
  Mail, 
  Lock, 
  User, 
  ArrowLeft 
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { studyService } from '../services/studyService';

interface AuthProps {
  onLogin: () => void;
  onClearError?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function Auth({ onLogin, onClearError, isLoading, error }: AuthProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const resetLocalState = () => {
    setLocalError(null);
    setLocalSuccess(null);
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
      console.log("✅ Email Login successful");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setLocalError('E-mail ou senha incorretos. Por favor, verifique suas credenciais.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('Formato de e-mail inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setLocalError('Múltiplas tentativas incorretas. Acesso temporariamente bloqueado. Tente mais tarde.');
      } else {
        setLocalError(err.message || 'Erro ao realizar login por e-mail.');
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
      console.log("✅ Email Registration successful");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setLocalError('Este endereço de e-mail já está sendo utilizado por outra conta.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('Formato de e-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setLocalError('A senha escolhida é muito fraca (mínimo 6 caracteres).');
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
      setLocalSuccess('Link de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setLocalError('Nenhum usuário correspondente a este e-mail foi encontrado.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('Formato de e-mail inválido.');
      } else {
        setLocalError(err.message || 'Erro ao enviar link de recuperação.');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const plans = [
    {
      name: 'Gratuito',
      price: '0',
      features: [
        'Controle de estudos ilimitado',
        'Até 50 flashcards pessoais',
        '10 questões/dia no Banco',
        'Filtros básicos de questões'
      ],
      icon: BookOpen,
      color: 'bg-slate-100 text-slate-600'
    },
    {
      name: 'Estudante Pro',
      price: '50,00',
      period: 'ano',
      features: [
        'Até 1000 flashcards',
        'Acesso ILIMITADO ao Banco',
        'Filtros avançados (Banca/Ano)',
        'Gabarito comentado'
      ],
      icon: Zap,
      color: 'bg-indigo-600 text-white',
      highlight: true
    },
    {
      name: 'Concurseiro Elite',
      price: '100,00',
      period: 'ano',
      badge: '10 Dias Grátis para Novos Usuários',
      features: [
        '🎁 10 Dias de Teste Grátis Automático',
        'Flashcards ILIMITADOS',
        'Estatísticas avançadas',
        'Suporte prioritário WhatsApp'
      ],
      icon: Star,
      color: 'bg-amber-500 text-white'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8" id="auth-container">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center" id="auth-grid">
        {/* Login Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 space-y-8 order-1 lg:order-1" id="auth-login-card">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GestãoEdu</h1>
            <p className="text-slate-500">Sua jornada de estudos organizada e eficiente.</p>
          </div>

          {/* 10-Day Elite Trial Promotion Banner */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-sm">
              <Star size={20} className="fill-current" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block mb-1">
                Bônus Automático
              </span>
              <h4 className="text-xs font-bold text-slate-900">10 Dias de Teste Grátis no Plano Elite!</h4>
              <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                Ao entrar ou se cadastrar, você ganha 10 dias de acesso total ilimitado automaticamente, sem necessidade de cartão.
              </p>
            </div>
          </div>

          <div className="space-y-4" id="auth-actions-container">
            {/* Show error from props (e.g. Google Login errors) */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 text-red-600 animate-in fade-in slide-in-from-top-2 relative pr-10" id="auth-error-props">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-700">
                      {error.includes('suspended') || error.includes('api-key') || error.includes('permission-denied') 
                        ? 'Serviço do Banco de Dados Suspenso ou Propagando'
                        : 'Erro de Autenticação'}
                    </p>
                    <p className="text-xs leading-relaxed text-red-600 break-words">
                      {error}
                    </p>
                  </div>
                  <button 
                    onClick={onClearError} 
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                    title="Fechar"
                    id="clear-props-error-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                {(error.includes('suspended') || error.includes('api-key') || error.includes('permission-denied')) && (
                  <div className="mt-2 text-xs bg-amber-50 p-3 rounded-lg border border-amber-200 text-slate-700 space-y-2">
                    <p className="font-bold text-amber-900">
                      Já habilitou o faturamento no Google Cloud / console do Firebase?
                    </p>
                    <p>
                      Se você acabou de pagar ou ativar o faturamento (billing), saiba que o Google leva entre <strong>2 e 10 minutos</strong> para propagar a ativação da chave e reativar as requisições de login.
                    </p>
                    <p>
                      Basta aguardar alguns minutinhos para a liberação total e tentar novamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Show local error from email login */}
            {localError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2 relative pr-10" id="auth-error-local">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-700">Erro de Acesso</p>
                  <p className="text-xs leading-relaxed text-red-600">{localError}</p>
                </div>
                <button 
                  onClick={() => setLocalError(null)} 
                  className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                  title="Fechar"
                  id="clear-local-error-btn"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Show local success from email login (e.g. password reset) */}
            {localSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-600 animate-in fade-in slide-in-from-top-2 relative pr-10" id="auth-success-local">
                <Check size={20} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-700">Sucesso</p>
                  <p className="text-xs leading-relaxed text-emerald-600">{localSuccess}</p>
                </div>
                <button 
                  onClick={() => setLocalSuccess(null)} 
                  className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-600 transition-colors"
                  title="Fechar"
                  id="clear-local-success-btn"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Google Sign-In (Always accessible) */}
            {authMode === 'login' && (
              <>
                <button
                  onClick={onLogin}
                  disabled={isLoading || localLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  id="google-login-btn"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  ) : (
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  )}
                  <span>{isLoading ? 'Conectando...' : 'Entrar com Google'}</span>
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">ou entre com e-mail</span>
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                </div>
              </>
            )}

            {/* Email/Password Form */}
            {authMode === 'login' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4" id="email-login-form">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Endereço de E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@exemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="email-login-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">Sua Senha</label>
                    <button 
                      type="button"
                      onClick={() => { resetLocalState(); setAuthMode('forgot_password'); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      id="forgot-password-toggle-btn"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="password-login-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading || isLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  id="email-login-submit-btn"
                >
                  {localLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : 'Entrar com E-mail'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Ainda não tem conta? </span>
                  <button 
                    type="button"
                    onClick={() => { resetLocalState(); setAuthMode('register'); }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    id="register-toggle-btn"
                  >
                    Cadastre-se grátis
                  </button>
                </div>
              </form>
            )}

            {/* Email Registration Form */}
            {authMode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-4" id="email-register-form">
                <button
                  type="button"
                  onClick={() => { resetLocalState(); setAuthMode('login'); }}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                  id="back-to-login-btn-1"
                >
                  <ArrowLeft size={14} />
                  Voltar para login
                </button>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nome Completo</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="name-register-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Seu E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@exemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="email-register-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Crie uma Senha</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="password-register-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading || isLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  id="email-register-submit-btn"
                >
                  {localLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : 'Criar minha Conta'}
                </button>
              </form>
            )}

            {/* Forgot Password Form */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" id="email-forgot-password-form">
                <button
                  type="button"
                  onClick={() => { resetLocalState(); setAuthMode('login'); }}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                  id="back-to-login-btn-2"
                >
                  <ArrowLeft size={14} />
                  Voltar para login
                </button>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Insira o e-mail associado à sua conta. Enviaremos um link para você redefinir sua senha com segurança.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Seu E-mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@exemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      required
                      id="email-forgot-password-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={localLoading || isLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  id="email-forgot-password-submit-btn"
                >
                  {localLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : 'Enviar Link de Redefinição'}
                </button>
              </form>
            )}
          </div>

          <footer className="text-center space-y-4 pt-4 border-t border-slate-100" id="auth-footer">
            <p className="text-xs text-slate-400">
              Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
            </p>
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Proprietário deste app</p>
              <a 
                href="https://www.instagram.com/sdeconcursos_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                id="footer-instagram-link"
              >
                @sdeconcursos_
              </a>
            </div>
          </footer>
        </div>

        {/* Pricing Section */}
        <div className="space-y-6 order-2 lg:order-2" id="pricing-section-container">
          <div className="text-center lg:text-left space-y-2 mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planos e Preços</h2>
            <p className="text-slate-500">Escolha o plano ideal para sua aprovação.</p>
          </div>

          <div className="grid gap-4" id="plans-list">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  plan.highlight 
                    ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-50 ring-2 ring-indigo-500 ring-opacity-10' 
                    : 'bg-white border-slate-100 shadow-sm'
                }`}
                id={`plan-card-${plan.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${plan.color}`}>
                      <plan.icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium text-slate-400">R$</span>
                        <span className="text-xl font-black text-slate-900">{plan.price}</span>
                        <span className="text-[12px] font-bold text-slate-500">/{ (plan as any).period || 'mês' }</span>
                      </div>
                    </div>
                  </div>
                  {plan.highlight && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Recomendado
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div className="p-0.5 bg-emerald-100 text-emerald-600 rounded-full">
                        <Check size={10} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center gap-4" id="warranty-card">
            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">Garantia de 7 dias</h4>
              <p className="text-xs text-indigo-700">Teste qualquer plano Pro e se não gostar, devolvemos seu dinheiro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
