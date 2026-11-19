import json, subprocess, re, os, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); D=os.path.dirname(HERE)
C=D+'/contracts/VATGovernancePoC.sol'
orig=open(C).read()
def run():
    p=subprocess.run(['npx','hardhat','test'],cwd=D,capture_output=True,text=True,timeout=300)
    out=p.stdout+p.stderr
    passed=set(re.findall(r'✔ (\S+)',out))
    compiled=not ('HHE' in out and 'compil' in out.lower()) and 'Error' not in out.split('Running node:test')[0] if 'Running node:test' in out else False
    return passed,out,compiled
open(C,'w').write(orig); base,_,_=run(); print('baseline',len(base))
muts=json.load(open(os.path.join(HERE,'mutants.json')))
res=[]
for m in muts:
    open(C,'w').write(m['src'])
    passed,out,ok=run()
    if not ok:
        st='stillborn'; killed=[]
    else:
        killed=sorted(base-passed); st='killed' if killed else 'survived'
    res.append(dict(id=m['id'],op=m['op'],fn=m['fn'],desc=m['desc'],line=m['line'],status=st,killedBy=killed))
    print(m['id'],m['op'],m['fn'],m['desc'],st,killed)
    if not ok: open(os.path.join(HERE,'stillborn_'+m['id']+'.log'),'w').write(out)
open(C,'w').write(orig)
json.dump(res,open(os.path.join(HERE,'results.json'),'w'),indent=1)
