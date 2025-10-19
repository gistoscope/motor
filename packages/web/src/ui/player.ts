import type { MathSessionController, MathSessionReplayHandle } from '../math/session';

export interface SessionPlayerLabels {
  empty?: string;
  counter?: (index: number, total: number) => string;
}

export interface SessionPlayerOptions {
  session: MathSessionController;
  apply: (actionId: string) => void | Promise<void>;
  onReset: () => void | Promise<void>;
  delayMs?: number;
  speeds?: number[];
  labels?: SessionPlayerLabels;
}

export interface SessionPlayerHandle {
  readonly element: HTMLElement;
  getSession(): MathSessionController;
  getPlayback(): MathSessionReplayHandle | null;
  refresh(): Promise<void>;
  destroy(): Promise<void>;
}

function formatSpeed(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '×1';
  }
  if (Number.isInteger(value)) {
    return `×${value}`;
  }
  return `×${Number.parseFloat(value.toFixed(1))}`;
}

function formatCounter(index: number, total: number, labels?: SessionPlayerLabels): string {
  if (labels?.counter) {
    try {
      return labels.counter(index, total);
    } catch {
      // fall back to default formatting
    }
  }
  return `${index}/${total}`;
}

export function createSessionPlayer(
  container: HTMLElement,
  options: SessionPlayerOptions,
): SessionPlayerHandle {
  container.dataset.role = container.dataset.role ?? 'math-session-player';
  container.dataset.state = 'empty';

  const speeds = options.speeds && options.speeds.length > 0 ? options.speeds.slice() : [0.5, 1, 2, 4];
  const defaultSpeed = speeds.includes(1) ? 1 : speeds[0]!;
  let currentSpeed = defaultSpeed;

  const controls = document.createElement('div');
  controls.dataset.role = 'math-session-player-controls';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.textContent = '⏮️';
  prevButton.dataset.role = 'math-session-player-prev';
  prevButton.ariaLabel = 'Step back';

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.textContent = '▶️';
  playButton.dataset.role = 'math-session-player-play';
  playButton.ariaLabel = 'Play or pause';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.textContent = '⏭️';
  nextButton.dataset.role = 'math-session-player-next';
  nextButton.ariaLabel = 'Step forward';

  controls.append(prevButton, playButton, nextButton);

  const timelineWrapper = document.createElement('div');
  timelineWrapper.dataset.role = 'math-session-player-timeline-wrapper';

  const timeline = document.createElement('input');
  timeline.type = 'range';
  timeline.min = '0';
  timeline.max = '0';
  timeline.step = '1';
  timeline.value = '0';
  timeline.dataset.role = 'math-session-player-timeline';

  const counter = document.createElement('span');
  counter.dataset.role = 'math-session-player-counter';
  counter.textContent = formatCounter(0, 0, options.labels);

  const speedWrapper = document.createElement('label');
  speedWrapper.dataset.role = 'math-session-player-speed-control';
  speedWrapper.textContent = 'Speed ';

  const speedSelect = document.createElement('select');
  speedSelect.dataset.role = 'math-session-player-speed';
  speeds.forEach((speed) => {
    const option = document.createElement('option');
    option.value = String(speed);
    option.textContent = formatSpeed(speed);
    if (speed === defaultSpeed) {
      option.selected = true;
    }
    speedSelect.appendChild(option);
  });
  speedWrapper.appendChild(speedSelect);

  const footer = document.createElement('div');
  footer.dataset.role = 'math-session-player-footer';
  footer.append(timeline, counter, speedWrapper);

  container.append(controls, footer);

  let playback: MathSessionReplayHandle | null = null;
  let blocking = false;
  let destroyed = false;

  const updateControls = () => {
    if (destroyed) {
      return;
    }
    const total = playback?.total ?? 0;
    const index = playback?.index ?? 0;
    const playing = playback?.playing ?? false;
    const disableForPlayback = playing || blocking;

    prevButton.disabled = !playback || total === 0 || disableForPlayback || index <= 0;
    nextButton.disabled = !playback || total === 0 || disableForPlayback || index >= total;
    playButton.disabled = !playback || total === 0;
    playButton.textContent = playing ? '⏸️' : '▶️';

    timeline.disabled = !playback || total === 0 || disableForPlayback;
    timeline.max = String(total);
    timeline.value = String(index);

    speedSelect.disabled = !playback || total === 0 || blocking;

    counter.textContent = formatCounter(index, total, options.labels);

    container.dataset.state = total > 0 ? 'ready' : 'empty';
  };

  const handleIndexChange = ({ index, total }: { index: number; total: number }) => {
    if (destroyed) {
      return;
    }
    timeline.max = String(total);
    timeline.value = String(index);
    counter.textContent = formatCounter(index, total, options.labels);
    container.dataset.state = total > 0 ? 'ready' : 'empty';
    updateControls();
  };

  const cleanupPlayback = async () => {
    const current = playback;
    playback = null;
    if (current) {
      try {
        await current.destroy();
      } catch {
        // ignore destroy errors
      }
    }
  };

  const setupPlayback = () => {
    const replayOptions = {
      onReset: options.onReset,
      onIndexChange: handleIndexChange,
      ...(options.delayMs !== undefined ? { delayMs: options.delayMs } : {}),
    };
    playback = options.session.replay(options.apply, replayOptions);
    handleIndexChange({ index: playback.index, total: playback.total });
  };

  const runBlockingTask = async (task: () => Promise<void>) => {
    if (blocking || destroyed) {
      return;
    }
    blocking = true;
    updateControls();
    try {
      await task();
    } finally {
      blocking = false;
      updateControls();
    }
  };

  const handlePrevClick = () => {
    if (!playback) {
      return;
    }
    const target = Math.max(0, playback.index - 1);
    void runBlockingTask(async () => {
      await playback!.seek(target);
    });
  };

  const handleNextClick = () => {
    if (!playback) {
      return;
    }
    void runBlockingTask(async () => {
      await playback!.step();
    });
  };

  const handlePlayClick = async () => {
    if (!playback) {
      return;
    }
    if (playback.playing) {
      await runBlockingTask(async () => {
        await playback!.pause();
      });
      return;
    }
    updateControls();
    try {
      await playback.play(currentSpeed);
    } finally {
      updateControls();
    }
  };

  const handleTimelineChange = () => {
    if (!playback) {
      return;
    }
    const nextIndex = Number.parseInt(timeline.value, 10);
    if (!Number.isFinite(nextIndex)) {
      return;
    }
    void runBlockingTask(async () => {
      await playback!.seek(nextIndex);
    });
  };

  const handleSpeedChange = () => {
    const value = Number.parseFloat(speedSelect.value);
    if (Number.isFinite(value) && value > 0) {
      currentSpeed = value;
    }
  };

  prevButton.addEventListener('click', handlePrevClick);
  playButton.addEventListener('click', handlePlayClick);
  nextButton.addEventListener('click', handleNextClick);
  timeline.addEventListener('change', handleTimelineChange);
  speedSelect.addEventListener('change', handleSpeedChange);

  setupPlayback();
  updateControls();

  return {
    element: container,
    getSession: () => options.session,
    getPlayback: () => playback,
    refresh: async () => {
      await cleanupPlayback();
      const resetResult = options.onReset();
      if (resetResult && typeof (resetResult as Promise<void>).then === 'function') {
        await resetResult;
      }
      setupPlayback();
      updateControls();
    },
    destroy: async () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      prevButton.removeEventListener('click', handlePrevClick);
      playButton.removeEventListener('click', handlePlayClick);
      nextButton.removeEventListener('click', handleNextClick);
      timeline.removeEventListener('change', handleTimelineChange);
      speedSelect.removeEventListener('change', handleSpeedChange);
      await cleanupPlayback();
      container.dataset.state = 'empty';
      container.textContent = options.labels?.empty ?? '';
    },
  };
}
