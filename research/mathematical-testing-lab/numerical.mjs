// Bounded numerical reference implementations for general synthetic QA.
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const boundedInt=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max
function evaluate(fn,x){
 const y=fn(x);if(!finite(y))throw RangeError('Nonfinite function evaluation');return y
}
export function bisect(fn,a,b,{tolerance=1e-10,maxIterations=200}={}){
 if(typeof fn!=='function'||!finite(a)||!finite(b)||a>=b||!finite(b-a)||
   !finite(tolerance)||tolerance<=0||!boundedInt(maxIterations,10000))throw RangeError('Invalid bisection configuration')
 let fa=evaluate(fn,a),fb=evaluate(fn,b)
 if(fa===0)return {root:a,iterations:0,converged:true,bracketWidth:0}
 if(fb===0)return {root:b,iterations:0,converged:true,bracketWidth:0}
 if(Math.sign(fa)===Math.sign(fb))throw RangeError('Root is not bracketed')
 let k=0
 while(k<maxIterations&&b-a>tolerance){
  const m=a+(b-a)/2
  if(m===a||m===b)break
  const fm=evaluate(fn,m);k++
  if(fm===0)return {root:m,iterations:k,converged:true,bracketWidth:0}
  if(Math.sign(fm)===Math.sign(fa)){a=m;fa=fm}else b=m
 }
 return {root:a+(b-a)/2,iterations:k,converged:b-a<=tolerance,bracketWidth:b-a}
}
export function integratePolynomialRule(fn,a,b,n,rule){
 if(typeof fn!=='function'||!finite(a)||!finite(b)||a>=b||!finite(b-a)||
   !boundedInt(n,100000)||!['trapezoid','simpson'].includes(rule)||
   (rule==='simpson'&&n%2!==0))throw RangeError('Invalid quadrature configuration')
 const h=(b-a)/n
 let sum=evaluate(fn,a)+evaluate(fn,b),correction=0
 for(let i=1;i<n;i++){
  const weight=rule==='trapezoid'?2:i%2?4:2
  const term=weight*evaluate(fn,a+i*h)-correction,next=sum+term
  correction=(next-sum)-term;sum=next
 }
 const result=sum*h/(rule==='trapezoid'?2:3)
 if(!finite(result))throw RangeError('Nonfinite quadrature result')
 return result
}
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const norm=x=>Math.hypot(...x)
export function powerIteration(matrix,start,{tolerance=1e-10,maxIterations=200}={}){
 if(!Array.isArray(matrix)||!boundedInt(matrix.length,64)||!Array.isArray(start)||start.length!==matrix.length||
  !start.every(finite)||!matrix.every(r=>Array.isArray(r)&&r.length===matrix.length&&r.every(finite))||
  !matrix.every((r,i)=>r.every((x,j)=>x===matrix[j][i]))||
  !finite(tolerance)||tolerance<=0||!boundedInt(maxIterations,10000))throw RangeError('Invalid symmetric eigenproblem')
 const size=norm(start);if(!finite(size)||size===0)throw RangeError('Invalid starting norm')
 let x=start.map(v=>v/size)
 for(let k=0;k<=maxIterations;k++){
  const ax=matrix.map(r=>dot(r,x)),eigenvalue=dot(x,ax),residual=norm(ax.map((v,i)=>v-eigenvalue*x[i]))
  if(!finite(eigenvalue)||!finite(residual))throw RangeError('Nonfinite eigenpair')
  if(residual<=tolerance||k===maxIterations)return {eigenvalue,residual,iterations:k,converged:residual<=tolerance}
  const scale=norm(ax);if(!finite(scale)||scale===0)throw RangeError('Power iteration breakdown')
  x=ax.map(v=>v/scale)
 }
 throw Error('Unreachable iteration state')
}
