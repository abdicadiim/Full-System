const fs = require('fs');
const files = [
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Billing/src/pages/timeTracking/TimeTrackingProject.tsx',
  'c:/Users/Taban-pc/Pictures/Full-System/Frontend/Invoice/src/pages/timeTracking/TimeTrackingProject.tsx'
];

const syncRemoteStr = `
const syncRemote = (s) => {
  const tm = typeof document !== 'undefined' ? document.cookie.match(/(^| )fs_session=([^;]+)/) : null;
  const t = (tm ? tm[2] : null) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('accessToken')) : null);
  if(t) {
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${t}\` },
      body: JSON.stringify({ activeTimer: s })
    }).catch(()=>null);
  }
};
`;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if(!c.includes('const syncRemote =')) {
    c = syncRemoteStr + c;
  }
  
  c = c.split('\n').map(line => {
    if(line.includes("setItem('timerState'") && !line.includes('syncRemote')) {
      return line + " syncRemote(JSON.parse(localStorage.getItem('timerState') || 'null'));";
    }
    if(line.includes("removeItem('timerState'") && !line.includes('syncRemote')) {
      return line + " syncRemote(null);";
    }
    return line;
  }).join('\n');
  
  fs.writeFileSync(f, c);
  console.log('Successfully patched ' + f);
});
