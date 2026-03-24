import fs from 'fs';

const filePath = 'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "  // Save timer state to localStorage whenever it changes";
const endMarker = "  const handleStartTimer = () => {";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = "  // Save timer state to localStorage whenever it changes\n" +
"  useEffect(() => {\n" +
"    if (!isTimerHydrated) return;\n" +
"\n" +
"    const savedTimerState = localStorage.getItem('timerState');\n" +
"    let timerState;\n" +
"    if (savedTimerState) {\n" +
"      try {\n" +
"        timerState = JSON.parse(savedTimerState);\n" +
"      } catch(e) {\n" +
"        timerState = {};\n" +
"      }\n" +
"    } else {\n" +
"      timerState = {};\n" +
"    }\n" +
"\n" +
"    const updatedState = {\n" +
"      ...timerState,\n" +
"      pausedElapsedTime: isTimerRunning ? (timerState.pausedElapsedTime || 0) : elapsedTime,\n" +
"      isTimerRunning,\n" +
"      timerNotes,\n" +
"      associatedProject: selectedProjectForTimer,\n" +
"      selectedProjectForTimer,\n" +
"      selectedTaskForTimer,\n" +
"      isBillable\n" +
"    };\n" +
"\n" +
"    if (isTimerRunning && !updatedState.startTime) {\n" +
"      updatedState.startTime = Date.now();\n" +
"      updatedState.pausedElapsedTime = elapsedTime;\n" +
"    }\n" +
"\n" +
"    if (!isTimerRunning && updatedState.startTime) {\n" +
"      updatedState.pausedElapsedTime = elapsedTime;\n" +
"      delete updatedState.startTime;\n" +
"    }\n" +
"\n" +
"    localStorage.setItem('timerState', JSON.stringify(updatedState));\n" +
"    // syncRemote helper\n" +
"    const sr = (st) => {\n" +
"       const tm = document.cookie.match(/(^| )fs_session=([^;]+)/);\n" +
"       const b = localStorage.getItem('token') || localStorage.getItem('auth_token');\n" +
"       const t = (tm ? tm[2] : null) || b;\n" +
"       if(t) {\n" +
"         fetch('/api/auth/me', {\n" +
"           method: 'PATCH',\n" +
"           headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },\n" +
"           body: JSON.stringify({ activeTimer: st })\n" +
"         }).catch(()=>null);\n" +
"       }\n" +
"    };\n" +
"    sr(updatedState);\n" +
"  }, [isTimerHydrated, elapsedTime, isTimerRunning, timerNotes, selectedProjectForTimer, selectedTaskForTimer, isBillable]);\n" +
"\n" +
"  // Listen for storage changes\n" +
"  useEffect(() => {\n" +
"    const handleStorageChange = (e) => {\n" +
"      if (e.key === 'timerState' && e.newValue) {\n" +
"        try {\n" +
"            const ts = JSON.parse(e.newValue);\n" +
"            setElapsedTime(calculateElapsedTime(ts));\n" +
"            setIsTimerRunning(Boolean(ts.isTimerRunning));\n" +
"            setTimerNotes(ts.timerNotes || '');\n" +
"            setSelectedProjectForTimer(ts.associatedProject || ts.selectedProjectForTimer || '');\n" +
"            setSelectedTaskForTimer(ts.selectedTaskForTimer || '');\n" +
"            setIsBillable(ts.isBillable ?? true);\n" +
"        } catch(err){}\n" +
"      }\n" +
"    };\n" +
"\n" +
"    const handleCustomStorage = () => {\n" +
"      const saved = localStorage.getItem('timerState');\n" +
"      if (saved) {\n" +
"        try {\n" +
"            const ts = JSON.parse(saved);\n" +
"            setElapsedTime(calculateElapsedTime(ts));\n" +
"            setIsTimerRunning(Boolean(ts.isTimerRunning));\n" +
"            setTimerNotes(ts.timerNotes || '');\n" +
"            setSelectedProjectForTimer(ts.associatedProject || ts.selectedProjectForTimer || '');\n" +
"            setSelectedTaskForTimer(ts.selectedTaskForTimer || '');\n" +
"            setIsBillable(ts.isBillable ?? true);\n" +
"        } catch(err){}\n" +
"      }\n" +
"    };\n" +
"\n" +
"    window.addEventListener('storage', handleStorageChange);\n" +
"    window.addEventListener('timerStateUpdated', handleCustomStorage);\n" +
"\n" +
"    const poll = setInterval(() => {\n" +
"       const saved = localStorage.getItem('timerState');\n" +
"       if (saved) {\n" +
"         try {\n" +
"             const ts = JSON.parse(saved);\n" +
"             if (ts && ts.isTimerRunning) setElapsedTime(calculateElapsedTime(ts));\n" +
"         } catch(e){}\n" +
"       }\n" +
"    }, 1000);\n" +
"\n" +
"    return () => {\n" +
"      window.removeEventListener('storage', handleStorageChange);\n" +
"      window.removeEventListener('timerStateUpdated', handleCustomStorage);\n" +
"      clearInterval(poll);\n" +
"    };\n" +
"  }, []);\n" +
"\n" +
"  const formatTimeVerbose = (seconds) => {\n" +
"    const hours = Math.floor(seconds / 3600);\n" +
"    const minutes = Math.floor((seconds % 3600) / 60);\n" +
"    const secs = seconds % 60;\n" +
"    return String(hours).padStart(2, '0') + 'h : ' + String(minutes).padStart(2, '0') + 'm : ' + String(secs).padStart(2, '0') + 's';\n" +
"  };\n\n";
  
  const finalContent = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
  fs.writeFileSync(filePath, finalContent);
  console.log('Successfully repaired TimeTrackingProject.tsx in Invoice');
} else {
  console.log('Markers not found');
}
