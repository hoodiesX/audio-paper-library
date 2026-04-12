"use client";

import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AudioPlayerProps = {
  audioId: string;
  filePath: string;
  initialPosition: number;
  title: string;
  topic: string;
  course: string;
};

export function AudioPlayer({
  audioId,
  filePath,
  initialPosition,
  title,
  topic,
  course,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTrackRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const progressStyle = useMemo(
    () => ({
      background: `linear-gradient(90deg, #111111 0%, #111111 ${progressPercentage}%, rgba(17,17,17,0.14) ${progressPercentage}%, rgba(17,17,17,0.14) 100%)`,
    }),
    [progressPercentage],
  );

  const syncProgressFromAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }, []);

  function formatTime(value: number) {
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function jumpBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      audio.duration || Number.MAX_SAFE_INTEGER,
    );

    audio.currentTime = nextTime;
    syncProgressFromAudio();
  }

  function updatePlaybackRate(nextRate: number) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  function handleProgressChange(event: ChangeEvent<HTMLInputElement>) {
    const nextTime = Number(event.target.value);
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = nextTime;
    syncProgressFromAudio();
  }

  function handleProgressHover(event: MouseEvent<HTMLInputElement>) {
    if (!progressTrackRef.current || duration <= 0) {
      setHoverTime(null);
      return;
    }

    const rect = progressTrackRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setHoverTime(duration * ratio);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;
    setCurrentTime(initialPosition);

    let lastSentSecond = initialPosition;

    const persistProgress = async () => {
      const currentSecond = Math.floor(audio.currentTime);

      if (currentSecond === lastSentSecond) {
        return;
      }

      lastSentSecond = currentSecond;

      try {
        await fetch("/api/audio/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: audioId,
            lastPositionSeconds: currentSecond,
          }),
        });
      } catch {
        // Silent fail for the MVP: progress can be retried on the next update.
      }
    };

    const syncInitialPosition = () => {
      if (Number.isFinite(initialPosition) && initialPosition > 0) {
        audio.currentTime = Math.min(initialPosition, audio.duration || initialPosition);
      }

      syncProgressFromAudio();
    };

    const handleLoadedMetadata = () => {
      syncInitialPosition();
    };

    const handleTimeUpdate = () => {
      syncProgressFromAudio();
      const currentSecond = Math.floor(audio.currentTime);
      if (currentSecond > 0 && currentSecond % 5 === 0) {
        void persistProgress();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      void persistProgress();
    };

    const handleEnded = async () => {
      setIsPlaying(false);
      syncProgressFromAudio();
      lastSentSecond = 0;

      try {
        await fetch("/api/audio/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: audioId,
            lastPositionSeconds: 0,
          }),
        });
      } catch {
        // Silent fail for the MVP.
      }
    };

    if (audio.readyState >= 1) {
      syncInitialPosition();
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeked", syncProgressFromAudio);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeked", syncProgressFromAudio);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioId, initialPosition, playbackRate, syncProgressFromAudio]);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(255,255,255,0.7)_45%,_rgba(245,245,247,0.92)_100%)] p-5 shadow-[0_20px_60px_rgba(17,17,17,0.12)] backdrop-blur md:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(10,132,255,0.10),transparent_35%,rgba(255,255,255,0.4)_100%)]" />

      <div className="relative space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-muted shadow-sm">
              {topic}
            </span>
            <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-muted shadow-sm">
              {course}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted/80">
              Now playing
            </p>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {title}
            </h2>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
          <div className="relative">
            <input
              ref={progressTrackRef}
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(currentTime, duration || currentTime)}
              onChange={handleProgressChange}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setHoverTime(null)}
              className="audio-slider h-2 w-full cursor-pointer appearance-none rounded-full"
              style={progressStyle}
              aria-label="Progress"
            />

            {hoverTime !== null && duration > 0 ? (
              <div
                className="pointer-events-none absolute -top-10 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white shadow-lg"
                style={{
                  left: `${(hoverTime / duration) * 100}%`,
                }}
              >
                {formatTime(hoverTime)}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm font-medium text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => jumpBy(-10)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            aria-label="Torna indietro di 10 secondi"
          >
            -10
          </button>

          <button
            type="button"
            onClick={togglePlayback}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-lg font-semibold text-white shadow-[0_16px_35px_rgba(17,17,17,0.25)] transition hover:-translate-y-0.5 hover:scale-[1.01] hover:opacity-95"
            aria-label={isPlaying ? "Pausa" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            onClick={() => jumpBy(10)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            aria-label="Avanza di 10 secondi"
          >
            +10
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-3 backdrop-blur">
          <span className="text-sm font-medium text-muted">Velocita</span>
          <div className="flex flex-wrap justify-end gap-2">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => {
              const active = playbackRate === rate;

              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => updatePlaybackRate(rate)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-ink text-white shadow-sm"
                      : "bg-canvas text-muted hover:bg-white hover:text-ink"
                  }`}
                >
                  {rate}x
                </button>
              );
            })}
          </div>
        </div>

        <audio ref={audioRef} preload="metadata" src={filePath}>
          Il tuo browser non supporta il player audio.
        </audio>
      </div>
    </div>
  );
}
