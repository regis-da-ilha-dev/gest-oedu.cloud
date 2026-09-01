import React from 'react';
import { Check, X, Sparkles, Zap, ShieldCheck, Star } from 'lucide-react';
import { UserSubscription } from '../types';
import { cn } from '../lib/utils';

interface PricingProps {
  subscription: UserSubscription | null;
  userId: string;
  onUpgrade: (plan: 'free' | 'pro' | 'elite') => void;
}

export default function Pricing({ subscription, userId, onUpgrade }: PricingProps) {
  const currentPlan = subscription?.plan || 'free';

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: '0',
      description: 'Para quem está começando a organizar os estudos.',
      features: [
        'Controle de estudos ilimitado',
        'Até 50 flashcards pessoais',
        '10 questões/dia no Banco',
        'Filtros básicos de questões'
      ],
      notIncluded: [
        'Flashcards ilimitados',
        'Acesso ilimitado ao Banco',
        'Gabarito comentado',
        'Estatísticas avançadas',
      ],
      buttonText: 'Plano Atual',
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Estudante Pro',
      price: '50,00',
      period: 'ano',
      description: 'Otimize sua memorização e prática de questões com recursos avançados.',
      features: [
        'Até 1000 flashcards',
        'Acesso ILIMITADO ao Banco',
        'Filtros avançados (Banca/Ano)',
        'Gabarito comentado'
      ],
      notIncluded: [
        'Flashcards ilimitados',
        'Suporte prioritário',
      ],
      buttonText: 'Fazer Upgrade',
      highlight: true,
      icon: Zap,
    },
    {
      id: 'elite',
      name: 'Concurseiro Elite',
      price: '100,00',
      period: 'ano',
      description: 'A experiência completa e definitiva para sua aprovação com 10 dias de degustação grátis.',
      features: [
        '🎁 10 Dias de Teste Grátis Automático',
        'Flashcards ILIMITADOS',
        'Estatísticas avançadas',
        'Suporte prioritário WhatsApp'
      ],
      notIncluded: [],
      buttonText: 'Seja Elite',
      highlight: false,
      icon: Star,
      badge: '10 Dias Grátis Ao Entrar'
    },
  ];

  const handleUpgrade = (planId: string, planName: string, planPrice: string, planPeriod: string = 'mês') => {
    if (planId === 'free') {
      onUpgrade('free');
      return;
    }

    const phoneNumber = "5598988284885"; // Número de WhatsApp atualizado
    const message = `Olá! Gostaria de adquirir o plano *${planName}* (R$ ${planPrice}/${planPeriod}) no GestãoEdu. Como posso prosseguir com o pagamento?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-8 py-6">
      {/* 10-Day Elite Trial Header Banner */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-400">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl shrink-0 shadow-inner">
            <Star size={32} className="fill-current text-amber-100" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-950 bg-amber-300 px-3 py-1 rounded-full inline-block mb-1">
              Bônus Automático para Novos Usuários
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">10 Dias de Teste Grátis no Plano Elite!</h3>
            <p className="text-xs text-amber-100 mt-1 max-w-xl leading-relaxed">
              Todos os novos cadastros (fora administradores) ganham automaticamente 10 dias de acesso total aos recursos do Plano Elite sem precisar cadastrar cartão de crédito.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Escolha seu Plano</h2>
        <p className="text-base text-slate-500 max-w-2xl mx-auto">
          O controle de estudos é gratuito para todos. Escolha um plano para destravar o poder total dos flashcards e do banco de questões.
          <br />
          <span className="text-sm font-bold text-indigo-600 mt-1 block">Atendimento personalizado via WhatsApp</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const Icon = plan.icon;
          const period = (plan as any).period || 'mês';

          return (
            <div 
              key={plan.id}
              className={cn(
                "relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:scale-105",
                plan.highlight 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-200" 
                  : "bg-white text-slate-900 border-slate-200 shadow-sm"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
                  Mais Popular
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  {Icon && <Icon size={24} className={plan.highlight ? "text-indigo-200" : "text-indigo-600"} />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-medium opacity-70">R$</span>
                  <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                  <span className="text-base font-bold opacity-80">/{period}</span>
                </div>
                <p className={cn("mt-4 text-sm leading-relaxed", plan.highlight ? "text-indigo-100" : "text-slate-500")}>
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className={cn("p-0.5 rounded-full mt-0.5", plan.highlight ? "bg-indigo-400 text-white" : "bg-emerald-100 text-emerald-600")}>
                      <Check size={14} />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-40">
                    <div className="p-0.5 rounded-full mt-0.5 bg-slate-100 text-slate-400">
                      <X size={14} />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && handleUpgrade(plan.id, plan.name, plan.price, period)}
                disabled={isCurrent}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all text-lg",
                  isCurrent
                    ? "bg-white/20 text-white cursor-default"
                    : plan.highlight
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                {isCurrent ? "Plano Atual" : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      <div className="max-w-3xl mx-auto bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600">
          <ShieldCheck size={40} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-lg font-bold text-slate-900">Garantia de Satisfação</h4>
          <p className="text-sm text-slate-500">
            Teste qualquer plano pro por 7 dias. Se não gostar, devolvemos seu dinheiro sem perguntas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-amber-500">
          {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
        </div>
      </div>
    </div>
  );
}
