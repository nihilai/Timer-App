const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  notify: (payload) => ipcRenderer.send("notify", payload),

  toggleMiniMode: () => ipcRenderer.send("toggle-mini-mode"),
  togglePlayPause: () => ipcRenderer.send("toggle-play-pause"),
  startPomodoro: () => ipcRenderer.send("start-pomodoro"),

  updateTime: (time) => ipcRenderer.send("timer-update", time),

  requestCurrentTime: () => ipcRenderer.send("request-current-time"),
  sendCurrentTime: (time, isRunning, isPomodoroActive) => ipcRenderer.send("send-current-time", time, isRunning, isPomodoroActive),

  onRequestCurrentTime: (callback) => ipcRenderer.on("request-current-time", callback),

  onTimeSync: (callback) => ipcRenderer.on("time-sync", (_evt, time, isRunning, isPomodoroActive) => callback(time, isRunning, isPomodoroActive)),

  onPlayPause: (callback) => ipcRenderer.on("toggle-play-pause", callback),

  onStartPomodoro: (callback) => ipcRenderer.on("start-pomodoro", callback),

  restoreMain: () => ipcRenderer.send("restore-main"),
});
