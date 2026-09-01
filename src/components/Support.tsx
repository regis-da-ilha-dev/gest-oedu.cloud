import React from 'react';
import { Headset, Mail, MessageCircle, Clock, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function Support() {
  const contactInfo = {
    whatsapp: "(98) 98828-4885",
    email: "sdeconcursos@gmail.com",
    hours: "Segunda a Sexta, das 08h às 18h",
  };

  const faqs = [
    {
      question: "Como funciona a repetição espaçada?",
      answer: "Nosso sistema utiliza algoritmos que agendam suas revisões com base no seu desempenho. Quanto mais difícil você achar um card, mais cedo ele aparecerá para revisão."
    },
    {
      question: "Posso usar o GestãoEdu em vários dispositivos?",
      answer: "Sim! Seus dados são sincronizados na nuvem em tempo real. Você pode estudar no computador, tablet ou celular mantendo seu progresso."
    },
    {
      question: "Como faço para cancelar minha assinatura?",
      answer: "Você pode gerenciar sua assinatura entrando em contato com nosso suporte diretamente via WhatsApp."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Central de Suporte</h2>
        <p className="text-slate-500">Estamos aqui para ajudar você a alcançar sua aprovação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Cards */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">WhatsApp Suporte</h3>
            <p className="text-sm text-slate-500 mb-4">Fale diretamente com nossa equipe técnica.</p>
            <a 
              href={`https://wa.me/55${contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent("Olá! Preciso de ajuda com o GestãoEdu. Como posso prosseguir?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-600 font-bold hover:underline"
            >
              {contactInfo.whatsapp}
              <ExternalLink size={14} />
            </a>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">E-mail</h3>
            <p className="text-sm text-slate-500 mb-4">Envie suas dúvidas, sugestões ou feedbacks.</p>
            <a 
              href={`mailto:${contactInfo.email}`}
              className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline"
            >
              {contactInfo.email}
              <ExternalLink size={14} />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Info Section */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horário de Atendimento</p>
            <p className="text-slate-700 font-medium">{contactInfo.hours}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Garantia de Resposta</p>
            <p className="text-slate-700 font-medium">Em até 24 horas úteis</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-indigo-600" size={24} />
          <h3 className="text-xl font-bold text-slate-900">Perguntas Frequentes</h3>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-900 mb-2">{faq.question}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support Footer */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
          <Headset size={16} />
          GestãoEdu Support Team
        </div>
      </div>
    </div>
  );
}
