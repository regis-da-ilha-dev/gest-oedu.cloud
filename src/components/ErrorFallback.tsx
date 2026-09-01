import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorFallbackProps {
  error: Error | null;
}

export default function ErrorFallback({ error }: ErrorFallbackProps) {
  let errorMessage = "Ocorreu um erro inesperado.";
  let isQuotaError = false;
  
  try {
    if (error?.message) {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        errorMessage = parsed.error;
        if (
          parsed.error.includes("Quota limit exceeded") ||
          parsed.error.includes("Quota exceeded") ||
          parsed.error.includes("Free daily read units")
        ) {
          isQuotaError = true;
        }
      }
    } else if (error) {
      errorMessage = error.toString();
      if (
        errorMessage.includes("Quota limit exceeded") ||
        errorMessage.includes("Quota exceeded") ||
        errorMessage.includes("Free daily read units")
      ) {
        isQuotaError = true;
      }
    }
  } catch (e) {
    const fallbackMsg = error?.message || "";
    errorMessage = fallbackMsg || errorMessage;
    if (
      fallbackMsg.includes("Quota limit exceeded") ||
      fallbackMsg.includes("Quota exceeded") ||
      fallbackMsg.includes("Free daily read units")
    ) {
      isQuotaError = true;
    }
  }

  const projectId = firebaseConfig.projectId;
  const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const databaseUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/${firestoreDatabaseId}/data?openUpgradeDialog=true`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" id="error-fallback-container">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center space-y-6" id="error-fallback-card">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center" id="error-alert-icon">
          <AlertTriangle size={32} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900" id="error-title">
            {isQuotaError ? "Cota Limite Excedida no Firestore" : "Ops! Algo deu errado"}
          </h2>
          
          {isQuotaError ? (
            <div className="text-left space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-slate-700" id="quota-error-details">
              <p className="font-semibold text-amber-900">
                O limite diário de leitura gratuita do Firestore foi temporariamente atingido.
              </p>
              <p>
                Se você <strong>já habilitou o faturamento (billing)</strong> ou realizou o upgrade do plano na console agora, excelente! 
                Pode levar <strong>alguns minutos</strong> (geralmente entre 2 e 10 minutos) para que o Google propague a alteração e normalize as chamadas do banco de dados.
              </p>
              <p>
                Você pode acompanhar o status, cotas e plano ativo diretamente no console do seu banco de dados:
              </p>
              <a
                href={databaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center font-bold text-indigo-600 hover:text-indigo-800 underline break-all mt-2"
                id="firestore-console-link"
              >
                Abrir Painel do Firestore ↗
              </a>
            </div>
          ) : (
            <p className="text-slate-500 text-sm leading-relaxed break-words" id="error-message-text">
              {errorMessage}
            </p>
          )}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          id="reload-button"
        >
          <RefreshCcw size={20} />
          Recarregar Página / Tentar Novamente
        </button>

        <p className="text-xs text-slate-400">
          Se o problema persistir ou o limite não normalizar, fale com o{" "}
          <a
            href={`https://wa.me/5598988284885?text=${encodeURIComponent(
              "Olá! Encontrei um erro de limite de cota/banco de dados já habilitado e preciso de suporte."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline font-bold"
            id="whatsapp-support-link"
          >
            suporte
          </a>
          .
        </p>
      </div>
    </div>
  );
}
