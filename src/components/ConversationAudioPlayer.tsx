import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import WaveSurfer from "wavesurfer.js";
// import { start } from "repl";

interface ConversationAudioPlayerProps {
  audioUrl: string;
  startTime?: string;
  endTime?: string;
}

export function ConversationAudioPlayer({
  audioUrl,
  startTime,
  endTime,
}: ConversationAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    waveRef.current?.destroy();

    waveRef.current = WaveSurfer.create({
      container: containerRef.current,
      height: 36,
      waveColor: "#D1D5DB",
      progressColor: "#111827",
      cursorColor: "#111827",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,

      // 🔑 THIS IS CRITICAL
      fetchParams: {
        mode: "cors",
      },
    });

    waveRef.current.load(audioUrl);

    waveRef.current.on("ready", () => {
      setDuration(waveRef.current!.getDuration());
      setReady(true);
    });

    waveRef.current.on("timeupdate", () => {
      setCurrent(waveRef.current!.getCurrentTime());
    });

    waveRef.current.on("finish", () => {
      setPlaying(false);
    });

    return () => {
      waveRef.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!waveRef.current || !ready) return;
    await waveRef.current.playPause();
    setPlaying(waveRef.current.isPlaying());
  };

  const rewind = () => waveRef.current?.skip(-5);
  const forward = () => waveRef.current?.skip(5);

  const format = (t: number) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

    return (
    <div className="w-full max-w-[420px]">
      <div
        ref={containerRef}
        className="mb-2 w-full"
        style={{ minHeight: 36 }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!ready}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white disabled:opacity-40"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
              <Clock size={12} />
              Start: <span className="font-medium">{startTime}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">
              <Clock size={12} />
              End: <span className="font-medium">{endTime}</span>
            </span>
          </div>

          <span className="font-medium">1.0x</span>

          <button onClick={rewind} className="opacity-70">
            <RotateCcw size={14} />
          </button>

          <button onClick={forward} className="opacity-70">
            <RotateCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-500">
            {format(current)} / {format(duration)}
          </span>
          <MoreHorizontal size={14} className="opacity-60" />
        </div>
      </div>
    </div>
  );
}
