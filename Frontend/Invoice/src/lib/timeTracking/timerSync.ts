
export const syncRemoteTimer = (state: any) => {
  const tm = typeof document !== 'undefined' ? document.cookie.match(/(^| )fs_session=([^;]+)/) : null;
  const t = (tm ? tm[2] : null) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('accessToken')) : null);
  const bootstrapReady = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_bootstrap_ready') === '1' : false;
  if(t && bootstrapReady) {
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ activeTimer: state })
    }).catch(()=>null);
  }
};
