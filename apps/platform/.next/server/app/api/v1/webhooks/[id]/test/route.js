"use strict";(()=>{var e={};e.id=6763,e.ids=[6763],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},74932:e=>{e.exports=require("dns/promises")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},90468:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>u,requestAsyncStorage:()=>c,routeModule:()=>_,serverHooks:()=>l,staticGenerationAsyncStorage:()=>p});var i=a(46498),r=a(98498),n=a(90929),o=a(63833),d=e([o]);o=(d.then?(await d)():d)[0];let _=new i.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/v1/webhooks/[id]/test/route",pathname:"/api/v1/webhooks/[id]/test",filename:"route",bundlePath:"app/api/v1/webhooks/[id]/test/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/webhooks/[id]/test/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:c,staticGenerationAsyncStorage:p,serverHooks:l}=_,y="/api/v1/webhooks/[id]/test/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:p})}s()}catch(e){s(e)}})},63833:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{POST:()=>y,dynamic:()=>f});var i=a(34753),r=a(18473),n=a(42609),o=a(52281),d=a(78045),u=a(63518),_=a(97289),c=a(42439),p=a(99638),l=e([r,n,o,p]);[r,n,o,p]=l.then?(await l)():l;let f="force-dynamic",h=(0,u.YX)("webhook-test-api"),w={id:"evt_test_sample_000000000000",event_type:"payment.xrp",ledger_index:12345678,tx_hash:"0000000000000000000000000000000000000000000000000000000000000000",timestamp:new Date().toISOString(),accounts:["rTestSender111111111111111","rTestReceiver22222222222222"],payload:{type:"Payment",account:"rTestSender111111111111111",destination:"rTestReceiver22222222222222",amount:"1000000",fee:"12",sequence:1,_test:!0,_note:"This is a test event sent from the XRNotify dashboard. It does not represent a real XRPL transaction."}};async function y(e,{params:t}){let{id:a}=await t,s=(0,c.Yi)(),u=performance.now();(0,_.I9)();try{let t;let l=await (0,n.y_)();if(l)t=l.tenantId;else{let a=Object.fromEntries(e.headers.entries()),s=(0,r.r$)(a);if(!s)return i.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required."}},{status:401});let n=await (0,r.Gw)(s);if(!n.valid||!n.context)return i.NextResponse.json({error:{code:"UNAUTHORIZED",message:n.error??"Invalid API key"}},{status:401});if(!(0,r.MU)(n.context,"webhooks:write"))return i.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});t=n.context.tenantId}let{allowed:y}=await (0,d.Dn)(t);if(!y)return i.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests."}},{status:429});let f=await (0,o.zt)(a,t);if(!f)return i.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":s}});let k=await (0,p.pP)(`
      SELECT secret FROM webhooks WHERE id = $1 AND tenant_id = $2
    `,[a,t]),x=k?.secret??"",I=JSON.stringify(w),m=Math.floor(Date.now()/1e3),E=x?(0,c.Y)(I,x):"unsigned",v=new AbortController,A=setTimeout(()=>v.abort(),1e4),g=0,N="",O=null,T=performance.now();try{let e=await fetch(f.url,{method:"POST",headers:{"Content-Type":"application/json","X-XRNotify-Signature":E,"X-XRNotify-Event-Type":"payment.xrp","X-XRNotify-Event-Id":w.id,"X-XRNotify-Webhook-Id":a,"X-XRNotify-Timestamp":String(m),"X-XRNotify-Delivery-Id":`dlv_test_${s}`,"X-XRNotify-Attempt":"1","User-Agent":"XRNotify-Webhook/1.0 (test)"},body:I,signal:v.signal});g=e.status,(N=await e.text().catch(()=>"")).length>2048&&(N=N.slice(0,2048)+"... (truncated)")}catch(e){O=e instanceof Error?e.message:"Unknown error"}finally{clearTimeout(A)}let R=Math.round(performance.now()-T);h.info({requestId:s,webhookId:a,statusCode:g,durationMs:R},"Test webhook delivered");let S=Math.round(performance.now()-u);return(0,_.bd)({method:"POST",route:"/api/v1/webhooks/[id]/test",status_code:"200"},S/1e3),i.NextResponse.json({data:{success:g>=200&&g<300&&!O,status_code:g||null,duration_ms:R,response_body:N||null,error:O},message:g>=200&&g<300&&!O?"Test event delivered successfully":"Test event delivery failed"},{status:200,headers:{"X-Request-Id":s}})}catch(t){h.error({error:t,requestId:s,webhookId:a},"Failed to test webhook");let e=Math.round(performance.now()-u);return(0,_.bd)({method:"POST",route:"/api/v1/webhooks/[id]/test",status_code:"500"},e/1e3),i.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":s}})}finally{(0,_.FJ)()}}s()}catch(e){s(e)}})},18473:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Gw:()=>c,MU:()=>l,Qd:()=>k,bF:()=>I,jU:()=>x,r$:()=>_});var i=a(42439),r=a(99638),n=a(18500),o=a(63518),d=a(25665),u=e([r]);r=(u.then?(await u)():u)[0];let m="auth:apikey:",E="x-xrnotify-key",v=(0,o.YX)("api-key-auth");function _(e){let t=e[E]||e[E.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function c(e){if(!(0,i.aQ)(e))return v.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return p(t,e);let a=(0,i.Sr)(e),s=await (0,r.pP)(`
    SELECT 
      ak.id as api_key_id,
      ak.name as api_key_name,
      ak.key_hash as api_key_hash,
      ak.key_prefix as api_key_prefix,
      ak.scopes as api_key_scopes,
      ak.last_used_at as api_key_last_used_at,
      ak.expires_at as api_key_expires_at,
      ak.is_active as api_key_is_active,
      ak.created_at as api_key_created_at,
      ak.updated_at as api_key_updated_at,
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.plan as tenant_plan,
      t.is_active as tenant_is_active,
      t.stripe_customer_id as tenant_stripe_customer_id,
      t.stripe_subscription_id as tenant_stripe_subscription_id,
      t.settings as tenant_settings,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM api_keys ak
    JOIN tenants t ON ak.tenant_id = t.id
    WHERE ak.key_hash = $1
  `,[a]);if(!s)return(0,o.oy)(v,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,i.V8)(e,s.api_key_hash))return(0,o.oy)(v,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:s.api_key_id,tenant_id:s.tenant_id,name:s.api_key_name,key_hash:s.api_key_hash,key_prefix:s.api_key_prefix,scopes:(0,d.k)(s.api_key_scopes),last_used_at:s.api_key_last_used_at?.toISOString(),expires_at:s.api_key_expires_at?.toISOString(),is_active:s.api_key_is_active,created_at:s.api_key_created_at.toISOString(),updated_at:s.api_key_updated_at.toISOString()},u={id:s.tenant_id,name:s.tenant_name,email:s.tenant_email,plan:s.tenant_plan,is_active:s.tenant_is_active,stripe_customer_id:s.tenant_stripe_customer_id??void 0,stripe_subscription_id:s.tenant_stripe_subscription_id??void 0,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()};return await f(e,{apiKey:n,tenant:u}),p({apiKey:n,tenant:u},e)}function p(e,t){let{apiKey:a,tenant:s}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(v,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):s.is_active?(w(a.id).catch(e=>{v.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),v.debug({apiKeyId:a.id,tenantId:s.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:s.id,tenant:s,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(v,"auth_failed",{reason:"Tenant inactive",tenantId:s.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(v,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function l(e,t){return e.scopes.includes(t)}async function y(e){let t=`${m}${(0,i.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function f(e,t){let a=`${m}${(0,i.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function h(e,t){let a=`${m}${t}`;await (0,n.IV)(a),v.debug({apiKeyId:e},"API key cache invalidated")}async function w(e){await (0,r.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function k(e,t,a,s){let{key:n,hash:o,prefix:u}=(0,i._4)(),_=await (0,r.pP)(`
    INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id,
      tenant_id,
      name,
      key_hash,
      key_prefix,
      scopes,
      last_used_at,
      expires_at,
      is_active,
      created_at,
      updated_at
  `,[e,t,o,u,a,s??null]);if(!_)throw Error("Failed to create API key");return v.info({apiKeyId:_.id,tenantId:e,name:t},"API key created"),{apiKey:{..._,scopes:(0,d.k)(_.scopes),last_used_at:_.last_used_at??void 0,expires_at:_.expires_at??void 0},rawKey:n}}async function x(e,t){let a=await (0,r.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let s=a.rows[0]?.key_hash;return s&&await h(e,s),v.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function I(e){return(await (0,r.IO)(`
    SELECT 
      id,
      tenant_id,
      name,
      key_prefix,
      scopes,
      last_used_at,
      expires_at,
      is_active,
      created_at,
      updated_at
    FROM api_keys
    WHERE tenant_id = $1
    ORDER BY created_at DESC
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}s()}catch(e){s(e)}})},42609:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Cp:()=>R,Rf:()=>T,Uj:()=>O,c_:()=>k,kS:()=>N,x4:()=>g,y_:()=>m});var i=a(84770),r=a(37681),n=a(80219),o=a(66059),d=a(78518),u=a(42439),_=a(7842),c=a(99638),p=a(18500),l=a(63518),y=e([c]);c=(y.then?(await y)():y)[0];let S="session:",D=(0,l.YX)("session-auth");function f(){let e=(0,_.iE)();return new TextEncoder().encode(e.session.secret)}async function h(e){let t=(0,_.iE)(),a=f();return await new r.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function w(e){try{let t=f(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return D.debug({error:e},"Token verification failed"),null}}async function k(e){return await (0,o.hash)(e,12)}async function x(e,t){return await (0,o.compare)(e,t)}async function I(e,t,a){let s=(0,_.iE)(),r=(0,u.Vj)(),n=new Date,o=new Date(n.getTime()+s.session.maxAgeMs),d={sid:r,tid:e.id,email:t,version:1},l=await h(d),y=(0,i.createHash)("sha256").update(l).digest("hex"),f={id:r,tenantId:e.id,email:t,tenant:e,createdAt:n.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${S}${r}`,JSON.stringify(f),Math.floor(s.session.maxAgeMs/1e3)),await (0,c.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[r,a,e.id,y,o]),D.info({sessionId:r,tenantId:e.id,email:t},"Session created"),{session:f,token:l}}async function m(){let e=(0,_.iE)(),t=await (0,d.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await E(a):null}async function E(e){let t=await w(e);if(!t)return null;let a=`${S}${t.sid}`,s=await (0,p.U2)(a);if(s)try{let e=JSON.parse(s);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let i=await (0,c.pP)(`
    SELECT
      s.id as session_id,
      s.expires_at as session_expires_at,
      s.created_at as session_created_at,
      u.email as user_email,
      t.id as tenant_id,
      t.name as tenant_name,
      t.plan as tenant_plan,
      t.is_active as tenant_is_active,
      t.settings as tenant_settings,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN tenants t ON s.tenant_id = t.id
    WHERE s.id = $1 AND s.expires_at > NOW()
  `,[t.sid]);if(!i)return null;let r={id:i.session_id,tenantId:i.tenant_id,email:i.user_email,tenant:{id:i.tenant_id,name:i.tenant_name,email:i.user_email,plan:i.tenant_plan,is_active:i.tenant_is_active,settings:i.tenant_settings,created_at:i.tenant_created_at.toISOString(),updated_at:i.tenant_updated_at.toISOString()},createdAt:i.session_created_at.toISOString(),expiresAt:i.session_expires_at.toISOString()};(0,_.iE)();let n=Math.floor((new Date(r.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,p.t8)(a,JSON.stringify(r),n),r}async function v(e){await (0,p.IV)(`${S}${e}`),await (0,c.IO)("DELETE FROM sessions WHERE id = $1",[e]),D.info({sessionId:e},"Session invalidated")}async function A(e){let t=await (0,c.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${S}${e.id}`);return D.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function g(e,t){let a=await (0,c.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,l.oy)(D,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,l.oy)(D,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await x(t,a.password_hash)){let t=a.failed_login_attempts+1,s=t>=5;return await (0,c.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,s?new Date(Date.now()+9e5):null,a.id]),(0,l.oy)(D,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:s}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,l.oy)(D,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let s=await (0,c.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!s||!s.is_active)return(0,l.oy)(D,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,c.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:i,token:r}=await I(s,a.email,a.id);return D.info({email:e,tenantId:s.id},"User logged in"),{success:!0,session:i,token:r}}async function N(){let e=await m();e&&await v(e.id);let t=(0,_.iE)();(await (0,d.cookies)()).delete(t.session.cookieName)}async function O(e){let t=(0,_.iE)();(await (0,d.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function T(){let e=(0,_.iE)();(await (0,d.cookies)()).delete(e.session.cookieName)}async function R(e,t,a){let s=await (0,c.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!s||!await x(t,s.password_hash))return!1;let i=await k(a);return await (0,c.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[i,e]),await A(s.tenant_id),D.info({userId:e},"Password changed"),!0}s()}catch(e){s(e)}})}};var t=require("../../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[5584,1515,6298,4058,207,3591,9638,9469,9801,2281],()=>a(90468));module.exports=s})();