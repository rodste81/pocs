import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { decode, decodeAudioData } from '../utils/audio';

interface VideoPlayerProps {
  scenes: Scene[];
  onRecordingComplete: (download: { url: string; extension: string }) => void;
}

const VIDEO_WIDTH = 405; // 9:16 aspect ratio
const VIDEO_HEIGHT = 720;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, onRecordingComplete }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  // For recording
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderConfigRef = useRef<{ mimeType: string; extension: string } | null>(null);

  // For animation loop
  const animationFrameRef = useRef<number | null>(null);
  const sceneStartTimeRef = useRef<number | null>(null);

  const setupRecorder = () => {
    if (!canvasRef.current || !audioContextRef.current || mediaRecorderRef.current) return;

    const canvas = canvasRef.current;
    const audioContext = audioContextRef.current;

    mediaStreamDestinationRef.current = audioContext.createMediaStreamDestination();
    const videoStream = canvas.captureStream(30); // 30 FPS
    const audioStream = mediaStreamDestinationRef.current.stream;

    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    const getSupportedMimeType = () => {
      const types = [
        { mimeType: 'video/mp4; codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
        { mimeType: 'video/mp4', extension: 'mp4' },
        { mimeType: 'video/webm; codecs=vp9,opus', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' },
      ];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type.mimeType)) {
          return type;
        }
      }
      return { mimeType: 'video/webm', extension: 'webm' };
    };

    const config = getSupportedMimeType();
    recorderConfigRef.current = config;
    try {
      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: config.mimeType });
    } catch (e) {
      console.error(`Error creating MediaRecorder with ${config.mimeType}, falling back to default.`, e);
      const fallbackConfig = { mimeType: 'video/webm', extension: 'webm' };
      recorderConfigRef.current = fallbackConfig;
      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: fallbackConfig.mimeType });
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      if (!recorderConfigRef.current) return;
      const blob = new Blob(recordedChunksRef.current, { type: recorderConfigRef.current.mimeType });
      const url = URL.createObjectURL(blob);
      onRecordingComplete({ url, extension: recorderConfigRef.current.extension });
      recordedChunksRef.current = [];
    };

    mediaRecorderRef.current.start();
  };

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    return () => {
      // Major cleanup on unmount
      if (audioSourceRef.current) audioSourceRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      audioContextRef.current?.close();
    };
  }, []);

  const drawSceneOnCanvas = (scene: Scene, imageElement: HTMLImageElement, progress: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ken Burns effect (slow zoom in)
    const zoom = 1 + progress * 0.1;
    const scaledWidth = canvas.width * zoom;
    const scaledHeight = canvas.height * zoom;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    ctx.drawImage(imageElement, x, y, scaledWidth, scaledHeight);

    // Subtitle overlay
    const overlayHeight = 90;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

    // Subtitle text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Inter, sans-serif'; // Further reduced font size
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = scene.subtitle.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = canvas.width - 40;
    const lineHeight = 22; // Adjusted line height

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const totalTextHeight = lines.length * lineHeight;
    const startY = (canvas.height - overlayHeight) + ((overlayHeight - totalTextHeight) / 2) + (lineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], canvas.width / 2, startY + (i * lineHeight));
    }
  };

  const playScene = (index: number): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!audioContextRef.current || !scenes[index]) {
        return resolve();
      }

      if (audioSourceRef.current) {
        audioSourceRef.current.onended = null; // Prevent old onended from firing
        audioSourceRef.current.stop();
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      const scene = scenes[index];

      let imageElement = imageCacheRef.current[scene.image];
      if (!imageElement) {
        imageElement = new Image();
        imageElement.src = scene.image;
        await new Promise(res => { imageElement.onload = res; });
        imageCacheRef.current[scene.image] = imageElement;
      }

      const audioBuffer = await decodeAudioData(
        decode(scene.audio),
        audioContextRef.current,
        24000, 1
      );
      const sceneDurationMs = audioBuffer.duration > 0.1 ? audioBuffer.duration * 1000 : 3000;

      sceneStartTimeRef.current = performance.now();
      const animate = (currentTime: number) => {
        if (!sceneStartTimeRef.current) return;
        const elapsedTime = currentTime - sceneStartTimeRef.current;
        const progress = Math.min(elapsedTime / sceneDurationMs, 1);

        drawSceneOnCanvas(scene, imageElement, progress);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          drawSceneOnCanvas(scene, imageElement, 1);
          animationFrameRef.current = null;
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      if (mediaStreamDestinationRef.current) {
        source.connect(mediaStreamDestinationRef.current);
      }
      source.start();
      audioSourceRef.current = source;

      source.onended = () => {
        const transitionBuffer = 500;
        setTimeout(resolve, transitionBuffer);
      };
    });
  };

  useEffect(() => {
    if (scenes.length === 0) return;

    let isCancelled = false;

    const playAllScenes = async () => {
      try {
        console.log("Starting playback of", scenes.length, "scenes");

        if (audioContextRef.current?.state === 'suspended') {
          console.log("Resuming AudioContext...");
          await audioContextRef.current.resume();
        }

        setupRecorder();

        for (let i = 0; i < scenes.length; i++) {
          if (isCancelled) return;
          console.log(`Playing scene ${i + 1}/${scenes.length}`);
          setCurrentSceneIndex(i);
          await playScene(i);
        }
        console.log("Playback finished successfully");
      } catch (error) {
        console.error("Error during playback:", error);
        // You might want to expose this error to the UI state if possible
      } finally {
        if (!isCancelled && mediaRecorderRef.current?.state === 'recording') {
          console.log("Stopping MediaRecorder");
          mediaRecorderRef.current.stop();
        }
      }
    };

    playAllScenes();

    return () => {
      isCancelled = true;
    };
  }, [scenes]);

  if (scenes.length === 0) return null;

  const progress = ((currentSceneIndex + 1) / scenes.length) * 100;

  return (
    <div className="w-full max-w-[360px] aspect-[9/16] bg-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col border-4 border-gray-700">
      <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} className="w-full h-full"></canvas>

      <div className="w-full bg-gray-600 h-1.5 absolute top-0 left-0 z-20">
        <div
          className="bg-purple-500 h-1.5"
          style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
        ></div>
      </div>
    </div>
  );
};

export default VideoPlayer;
