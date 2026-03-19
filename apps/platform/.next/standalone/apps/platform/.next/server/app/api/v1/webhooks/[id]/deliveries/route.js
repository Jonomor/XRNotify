"use strict";(()=>{var e={};e.id=246,e.ids=[246],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},74932:e=>{e.exports=require("dns/promises")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},20862:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>_,requestAsyncStorage:()=>u,routeModule:()=>p,serverHooks:()=>l,staticGenerationAsyncStorage:()=>c});var s=a(46498),i=a(98498),n=a(90929),o=a(59080),d=e([o]);o=(d.then?(await d)():d)[0];let p=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/webhooks/[id]/deliveries/route",pathname:"/api/v1/webhooks/[id]/deliveries",filename:"route",bundlePath:"app/api/v1/webhooks/[id]/deliveries/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/webhooks/[id]/deliveries/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:c,serverHooks:l}=p,y="/api/v1/webhooks/[id]/deliveries/route";function _(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:c})}r()}catch(e){r(e)}})},59080:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>h,dynamic:()=>m});var s=a(34753),i=a(42439),n=a(18473),o=a(52281),d=a(97530),_=a(78045),p=a(63518),u=a(97289),c=e([n,o,d]);[n,o,d]=c.then?(await c)():c;let m="force-dynamic",k=(0,p.YX)("webhook-deliveries-api");async function l(e){let t=Object.fromEntries(e.headers.entries()),a=(0,n.r$)(t);if(!a)return(0,p.oy)(k,"auth_failed",{reason:"Missing API key"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing API key. Provide X-XRNotify-Key header."}},{status:401})};let r=await (0,n.Gw)(a);return r.valid&&r.context?{context:r.context}:{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:r.error??"Invalid API key"}},{status:401})}}async function y(e){let{allowed:t,headers:a,retryAfter:r}=await (0,_.Dn)(e.tenantId);return t?{allowed:!0,headers:a}:((0,p.oy)(k,"rate_limited",{tenantId:e.tenantId}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function h(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),_=performance.now();(0,u.I9)();try{let t=await l(e);if("error"in t)return t.error;let{context:p}=t;if(!(0,n.MU)(p,"webhooks:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:read scope"}},{status:403});if(!(0,n.MU)(p,"deliveries:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have deliveries:read scope"}},{status:403});let c=await y(p);if("error"in c)return c.error;if(!await (0,o.zt)(a,p.tenantId))return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":r}});let h=new URL(e.url),m={limit:h.searchParams.get("limit"),offset:h.searchParams.get("offset"),event_type:h.searchParams.get("event_type"),status:h.searchParams.get("status"),start_date:h.searchParams.get("start_date"),end_date:h.searchParams.get("end_date")},f=i.nd.safeParse({limit:m.limit?parseInt(m.limit,10):void 0,offset:m.offset?parseInt(m.offset,10):void 0,event_type:m.event_type??void 0,status:m.status??void 0,start_date:m.start_date??void 0,end_date:m.end_date??void 0});if(!f.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid query parameters",details:f.error.flatten()}},{status:400});let I=f.data,{deliveries:E,total:x}=await (0,d._m)({tenantId:p.tenantId,webhookId:a,eventType:I.event_type,status:I.status,startDate:I.from?new Date(I.from):void 0,endDate:I.to?new Date(I.to):void 0,limit:I.per_page,offset:(I.page-1)*I.per_page});k.debug({requestId:r,webhookId:a,tenantId:p.tenantId,count:E.length,total:x},"Listed webhook deliveries");let w=Math.round(performance.now()-_);return(0,u.bd)({method:"GET",route:"/api/v1/webhooks/[id]/deliveries",status_code:"200"},w/1e3),s.NextResponse.json({data:E.map(v),meta:{total:x,page:I.page,per_page:I.per_page,webhook_id:a}},{status:200,headers:{...c.headers,"X-Request-Id":r}})}catch(t){k.error({error:t,requestId:r,webhookId:a},"Failed to list webhook deliveries");let e=Math.round(performance.now()-_);return(0,u.bd)({method:"GET",route:"/api/v1/webhooks/[id]/deliveries",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,u.FJ)()}}function v(e){return{id:e.id,webhook_id:e.webhook_id,event_id:e.event_id,event_type:e.event_type,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,last_error_code:e.last_error_code,last_error:e.last_error,next_attempt_at:e.next_attempt_at,delivered_at:e.delivered_at,created_at:e.created_at,updated_at:e.updated_at}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>p,MU:()=>c,Qd:()=>m,bF:()=>f,jU:()=>k,r$:()=>_});var s=a(42439),i=a(99638),n=a(18500),o=a(63518),d=e([i]);i=(d.then?(await d)():d)[0];let I="auth:apikey:",E="x-xrnotify-key",x=(0,o.YX)("api-key-auth");function _(e){let t=e[E]||e[E.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function p(e){if(!(0,s.aQ)(e))return x.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await l(e);if(t)return u(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(x,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(x,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:r.api_key_scopes,last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},d={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await y(e,{apiKey:n,tenant:d}),u({apiKey:n,tenant:d},e)}function u(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(x,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(v(a.id).catch(e=>{x.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),x.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(x,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(x,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function c(e,t){return e.scopes.includes(t)}async function l(e){let t=`${I}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function y(e,t){let a=`${I}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function h(e,t){let a=`${I}${t}`;await (0,n.IV)(a),x.debug({apiKeyId:e},"API key cache invalidated")}async function v(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function m(e,t,a,r){let{key:n,hash:o,prefix:d}=(0,s._4)(),_=await (0,i.pP)(`
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
  `,[e,t,o,d,a,r??null]);if(!_)throw Error("Failed to create API key");return x.info({apiKeyId:_.id,tenantId:e,name:t},"API key created"),{apiKey:{..._,last_used_at:_.last_used_at??void 0,expires_at:_.expires_at??void 0},rawKey:n}}async function k(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await h(e,r),x.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function f(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},97530:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Kg:()=>_,Zl:()=>y,_m:()=>l,mj:()=>c,xr:()=>u,y7:()=>p});var s=a(42439),i=a(99638),n=a(18500),o=a(63518);a(97289),a(7842);var d=e([i]);i=(d.then?(await d)():d)[0];let m="stream:deliveries",k=(0,o.YX)("delivery-service");async function _(e){let t=await u(e);return!!t&&(await (0,i.IO)(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[e]),await (0,n.Ug)("stream:replay",{delivery_id:e,webhook_id:t.webhook_id,tenant_id:t.tenant_id,event_id:t.event_id,event_type:t.event_type,replay_requested_at:(0,s.i2)()}),k.info({deliveryId:e},"Delivery queued for replay"),!0)}async function p(e,t){let a=["tenant_id = $1"],r=[e],s=2;t.webhookId&&(a.push(`webhook_id = $${s}`),r.push(t.webhookId),s++),t.eventType&&(a.push(`event_type = $${s}`),r.push(t.eventType),s++),t.status&&(a.push(`status = $${s}`),r.push(t.status),s++),t.startDate&&(a.push(`created_at >= $${s}`),r.push(t.startDate),s++),t.endDate&&(a.push(`created_at <= $${s}`),r.push(t.endDate),s++);let n=a.join(" AND "),o=await (0,i.Kt)(`
    SELECT id FROM deliveries
    WHERE ${n}
    LIMIT 1000
  `,r),d=0;for(let e of o)await _(e.id)&&d++;return k.info({tenantId:e,filter:t,count:d},"Batch replay queued"),d}async function u(e){let t=await (0,i.pP)(`
    SELECT * FROM deliveries WHERE id = $1
  `,[e]);return t?h(t):null}async function c(e,t){let a=await (0,i.pP)(`
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
  `,[e]);return{...h(a),attempts:r.map(v)}}async function l(e){let{tenantId:t,webhookId:a,eventType:r,status:s,startDate:n,endDate:o,limit:d=50,offset:_=0}=e,p=["tenant_id = $1"],u=[t],c=2;a&&(p.push(`webhook_id = $${c}`),u.push(a),c++),r&&(p.push(`event_type = $${c}`),u.push(r),c++),s&&(p.push(`status = $${c}`),u.push(s),c++),n&&(p.push(`created_at >= $${c}`),u.push(n),c++),o&&(p.push(`created_at <= $${c}`),u.push(o),c++);let l=p.join(" AND "),y=await (0,i.pP)(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${l}
  `,u),v=parseInt(y?.count??"0",10);return{deliveries:(await (0,i.Kt)(`
    SELECT * FROM deliveries
    WHERE ${l}
    ORDER BY created_at DESC
    LIMIT $${c} OFFSET $${c+1}
  `,[...u,d,_])).map(h),total:v}}async function y(e,t,a){let r=["tenant_id = $1"],s=[e],n=2;t&&(r.push(`created_at >= $${n}`),s.push(t),n++),a&&(r.push(`created_at <= $${n}`),s.push(a),n++);let o=r.join(" AND "),d=await (0,i.pP)(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${o}
  `,s),_=parseInt(d?.total??"0",10),p=parseInt(d?.delivered??"0",10),u=parseInt(d?.failed??"0",10),c=parseInt(d?.pending??"0",10),l=parseInt(d?.retrying??"0",10);return{total:_,delivered:p,failed:u,pending:c,retrying:l,successRate:_>0?p/_*100:0}}function h(e){return{id:e.id,webhook_id:e.webhook_id,tenant_id:e.tenant_id,event_id:e.event_id,event_type:e.event_type,payload:"string"==typeof e.payload?JSON.parse(e.payload):e.payload,url:e.url,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,error_code:e.error_code??void 0,error_message:e.error_message??void 0,next_retry_at:e.next_retry_at??void 0,delivered_at:e.delivered_at??void 0,created_at:e.created_at,updated_at:e.updated_at}}function v(e){return{attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}}r()}catch(e){r(e)}})}};var t=require("../../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[584,808,298,591,207,638,469,801,281],()=>a(20862));module.exports=r})();