import re, json, sys, os
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
src=open(os.path.join(ROOT,'contracts','VATGovernancePoC.sol')).read()
ROLES=['TAX_AUTHORITY_ROLE','SELLER_ROLE','BUYER_ROLE','TAX_SYSTEM_RECORDER_ROLE','PERIOD_POSTER_ROLE','TAX_RETURN_RECORDER_ROLE','SETTLEMENT_EVIDENCE_RECORDER_ROLE','SUPERVISORY_REVIEWER_ROLE']
muts=[]
def fn_at(pos):
    m=None
    for mm in re.finditer(r'function (\w+)|constructor|modifier (\w+)',src[:pos]): m=mm
    return (m.group(1) or ('modifier '+m.group(2) if m.group(2) else 'constructor')) if m else '?'
def add(op,pos,old,new,desc):
    s=src[:pos]+new+src[pos+len(old):]
    muts.append(dict(op=op,fn=fn_at(pos),desc=desc,src=s,line=src[:pos].count('\n')+1))
# requires
for m in re.finditer(r'require\(\s*([^";]*?)\s*,\s*"([A-Z_]+)"\s*(?://[^\n]*\n\s*)?\);',src,re.S):
    cond,code=m.group(1),m.group(2)
    if fn_at(m.start()).startswith('modifier'): continue
    add('GUARD_DELETE',m.start(),m.group(0),'/* mutant */',f'remove require {code}')
    add('COND_NEGATE',m.start(),m.group(0),f'require(!({re.sub(r"//[^\n]*","",cond)}), "{code}");',f'negate {code}')
# onlyRole per function
for m in re.finditer(r'external onlyRole\((\w+)\)',src):
    r=m.group(1)
    add('ROLE_DELETE',m.start(),m.group(0),'external',f'remove role check {r}')
    alt=ROLES[(ROLES.index(r)+1)%len(ROLES)]
    add('ROLE_SWAP',m.start(),m.group(0),f'external onlyRole({alt})',f'{r} -> {alt}')
# branch swaps: position-type constants inside require/if conditions
for m in re.finditer(r'PeriodPositionType\.(Payable|Nil|Overpaid)',src):
    line=src[src.rfind('\n',0,m.start()):src.find('\n',m.start())]
    if 'require' not in line and 'if' not in line and '==' not in line: continue
    a=m.group(1); b={'Payable':'Nil','Nil':'Payable','Overpaid':'Payable'}[a]
    add('BRANCH_SWAP',m.start(),m.group(0),f'PeriodPositionType.{b}',f'{a} -> {b}')
# completion status swap
for m in re.finditer(r'SettlementCompletionStatus\.Complete\b',src):
    add('BRANCH_SWAP',m.start(),m.group(0),'SettlementCompletionStatus.Incomplete','Complete -> Incomplete')
# bound relax / state-effect deletions
for old,new,desc,op in [
 ('per.postedInvoiceCount > 0, "BLOCKED_NO_POSTED_INVOICE"','per.postedInvoiceCount >= 0, "BLOCKED_NO_POSTED_INVOICE"','posted count >0 -> >=0','BOUND_RELAX'),
 ('hasPostedSet != hasNoActivity','hasPostedSet || hasNoActivity','nil exactly-one path -> at least one','BOUND_RELAX'),
 ('sourceEventTimeCommitment != bytes32(0)','sourceEventTimeCommitment == sourceEventTimeCommitment','source-time commitment check always true','BOUND_RELAX'),
 ('            per.underReview = true;\n        }','            /* mutant */\n        }','ExceptionRequired no longer activates review','STATE_DELETE'),
 ('        per.underReview = false;\n','        /* mutant */\n','resolution reference no longer clears review','STATE_DELETE'),
 ('        per.underReview = true;\n        emit ScopeMarkedUnderReview','        /* mutant */\n        emit ScopeMarkedUnderReview','markScopeUnderReview no longer sets review flag','STATE_DELETE'),
 ('        inv.posted = true;\n','        /* mutant */\n','posting no longer marks invoice as posted','STATE_DELETE'),
 ('            per.status = PeriodStatus.ExternalResolutionReferenced;\n','            /* mutant */\n','resolution reference no longer advances Overpaid status','STATE_DELETE'),
]:
    p=src.find(old); assert p>=0,desc; assert src.find(old,p+1)<0,desc
    add(op,p,old,new,desc)
for i,m in enumerate(muts): m['id']=f'M{i+1:03d}'
json.dump(muts,open(os.path.join(HERE,'mutants.json'),'w'))
from collections import Counter
print(len(muts),Counter(m['op'] for m in muts))
