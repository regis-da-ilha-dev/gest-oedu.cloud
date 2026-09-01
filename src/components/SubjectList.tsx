import React, { useState } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  BookOpen, 
  AlertTriangle,
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
  FileText
} from 'lucide-react';
import { Subject } from '../types';

interface SubjectListProps {
  subjects: Subject[];
  onAdd: (name: string, color: string, icon: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, color: string, icon: string) => void;
  onSelect?: (id: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Scale', icon: Scale },
  { name: 'Stethoscope', icon: Stethoscope },
  { name: 'Calculator', icon: Calculator },
  { name: 'Globe', icon: Globe },
  { name: 'History', icon: History },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Code', icon: Code },
  { name: 'Gavel', icon: Gavel },
  { name: 'Heart', icon: Heart },
  { name: 'Cpu', icon: Cpu },
  { name: 'Palette', icon: Palette },
  { name: 'Music', icon: Music },
  { name: 'Languages', icon: Languages },
  { name: 'Microscope', icon: Microscope },
  { name: 'Atom', icon: Atom },
  { name: 'Binary', icon: Binary },
  { name: 'Coins', icon: Coins },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'FileText', icon: FileText }
];

const SubjectIcon = ({ name, size = 24 }: { name: string; size?: number }) => {
  const iconObj = AVAILABLE_ICONS.find(i => i.name === name);
  const IconComponent = iconObj ? iconObj.icon : BookOpen;
  return <IconComponent size={size} />;
};

export default function SubjectList({ subjects, onAdd, onDelete, onEdit, onSelect }: SubjectListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newIcon, setNewIcon] = useState('BookOpen');

  const colors = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      if (editingSubject) {
        onEdit(editingSubject.id, newName, newColor, newIcon);
        setEditingSubject(null);
      } else {
        onAdd(newName, newColor, newIcon);
      }
      setNewName('');
      setNewIcon('BookOpen');
      setIsAdding(false);
    }
  };

  const startEditing = (subject: Subject) => {
    setEditingSubject(subject);
    setNewName(subject.name);
    setNewColor(subject.color);
    setNewIcon(subject.icon || 'BookOpen');
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingSubject(null);
    setNewName('');
    setNewColor('#6366f1');
    setNewIcon('BookOpen');
  };

  const confirmDelete = () => {
    if (subjectToDelete) {
      onDelete(subjectToDelete.id);
      setSubjectToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Minhas Matérias</h2>
        <button
          onClick={() => {
            setEditingSubject(null);
            setNewName('');
            setNewColor('#6366f1');
            setIsAdding(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Nova Matéria
        </button>
      </div>

      {/* Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir esta matéria? Isso removerá permanentemente todos os tópicos e flashcards associados a ela em todas as abas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir Matéria
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-bold text-slate-900">{editingSubject ? 'Editar Matéria' : 'Nova Matéria'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome da Matéria</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Direito Constitucional"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ícone</label>
                <div className="grid grid-cols-7 gap-1 p-2 border border-slate-100 rounded-lg">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewIcon(name)}
                      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        newIcon === name ? 'bg-indigo-600 text-white scale-110 shadow-md' : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={name}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                {editingSubject ? 'Salvar Alterações' : 'Salvar Matéria'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <div 
            key={subject.id} 
            onClick={() => onSelect?.(subject.id)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
          >
            <div 
              className="absolute top-0 left-0 w-full h-1" 
              style={{ backgroundColor: subject.color }}
            />
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: subject.color }}>
                <SubjectIcon name={subject.icon || 'BookOpen'} size={24} />
              </div>
              <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(subject);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubjectToDelete(subject);
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-900">{subject.name}</h3>
            </div>
            <p className="text-sm text-slate-500">Criada em {new Date(subject.createdAt).toLocaleDateString()}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Ver Flashcards
              <Plus size={12} className="rotate-45" />
            </div>
          </div>
        ))}

        {subjects.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <BookOpen className="mx-auto mb-4 text-slate-300" size={48} />
            <h3 className="text-lg font-medium text-slate-900">Nenhuma matéria cadastrada</h3>
            <p className="text-slate-500">Comece adicionando as matérias que você está estudando.</p>
          </div>
        )}
      </div>
    </div>
  );
}
