import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from './services/geminiService';

// Define the AIStudio interface
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Augment the Window interface globally
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);

  const loadingMessages = useRef<string[]>([]);

  // Function to check API key status
  const checkApiKeyStatus = useCallback(async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      } else {
        // Fallback for environments where aistudio is not available (e.g., local dev without frame)
        // In a real deployed app, this condition might indicate an environment issue.
        console.warn("window.aistudio not available. Assuming API key is configured if process.env.API_KEY exists.");
        setApiKeySelected(!!process.env.API_KEY);
      }
    } catch (err) {
      console.error("Erro ao verificar o status da chave da API:", err);
      setError("Não foi possível verificar o status da chave da API.");
      setApiKeySelected(false);
    }
  }, []); // Empty dependency array, runs only once on mount

  useEffect(() => {
    checkApiKeyStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize data once

  const handleOpenApiKeySelection = useCallback(async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful to mitigate race condition
        setApiKeySelected(true);
        setError(null); // Clear any previous API key related errors
      } else {
        setError("Recurso de seleção de chave da API não disponível.");
      }
    } catch (err) {
      console.error("Erro ao abrir a seleção da chave da API:", err);
      setError("Não foi possível abrir a seleção da chave da API. Por favor, tente novamente.");
    }
  }, []);

  const handleGenerateVideo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Por favor, insira um prompt para gerar o vídeo.");
      return;
    }
    if (!apiKeySelected) {
      setError("Por favor, selecione sua chave da API antes de gerar um vídeo.");
      return;
    }

    setIsLoading(true);
    setVideoUrl(null);
    setError(null);
    setLoadingMessage('Iniciando geração do vídeo...');

    try {
      const url = await geminiService.generateVideo({
        prompt,
        onLoadingMessage: (msg) => setLoadingMessage(msg),
      });
      setVideoUrl(url);
    } catch (err: any) {
      console.error('Failed to generate video:', err);
      const errorMessage = err.message || "Ocorreu um erro inesperado ao gerar o vídeo.";
      setError(errorMessage);
      if (errorMessage.includes("Chave de API não encontrada ou inválida.")) {
        setApiKeySelected(false); // Reset API key status if it's invalid
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [prompt, apiKeySelected]);

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-500 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 w-full max-w-2xl transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-6 text-gray-800">
          Gerador de Vídeo Inteligente
        </h1>

        {!apiKeySelected && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md mb-6 flex flex-col items-center text-center">
            <p className="font-semibold mb-2">Atenção: Chave da API não selecionada!</p>
            <p className="mb-4">Para usar este recurso, você deve selecionar sua própria chave da API paga do Google Cloud Project.</p>
            <button
              onClick={handleOpenApiKeySelection}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75"
            >
              Selecionar Chave da API
            </button>
            <p className="mt-4 text-sm">
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                Informações de faturamento da API Gemini
              </a>
            </p>
          </div>
        )}

        <form onSubmit={handleGenerateVideo} className="flex flex-col gap-4">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-y min-h-[100px] text-lg placeholder-gray-500"
            placeholder="Descreva o vídeo que você quer gerar (ex: 'Um gato fofo andando de skate em uma rua movimentada com efeitos neon.')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={isLoading || !apiKeySelected}
          />
          <button
            type="submit"
            className={`w-full py-3 px-6 rounded-lg text-white font-semibold text-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ${
              isLoading || !apiKeySelected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading || !apiKeySelected}
          >
            {isLoading ? 'Gerando Vídeo...' : 'Gerar Vídeo'}
          </button>
        </form>

        {isLoading && (
          <div className="mt-8 flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg shadow-inner animate-pulse">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
            <p className="text-blue-700 font-medium text-center text-lg">{loadingMessage}</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
            {error.includes("Chave de API não encontrada ou inválida.") && (
              <button
                onClick={handleOpenApiKeySelection}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Tentar Selecionar Chave Novamente
              </button>
            )}
          </div>
        )}

        {videoUrl && !isLoading && !error && (
          <div className="mt-8 flex flex-col items-center bg-gray-50 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Seu Vídeo Gerado:</h2>
            <video
              src={videoUrl}
              controls
              className="w-full max-w-lg rounded-lg shadow-xl border border-gray-200"
              aria-label="Vídeo gerado"
              onEnded={() => console.log('Video finished playing.')}
            >
              Seu navegador não suporta a tag de vídeo.
            </video>
            <p className="mt-4 text-sm text-gray-600 text-center">
              (O vídeo pode levar alguns segundos para carregar completamente, dependendo da sua conexão.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;