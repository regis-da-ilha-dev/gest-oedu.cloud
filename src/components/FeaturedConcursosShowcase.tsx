import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  Building2, 
  Briefcase, 
  DollarSign, 
  GraduationCap, 
  ExternalLink, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  ChevronRight
} from 'lucide-react';
import { Concurso } from '../types';
import { studyService } from '../services/studyService';
import { EDITAL_PRESETS } from '../data/editalPresets';
import { cn } from '../lib/utils';

interface FeaturedConcursosShowcaseProps {
  onSelectConcurso?: (concurso: Concurso) => void;
  className?: string;
  showTitle?: boolean;
}

export default function FeaturedConcursosShowcase({ 
  onSelectConcurso, 
  className,
  showTitle = true 
}: FeaturedConcursosShowcaseProps) {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'published' | 'open' | 'defined'>('all');

  useEffect(() => {
    // Subscribe to real-time featured concursos from Firestore
    const unsubscribe = studyService.subscribeToFeaturedConcursos((data) => {
      if (data && data.length > 0) {
        setConcursos(data);
      } else {
        // Fallback gracefully to default presets if Firestore collection has no featured items yet
        const fallbackList: Concurso[] = EDITAL_PRESETS.slice(0, 6).map((p, idx) => ({
          id: `preset_feat_${p.id}`,
          title: p.title,
          institution: p.institution,
          banca: p.banca || 'A Definir',
          status: idx === 0 ? 'Edital Publicado' : (idx === 1 ? 'Inscrições Abertas' : 'Banca Definida'),
          vagas: idx === 0 ? '2.000 vagas' : (idx === 1 ? '1.000 vagas' : 'Vagas Imediatas + CR'),
          remuneracao: idx === 0 ? 'R$ 5.200,00' : (idx === 1 ? 'R$ 6.300,00' : 'R$ 7.800,00'),
          escolaridade: p.difficulty === 'Superior' ? 'Nível Superior' : 'Nível Médio',
          dataProva: idx === 0 ? 'Prevista para breve' : 'A definir',
          inscricaoPeriodo: 'Consulte o cronograma oficial',
          isFeatured: true,
          featuredOrder: idx + 1,
          description: p.description,
          tags: [p.institution, p.banca, p.difficulty],
          createdAt: Date.now() - idx * 10000,
          updatedAt: Date.now() - idx * 10000
        }));
        setConcursos(fallbackList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('publicado')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        text: 'Edital Publicado'
      };
    }
    if (s.includes('aberta') || s.includes('inscriç')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        text: 'Inscrições Abertas'
      };
    }
    if (s.includes('definida')) {
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        text: 'Banca Definida'
      };
    }
    return {
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
      text: status || 'Previsto'
    };
  };

  const filteredConcursos = concursos.filter((c) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = !query || 
      c.title.toLowerCase().includes(query) ||
      c.institution.toLowerCase().includes(query) ||
      (c.banca && c.banca.toLowerCase().includes(query)) ||
      (c.description && c.description.toLowerCase().includes(query));

    const s = (c.status || '').toLowerCase();
    let matchesStatus = true;
    if (selectedFilter === 'published') matchesStatus = s.includes('publicado');
    else if (selectedFilter === 'open') matchesStatus = s.includes('aberta') || s.includes('inscriç');
    else if (selectedFilter === 'defined') matchesStatus = s.includes('definida');

    return matchesSearch && matchesStatus;
  });

  return (
    <section className={cn("w-full py-12 px-4 sm:px-6 lg:px-8", className)} id="concursos-destaque">
      <div className="max-w-7xl mx-auto space-y-8">
        {showTitle && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black tracking-wide uppercase">
                <Flame size={14} className="text-orange-600 animate-pulse fill-orange-500" />
                Atualização em Tempo Real
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                Vitrine de Concursos em Destaque
              </h2>
              <p className="text-slate-500 text-sm sm:text-base max-w-2xl leading-relaxed">
                Editais abertos, bancas confirmadas e as maiores oportunidades do momento para você direcionar sua preparação.
              </p>
            </div>

            {/* Quick Search & Tag Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedFilter === 'all'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                Todos ({concursos.length})
              </button>
              <button
                onClick={() => setSelectedFilter('published')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedFilter === 'published'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                Editais Publicados
              </button>
              <button
                onClick={() => setSelectedFilter('open')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedFilter === 'open'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700"
                )}
              >
                Inscrições Abertas
              </button>
              <button
                onClick={() => setSelectedFilter('defined')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedFilter === 'defined'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                Banca Definida
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por órgão, cargo ou banca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
          />
        </div>

        {/* Concursos Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
                <div className="h-6 bg-slate-100 rounded-full w-1/3" />
                <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : filteredConcursos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="concursos-grid">
            {filteredConcursos.map((c) => {
              const badge = getStatusBadge(c.status);
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-xl hover:border-orange-200 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Header Strip with Status and Institution */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider",
                        badge.bg
                      )}>
                        <span className={cn("w-2 h-2 rounded-full animate-ping", badge.dot)} />
                        {badge.text}
                      </span>
                      {c.banca && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          Banca: {c.banca}
                        </span>
                      )}
                    </div>

                    {/* Title & Institution */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                        <Building2 size={13} />
                        {c.institution}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-orange-600 transition-colors leading-snug">
                        {c.title}
                      </h3>
                      {c.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>

                    {/* Highlights Cards (Vagas, Remuneração, Escolaridade) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      {c.remuneracao && (
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remuneração</span>
                          <span className="text-xs font-black text-emerald-700">{c.remuneracao}</span>
                        </div>
                      )}
                      {c.vagas && (
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vagas</span>
                          <span className="text-xs font-black text-slate-800">{c.vagas}</span>
                        </div>
                      )}
                      {c.escolaridade && (
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 col-span-2 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escolaridade</span>
                          <span className="text-xs font-bold text-orange-700">{c.escolaridade}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    {c.editalUrl ? (
                      <a
                        href={c.editalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={13} />
                        Edital Oficial
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} />
                        {c.dataProva || 'Cronograma em breve'}
                      </span>
                    )}

                    <button
                      onClick={() => onSelectConcurso ? onSelectConcurso(c) : null}
                      className="inline-flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-700 uppercase tracking-wide group/btn cursor-pointer"
                    >
                      <span>Estudar Agora</span>
                      <ChevronRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">Nenhum concurso encontrado</p>
            <p className="text-slate-400 text-xs mt-1">Ajuste os filtros de busca para encontrar outras oportunidades.</p>
          </div>
        )}
      </div>
    </section>
  );
}
