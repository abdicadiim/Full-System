import fs from 'fs';

const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

const helperCode = `
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
    
    // First, remove existing ones to be clean
    content = content.replace(/\/\/ Helper formatting functions[\s\S]*?\n\n/g, ''); // catch previous failed attempt
    content = content.replace(/const formatTime = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    content = content.replace(/const formatTimeShort = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    content = content.replace(/const formatTimeVerbose = \(seconds(|: number)\) => \{[\s\S]*?\};\s*/g, '');
    
    // Insert before the component
    const marker = "export default function TimeTrackingProject()";
    const index = content.indexOf(marker);
    if (index !== -1) {
      const finalContent = content.substring(0, index) + helperCode + content.substring(index);
      fs.writeFileSync(filePath, finalContent);
      console.log('Successfully fixed ' + filePath);
    } else {
      console.log('Could not find component start in ' + filePath);
    }
  }
});
