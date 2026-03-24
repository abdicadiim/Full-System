import fs from 'fs';

const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

const functionsToAdd = `  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return \`\${String(hours).padStart(2, '0')}:\${String(minutes).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  };

  // Format time as HH:MM for display
  const formatTimeShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return \`\${String(hours).padStart(2, '0')}:\${String(minutes).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  };

`;

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // If formatTime already exists, skip
    if (content.includes('const formatTime =')) {
       console.log('formatTime already exists in ' + filePath);
       return;
    }

    const markers = [
      "const formatTimeVerbose = (seconds: number) => {",
      "const formatTimeVerbose = (seconds) => {",
      "const handleStartTimer = () => {"
    ];
    
    let index = -1;
    for (const marker of markers) {
      index = content.indexOf(marker);
      if (index !== -1) break;
    }

    if (index !== -1) {
      const finalContent = content.substring(0, index) + functionsToAdd + content.substring(index);
      fs.writeFileSync(filePath, finalContent);
      console.log('Successfully added missing functions to ' + filePath);
    } else {
      console.log('No marker found in ' + filePath);
    }
  }
});
