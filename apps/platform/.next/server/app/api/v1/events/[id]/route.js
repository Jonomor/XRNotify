"use strict";(()=>{var e={};e.id=1603,e.ids=[1603],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},83725:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>l,patchFetch:()=>_,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>y,staticGenerationAsyncStorage:()=>c});var i=a(46498),s=a(98498),n=a(90929),o=a(6864),d=e([o]);o=(d.then?(await d)():d)[0];let p=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/v1/events/[id]/route",pathname:"/api/v1/events/[id]",filename:"route",bundlePath:"app/api/v1/events/[id]/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/events/[id]/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:c,serverHooks:y}=p,l="/api/v1/events/[id]/route";function _(){return(0,n.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:c})}r()}catch(e){r(e)}})},6864:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>c,dynamic:()=>y});var i=a(34753),s=a(18473),n=a(99638),o=a(78045),d=a(63518),_=a(97289),p=a(42439),u=e([s,n]);[s,n]=u.then?(await u)():u;let y="force-dynamic",l=(0,d.YX)("events-api");async function c(e,{params:t}){let{id:a}=await t,r=(0,p.Yi)(),u=performance.now();(0,_.I9)();try{let t=Object.fromEntries(e.headers.entries()),p=(0,s.r$)(t);if(!p)return(0,d.oy)(l,"auth_failed",{reason:"Missing API key"}),i.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing API key. Provide X-XRNotify-Key header."}},{status:401});let c=await (0,s.Gw)(p);if(!c.valid||!c.context)return i.NextResponse.json({error:{code:"UNAUTHORIZED",message:c.error??"Invalid API key"}},{status:401});let y=c.context;if(!(0,s.MU)(y,"events:read"))return i.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have events:read scope"}},{status:403});let{allowed:k,headers:h}=await (0,o.Dn)(y.tenantId);if(!k)return i.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests."}},{status:429});let x=await (0,n.pP)(`
      SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload, created_at
      FROM events WHERE id = $1
    `,[a]);if(!x)return i.NextResponse.json({error:{code:"NOT_FOUND",message:"Event not found"}},{status:404,headers:{"X-Request-Id":r}});let v=Math.round(performance.now()-u);return(0,_.bd)({method:"GET",route:"/api/v1/events/[id]",status_code:"200"},v/1e3),i.NextResponse.json({data:{id:x.id,event_type:x.event_type,ledger_index:x.ledger_index,tx_hash:x.tx_hash,timestamp:x.timestamp.toISOString(),accounts:x.accounts,payload:x.payload,created_at:x.created_at.toISOString()}},{status:200,headers:{...h,"X-Request-Id":r}})}catch(t){l.error({error:t,requestId:r,eventId:a},"Failed to get event");let e=Math.round(performance.now()-u);return(0,_.bd)({method:"GET",route:"/api/v1/events/[id]",status_code:"500"},e/1e3),i.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>u,MU:()=>y,Qd:()=>v,bF:()=>I,jU:()=>f,r$:()=>p});var i=a(42439),s=a(99638),n=a(18500),o=a(63518),d=a(25665),_=e([s]);s=(_.then?(await _)():_)[0];let m="auth:apikey:",A="x-xrnotify-key",E=(0,o.YX)("api-key-auth");function p(e){let t=e[A]||e[A.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function u(e){if(!(0,i.aQ)(e))return E.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await l(e);if(t)return c(t,e);let a=(0,i.Sr)(e),r=await (0,s.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(E,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,i.V8)(e,r.api_key_hash))return(0,o.oy)(E,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,d.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},_={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await k(e,{apiKey:n,tenant:_}),c({apiKey:n,tenant:_},e)}function c(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(E,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(x(a.id).catch(e=>{E.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),E.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(E,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(E,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function y(e,t){return e.scopes.includes(t)}async function l(e){let t=`${m}${(0,i.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function k(e,t){let a=`${m}${(0,i.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function h(e,t){let a=`${m}${t}`;await (0,n.IV)(a),E.debug({apiKeyId:e},"API key cache invalidated")}async function x(e){await (0,s.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function v(e,t,a,r){let{key:n,hash:o,prefix:_}=(0,i._4)(),p=await (0,s.pP)(`
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
  `,[e,t,o,_,a,r??null]);if(!p)throw Error("Failed to create API key");return E.info({apiKeyId:p.id,tenantId:e,name:t},"API key created"),{apiKey:{...p,scopes:(0,d.k)(p.scopes),last_used_at:p.last_used_at??void 0,expires_at:p.expires_at??void 0},rawKey:n}}async function f(e,t){let a=await (0,s.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await h(e,r),E.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function I(e){return(await (0,s.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},25665:(e,t,a)=>{a.d(t,{k:()=>r});function r(e){if(Array.isArray(e))return e;if("string"==typeof e)try{return JSON.parse(e)}catch{}return[]}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,207,3591,9638,9469,9801],()=>a(83725));module.exports=r})();