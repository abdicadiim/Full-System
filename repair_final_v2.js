import fs from 'fs';

const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

const topLevelFunctions = `
// Helper formatting functions
const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return \`\${String(hours).padStart(2, '0')}:\${String(minutes).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
};

const formatTimeShort = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return \`\${String(hours).padStart(2, '0')}:\${String(minutes).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
};

const formatTimeVerbose = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return \`\${String(hours).padStart(2, "0")}h : \${String(minutes).padStart(2, "0")}m : \${String(secs).padStart(2, "0")}s\`;
};
`;

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove all internal definitions of these functions to avoid duplicates/shadowing
    content = content.replace(/const formatTime = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    content = content.replace(/const formatTimeShort = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    content = content.replace(/const formatTimeVerbose = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    
    // Insert at the top after imports
    const importEnd = content.lastIndexOf('import');
    const nextLine = content.indexOf('\n', importEnd) + 1;
    
    const finalContent = content.substring(0, nextLine) + topLevelFunctions + content.substring(nextLine);
    fs.writeFileSync(filePath, finalContent);
    console.log('Successfully moved functions to top level in ' + filePath);
  }
});
