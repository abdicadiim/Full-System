import fs from 'fs';

const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the poll to also update if not running (to catch pause/stop)
    content = content.replace(
      /if \(ts && ts\.isTimerRunning\) setElapsedTime\(calculateElapsedTime\(ts\)\);/g,
      'if (ts) { setElapsedTime(calculateElapsedTime(ts)); setIsTimerRunning(Boolean(ts.isTimerRunning)); }'
    );
    
    // Also, improve the useEffect at 312-386 to not blast the API every second
    // We only want to sync on state changes or occasionally
    content = content.replace(
      /\}, \[isTimerHydrated, elapsedTime, isTimerRunning/,
      '}, [isTimerHydrated, isTimerRunning' // Remove elapsedTime from dependencies to stop per-second syncing
    );

    fs.writeFileSync(filePath, content);
    console.log('Fixed polling and throttled syncing in ' + filePath);
  }
});

// Also update UserContext for faster polling
const contextFiles = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/lib/auth/UserContext.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/lib/auth/UserContext.tsx'
];

contextFiles.forEach(cp => {
  if (fs.existsSync(cp)) {
    let content = fs.readFileSync(cp, 'utf8');
    content = content.replace(/setInterval\(refresh, 3000\)/g, 'setInterval(refresh, 1500)');
    fs.writeFileSync(cp, content);
    console.log('Faster polling set (1.5s) in ' + cp);
  }
});
