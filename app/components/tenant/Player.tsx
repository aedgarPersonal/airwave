"use client";

import { useEffect, useRef, useState } from "react";
import type { Show, Station } from "@/app/lib/types";
import { currentShow } from "@/app/lib/current-show";

type NowPlaying = {
  online: boolean;
  isLive: boolean;
  activeMount: "live" | "autodj" | "stream" | "other" | null;
  title: string | null;
  listeners: number;
  bitrate: number | null;
  genre: string | null;
};

export function Player({
  station,
  shows,
}: {
  station: Station;
  shows: Show[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<NowPlaying | null>(null);
  const [liveShow, setLiveShow] = useState<Show | null>(null);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(
          `/api/v1/stations/${station.slug}/now-playing`,
          { cache: "no-store" },
        );
        if (!r.ok) return;
        const j = (await r.json()) as NowPlaying;
        if (!stopped) setInfo(j);
      } catch {
        /* ignore */
      }
    };
    tick();
    const iv = setInterval(tick, 15_000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [station.slug]);

  useEffect(() => {
    const update = () =>
      setLiveShow(currentShow(shows, station.timezone, new Date()));
    update();
    const iv = setInterval(update, 60_000);
    return () => clearInterval(iv);
  }, [shows, station.timezone]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (playing) {
      el.pause();
      el.removeAttribute("src");
      el.load();
      setPlaying(false);
      return;
    }
    setLoading(true);
    const sep = station.stream_url.includes("?") ? "&" : "?";
    el.src = `${station.stream_url}${sep}t=${Date.now()}`;
    try {
      await el.play();
      setPlaying(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't start stream. Try again.",
      );
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const nowPlaying = info?.title ?? "Live stream";
  const listeners = info?.listeners ?? 0;
  const isLive = !!info?.isLive;
  const statusLabel = !info
    ? ""
    : !info.online
      ? "OFFLINE"
      : isLive
        ? "LIVE · ON AIR"
        : "AUTODJ · ON AIR";
  const statusColour = isLive ? "var(--t-accent3)" : "var(--t-accent1)";

  return (
    <div className="rounded-3xl border border-white/10 p-5 sm:p-7 shadow-2xl" style={{ background: "color-mix(in srgb, var(--t-ink-2) 80%, transparent)" }}>
      <div
        className="flex items-center gap-3 text-xs font-display tracking-widest"
        style={{ color: statusColour }}
      >
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${info?.online ? "live-dot" : ""}`}
          style={{ background: statusColour }}
        />
        <span>{statusLabel}</span>
        {info?.bitrate && (
          <span className="ml-auto text-white/50 tracking-normal font-sans">
            {info.bitrate} kbps
          </span>
        )}
      </div>

      {liveShow && (
        <div
          className="mt-4 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            border: `1px solid color-mix(in srgb, var(--t-accent2) 30%, transparent)`,
            background: `color-mix(in srgb, var(--t-accent2) 5%, transparent)`,
          }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 mt-0.5 shrink-0" fill="var(--t-accent2)">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h4a1 1 0 0 1 0 2h-5a1 1 0 0 1-1-1V7a1 1 0 0 1 2 0Z" />
          </svg>
          <div className="min-w-0">
            <div className="text-[10px] font-display tracking-[0.25em]" style={{ color: "var(--t-accent2)" }}>
              NOW ON AIR
            </div>
            <div className="text-base sm:text-lg font-display leading-tight truncate">
              {liveShow.title}
            </div>
            {liveShow.host && (
              <div className="text-xs opacity-70 truncate">with {liveShow.host}</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? "Pause stream" : "Play stream"}
          className="group h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-60"
          style={{
            background: "var(--t-accent2)",
            color: "var(--t-ink)",
          }}
        >
          {loading ? (
            <span className="inline-block h-5 w-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--t-ink)" }} />
          ) : playing ? (
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-8 w-8 ml-1" fill="currentColor">
              <path d="M7 4.5v15a1 1 0 0 0 1.54.84l12-7.5a1 1 0 0 0 0-1.68l-12-7.5A1 1 0 0 0 7 4.5Z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 h-4">
            {playing
              ? [0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="eq-bar inline-block w-1.5 rounded-sm h-4"
                    style={{ background: "var(--t-accent1)", animationDelay: `${i * 0.12}s` }}
                  />
                ))
              : null}
          </div>
          <div className="mt-1 text-xs uppercase tracking-widest opacity-60 font-display">
            Now Playing
          </div>
          <div className="text-lg sm:text-xl font-semibold truncate">{nowPlaying}</div>
          <div className="mt-0.5 text-sm opacity-60 truncate">
            {info?.genre ? `${info.genre} · ` : ""}
            {listeners} listener{listeners === 1 ? "" : "s"} tuned in
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-70" fill="currentColor">
          <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.7A1 1 0 0 0 13 18V6a1 1 0 0 0-1.7-.7L7 9H4a1 1 0 0 0-1 1Z" />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="w-full"
          style={{ accentColor: "var(--t-accent1)" }}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm opacity-80" role="alert" style={{ color: "var(--t-accent3)" }}>
          {error}
        </p>
      )}

      <audio ref={audioRef} preload="none" />
    </div>
  );
}
