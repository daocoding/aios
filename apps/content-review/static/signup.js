// Open signup (Cloudflare copies with OPEN_SIGNUP=1). Adds "create a workspace" under the passcode box.
// The page defines window.aiosAfterLogin(); the passcode is shown once and never stored by the browser script.
(async () => {
  let c; try { c = await (await fetch('/api/config')).json() } catch { return }
  if (!c || !c.signup) return;
  const box = document.getElementById('login'); if (!box) return;
  const d = document.createElement('div');
  d.id = 'signup'; d.style.cssText = 'margin-top:18px;padding-top:14px;border-top:1px solid #ddd';
  d.innerHTML = `<h3 style="margin:0 0 6px">New here? Create a free workspace</h3>
<p style="margin:0 0 6px;font-size:13px;color:#666">Your sheets and review queue are private to you. You get a passcode once; keep it in a password manager.</p>
<input id="suname" placeholder="Pick a name (a-z, 0-9, - _)" autocomplete="username">
<button id="subtn" type="button">Create workspace</button><p id="suerr" style="color:#b00020"></p><div id="suok" hidden></div>`;
  box.appendChild(d);
  const $ = s => document.getElementById(s);
  $('subtn').onclick = async () => {
    $('suerr').textContent = '';
    const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('suname').value }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { $('suerr').textContent = j.error || 'Signup failed'; return }
    $('suok').hidden = false;
    $('suok').innerHTML = `<p><b>Workspace "${j.user}" created.</b> Your passcode (shown only now):</p>
<input id="supass" readonly style="font-family:monospace"><p style="font-size:13px">Copy it somewhere safe, then continue. Agents use it as <code>Authorization: Bearer &lt;passcode&gt;</code>.</p>
<button id="sugo" type="button">I saved it, continue</button>`;
    $('supass').value = j.passcode; $('supass').select();
    $('sugo').onclick = () => { $('supass').value = ''; d.remove(); window.aiosAfterLogin && window.aiosAfterLogin() };
  };
})();
