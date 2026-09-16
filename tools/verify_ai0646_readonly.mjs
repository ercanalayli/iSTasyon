// Read-only primary-source check. No browser input, credential access, or writes.
const tabs = await (await fetch('http://127.0.0.1:9222/json/list', { signal: AbortSignal.timeout(5000) })).json();
const target = tabs.find(tab => tab.type === 'page' && /^https:\/\/uygulama\.bizimhesap\.com\//.test(tab.url));
if (!target?.webSocketDebuggerUrl) throw new Error('bizimhesap_tab_not_found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});setTimeout(()=>reject(new Error('cdp_timeout')),5000); });
const expression = `(async()=>{
  const firm=await fetch('/api/AngularControllers/firms/getcurrentfirm',{credentials:'include'}).then(r=>r.json());
  const cost=await fetch('/api/AngularControllers/costs/GetAllCosts',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json;charset=UTF-8'},body:JSON.stringify({guid:'',searchText:'AI-0646',startIndex:0,totalRecordCount:100,sortColumnIndex:0,sortDirectionAsc:false,paymentStatus:0,canViewAll:true,costSearchCalendarType:1})}).then(r=>r.json());
  const flat=[]; const seen=new Set(); const walk=(value,depth)=>{if(depth>5||!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(value.dsGuid&&String(value.dsDocumentNo||'').includes('AI-0646'))flat.push(value);else for(const child of Object.values(value))walk(child,depth+1)};walk(cost,0);
  const firmText=JSON.stringify(firm).slice(0,2000);
  return {company_alayli:/ALAYLI/i.test(firmText),matches:flat.map(v=>({document_no:String(v.dsDocumentNo||''),amount:Number(v.mtAmount),category:String(v.dsAccount||v.dsAccountDetail||''),account:String(v.dsSupplier||''),status:String(v.dsStatus||''),date:String(v.dtTransaction||v.dtDue||'')})).slice(0,10)};
})()`;
const result = await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('cdp_evaluate_timeout')),10000);
  socket.addEventListener('message',event=>{try{const message=JSON.parse(event.data);if(message.id!==1)return;clearTimeout(timer);if(message.error)reject(new Error('cdp_evaluate_error'));else resolve(message.result?.result?.value||null);}catch(error){reject(error)} });
  socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
});
socket.close();
if (!result) throw new Error('readback_empty');
console.log(JSON.stringify({mode:'bizimhesap_read_only',...result}));
