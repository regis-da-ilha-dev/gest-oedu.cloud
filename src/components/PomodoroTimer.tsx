import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee, Bell, Settings, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PomodoroTimer() {
  const [workTime, setWorkTime] = useState(25);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<any>(null);

  const playAlarm = () => {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 1);
      
      // Close context after sound finishes to save resources
      setTimeout(() => ctx.close(), 1500);
    } catch (e) {
      console.error("Error playing generated audio:", e);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          handleTimerComplete();
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    playAlarm();

    if (mode === 'work') {
      setSessionsCompleted(prev => prev + 1);
      setMode('break');
      setMinutes(5);
    } else {
      setMode('work');
      setMinutes(workTime);
    }
    setSeconds(0);
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    setMinutes(workTime);
    setSeconds(0);
  };

  const changeWorkTime = (time: number) => {
    setIsActive(false);
    setMode('work');
    setWorkTime(time);
    setMinutes(time);
    setSeconds(0);
    setShowSettings(false);
  };

  const formatTime = (m: number, s: number) => {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-8 py-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Pomodoro</h2>
        <p className="text-slate-500">Mantenha o foco e gerencie seu tempo de estudo.</p>
      </div>

      {showSettings && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Configurações de Tempo</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <RotateCcw size={18} className="rotate-45" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 60].map((time) => (
              <button
                key={time}
                onClick={() => changeWorkTime(time)}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                  workTime === time && mode === 'work'
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                )}
              >
                {time} min
              </button>
            ))}
          </div>
          <div className="pt-2">
            <button
              onClick={playAlarm}
              className="w-full py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <Bell size={14} />
              Testar Som de Alarme
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center">
            Alterar o tempo irá resetar o cronômetro atual.
          </p>
        </div>
      )}

      <div className={cn(
        "relative aspect-square rounded-full border-8 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl",
        mode === 'work' 
          ? "bg-white border-indigo-600 shadow-indigo-100" 
          : "bg-white border-emerald-500 shadow-emerald-100"
      )}>
        <div className="text-center space-y-2">
          <div className={cn(
            "flex items-center justify-center gap-2 font-semibold uppercase tracking-widest text-sm",
            mode === 'work' ? "text-indigo-600" : "text-emerald-600"
          )}>
            {mode === 'work' ? <Timer size={18} /> : <Coffee size={18} />}
            {mode === 'work' ? 'Foco' : 'Descanso'}
          </div>
          <div className="text-7xl font-black text-slate-900 tabular-nums">
            {formatTime(minutes, seconds)}
          </div>
        </div>

        {/* Progress Circle (Simplified) */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-50 -z-10"></div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={resetTimer}
          className="p-4 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Resetar"
        >
          <RotateCcw size={24} />
        </button>
        <button
          onClick={toggleTimer}
          className={cn(
            "p-6 rounded-3xl text-white shadow-lg transition-all transform hover:scale-105 active:scale-95",
            isActive 
              ? "bg-slate-800 shadow-slate-200" 
              : mode === 'work' ? "bg-indigo-600 shadow-indigo-200" : "bg-emerald-600 shadow-emerald-200"
          )}
        >
          {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-4 rounded-2xl transition-colors",
            isMuted ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          title={isMuted ? "Ativar Som" : "Mudar para Mudo"}
        >
          {isMuted ? <Bell size={24} className="opacity-50" /> : <Bell size={24} />}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-4 rounded-2xl transition-colors",
            showSettings ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          title="Configurações"
        >
          <Settings size={24} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sessões</p>
            <p className="text-sm font-bold text-slate-900">Hoje: {sessionsCompleted}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                i <= sessionsCompleted ? "bg-indigo-600" : "bg-slate-100"
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
