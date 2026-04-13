"use strict";(()=>{var e={};e.id=9318,e.ids=[9318],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},74932:e=>{e.exports=require("dns/promises")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},1243:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>h,patchFetch:()=>u,requestAsyncStorage:()=>_,routeModule:()=>c,serverHooks:()=>l,staticGenerationAsyncStorage:()=>p});var s=a(46498),i=a(98498),n=a(90929),o=a(65796),d=e([o]);o=(d.then?(await d)():d)[0];let c=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/webhooks/[id]/route",pathname:"/api/v1/webhooks/[id]",filename:"route",bundlePath:"app/api/v1/webhooks/[id]/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/webhooks/[id]/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:_,staticGenerationAsyncStorage:p,serverHooks:l}=c,h="/api/v1/webhooks/[id]/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:p})}r()}catch(e){r(e)}})},65796:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{DELETE:()=>w,GET:()=>y,PATCH:()=>f,POST:()=>k,dynamic:()=>I});var s=a(34753),i=a(42439),n=a(18473),o=a(42609),d=a(52281),u=a(78045),c=a(63518),_=a(97289),p=e([n,o,d]);[n,o,d]=p.then?(await p)():p;let I="force-dynamic",x=(0,c.YX)("webhook-api");async function l(e){let t=await (0,o.y_)();if(t)return t.tenant.is_active?{tenantId:t.tenantId}:{error:s.NextResponse.json({error:{code:"ACCOUNT_INACTIVE",message:"Your account is inactive."}},{status:403})};let a=Object.fromEntries(e.headers.entries()),r=(0,n.r$)(a);if(!r)return(0,c.oy)(x,"auth_failed",{reason:"No session or API key"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Log in or provide X-XRNotify-Key header."}},{status:401})};let i=await (0,n.Gw)(r);return i.valid&&i.context?{tenantId:i.context.tenantId,apiContext:i.context}:{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:i.error??"Invalid API key"}},{status:401})}}async function h(e){let{allowed:t,headers:a,retryAfter:r}=await (0,u.Dn)(e);return t?{allowed:!0,headers:a}:((0,c.oy)(x,"rate_limited",{tenantId:e}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function y(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),o=performance.now();(0,_.I9)();try{let t=await l(e);if("error"in t)return t.error;let{tenantId:i,apiContext:u}=t;if(u&&!(0,n.MU)(u,"webhooks:read"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:read scope"}},{status:403});let c=await h(i);if("error"in c)return c.error;let p=await (0,d.zt)(a,i);if(!p)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":r}});x.debug({requestId:r,webhookId:a},"Retrieved webhook");let y=Math.round(performance.now()-o);return(0,_.bd)({method:"GET",route:"/api/v1/webhooks/[id]",status_code:"200"},y/1e3),s.NextResponse.json({data:p},{status:200,headers:{...c.headers,"X-Request-Id":r}})}catch(t){x.error({error:t,requestId:r,webhookId:a},"Failed to get webhook");let e=Math.round(performance.now()-o);return(0,_.bd)({method:"GET",route:"/api/v1/webhooks/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}async function f(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),o=performance.now();(0,_.I9)();try{let t;let u=await l(e);if("error"in u)return u.error;let{tenantId:c,apiContext:p}=u;if(p&&!(0,n.MU)(p,"webhooks:write"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});let y=await h(c);if("error"in y)return y.error;try{t=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let f=i.km.safeParse(t);if(!f.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body: "+f.error.issues.map(e=>e.message).join(", "),details:f.error.flatten()}},{status:400});let w=f.data;if(0===Object.keys(w).length)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"No fields to update"}},{status:400});let k=await (0,d.$1)(a,c,w);if(!k)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":r}});x.info({requestId:r,webhookId:a},"Webhook updated");let I=Math.round(performance.now()-o);return(0,_.bd)({method:"PATCH",route:"/api/v1/webhooks/[id]",status_code:"200"},I/1e3),s.NextResponse.json({data:k},{status:200,headers:{...y.headers,"X-Request-Id":r}})}catch(t){let e=Math.round(performance.now()-o);if(t instanceof d.jD)return x.warn({error:t.message,code:t.code,requestId:r,webhookId:a},"Webhook update validation failed"),(0,_.bd)({method:"PATCH",route:"/api/v1/webhooks/[id]",status_code:"400"},e/1e3),s.NextResponse.json({error:{code:t.code,message:t.message}},{status:400,headers:{"X-Request-Id":r}});return x.error({error:t,requestId:r,webhookId:a},"Failed to update webhook"),(0,_.bd)({method:"PATCH",route:"/api/v1/webhooks/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}async function w(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),o=performance.now();(0,_.I9)();try{let t=await l(e);if("error"in t)return t.error;let{tenantId:i,apiContext:u}=t;if(u&&!(0,n.MU)(u,"webhooks:write"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});let c=await h(i);if("error"in c)return c.error;if(!await (0,d.N)(a,i))return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":r}});x.info({requestId:r,webhookId:a},"Webhook deleted");let p=Math.round(performance.now()-o);return(0,_.bd)({method:"DELETE",route:"/api/v1/webhooks/[id]",status_code:"204"},p/1e3),new s.NextResponse(null,{status:204,headers:{...c.headers,"X-Request-Id":r}})}catch(t){x.error({error:t,requestId:r,webhookId:a},"Failed to delete webhook");let e=Math.round(performance.now()-o);return(0,_.bd)({method:"DELETE",route:"/api/v1/webhooks/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}async function k(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),o=performance.now();(0,_.I9)();try{let t=new URL(e.url).searchParams.get("action");if("rotate-secret"!==t)return s.NextResponse.json({error:{code:"BAD_REQUEST",message:"Invalid action. Use ?action=rotate-secret"}},{status:400});let i=await l(e);if("error"in i)return i.error;let{tenantId:u,apiContext:c}=i;if(c&&!(0,n.MU)(c,"webhooks:write"))return s.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});let p=await h(u);if("error"in p)return p.error;let y=await (0,d.m2)(a,u);if(!y)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Webhook not found"}},{status:404,headers:{"X-Request-Id":r}});x.info({requestId:r,webhookId:a},"Webhook secret rotated");let f=Math.round(performance.now()-o);return(0,_.bd)({method:"POST",route:"/api/v1/webhooks/[id]",status_code:"200"},f/1e3),s.NextResponse.json({data:{secret:y.secret},message:"Secret rotated successfully. Save the new secret - it will not be shown again."},{status:200,headers:{...p.headers,"X-Request-Id":r}})}catch(t){x.error({error:t,requestId:r,webhookId:a},"Failed to rotate webhook secret");let e=Math.round(performance.now()-o);return(0,_.bd)({method:"POST",route:"/api/v1/webhooks/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,_.FJ)()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>_,MU:()=>l,Qd:()=>k,bF:()=>x,jU:()=>I,r$:()=>c});var s=a(42439),i=a(99638),n=a(18500),o=a(63518),d=a(25665),u=e([i]);i=(u.then?(await u)():u)[0];let m="auth:apikey:",E="x-xrnotify-key",R=(0,o.YX)("api-key-auth");function c(e){let t=e[E]||e[E.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function _(e){if(!(0,s.aQ)(e))return R.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await h(e);if(t)return p(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(R,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(R,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,d.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},u={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await y(e,{apiKey:n,tenant:u}),p({apiKey:n,tenant:u},e)}function p(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(R,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(w(a.id).catch(e=>{R.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),R.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(R,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(R,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function l(e,t){return e.scopes.includes(t)}async function h(e){let t=`${m}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function y(e,t){let a=`${m}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function f(e,t){let a=`${m}${t}`;await (0,n.IV)(a),R.debug({apiKeyId:e},"API key cache invalidated")}async function w(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function k(e,t,a,r){let{key:n,hash:o,prefix:u}=(0,s._4)(),c=await (0,i.pP)(`
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
  `,[e,t,o,u,a,r??null]);if(!c)throw Error("Failed to create API key");return R.info({apiKeyId:c.id,tenantId:e,name:t},"API key created"),{apiKey:{...c,scopes:(0,d.k)(c.scopes),last_used_at:c.last_used_at??void 0,expires_at:c.expires_at??void 0},rawKey:n}}async function I(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await f(e,r),R.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function x(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},42609:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Cp:()=>T,Rf:()=>O,Uj:()=>g,c_:()=>k,kS:()=>v,x4:()=>A,y_:()=>m});var s=a(84770),i=a(37681),n=a(80219),o=a(66059),d=a(78518),u=a(42439),c=a(7842),_=a(99638),p=a(18500),l=a(63518),h=e([_]);_=(h.then?(await h)():h)[0];let b="session:",S=(0,l.YX)("session-auth");function y(){let e=(0,c.iE)();return new TextEncoder().encode(e.session.secret)}async function f(e){let t=(0,c.iE)(),a=y();return await new i.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function w(e){try{let t=y(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return S.debug({error:e},"Token verification failed"),null}}async function k(e){return await (0,o.hash)(e,12)}async function I(e,t){return await (0,o.compare)(e,t)}async function x(e,t,a){let r=(0,c.iE)(),i=(0,u.Vj)(),n=new Date,o=new Date(n.getTime()+r.session.maxAgeMs),d={sid:i,tid:e.id,email:t,version:1},l=await f(d),h=(0,s.createHash)("sha256").update(l).digest("hex"),y={id:i,tenantId:e.id,email:t,tenant:e,createdAt:n.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${b}${i}`,JSON.stringify(y),Math.floor(r.session.maxAgeMs/1e3)),await (0,_.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[i,a,e.id,h,o]),S.info({sessionId:i,tenantId:e.id,email:t},"Session created"),{session:y,token:l}}async function m(){let e=(0,c.iE)(),t=await (0,d.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await E(a):null}async function E(e){let t=await w(e);if(!t)return null;let a=`${b}${t.sid}`,r=await (0,p.U2)(a);if(r)try{let e=JSON.parse(r);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let s=await (0,_.pP)(`
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
  `,[t.sid]);if(!s)return null;let i={id:s.session_id,tenantId:s.tenant_id,email:s.user_email,tenant:{id:s.tenant_id,name:s.tenant_name,email:s.user_email,plan:s.tenant_plan,is_active:s.tenant_is_active,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()},createdAt:s.session_created_at.toISOString(),expiresAt:s.session_expires_at.toISOString()};(0,c.iE)();let n=Math.floor((new Date(i.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,p.t8)(a,JSON.stringify(i),n),i}async function R(e){await (0,p.IV)(`${b}${e}`),await (0,_.IO)("DELETE FROM sessions WHERE id = $1",[e]),S.info({sessionId:e},"Session invalidated")}async function N(e){let t=await (0,_.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${b}${e.id}`);return S.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function A(e,t){let a=await (0,_.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,l.oy)(S,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,l.oy)(S,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await I(t,a.password_hash)){let t=a.failed_login_attempts+1,r=t>=5;return await (0,_.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,r?new Date(Date.now()+9e5):null,a.id]),(0,l.oy)(S,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:r}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,l.oy)(S,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let r=await (0,_.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!r||!r.is_active)return(0,l.oy)(S,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,_.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:s,token:i}=await x(r,a.email,a.id);return S.info({email:e,tenantId:r.id},"User logged in"),{success:!0,session:s,token:i}}async function v(){let e=await m();e&&await R(e.id);let t=(0,c.iE)();(await (0,d.cookies)()).delete(t.session.cookieName)}async function g(e){let t=(0,c.iE)();(await (0,d.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function O(){let e=(0,c.iE)();(await (0,d.cookies)()).delete(e.session.cookieName)}async function T(e,t,a){let r=await (0,_.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!r||!await I(t,r.password_hash))return!1;let s=await k(a);return await (0,_.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[s,e]),await N(r.tenant_id),S.info({userId:e},"Password changed"),!0}r()}catch(e){r(e)}})}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,4058,207,3591,9638,9469,9801,2281],()=>a(1243));module.exports=r})();