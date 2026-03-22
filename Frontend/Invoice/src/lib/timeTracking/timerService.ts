type TimerState = {
  elapsedTime?: number;
  isTimerRunning?: boolean;
  pausedElapsedTime?: number;
  startTime?: number;
  lastUpdated?: number;
};

let timerIntervalId: number | null = null;

export const calculateElapsedTime = (timerState: TimerState) => {
  if (!timerState) return 0;

  if (timerState.isTimerRunning && timerState.startTime) {
    const elapsedFromStart = Math.floor((Date.now() - timerState.startTime) / 1000);
    return (timerState.pausedElapsedTime || 0) + Math.max(0, elapsedFromStart);
  }

  return timerState.pausedElapsedTime || timerState.elapsedTime || 0;
};

const tick = () => {
  const savedTimerState = localStorage.getItem("timerState");
  if (!savedTimerState) {
    return;
  }

  let timerState: TimerState;
  try {
    timerState = JSON.parse(savedTimerState) as TimerState;
  } catch {
    return;
  }

  if (!timerState.isTimerRunning) {
    return;
  }

  if (!timerState.startTime) {
    timerState.startTime = Date.now();
    timerState.pausedElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
  }

  const elapsedTime = calculateElapsedTime(timerState);
  const updatedTimerState: TimerState = {
    ...timerState,
    elapsedTime,
    lastUpdated: Date.now(),
  };

  localStorage.setItem("timerState", JSON.stringify(updatedTimerState));
  window.dispatchEvent(new CustomEvent("timerStateUpdated"));
};

export const ensureTimerTicker = () => {
  if (timerIntervalId !== null) return;
  timerIntervalId = window.setInterval(tick, 1000);
};

export const stopTimerTicker = () => {
  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
};
