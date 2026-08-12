import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { TokenSource } from 'livekit-client';
import {
  useSession,
  useSessionContext,
  useAgent,
  SessionProvider,
  BarVisualizer,
  RoomAudioRenderer,
} from '@livekit/components-react';
import type { AgentState } from '@livekit/components-react';

export interface VoiceWidgetProps {
  /** URL of the token endpoint (FastAPI /getToken). */
  tokenEndpoint: string;
  /** Brand accent colour (hex). */
  accent: string;
}

/** localStorage key used to remember that the visitor dismissed the nudge. */
const NUDGE_KEY = 'dalab-vw-nudge-dismissed';
/** Delay before the attention nudge slides in on first visit (ms). */
const NUDGE_DELAY_MS = 3500;

/**
 * The whole widget: a floating launcher button plus a popup panel. The panel is
 * kept mounted (only visually hidden) while a call is active, so minimising the
 * panel never drops the conversation.
 */
export function VoiceWidget({ tokenEndpoint, accent }: VoiceWidgetProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  // One TokenSource for the widget's lifetime; it fetches from our FastAPI
  // endpoint using the LiveKit standard token-endpoint schema.
  const tokenSource = useMemo(() => TokenSource.endpoint(tokenEndpoint), [tokenEndpoint]);

  const style = { '--dalab-accent': accent } as CSSProperties;

  // One-time attention nudge: a small callout slides in a few seconds after
  // load to tell visitors this is a voice agent they can talk to. It never
  // reappears once dismissed (remembered in localStorage), and it stays away
  // while the panel is open.
  useEffect(() => {
    if (open) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(NUDGE_KEY) === '1';
    } catch {
      /* localStorage blocked (private mode) — safe to just show it */
    }
    if (dismissed) return;
    const t = setTimeout(() => setShowNudge(true), NUDGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [open]);

  const dismissNudge = () => {
    setShowNudge(false);
    try {
      localStorage.setItem(NUDGE_KEY, '1');
    } catch {
      /* ignore — dismissal just won't persist */
    }
  };

  const togglePanel = () => {
    setOpen((o) => !o);
    dismissNudge(); // interacting with the launcher retires the nudge for good
  };

  return (
    <div className="dalab-vw" style={style}>
      <div
        className={`dalab-vw__panel ${open ? 'is-open' : 'is-hidden'}`}
        role="dialog"
        aria-label="Talk to DaLab AI"
        aria-hidden={!open}
      >
        <header className="dalab-vw__header">
          <span className="dalab-vw__title">
            <span className="dalab-vw__dot" data-live={active} />
            Talk with Linda
          </span>
          <button
            type="button"
            className="dalab-vw__icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Minimize"
          >
            <ChevronDownIcon />
          </button>
        </header>

        <div className="dalab-vw__body">
          {active ? (
            <VoiceSession tokenSource={tokenSource} onEnd={() => setActive(false)} />
          ) : (
            <StartScreen onStart={() => setActive(true)} />
          )}
        </div>
      </div>

      {showNudge && !open && !active && (
        <div className="dalab-vw__nudge" role="status">
          <button
            type="button"
            className="dalab-vw__nudge-close"
            onClick={dismissNudge}
            aria-label="Dismiss"
          >
            <CloseIcon />
          </button>
          <p className="dalab-vw__nudge-text">
            👋 Hi, I'm <strong>Linda</strong> — Dalab's AI receptionist. Tap to
            talk with me out loud, any time.
          </p>
        </div>
      )}

      <button
        type="button"
        className="dalab-vw__launcher"
        onClick={togglePanel}
        aria-label={open ? 'Minimize voice assistant' : 'Talk with Linda, our AI receptionist'}
        data-open={open}
        data-active={active}
      >
        {open ? (
          <ChevronDownIcon />
        ) : (
          <>
            <SoundWave />
            <span className="dalab-vw__launcher-label">
              {active ? 'Linda is live' : 'Talk with Linda'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="dalab-vw__start">
      <p className="dalab-vw__lead">
        Speak with our AI receptionist. It can answer questions and help book you in —
        24/7, no hold music.
      </p>
      <button type="button" className="dalab-vw__primary" onClick={onStart}>
        <MicIcon />
        Start conversation
      </button>
      <p className="dalab-vw__hint">Your browser will ask for microphone access.</p>
    </div>
  );
}

/**
 * Owns the LiveKit session. Mounting starts the call (connect + agent dispatch);
 * unmounting ends it. `web-agent` dispatch is handled server-side by the token,
 * so no agentName is needed here.
 */
function VoiceSession({
  tokenSource,
  onEnd,
}: {
  tokenSource: ReturnType<typeof TokenSource.endpoint>;
  onEnd: () => void;
}) {
  const session = useSession(tokenSource, { agentConnectTimeoutMilliseconds: 20000 });

  useEffect(() => {
    session.start({ tracks: { microphone: { enabled: true } } }).catch((err) => {
      console.error('[dalab-vw] failed to start session', err);
    });
    return () => {
      session.end().catch(() => {
        /* ignore teardown errors */
      });
    };
    // Intentionally run once: start on mount, end on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SessionProvider session={session}>
      <SessionInner onEnd={onEnd} />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function SessionInner({ onEnd }: { onEnd: () => void }) {
  const session = useSessionContext();
  const agent = useAgent(session);
  const [micEnabled, setMicEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleMic = async () => {
    const next = !micEnabled;
    setMicEnabled(next); // optimistic
    try {
      await session.room.localParticipant.setMicrophoneEnabled(next);
    } catch (err) {
      console.error('[dalab-vw] mic toggle failed', err);
      setMicEnabled(!next); // revert
    }
  };

  const endCall = async () => {
    setBusy(true);
    try {
      await session.end();
    } finally {
      onEnd();
    }
  };

  return (
    <div className="dalab-vw__session">
      <BarVisualizer
        className="dalab-vw__viz"
        state={agent.state}
        track={agent.microphoneTrack}
        barCount={7}
        options={{ minHeight: 8 }}
      />

      <div className="dalab-vw__state" data-state={agent.state}>
        {stateLabel(agent.state)}
      </div>

      <div className="dalab-vw__controls">
        <button
          type="button"
          className="dalab-vw__ctrl"
          onClick={toggleMic}
          aria-pressed={!micEnabled}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
          {micEnabled ? 'Mute' : 'Unmute'}
        </button>

        <button
          type="button"
          className="dalab-vw__ctrl dalab-vw__ctrl--end"
          onClick={endCall}
          disabled={busy}
        >
          <EndIcon />
          End
        </button>
      </div>
    </div>
  );
}

function stateLabel(state: AgentState): string {
  switch (state) {
    case 'connecting':
      return 'Connecting…';
    case 'pre-connect-buffering':
      return 'Getting ready…';
    case 'initializing':
      return 'Waking up…';
    case 'listening':
    case 'idle':
      return 'Listening…';
    case 'thinking':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking…';
    case 'failed':
      return "Couldn't reach the assistant. Try again.";
    case 'disconnected':
      return 'Call ended.';
    default:
      return '';
  }
}

/* ------------------------------ icons ------------------------------ */

/** Animated equaliser bars — signals "this is voice" on the resting launcher. */
function SoundWave() {
  return (
    <span className="dalab-vw__wave" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M15 10.6V6a3 3 0 0 0-5.94-.6l5.94 5.6ZM19 11a1 1 0 1 0-2 0 4.9 4.9 0 0 1-.3 1.7l1.46 1.38A6.94 6.94 0 0 0 19 11ZM3.3 2.3 2 3.6l6 5.66V12a3 3 0 0 0 4.5 2.6l1.2 1.13A5 5 0 0 1 7 11a1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08a6.9 6.9 0 0 0 2.1-.72l3.6 3.4 1.3-1.36L3.3 2.3Z" />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 9c-1.6 0-3.15.25-4.6.7v3.1c0 .4-.24.74-.58.9-1 .48-1.9 1.1-2.7 1.85a.99.99 0 0 1-1.4 0L.3 13.1a.99.99 0 0 1 0-1.4C3.34 8.78 7.46 7 12 7s8.66 1.78 11.7 4.7a.99.99 0 0 1 0 1.4l-2.42 2.35a.99.99 0 0 1-1.4 0c-.8-.75-1.7-1.37-2.7-1.85a1 1 0 0 1-.58-.9v-3.1C15.15 9.25 13.6 9 12 9Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z" />
    </svg>
  );
}
