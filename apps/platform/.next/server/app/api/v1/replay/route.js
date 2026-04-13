"use strict";(()=>{var e={};e.id=9587,e.ids=[9587],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},35968:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>p,requestAsyncStorage:()=>u,routeModule:()=>_,serverHooks:()=>c,staticGenerationAsyncStorage:()=>l});var s=a(46498),n=a(98498),i=a(90929),o=a(33417),d=e([o]);o=(d.then?(await d)():d)[0];let _=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/v1/replay/route",pathname:"/api/v1/replay",filename:"route",bundlePath:"app/api/v1/replay/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/replay/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:u,staticGenerationAsyncStorage:l,serverHooks:c}=_,y="/api/v1/replay/route";function p(){return(0,i.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:l})}r()}catch(e){r(e)}})},33417:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>h,POST:()=>y,dynamic:()=>v});var s=a(34753),n=a(42439),i=a(18473),o=a(97530),d=a(78045),p=a(63518),_=a(97289),u=e([i,o]);[i,o]=u.then?(await u)():u;let v="force-dynamic",f=(0,p.YX)("replay-api");async function l(e){let t=Object.fromEntries(e.headers.entries()),a=(0,i.r$)(t);if(!a)return(0,p.oy)(f,"auth_failed",{reason:"Missing API key"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing API key. Provide X-XRNotify-Key header."}},{status:401})};let r=await (0,i.Gw)(a);return r.valid&&r.context?{context:r.context}:{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:r.error??"Invalid API key"}},{status:401})}}async function c(e){let{allowed:t,headers:a,retryAfter:r}=await (0,d.Dn)(e.tenantId);return t?{allowed:!0,headers:a}:((0,p.oy)(f,"rate_limited",{tenantId:e.tenantId}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function y(e){let t=(0,n.Yi)(),a=performance.now();(0,_.I9)();try{let r;let d=await l(e);if("error"in d)return d.error;let{context:p}=d;if(!(0,i.MU)(p,"deliveries:write"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have deliveries:write scope"}},{status:403});if(!p.tenant.settings.replay_enabled)return s.NextResponse.json({error:{code:"FEATURE_DISABLED",message:"Event replay is not available on your plan. Upgrade to enable replay."}},{status:403});let u=await c(p);if("error"in u)return u.error;try{r=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let y=n.hs.safeParse(r);if(!y.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:y.error.flatten()}},{status:400});let h=y.data;if(h.start_date&&h.end_date){let e=new Date(h.start_date),t=new Date(h.end_date);if(e>t)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"start_date must be before end_date"}},{status:400});let a=p.tenant.settings.retention_days??30,r=new Date;if(r.setDate(r.getDate()-a),e<r)return s.NextResponse.json({error:{code:"RETENTION_EXCEEDED",message:`Cannot replay events older than ${a} days. Your plan allows replay within the last ${a} days.`}},{status:400})}let v={};if(h.webhook_id&&(v.webhookId=h.webhook_id),h.event_type&&(v.eventType=h.event_type),h.status){let e=["failed","dead_letter"];if(!e.includes(h.status))return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:`Can only replay deliveries with status: ${e.join(", ")}`}},{status:400});v.status=h.status}else v.status="failed";h.start_date&&(v.startDate=new Date(h.start_date)),h.end_date&&(v.endDate=new Date(h.end_date));let I=await (0,o.y7)(p.tenantId,v);f.info({requestId:t,tenantId:p.tenantId,filter:v,queuedCount:I},"Batch replay queued");let m=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/replay",status_code:"202"},m/1e3),s.NextResponse.json({message:"Replay request accepted",data:{queued_count:I,filter:{webhook_id:v.webhookId??null,event_type:v.eventType??null,status:v.status??null,start_date:v.startDate?.toISOString()??null,end_date:v.endDate?.toISOString()??null}}},{status:202,headers:{...u.headers,"X-Request-Id":t}})}catch(r){f.error({error:r,requestId:t},"Failed to process replay request");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/replay",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}async function h(e){let t=(0,n.Yi)(),a=performance.now();(0,_.I9)();try{let r=await l(e);if("error"in r)return r.error;let{context:n}=r;if(!(0,i.MU)(n,"deliveries:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have deliveries:read scope"}},{status:403});let o=await c(n);if("error"in o)return o.error;let d=n.tenant.settings.retention_days??30,p=new Date;p.setDate(p.getDate()-d),f.debug({requestId:t,tenantId:n.tenantId},"Retrieved replay info");let u=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/replay",status_code:"200"},u/1e3),s.NextResponse.json({data:{enabled:n.tenant.settings.replay_enabled??!1,retention_days:d,oldest_replayable:p.toISOString(),allowed_statuses:["failed","dead_letter"],max_batch_size:1e3}},{status:200,headers:{...o.headers,"X-Request-Id":t}})}catch(r){f.error({error:r,requestId:t},"Failed to get replay info");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/replay",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>u,MU:()=>c,Qd:()=>I,bF:()=>E,jU:()=>m,r$:()=>_});var s=a(42439),n=a(99638),i=a(18500),o=a(63518),d=a(25665),p=e([n]);n=(p.then?(await p)():p)[0];let k="auth:apikey:",R="x-xrnotify-key",x=(0,o.YX)("api-key-auth");function _(e){let t=e[R]||e[R.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function u(e){if(!(0,s.aQ)(e))return x.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return l(t,e);let a=(0,s.Sr)(e),r=await (0,n.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(x,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(x,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let i={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,d.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},p={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await h(e,{apiKey:i,tenant:p}),l({apiKey:i,tenant:p},e)}function l(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(x,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(f(a.id).catch(e=>{x.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),x.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(x,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(x,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function c(e,t){return e.scopes.includes(t)}async function y(e){let t=`${k}${(0,s.Sr)(e)}`,a=await (0,i.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function h(e,t){let a=`${k}${(0,s.Sr)(e)}`;await (0,i.t8)(a,JSON.stringify(t),300)}async function v(e,t){let a=`${k}${t}`;await (0,i.IV)(a),x.debug({apiKeyId:e},"API key cache invalidated")}async function f(e){await (0,n.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function I(e,t,a,r){let{key:i,hash:o,prefix:p}=(0,s._4)(),_=await (0,n.pP)(`
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
  `,[e,t,o,p,a,r??null]);if(!_)throw Error("Failed to create API key");return x.info({apiKeyId:_.id,tenantId:e,name:t},"API key created"),{apiKey:{..._,scopes:(0,d.k)(_.scopes),last_used_at:_.last_used_at??void 0,expires_at:_.expires_at??void 0},rawKey:i}}async function m(e,t){let a=await (0,n.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await v(e,r),x.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function E(e){return(await (0,n.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},97530:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Kg:()=>p,Zl:()=>y,_m:()=>c,mj:()=>l,xr:()=>u,y7:()=>_});var s=a(42439),n=a(99638),i=a(18500),o=a(63518);a(97289),a(7842);var d=e([n]);n=(d.then?(await d)():d)[0];let f="stream:deliveries",I=(0,o.YX)("delivery-service");async function p(e){let t=await u(e);return!!t&&(await (0,n.IO)(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[e]),await (0,i.Ug)("stream:replay",{delivery_id:e,webhook_id:t.webhook_id,tenant_id:t.tenant_id,event_id:t.event_id,event_type:t.event_type,replay_requested_at:(0,s.i2)()}),I.info({deliveryId:e},"Delivery queued for replay"),!0)}async function _(e,t){let a=["tenant_id = $1"],r=[e],s=2;t.webhookId&&(a.push(`webhook_id = $${s}`),r.push(t.webhookId),s++),t.eventType&&(a.push(`event_type = $${s}`),r.push(t.eventType),s++),t.status&&(a.push(`status = $${s}`),r.push(t.status),s++),t.startDate&&(a.push(`created_at >= $${s}`),r.push(t.startDate),s++),t.endDate&&(a.push(`created_at <= $${s}`),r.push(t.endDate),s++);let i=a.join(" AND "),o=await (0,n.Kt)(`
    SELECT id FROM deliveries
    WHERE ${i}
    LIMIT 1000
  `,r),d=0;for(let e of o)await p(e.id)&&d++;return I.info({tenantId:e,filter:t,count:d},"Batch replay queued"),d}async function u(e){let t=await (0,n.pP)(`
    SELECT * FROM deliveries WHERE id = $1
  `,[e]);return t?h(t):null}async function l(e,t){let a=await (0,n.pP)(`
    SELECT * FROM deliveries 
    WHERE id = $1 AND tenant_id = $2
  `,[e,t]);if(!a)return null;let r=await (0,n.Kt)(`
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
  `,[e]);return{...h(a),attempts:r.map(v)}}async function c(e){let{tenantId:t,webhookId:a,eventType:r,status:s,startDate:i,endDate:o,limit:d=50,offset:p=0}=e,_=["tenant_id = $1"],u=[t],l=2;a&&(_.push(`webhook_id = $${l}`),u.push(a),l++),r&&(_.push(`event_type = $${l}`),u.push(r),l++),s&&(_.push(`status = $${l}`),u.push(s),l++),i&&(_.push(`created_at >= $${l}`),u.push(i),l++),o&&(_.push(`created_at <= $${l}`),u.push(o),l++);let c=_.join(" AND "),y=await (0,n.pP)(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${c}
  `,u),v=parseInt(y?.count??"0",10);return{deliveries:(await (0,n.Kt)(`
    SELECT * FROM deliveries
    WHERE ${c}
    ORDER BY created_at DESC
    LIMIT $${l} OFFSET $${l+1}
  `,[...u,d,p])).map(h),total:v}}async function y(e,t,a){let r=["tenant_id = $1"],s=[e],i=2;t&&(r.push(`created_at >= $${i}`),s.push(t),i++),a&&(r.push(`created_at <= $${i}`),s.push(a),i++);let o=r.join(" AND "),d=await (0,n.pP)(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${o}
  `,s),p=parseInt(d?.total??"0",10),_=parseInt(d?.delivered??"0",10),u=parseInt(d?.failed??"0",10),l=parseInt(d?.pending??"0",10),c=parseInt(d?.retrying??"0",10);return{total:p,delivered:_,failed:u,pending:l,retrying:c,successRate:p>0?_/p*100:0}}function h(e){return{id:e.id,webhook_id:e.webhook_id,tenant_id:e.tenant_id,event_id:e.event_id,event_type:e.event_type,payload:"string"==typeof e.payload?JSON.parse(e.payload):e.payload,url:e.url,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,error_code:e.error_code??void 0,error_message:e.error_message??void 0,next_retry_at:e.next_retry_at??void 0,delivered_at:e.delivered_at??void 0,created_at:e.created_at,updated_at:e.updated_at}}function v(e){return{attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}}r()}catch(e){r(e)}})},25665:(e,t,a)=>{a.d(t,{k:()=>r});function r(e){if(Array.isArray(e))return e;if("string"==typeof e)try{return JSON.parse(e)}catch{}return[]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,207,3591,9638,9469,9801],()=>a(35968));module.exports=r})();