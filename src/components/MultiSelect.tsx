import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
  showSearch?: boolean;
}

export default function MultiSelect({ 
  options, 
  selected, 
  onChange, 
  placeholder, 
  className,
  showSearch = true 
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    (option.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const toggleOption = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter(item => item !== id)
      : [...selected, id];
    onChange(newSelected);
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== id));
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] md:min-h-[46px] px-3 py-1.5 md:px-4 md:py-2 bg-slate-50 border-none rounded-lg sm:rounded-xl text-xs md:text-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all cursor-pointer flex flex-wrap gap-1 md:gap-1.5 items-center pr-10"
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          selected.map(id => {
            const option = options.find(o => o.id === id);
            return (
              <span 
                key={id} 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 bg-indigo-100 text-indigo-700 rounded md:rounded-lg text-[10px] md:text-xs font-bold animate-in zoom-in-95 duration-150"
              >
                {option?.name || id}
                <X 
                  size={10} 
                  className="cursor-pointer hover:text-indigo-900 md:w-3 md:h-3" 
                  onClick={(e) => removeOption(id, e)}
                />
              </span>
            );
          })
        )}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDown size={14} className={cn("transition-transform duration-200 md:w-[18px] md:h-[18px]", isOpen && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-50">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">Nenhum resultado encontrado.</div>
              ) : (
                filteredOptions.map(option => (
                  <div 
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs font-medium",
                      selected.includes(option.id) 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>{option.name}</span>
                    {selected.includes(option.id) && <Check size={14} className="text-indigo-600" />}
                  </div>
                ))
              )}
            </div>
            {selected.length > 0 && (
              <div className="p-2 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1"
                >
                  Limpar Seleção
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
