import React, { useState, useEffect, useMemo } from 'react';
import { Plus, History, Calendar, Clock, Target, Trash2, RotateCcw } from 'lucide-react';
import { Subject, Topic, StudySession, Question, QuestionAnswer } from '../types';
import { cn, safeFormat } from '../lib/utils';

interface StudySessionListProps {
  sessions: StudySession[];
  subjects: Subject[];
  topics: Topic[];
  onAdd: (session: Partial<StudySession>) => void;
  onDelete: (id: string) => void;
  answers?: QuestionAnswer[];
  questions?: Question[];
  preselectedTopicId?: string | null;
  onClearPreselected?: () => void;
}

export default function StudySessionList({ 
  sessions, 
  subjects, 
  topics, 
  onAdd, 
  onDelete,
  preselectedTopicId,
  onClearPreselected
}: StudySessionListProps) {
  const [isAdding, setIsAdding] = useState(!!preselectedTopicId);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newSession, setNewSession] = useState(() => {
    if (preselectedTopicId) {
      const topic = topics.find(t => t.id === preselectedTopicId);
      return {
        subjectId: topic?.subjectId || subjects[0]?.id || '',
        topicId: preselectedTopicId,
        durationMinutes: 60,
        questionsTotal: 0,
        questionsCorrect: 0,
        notes: '',
      };
    }
    return {
      subjectId: subjects[0]?.id || '',
      topicId: '',
      durationMinutes: 60,
      questionsTotal: 0,
      questionsCorrect: 0,
      notes: '',
    };
  });

  // Effect to handle preselected topic changes
  useEffect(() => {
    if (preselectedTopicId) {
      const topic = topics.find(t => t.id === preselectedTopicId);
      if (topic) {
        setNewSession({
          subjectId: topic.subjectId,
          topicId: preselectedTopicId,
          durationMinutes: 60,
          questionsTotal: 0,
          questionsCorrect: 0,
          notes: '',
        });
        setIsAdding(true);
        if (onClearPreselected) onClearPreselected();
      }
    }
  }, [preselectedTopicId, topics, onClearPreselected]);

  const handleRepeatSession = (session: StudySession) => {
    setNewSession({
      subjectId: session.subjectId,
      topicId: session.topicId,
      durationMinutes: session.durationMinutes,
      questionsTotal: 0,
      questionsCorrect: 0,
      notes: '',
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortedSessions = useMemo(() => {
    try {
      return [...(sessions || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
    } catch (e) {
      console.error("Error sorting sessions:", e);
      return [];
    }
  }, [sessions]);

  const filteredTopics = (topics || []).filter(t => t.subjectId === newSession.subjectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSession.subjectId && newSession.topicId) {
      onAdd({ ...newSession, date: Date.now() });
      setIsAdding(false);
      setNewSession({ ...newSession, topicId: '', notes: '' });
    }
  };

  const handleDeleteSession = (id: string) => {
    setSessionToDelete(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(sessionToDelete);
      setSessionToDelete(null);
    } catch (error) {
      console.error("Error deleting session:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Histórico de Estudos</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            Registrar Sessão
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matéria</label>
                <select
                  value={newSession.subjectId}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const firstTopic = topics.find(t => t.subjectId === subId);
                    setNewSession({ ...newSession, subjectId: subId, topicId: firstTopic?.id || '' });
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tópico</label>
                <select
                  value={newSession.topicId}
                  onChange={(e) => setNewSession({ ...newSession, topicId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">Selecione um tópico</option>
                  {filteredTopics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Duração (minutos)</label>
                <input
                  type="number"
                  value={newSession.durationMinutes}
                  onChange={(e) => setNewSession({ ...newSession, durationMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Questões Totais</label>
                <input
                  type="number"
                  value={newSession.questionsTotal}
                  onChange={(e) => setNewSession({ ...newSession, questionsTotal: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Acertos</label>
                <input
                  type="number"
                  value={newSession.questionsCorrect}
                  onChange={(e) => setNewSession({ ...newSession, questionsCorrect: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Notas</label>
                  <span className={cn(
                    "text-[10px] font-medium",
                    (newSession.notes?.length || 0) > 1800 ? "text-amber-600" : "text-slate-400"
                  )}>
                    {newSession.notes?.length || 0}/2000
                  </span>
                </div>
                <textarea
                  value={newSession.notes}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value.slice(0, 2000) })}
                  placeholder="O que você aprendeu hoje? (Principais pontos, dúvidas, etc.)"
                  maxLength={2000}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[120px] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                Registrar Sessão
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {sortedSessions.length > 0 ? (
          sortedSessions.map((session) => {
          const subject = subjects.find(s => s.id === session.subjectId);
          const topic = topics.find(t => t.id === session.topicId);
          return (
            <div key={session.id} className="p-6 flex flex-col md:flex-row md:items-center gap-6 group overflow-hidden">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: subject?.color || '#6366f1' }}
                  >
                    {subject?.name}
                  </span>
                  <span className="text-[14px] text-slate-400">•</span>
                  <span className="text-[14px] text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {safeFormat(session.date, "d 'de' MMMM, yyyy")}
                  </span>
                </div>
                <h3 className="text-[14px] font-bold text-slate-900">{topic?.name}</h3>
                {session.notes && <p className="text-[14px] text-slate-600 italic">"{session.notes}"</p>}
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    <Clock size={14} />
                    <span className="text-xs font-medium uppercase tracking-wider">Tempo</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {session.durationMinutes} min
                  </p>
                  <p className="text-[10px] font-bold text-indigo-600">
                    {(session.durationMinutes / 60).toFixed(1)}h
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    <Target size={14} />
                    <span className="text-xs font-medium uppercase tracking-wider">Questões</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{session.questionsCorrect}/{session.questionsTotal}</p>
                  <p className="text-[10px] font-bold text-emerald-600">
                    {session.questionsTotal > 0 ? Math.round((session.questionsCorrect / session.questionsTotal) * 100) : 0}%
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleRepeatSession(session)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Repetir esta sessão"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-12 text-center text-slate-500">
          <History className="mx-auto mb-4 opacity-20" size={48} />
          <p>Nenhuma sessão de estudo registrada ainda.</p>
        </div>
      )}
    </div>

      {/* Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir este registro de sessão de estudo?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : 'Excluir Sessão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
