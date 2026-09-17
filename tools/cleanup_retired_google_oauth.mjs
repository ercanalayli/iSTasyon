import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const targets = [
  'C:\\AperiON\\iSTasyon\\.aperion-secrets\\google-oauth-pre-rotation-backup.dpapi',
  'C:\\AperiON\\iSTasyon\\.aperion-secrets\\drive-content-pre-rotation-backup.dpapi',
  'C:\\Users\\HP\\Downloads\\client_secret_662965192368-i6ho5hl7pn5o4vrflqsou287ah9jmlan.apps.googleusercontent.com.json',
];
const allowed = new Set([
  path.resolve('C:\\AperiON\\iSTasyon\\.aperion-secrets').toLowerCase(),
  path.resolve('C:\\Users\\HP\\Downloads').toLowerCase(),
]);
let removed = 0;
for (const target of targets) {
  if (!allowed.has(path.dirname(path.resolve(target)).toLowerCase())) throw new Error('cleanup_path_out_of_scope');
  try { await fs.lstat(target); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  const resolved = await fs.realpath(target);
  if (path.resolve(resolved).toLowerCase() !== path.resolve(target).toLowerCase()) throw new Error('cleanup_symlink_not_allowed');
  await fs.rm(target);
  removed++;
}
const key = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\state\\ssh\\aperion-hermes-ed25519';
const child = spawn('ssh',['-i',key,'-o','BatchMode=yes','root@srv1929456.hstgr.cloud',
  'test -f /opt/aperion/secrets/google-oauth.pre-rotation.env && unlink /opt/aperion/secrets/google-oauth.pre-rotation.env; echo REMOTE_BACKUP_REMOVED'],
  {stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='',errorText='';
child.stdout.on('data',chunk=>output+=chunk);
child.stderr.on('data',chunk=>errorText+=chunk);
const code = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
if (code !== 0 || !output.includes('REMOTE_BACKUP_REMOVED')) throw new Error(`remote_cleanup_failed_${code}:${errorText.replace(/[^a-z0-9_ .:-]/gi,'').slice(0,80)}`);
console.log(JSON.stringify({ok:true,old_local_files_removed:removed,old_remote_backup_removed:true,secrets_printed:false}));
