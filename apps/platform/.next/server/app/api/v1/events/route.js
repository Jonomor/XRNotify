"use strict";(()=>{var e={};e.id=1406,e.ids=[1406],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},29339:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>_,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>l,staticGenerationAsyncStorage:()=>c});var s=a(46498),i=a(98498),n=a(90929),o=a(75497),d=e([o]);o=(d.then?(await d)():d)[0];let p=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/events/route",pathname:"/api/v1/events",filename:"route",bundlePath:"app/api/v1/events/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/events/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:c,serverHooks:l}=p,y="/api/v1/events/route";function _(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:c})}r()}catch(e){r(e)}})},75497:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>h,dynamic:()=>v});var s=a(34753),i=a(29010),n=a(42439),o=a(18473),d=a(99638),_=a(78045),p=a(63518),u=a(97289),c=e([o,d]);[o,d]=c.then?(await c)():c;let v="force-dynamic",m=i.Ry({limit:i.Rx().int().min(1).max(100).optional(),offset:i.Rx().int().min(0).optional(),event_type:i.Km(n.E_).optional(),account:i.Z_().min(1).max(100).optional(),tx_hash:i.Z_().length(64).optional(),ledger_index:i.Rx().int().min(0).optional(),start_date:i.Z_().datetime().optional(),end_date:i.Z_().datetime().optional()}),f=(0,p.YX)("events-api");async function l(e){let t=Object.fromEntries(e.headers.entries()),a=(0,o.r$)(t);if(!a)return(0,p.oy)(f,"auth_failed",{reason:"Missing API key"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing API key. Provide X-XRNotify-Key header."}},{status:401})};let r=await (0,o.Gw)(a);return r.valid&&r.context?{context:r.context}:{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:r.error??"Invalid API key"}},{status:401})}}async function y(e){let{allowed:t,headers:a,retryAfter:r}=await (0,_.Dn)(e.tenantId);return t?{allowed:!0,headers:a}:((0,p.oy)(f,"rate_limited",{tenantId:e.tenantId}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function h(e){let t=(0,n.Yi)(),a=performance.now();(0,u.I9)();try{let r=await l(e);if("error"in r)return r.error;let{context:i}=r;if(!(0,o.MU)(i,"events:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have events:read scope"}},{status:403});if(!i.tenant.settings.events_api_enabled)return s.NextResponse.json({error:{code:"FEATURE_DISABLED",message:"Events API is not available on your plan. Upgrade to access raw events."}},{status:403});let n=await y(i);if("error"in n)return n.error;let _=new URL(e.url),p={limit:_.searchParams.get("limit"),offset:_.searchParams.get("offset"),event_type:_.searchParams.get("event_type"),account:_.searchParams.get("account"),tx_hash:_.searchParams.get("tx_hash"),ledger_index:_.searchParams.get("ledger_index"),start_date:_.searchParams.get("start_date"),end_date:_.searchParams.get("end_date")},c=m.safeParse({limit:p.limit?parseInt(p.limit,10):void 0,offset:p.offset?parseInt(p.offset,10):void 0,event_type:p.event_type??void 0,account:p.account??void 0,tx_hash:p.tx_hash??void 0,ledger_index:p.ledger_index?parseInt(p.ledger_index,10):void 0,start_date:p.start_date??void 0,end_date:p.end_date??void 0});if(!c.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid query parameters",details:c.error.flatten()}},{status:400});let h=c.data,v=h.limit??50,k=h.offset??0,I=[],g=[],E=1;h.event_type&&(I.push(`event_type = $${E}`),g.push(h.event_type),E++),h.account&&(I.push(`$${E} = ANY(accounts)`),g.push(h.account),E++),h.tx_hash&&(I.push(`tx_hash = $${E}`),g.push(h.tx_hash),E++),h.ledger_index&&(I.push(`ledger_index = $${E}`),g.push(h.ledger_index),E++),h.start_date&&(I.push(`timestamp >= $${E}`),g.push(new Date(h.start_date)),E++),h.end_date&&(I.push(`timestamp <= $${E}`),g.push(new Date(h.end_date)),E++);let A=I.length>0?`WHERE ${I.join(" AND ")}`:"",R=await (0,d.pP)(`SELECT COUNT(*) as count FROM events ${A}`,g),P=parseInt(R?.count??"0",10);g.push(v,k);let w=await (0,d.Kt)(`SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload, created_at
       FROM events 
       ${A}
       ORDER BY ledger_index DESC, created_at DESC
       LIMIT $${E} OFFSET $${E+1}`,g);f.debug({requestId:t,tenantId:i.tenantId,count:w.length,total:P},"Listed events");let N=Math.round(performance.now()-a);return(0,u.bd)({method:"GET",route:"/api/v1/events",status_code:"200"},N/1e3),s.NextResponse.json({data:w.map(x),meta:{total:P,limit:v,offset:k}},{status:200,headers:{...n.headers,"X-Request-Id":t}})}catch(r){f.error({error:r,requestId:t},"Failed to list events");let e=Math.round(performance.now()-a);return(0,u.bd)({method:"GET",route:"/api/v1/events",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,u.FJ)()}}function x(e){return{id:e.id,event_type:e.event_type,ledger_index:e.ledger_index,tx_hash:e.tx_hash,timestamp:e.timestamp.toISOString(),accounts:e.accounts,payload:e.payload,created_at:e.created_at.toISOString()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>u,MU:()=>l,Qd:()=>m,bF:()=>k,jU:()=>f,r$:()=>p});var s=a(42439),i=a(99638),n=a(18500),o=a(63518),d=a(25665),_=e([i]);i=(_.then?(await _)():_)[0];let I="auth:apikey:",g="x-xrnotify-key",E=(0,o.YX)("api-key-auth");function p(e){let t=e[g]||e[g.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function u(e){if(!(0,s.aQ)(e))return E.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return c(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(E,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(E,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,d.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},_={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await h(e,{apiKey:n,tenant:_}),c({apiKey:n,tenant:_},e)}function c(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(E,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(v(a.id).catch(e=>{E.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),E.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(E,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(E,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function l(e,t){return e.scopes.includes(t)}async function y(e){let t=`${I}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function h(e,t){let a=`${I}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function x(e,t){let a=`${I}${t}`;await (0,n.IV)(a),E.debug({apiKeyId:e},"API key cache invalidated")}async function v(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function m(e,t,a,r){let{key:n,hash:o,prefix:_}=(0,s._4)(),p=await (0,i.pP)(`
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
  `,[e,t,o,_,a,r??null]);if(!p)throw Error("Failed to create API key");return E.info({apiKeyId:p.id,tenantId:e,name:t},"API key created"),{apiKey:{...p,scopes:(0,d.k)(p.scopes),last_used_at:p.last_used_at??void 0,expires_at:p.expires_at??void 0},rawKey:n}}async function f(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await x(e,r),E.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function k(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},25665:(e,t,a)=>{a.d(t,{k:()=>r});function r(e){if(Array.isArray(e))return e;if("string"==typeof e)try{return JSON.parse(e)}catch{}return[]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,207,3591,9638,9469,9801],()=>a(29339));module.exports=r})();