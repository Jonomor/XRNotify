"use strict";(()=>{var e={};e.id=9313,e.ids=[9313],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},22597:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>_,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>c,staticGenerationAsyncStorage:()=>l});var s=a(46498),i=a(98498),n=a(90929),d=a(57885),o=e([d]);d=(o.then?(await o)():o)[0];let p=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/deliveries/[id]/route",pathname:"/api/v1/deliveries/[id]",filename:"route",bundlePath:"app/api/v1/deliveries/[id]/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/deliveries/[id]/route.ts",nextConfigOutput:"standalone",userland:d}),{requestAsyncStorage:u,staticGenerationAsyncStorage:l,serverHooks:c}=p,y="/api/v1/deliveries/[id]/route";function _(){return(0,n.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:l})}r()}catch(e){r(e)}})},57885:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>y,POST:()=>v,dynamic:()=>h});var s=a(34753),i=a(18473),n=a(97530),d=a(78045),o=a(63518),_=a(97289),p=a(42439),u=e([i,n]);[i,n]=u.then?(await u)():u;let h="force-dynamic",m=(0,o.YX)("delivery-api");async function l(e){let t=Object.fromEntries(e.headers.entries()),a=(0,i.r$)(t);if(!a)return(0,o.oy)(m,"auth_failed",{reason:"Missing API key"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing API key. Provide X-XRNotify-Key header."}},{status:401})};let r=await (0,i.Gw)(a);return r.valid&&r.context?{context:r.context}:{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:r.error??"Invalid API key"}},{status:401})}}async function c(e){let{allowed:t,headers:a,retryAfter:r}=await (0,d.Dn)(e.tenantId);return t?{allowed:!0,headers:a}:((0,o.oy)(m,"rate_limited",{tenantId:e.tenantId}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function y(e,{params:t}){let{id:a}=await t,r=(0,p.Yi)(),d=performance.now();(0,_.I9)();try{let t=await l(e);if("error"in t)return t.error;let{context:o}=t;if(!(0,i.MU)(o,"deliveries:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have deliveries:read scope"}},{status:403});let p=await c(o);if("error"in p)return p.error;let u=await (0,n.mj)(a,o.tenantId);if(!u)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Delivery not found"}},{status:404,headers:{"X-Request-Id":r}});m.debug({requestId:r,deliveryId:a},"Retrieved delivery details");let y=Math.round(performance.now()-d);return(0,_.bd)({method:"GET",route:"/api/v1/deliveries/[id]",status_code:"200"},y/1e3),s.NextResponse.json({data:{id:u.id,webhook_id:u.webhook_id,event_id:u.event_id,event_type:u.event_type,status:u.status,attempt_count:u.attempt_count,max_attempts:u.max_attempts,error_code:u.last_error_code,error_message:u.last_error,next_retry_at:u.next_attempt_at,delivered_at:u.delivered_at,created_at:u.created_at,updated_at:u.updated_at,payload:u.payload,attempts:u.attempts.map(e=>({attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}))}},{status:200,headers:{...p.headers,"X-Request-Id":r}})}catch(t){m.error({error:t,requestId:r,deliveryId:a},"Failed to get delivery");let e=Math.round(performance.now()-d);return(0,_.bd)({method:"GET",route:"/api/v1/deliveries/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}async function v(e,{params:t}){let{id:a}=await t,r=(0,p.Yi)(),d=performance.now();(0,_.I9)();try{let t=new URL(e.url).searchParams.get("action");if("replay"!==t)return s.NextResponse.json({error:{code:"BAD_REQUEST",message:"Invalid action. Use ?action=replay"}},{status:400});let o=await l(e);if("error"in o)return o.error;let{context:p}=o;if(!(0,i.MU)(p,"webhooks:write"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});let u=await c(p);if("error"in u)return u.error;let y=await (0,n.xr)(a);if(!y||y.tenant_id!==p.tenantId)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Delivery not found"}},{status:404,headers:{"X-Request-Id":r}});if(!p.tenant.settings.replay_enabled)return s.NextResponse.json({error:{code:"FEATURE_DISABLED",message:"Event replay is not available on your plan. Upgrade to enable replay."}},{status:403});if(!["failed","dead_letter"].includes(y.status))return s.NextResponse.json({error:{code:"INVALID_STATE",message:`Cannot replay delivery with status '${y.status}'. Only failed or dead_letter deliveries can be replayed.`}},{status:400});if(!await (0,n.Kg)(a))return s.NextResponse.json({error:{code:"REPLAY_FAILED",message:"Failed to queue delivery for replay"}},{status:500,headers:{"X-Request-Id":r}});m.info({requestId:r,deliveryId:a},"Delivery queued for replay");let v=Math.round(performance.now()-d);return(0,_.bd)({method:"POST",route:"/api/v1/deliveries/[id]",status_code:"202"},v/1e3),s.NextResponse.json({message:"Delivery queued for replay",data:{delivery_id:a,status:"queued"}},{status:202,headers:{...u.headers,"X-Request-Id":r}})}catch(t){m.error({error:t,requestId:r,deliveryId:a},"Failed to replay delivery");let e=Math.round(performance.now()-d);return(0,_.bd)({method:"POST",route:"/api/v1/deliveries/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>u,MU:()=>c,Qd:()=>f,bF:()=>I,jU:()=>E,r$:()=>p});var s=a(42439),i=a(99638),n=a(18500),d=a(63518),o=a(25665),_=e([i]);i=(_.then?(await _)():_)[0];let k="auth:apikey:",x="x-xrnotify-key",R=(0,d.YX)("api-key-auth");function p(e){let t=e[x]||e[x.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function u(e){if(!(0,s.aQ)(e))return R.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return l(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,d.oy)(R,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,d.oy)(R,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,o.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},_={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await v(e,{apiKey:n,tenant:_}),l({apiKey:n,tenant:_},e)}function l(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,d.oy)(R,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(m(a.id).catch(e=>{R.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),R.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,d.oy)(R,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,d.oy)(R,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function c(e,t){return e.scopes.includes(t)}async function y(e){let t=`${k}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function v(e,t){let a=`${k}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function h(e,t){let a=`${k}${t}`;await (0,n.IV)(a),R.debug({apiKeyId:e},"API key cache invalidated")}async function m(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function f(e,t,a,r){let{key:n,hash:d,prefix:_}=(0,s._4)(),p=await (0,i.pP)(`
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
  `,[e,t,d,_,a,r??null]);if(!p)throw Error("Failed to create API key");return R.info({apiKeyId:p.id,tenantId:e,name:t},"API key created"),{apiKey:{...p,scopes:(0,o.k)(p.scopes),last_used_at:p.last_used_at??void 0,expires_at:p.expires_at??void 0},rawKey:n}}async function E(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await h(e,r),R.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function I(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,o.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},97530:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Kg:()=>_,Zl:()=>y,_m:()=>c,mj:()=>l,xr:()=>u,y7:()=>p});var s=a(42439),i=a(99638),n=a(18500),d=a(63518);a(97289),a(7842);var o=e([i]);i=(o.then?(await o)():o)[0];let m="stream:deliveries",f=(0,d.YX)("delivery-service");async function _(e){let t=await u(e);return!!t&&(await (0,i.IO)(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[e]),await (0,n.Ug)("stream:replay",{delivery_id:e,webhook_id:t.webhook_id,tenant_id:t.tenant_id,event_id:t.event_id,event_type:t.event_type,replay_requested_at:(0,s.i2)()}),f.info({deliveryId:e},"Delivery queued for replay"),!0)}async function p(e,t){let a=["tenant_id = $1"],r=[e],s=2;t.webhookId&&(a.push(`webhook_id = $${s}`),r.push(t.webhookId),s++),t.eventType&&(a.push(`event_type = $${s}`),r.push(t.eventType),s++),t.status&&(a.push(`status = $${s}`),r.push(t.status),s++),t.startDate&&(a.push(`created_at >= $${s}`),r.push(t.startDate),s++),t.endDate&&(a.push(`created_at <= $${s}`),r.push(t.endDate),s++);let n=a.join(" AND "),d=await (0,i.Kt)(`
    SELECT id FROM deliveries
    WHERE ${n}
    LIMIT 1000
  `,r),o=0;for(let e of d)await _(e.id)&&o++;return f.info({tenantId:e,filter:t,count:o},"Batch replay queued"),o}async function u(e){let t=await (0,i.pP)(`
    SELECT * FROM deliveries WHERE id = $1
  `,[e]);return t?v(t):null}async function l(e,t){let a=await (0,i.pP)(`
    SELECT * FROM deliveries 
    WHERE id = $1 AND tenant_id = $2
  `,[e,t]);if(!a)return null;let r=await (0,i.Kt)(`
    SELECT 
      attempt_number,
      status_code,
      response_body,
      error_message,
      duration_ms,
      attempted_at
    FROM delivery_attempts
    WHERE delivery_id = $1
    ORDER BY attempt_number ASC
  `,[e]);return{...v(a),attempts:r.map(h)}}async function c(e){let{tenantId:t,webhookId:a,eventType:r,status:s,startDate:n,endDate:d,limit:o=50,offset:_=0}=e,p=["tenant_id = $1"],u=[t],l=2;a&&(p.push(`webhook_id = $${l}`),u.push(a),l++),r&&(p.push(`event_type = $${l}`),u.push(r),l++),s&&(p.push(`status = $${l}`),u.push(s),l++),n&&(p.push(`created_at >= $${l}`),u.push(n),l++),d&&(p.push(`created_at <= $${l}`),u.push(d),l++);let c=p.join(" AND "),y=await (0,i.pP)(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${c}
  `,u),h=parseInt(y?.count??"0",10);return{deliveries:(await (0,i.Kt)(`
    SELECT * FROM deliveries
    WHERE ${c}
    ORDER BY created_at DESC
    LIMIT $${l} OFFSET $${l+1}
  `,[...u,o,_])).map(v),total:h}}async function y(e,t,a){let r=["tenant_id = $1"],s=[e],n=2;t&&(r.push(`created_at >= $${n}`),s.push(t),n++),a&&(r.push(`created_at <= $${n}`),s.push(a),n++);let d=r.join(" AND "),o=await (0,i.pP)(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${d}
  `,s),_=parseInt(o?.total??"0",10),p=parseInt(o?.delivered??"0",10),u=parseInt(o?.failed??"0",10),l=parseInt(o?.pending??"0",10),c=parseInt(o?.retrying??"0",10);return{total:_,delivered:p,failed:u,pending:l,retrying:c,successRate:_>0?p/_*100:0}}function v(e){return{id:e.id,webhook_id:e.webhook_id,tenant_id:e.tenant_id,event_id:e.event_id,event_type:e.event_type,payload:"string"==typeof e.payload?JSON.parse(e.payload):e.payload,url:e.url,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,error_code:e.error_code??void 0,error_message:e.error_message??void 0,next_retry_at:e.next_retry_at??void 0,delivered_at:e.delivered_at??void 0,created_at:e.created_at,updated_at:e.updated_at}}function h(e){return{attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}}r()}catch(e){r(e)}})},25665:(e,t,a)=>{a.d(t,{k:()=>r});function r(e){if(Array.isArray(e))return e;if("string"==typeof e)try{return JSON.parse(e)}catch{}return[]}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,207,3591,9638,9469,9801],()=>a(22597));module.exports=r})();