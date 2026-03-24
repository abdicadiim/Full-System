import fs from 'fs';

const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the handleDeleteTimer button from JSX
    // It's usually after the Stop button
    const deleteButtonRegex = /<button\s+onClick=\{handleDeleteTimer\}[\s\S]*?<\/button>/g;
    content = content.replace(deleteButtonRegex, '');
    
    // Also remove the border-r from the previous button (the stop button) 
    // to keep the styling consistent if it was there
    // Looking at my view:
    // 1816:                   className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-red-500 hover:bg-gray-50"
    // Wait, the Trash button doesn't have border-r, but the Stop button might.
    
    content = content.replace(
       /className="flex h-9 w-8 items-center justify-center border-none border-r border-gray-200 bg-white text-red-500 hover:bg-gray-50"/,
       'className="flex h-9 w-8 items-center justify-center border-none bg-white text-red-500 hover:bg-gray-50"'
    );

    fs.writeFileSync(filePath, content);
    console.log('Successfully removed delete icon from ' + filePath);
  }
});
