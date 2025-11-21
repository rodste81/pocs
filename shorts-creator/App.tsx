import React, { useState, useEffect, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import { createSceneAssets, generateFilename } from './services/geminiService';
import { Scene } from './types';

interface QueueItem {
  id: string;
  storyboard: string;
  status: 'pending' | 'generating' | 'ready' | 'playing' | 'done' | 'error';
  scenes?: Scene[];
  filename?: string;
  error?: string;
}

function App() {
  const [storyboards, setStoryboards] = useState<string[]>(['', '', '']);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref to track if we are currently playing a video to avoid race conditions
  const isPlayingRef = useRef(false);

  const handleStoryboardChange = (index: number, value: string) => {
    const newStoryboards = [...storyboards];
    newStoryboards[index] = value;
    setStoryboards(newStoryboards);
  };

  const addToQueue = () => {
    const newItems: QueueItem[] = storyboards
      .map((sb, index) => ({
        id: `job-${Date.now()}-${index}`,
        storyboard: sb,
        status: 'pending' as const,
      }))
      .filter(item => item.storyboard.trim().length > 0);

    if (newItems.length === 0) return;

    setQueue(prev => [...prev, ...newItems]);
    // Clear inputs? Maybe not, user might want to edit.
    // setStoryboards(['', '', '']); 
  };

  // Processor Effect: Handles generation (API calls)
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing) return;

      const pendingIndex = queue.findIndex(item => item.status === 'pending');
      if (pendingIndex === -1) return;

      setIsProcessing(true);
      const item = queue[pendingIndex];

      // Update status to generating
      setQueue(prev => prev.map((q, i) => i === pendingIndex ? { ...q, status: 'generating' } : q));

      try {
        console.log(`Generating assets for job ${item.id}...`);

        // 1. Generate Filename
        const filename = await generateFilename(item.storyboard);

        // 2. Parse scenes
        const sceneDescriptions = item.storyboard.split('\n').filter(line => line.trim() !== '');
        const scenes: Scene[] = [];

        // 3. Generate Assets
        for (let i = 0; i < sceneDescriptions.length; i++) {
          const scene = await createSceneAssets(sceneDescriptions[i], i + 1, sceneDescriptions);
          scenes.push(scene);
        }

        // Update status to ready
        setQueue(prev => prev.map((q, i) => i === pendingIndex ? { ...q, status: 'ready', scenes, filename } : q));

      } catch (error: any) {
        console.error(`Error processing job ${item.id}:`, error);
        setQueue(prev => prev.map((q, i) => i === pendingIndex ? { ...q, status: 'error', error: error.message } : q));
      } finally {
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [queue, isProcessing]);

  // Player Effect: Feeds ready items to the player
  useEffect(() => {
    if (isPlayingRef.current) return;

    const readyIndex = queue.findIndex(item => item.status === 'ready');
    if (readyIndex !== -1) {
      // Start playing this item
      isPlayingRef.current = true;
      setQueue(prev => prev.map((q, i) => i === readyIndex ? { ...q, status: 'playing' } : q));
    }
  }, [queue]);

  const handleRecordingComplete = (download: { url: string; extension: string }) => {
    const playingIndex = queue.findIndex(item => item.status === 'playing');
    if (playingIndex === -1) return;

    const item = queue[playingIndex];

    // Trigger download
    const a = document.createElement('a');
    a.href = download.url;
    a.download = `${item.filename || 'video'}.${download.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Mark as done
    setQueue(prev => prev.map((q, i) => i === playingIndex ? { ...q, status: 'done' } : q));
    isPlayingRef.current = false;
  };

  const currentPlayingItem = queue.find(item => item.status === 'playing');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Shorts Creator Studio
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="bg-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                Storyboards
              </h2>

              <div className="space-y-4">
                {storyboards.map((sb, index) => (
                  <div key={index} className="relative">
                    <span className="absolute top-2 left-2 bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">
                      Video {index + 1}
                    </span>
                    <textarea
                      className="w-full h-32 bg-gray-900 border border-gray-600 rounded-xl p-4 pt-8 text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                      placeholder={`Describe scenes for Video ${index + 1} (one per line)...`}
                      value={sb}
                      onChange={(e) => handleStoryboardChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addToQueue}
                disabled={storyboards.every(s => !s.trim()) || isProcessing}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] ${isProcessing || storyboards.every(s => !s.trim())
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                  }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Queue...
                  </span>
                ) : (
                  'Add to Queue & Generate'
                )}
              </button>
            </div>

            {/* Queue Status */}
            {queue.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                <h3 className="text-xl font-semibold mb-4">Production Queue</h3>
                <div className="space-y-3">
                  {queue.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-700">
                      <div className="flex items-center overflow-hidden">
                        <span className={`w-3 h-3 rounded-full mr-3 ${item.status === 'done' ? 'bg-green-500' :
                            item.status === 'playing' ? 'bg-blue-500 animate-pulse' :
                              item.status === 'ready' ? 'bg-yellow-500' :
                                item.status === 'generating' ? 'bg-purple-500 animate-pulse' :
                                  item.status === 'error' ? 'bg-red-500' :
                                    'bg-gray-500'
                          }`}></span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate text-sm text-gray-200">
                            {item.filename || `Job #${index + 1}`}
                          </span>
                          <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {item.storyboard}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono uppercase tracking-wider text-gray-400 ml-2">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="flex flex-col items-center justify-start space-y-6">
            <div className="bg-gray-800 p-2 rounded-[2rem] shadow-2xl border-4 border-gray-700">
              {currentPlayingItem && currentPlayingItem.scenes ? (
                <VideoPlayer
                  key={currentPlayingItem.id} // Force remount for new items
                  scenes={currentPlayingItem.scenes}
                  onRecordingComplete={handleRecordingComplete}
                  outroVideoUrl="/curta.mp4"
                />
              ) : (
                <div className="w-[360px] aspect-[9/16] bg-black rounded-2xl flex flex-col items-center justify-center text-gray-500 border-2 border-gray-800 border-dashed">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>Waiting for content...</p>
                </div>
              )}
            </div>

            {currentPlayingItem && (
              <div className="text-center animate-fade-in">
                <p className="text-purple-400 font-medium">Now Playing & Recording:</p>
                <p className="text-xl font-bold">{currentPlayingItem.filename}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;