import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Sparkles, 
  MessageSquare, 
  Maximize2, 
  Minimize2,
  BookOpen,
  Scale,
  Stethoscope,
  Calculator,
  Globe,
  History,
  FlaskConical,
  Briefcase,
  Code,
  Gavel,
  Heart,
  Cpu,
  Palette,
  Music,
  Languages,
  Microscope,
  Atom,
  Binary,
  Coins,
  ShieldCheck,
  FileText,
  Layers,
  Check,
  Clipboard,
  Clock,
  Zap
} from 'lucide-react';
import { Flashcard, Subject } from '../types';
import { cn, preventHyphenBreak } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ICON_MAP: Record<string, any> = {
  BookOpen, Scale, Stethoscope, Calculator, Globe, History, FlaskConical, Briefcase, Code, Gavel, Heart, Cpu,
  Palette, Music, Languages, Microscope, Atom, Binary, Coins, ShieldCheck, FileText
};

const SubjectIcon = ({ name, size = 16, className, style }: { name?: string; size?: number; className?: string; style?: React.CSSProperties }) => {
  const IconComponent = (name && ICON_MAP[name]) || Layers;
  return <IconComponent size={size} className={className} style={style} />;
};

export function formatTextQuotesAndExamples(html: any): string {
  if (html === null || html === undefined) return '';
  
  let strVal = '';
  try {
    strVal = String(html);
  } catch (e) {
    return '';
  }

  if (!strVal) return '';
  let formatted = strVal;
  
  // Substitui parágrafos inteiros iniciados e terminados por aspas por blockquotes elegantes
  formatted = formatted.replace(
    /<p>(\s*[“"'«（])(.*?)([”"'»）]\s*)<\/p>/gi, 
    '<blockquote>$2</blockquote>'
  );
  
  return preventHyphenBreak(formatted);
}

interface FlashcardReviewProps {
  cards: Flashcard[];
  subjects?: Subject[];
  onReview: (card: Flashcard, quality: number) => void;
  onClose: () => void;
}

export default function FlashcardReview({ cards: initialCards, subjects = [], onReview, onClose }: FlashcardReviewProps) {
  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const [cards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [stats, setStats] = useState({
    total: initialCards.length,
    reviewed: 0,
    correct: 0,
  });

  if (!cards || cards.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Nenhum card para revisar</h3>
            <p className="text-slate-500">Você não tem cards agendados para revisão no momento.</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  if (!currentCard && !sessionFinished) {
    return null;
  }

  const handleRate = (quality: number) => {
    onReview(currentCard, quality);
    
    setStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct
    }));

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setSessionFinished(true);
    }
  };

  if (sessionFinished) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Sessão Concluída!</h3>
            <p className="text-slate-500">Você revisou todos os cards agendados para hoje.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Acertos</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.correct}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
          >
            Voltar para a Lista
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col overflow-hidden transition-colors duration-500",
      isFocusMode ? "bg-slate-950" : "bg-slate-50"
    )}>
      {/* Header */}
      {!isFocusMode && (
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X size={22} className="sm:w-6 sm:h-6" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Revisão de Flashcards</h2>
              <p className="text-[10px] sm:text-xs text-slate-500">Card {currentIndex + 1} de {cards.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-32 sm:w-48 h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden hidden md:block">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500" 
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
            <button
              onClick={() => setIsFocusMode(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all font-medium text-xs sm:text-sm"
              title="Modo Foco"
            >
              <Maximize2 size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Modo Foco</span>
            </button>
          </div>
        </header>
      )}

      {/* Floating Exit Focus Button */}
      {isFocusMode && (
        <button
          onClick={() => setIsFocusMode(false)}
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60] p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
          title="Sair do Modo Foco"
        >
          <Minimize2 size={20} className="sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Main Review Area */}
      <main className={cn(
        "flex-1 overflow-y-auto flex flex-col items-center p-3 sm:p-4 md:p-8 relative transition-all duration-500",
        isFocusMode ? "bg-slate-900/50" : ""
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              "w-full max-w-2xl perspective-1000 mb-6 sm:mb-12",
              isFocusMode ? "sm:scale-110 mt-6 sm:mt-12" : "scale-100"
            )}
          >
            <div 
              className={cn(
                "relative w-full h-[280px] xs:h-[320px] sm:h-[380px] md:h-[400px] transition-transform duration-700 preserve-3d cursor-pointer shadow-2xl rounded-2xl sm:rounded-[2.5rem]",
                isFlipped ? "rotate-y-180" : ""
              )}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Side */}
              <div 
                className={cn(
                  "absolute inset-0 backface-hidden transition-all duration-300",
                  !isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                )}
              >
                <div className="absolute inset-0 bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200/80 shadow-2xl flex flex-col p-5 sm:p-10 justify-between transition-all duration-300">
                  <div className="flex items-center justify-between w-full mb-2 sm:mb-3 select-none">
                    {/* Subject tag */}
                    <div>
                      {(() => {
                        const subject = subjects.find(s => s.id === currentCard?.subjectId);
                        const color = subject?.color || '#6366f1';
                        return subject ? (
                          <div 
                            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-0.5 sm:py-1 border rounded-full font-bold shadow-sm"
                            style={{
                              backgroundColor: `${color}10`,
                              borderColor: `${color}20`,
                              color: color
                            }}
                          >
                            <SubjectIcon name={subject.icon} size={10} className="shrink-0 sm:w-3 sm:h-3" style={{ color }} />
                            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">{subject.name}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full">Frente</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 overflow-y-auto custom-scrollbar py-2">
                    <div 
                      className="text-slate-800 text-[15px] xs:text-[16px] sm:text-[19px] font-normal leading-relaxed text-center w-full ql-editor !p-0 rich-text-content flashcard-front-content"
                      dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(currentCard?.front || '') }}
                    />

                    {currentCard?.imageUrl && (
                      <div className="w-full max-w-sm rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 shadow-md mt-3 sm:mt-4 shrink-0">
                        <img src={currentCard.imageUrl} alt="" className="w-full object-contain max-h-[140px] sm:max-h-[220px] bg-slate-50" referrerPolicy="no-referrer" />
                        {currentCard.caption && (
                          <div className="bg-slate-900/80 backdrop-blur-md p-1.5 sm:p-2 text-center text-[9px] sm:text-[10px] text-white italic">
                            {currentCard.caption}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-center text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest shrink-0 transition-opacity opacity-50 flex items-center justify-center gap-1 select-none">
                    Toque para virar <ChevronRight size={11} className="text-slate-300 sm:w-3 sm:h-3" />
                  </div>
                </div>
              </div>

              {/* Back Side */}
              <div 
                className={cn(
                  "absolute inset-0 backface-hidden rotate-y-180 transition-all duration-300",
                  isFlipped ? "z-10 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
                )}
              >
                <div className="absolute inset-0 bg-[#f3faf6] rounded-2xl sm:rounded-[2.5rem] border border-[#bfeadd] shadow-2xl flex flex-col p-5 sm:p-10 justify-between transition-all duration-300">
                  <div className="flex items-center justify-between w-full mb-2 sm:mb-3 select-none">
                    <span className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Gabarito & Comentário</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-2.5 py-0.5 rounded-full">Verso</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-start text-left w-full overflow-y-auto custom-scrollbar py-1">
                    {/* Resposta Section */}
                    <div className="mb-4 sm:mb-5">
                      <div className="text-[#0e6231] font-bold text-xs sm:text-base uppercase tracking-wide mb-1 sm:mb-1.5 flex items-center gap-2 select-none">
                        <div className="w-1.5 h-3.5 sm:h-4 bg-[#107c41] rounded-full" />
                        Resposta:
                      </div>
                      <div 
                        className="text-slate-800 text-[14px] sm:text-[17px] font-normal leading-relaxed w-full ql-editor !p-0 rich-text-content flashcard-back-content force-visible-text text-left"
                        dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(currentCard?.back || '') }}
                      />
                    </div>
                    
                    {/* Separator / Explanation Section if present */}
                    {currentCard?.explanation && (
                      <div className="mt-1.5 sm:mt-2 pt-3 sm:pt-4 border-t border-emerald-200/55 w-full text-left">
                        <div className="text-[#0e6231] font-bold text-xs sm:text-base uppercase tracking-wide mb-1 sm:mb-1.5 flex items-center gap-2 select-none">
                          <div className="w-1.5 h-3.5 sm:h-4 bg-[#107c41] rounded-full" />
                          Comentário:
                        </div>
                        <div 
                          className="text-slate-700 text-[13px] sm:text-[16px] font-normal leading-relaxed ql-editor !p-0 rich-text-content force-visible-text text-left"
                          dangerouslySetInnerHTML={{ __html: formatTextQuotesAndExamples(currentCard.explanation || '') }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-center text-emerald-700/60 font-medium text-xs uppercase tracking-widest shrink-0 transition-opacity flex items-center justify-center gap-1 select-none">
                    <Sparkles size={12} className="text-emerald-500/70 animate-pulse" /> Avalie seu desempenho abaixo
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Controls */}
      <footer className={cn(
        "p-4 md:p-8 pb-10 md:pb-8 transition-all duration-500",
        isFocusMode ? "bg-transparent" : "bg-white border-t border-slate-200"
      )}>
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {!isFlipped ? (
            <button
              onClick={() => setIsFlipped(true)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]",
                isFocusMode ? "bg-[#FF6B00] text-white" : "bg-slate-950 text-white hover:bg-slate-900"
              )}
            >
              Exibir Resposta
            </button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 h-auto">
              <RatingButton 
                label="Errei" 
                sublabel="Repetir agora"
                color={isFocusMode ? "bg-red-500/20 text-red-400 border-red-500/30 font-bold" : "bg-red-50 text-red-600 border-red-100 font-bold"}
                onClick={() => handleRate(0)}
                icon={AlertCircle}
              />
              <RatingButton 
                label="Difícil" 
                sublabel="Em 2 dias"
                color={isFocusMode ? "bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold" : "bg-amber-50 text-amber-600 border-amber-100 font-bold"}
                onClick={() => handleRate(2)}
                icon={Clock}
              />
              <RatingButton 
                label="Bom" 
                sublabel="Em 4 dias"
                color={isFocusMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold" : "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold"}
                onClick={() => handleRate(4)}
                icon={CheckCircle2}
              />
              <RatingButton 
                label="Fácil" 
                sublabel="Em 7 dias"
                color={isFocusMode ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-bold" : "bg-indigo-50 text-indigo-600 border-indigo-100 font-bold"}
                onClick={() => handleRate(5)}
                icon={Zap}
              />
            </div>
          )}
        </div>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1500px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { 
          backface-visibility: hidden; 
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}

function RatingButton({ label, sublabel, color, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-4 rounded-xl sm:rounded-2xl border transition-all hover:scale-105 active:scale-95",
        color
      )}
    >
      <Icon className="mb-0.5 sm:mb-1 md:mb-2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
      <span className="font-bold text-[10px] sm:text-xs md:text-base">{label}</span>
      <span className="text-[7px] sm:text-[8px] md:text-[10px] opacity-70 font-medium uppercase tracking-wider">{sublabel}</span>
    </button>
  );
}
