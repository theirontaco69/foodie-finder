
const fs=require('fs');
const {execSync}=require('child_process');
const files=execSync('git diff --cached --name-only --diff-filter=ACM').toString().trim().split('\n').filter(Boolean);
const offenders=[];
for(const f of files){
  if(!/^apps\//.test(f)) continue;
  if(!fs.existsSync(f)) continue;
  const s=fs.readFileSync(f,'utf8').split(/\r?\n/);
  for(let i=0;i<s.length;i++){
    const t=s[i].trim();
    if(t.startsWith('//')||t.startsWith('#')){ offenders.push(`${f}:${i+1}`); break; }
  }
}
if(offenders.length){
  console.error('Blocked commit: files contain lines starting with // or #');
  console.error(offenders.join('\n'));
  process.exit(1);
}
