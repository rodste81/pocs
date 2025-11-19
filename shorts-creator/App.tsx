import React, { useState, useCallback } from 'react';
import { createSceneAssets } from './services/geminiService';
import { Scene } from './types';
import VideoPlayer from './components/VideoPlayer';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [storyboard, setStoryboard] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; extension: string } | null>(null);

  const handleCreateVideo = useCallback(async () => {
    const sceneDescriptions = storyboard
      .split(/CENA\s+\d+\s*[:-—]?/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sceneDescriptions.length === 0) {
      setError("O storyboard não pode estar vazio. Use o formato 'CENA 1: ...' para definir suas cenas.");
      return;
    }
    if (sceneDescriptions.length > 5) {
      setError("Por favor, forneça no máximo 5 cenas.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setScenes([]);
    setDownloadInfo(null);

    try {
      const generatedScenes: Scene[] = [];
      const totalScenes = sceneDescriptions.length;
      for (let i = 0; i < totalScenes; i++) {
        const description = sceneDescriptions[i];
        setLoadingMessage(`Criando recursos para a cena ${i + 1}/${totalScenes}...`);
        const scene = await createSceneAssets(description, i + 1, sceneDescriptions);
        generatedScenes.push(scene);
      }
      setScenes(generatedScenes);
    } catch (err) {
      console.error(err);
       if (err instanceof Error && err.message === 'API_RATE_LIMIT_EXCEEDED') {
          setError('Sua cota de API foi excedida após múltiplas tentativas. Isso é comum no plano gratuito.');
      } else {
          setError('Ocorreu um erro inesperado ao criar o vídeo. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [storyboard]);
  
  const resetApp = () => {
    setStoryboard('');
    setScenes([]);
    setError(null);
    setIsLoading(false);
    setDownloadInfo(null);
    if (downloadInfo) {
      URL.revokeObjectURL(downloadInfo.url);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Shorts Creator
          </h1>
          <p className="text-gray-400 mt-2">
            Digite seu storyboard de até 5 cenas para criar um vídeo animado com narração e legendas.
          </p>
        </header>

        {isLoading && <Loader message={loadingMessage} />}
        
        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6 w-full max-w-lg text-center">
                <p>{error}</p>
                {error.includes('cota de API') && (
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-purple-400 hover:underline mt-2 inline-block font-semibold"
                    >
                        Saiba como aumentar seus limites
                    </a>
                )}
            </div>
        )}

        {!isLoading && scenes.length === 0 && (
          <div className="w-full max-w-lg bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
            <textarea
              value={storyboard}
              onChange={(e) => setStoryboard(e.target.value)}
              placeholder={`Exemplo:
CENA 1: Um astronauta flutuando no espaço, olhando para a Terra em silêncio. A imensidão azul contrasta com o vazio escuro.

CENA 2 - Close-up do capacete do astronauta. O reflexo mostra estrelas e galáxias distantes. Um sentimento de solidão e maravilha.

CENA 3: A nave espacial passa silenciosamente por um anel de asteroides brilhantes...`}
              className="w-full h-48 p-4 bg-gray-900/50 border border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none placeholder-gray-500"
            />
            <button
              onClick={handleCreateVideo}
              disabled={isLoading}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105"
            >
              Criar Vídeo
            </button>
          </div>
        )}
        
        {scenes.length > 0 && !isLoading && (
            <div className="w-full flex flex-col items-center">
                <VideoPlayer scenes={scenes} onRecordingComplete={setDownloadInfo} />
                <div className="flex items-center space-x-4 mt-6">
                    {downloadInfo && (
                         <a
                            href={downloadInfo.url}
                            download={`shorts_creator_video.${downloadInfo.extension}`}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-transform transform hover:scale-105"
                        >
                            Download Vídeo
                        </a>
                    )}
                    <button
                        onClick={resetApp}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-all"
                    >
                        Criar Novo Vídeo
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;