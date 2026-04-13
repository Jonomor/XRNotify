"use strict";(()=>{var e={};e.id=3435,e.ids=[3435],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},74932:e=>{e.exports=require("dns/promises")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},6328:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>u,requestAsyncStorage:()=>_,routeModule:()=>c,serverHooks:()=>l,staticGenerationAsyncStorage:()=>p});var r=a(46498),i=a(98498),n=a(90929),o=a(45068),d=e([o]);o=(d.then?(await d)():d)[0];let c=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/webhooks/route",pathname:"/api/v1/webhooks",filename:"route",bundlePath:"app/api/v1/webhooks/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/webhooks/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:_,staticGenerationAsyncStorage:p,serverHooks:l}=c,y="/api/v1/webhooks/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:p})}s()}catch(e){s(e)}})},45068:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{GET:()=>f,POST:()=>h,dynamic:()=>w});var r=a(34753),i=a(42439),n=a(18473),o=a(42609),d=a(52281),u=a(78045),c=a(63518),_=a(97289),p=e([n,o,d]);[n,o,d]=p.then?(await p)():p;let w="force-dynamic",I=(0,c.YX)("webhooks-api");async function l(e){let t=await (0,o.y_)();if(t)return t.tenant.is_active?{tenantId:t.tenantId,tenantSettings:t.tenant.settings}:{error:r.NextResponse.json({error:{code:"ACCOUNT_INACTIVE",message:"Your account is inactive."}},{status:403})};let a=Object.fromEntries(e.headers.entries()),s=(0,n.r$)(a);if(!s)return(0,c.oy)(I,"auth_failed",{reason:"Missing API key"}),{error:r.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Log in or provide X-XRNotify-Key header."}},{status:401})};let i=await (0,n.Gw)(s);return i.valid&&i.context?{tenantId:i.context.tenantId,apiContext:i.context}:{error:r.NextResponse.json({error:{code:"UNAUTHORIZED",message:i.error??"Invalid API key"}},{status:401})}}async function y(e){let{allowed:t,headers:a,retryAfter:s}=await (0,u.Dn)(e);return t?{allowed:!0,headers:a}:((0,c.oy)(I,"rate_limited",{tenantId:e}),{error:r.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(s??60)}})})}async function f(e){let t=(0,i.Yi)(),a=performance.now();(0,_.I9)();try{let s=await l(e);if("error"in s)return s.error;let{tenantId:o,apiContext:u}=s;if(u&&!(0,n.MU)(u,"webhooks:read"))return r.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:read scope"}},{status:403});let c=await y(o);if("error"in c)return c.error;let p=new URL(e.url),f={limit:p.searchParams.get("limit"),offset:p.searchParams.get("offset"),is_active:p.searchParams.get("is_active"),event_types:p.searchParams.getAll("event_types")},h=i.PX.safeParse({limit:f.limit?parseInt(f.limit,10):void 0,offset:f.offset?parseInt(f.offset,10):void 0,is_active:"true"===f.is_active||"false"!==f.is_active&&void 0,event_types:f.event_types.length>0?f.event_types:void 0});if(!h.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid query parameters",details:h.error.flatten()}},{status:400});let w=h.data,{webhooks:k,total:m}=await (0,d.bB)({tenantId:o,isActive:w.is_active,eventTypes:w.event_type?[w.event_type]:void 0,limit:w.per_page,offset:(w.page-1)*w.per_page});I.info({requestId:t,tenantId:o,count:k.length,total:m},"Listed webhooks");let x=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/webhooks",status_code:"200"},x/1e3),r.NextResponse.json({data:k,meta:{total:m,page:w.page,per_page:w.per_page}},{status:200,headers:{...c.headers,"X-Request-Id":t}})}catch(s){I.error({error:s,requestId:t},"Failed to list webhooks");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/webhooks",status_code:"500"},e/1e3),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}async function h(e){let t=(0,i.Yi)(),a=performance.now();(0,_.I9)();try{let s;let o=await l(e);if("error"in o)return o.error;let{tenantId:u,tenantSettings:c,apiContext:p}=o;if(p&&!(0,n.MU)(p,"webhooks:write"))return r.NextResponse.json({error:{code:"FORBIDDEN",message:"API key does not have webhooks:write scope"}},{status:403});let f=await y(u);if("error"in f)return f.error;let h=(p?.tenant.settings??c??{}).max_webhooks??1,{total:w}=await (0,d.bB)({tenantId:u,limit:1});if(w>=h)return r.NextResponse.json({error:{code:"LIMIT_EXCEEDED",message:`Webhook limit reached (${h}). Upgrade your plan for more webhooks.`}},{status:403});try{s=await e.json()}catch{return r.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let k=i.HO.safeParse(s);if(!k.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:k.error.flatten()}},{status:400});let m=k.data,x=await (0,d.tr)(u,m);I.info({requestId:t,tenantId:u,webhookId:x.id,url:function(e){try{let t=new URL(e);return`${t.protocol}//${t.host}/***`}catch{return"[invalid-url]"}}(x.url)},"Webhook created");let v=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/webhooks",status_code:"201"},v/1e3),r.NextResponse.json({data:x,message:"Webhook created successfully. Save the secret - it will not be shown again."},{status:201,headers:{...f.headers,"X-Request-Id":t,Location:`/api/v1/webhooks/${x.id}`}})}catch(s){let e=Math.round(performance.now()-a);if(s instanceof d.jD)return I.warn({error:s.message,code:s.code,requestId:t},"Webhook validation failed"),(0,_.bd)({method:"POST",route:"/api/v1/webhooks",status_code:"400"},e/1e3),r.NextResponse.json({error:{code:s.code,message:s.message}},{status:400,headers:{"X-Request-Id":t}});return I.error({error:s,requestId:t},"Failed to create webhook"),(0,_.bd)({method:"POST",route:"/api/v1/webhooks",status_code:"500"},e/1e3),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}s()}catch(e){s(e)}})},18473:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Gw:()=>_,MU:()=>l,Qd:()=>I,bF:()=>m,jU:()=>k,r$:()=>c});var r=a(42439),i=a(99638),n=a(18500),o=a(63518),d=a(25665),u=e([i]);i=(u.then?(await u)():u)[0];let x="auth:apikey:",v="x-xrnotify-key",E=(0,o.YX)("api-key-auth");function c(e){let t=e[v]||e[v.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function _(e){if(!(0,r.aQ)(e))return E.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return p(t,e);let a=(0,r.Sr)(e),s=await (0,i.pP)(`
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
  `,[a]);if(!s)return(0,o.oy)(E,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,r.V8)(e,s.api_key_hash))return(0,o.oy)(E,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:s.api_key_id,tenant_id:s.tenant_id,name:s.api_key_name,key_hash:s.api_key_hash,key_prefix:s.api_key_prefix,scopes:(0,d.k)(s.api_key_scopes),last_used_at:s.api_key_last_used_at?.toISOString(),expires_at:s.api_key_expires_at?.toISOString(),is_active:s.api_key_is_active,created_at:s.api_key_created_at.toISOString(),updated_at:s.api_key_updated_at.toISOString()},u={id:s.tenant_id,name:s.tenant_name,email:s.tenant_email,plan:s.tenant_plan,is_active:s.tenant_is_active,stripe_customer_id:s.tenant_stripe_customer_id??void 0,stripe_subscription_id:s.tenant_stripe_subscription_id??void 0,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()};return await f(e,{apiKey:n,tenant:u}),p({apiKey:n,tenant:u},e)}function p(e,t){let{apiKey:a,tenant:s}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(E,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):s.is_active?(w(a.id).catch(e=>{E.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),E.debug({apiKeyId:a.id,tenantId:s.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:s.id,tenant:s,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(E,"auth_failed",{reason:"Tenant inactive",tenantId:s.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(E,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function l(e,t){return e.scopes.includes(t)}async function y(e){let t=`${x}${(0,r.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function f(e,t){let a=`${x}${(0,r.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function h(e,t){let a=`${x}${t}`;await (0,n.IV)(a),E.debug({apiKeyId:e},"API key cache invalidated")}async function w(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function I(e,t,a,s){let{key:n,hash:o,prefix:u}=(0,r._4)(),c=await (0,i.pP)(`
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
  `,[e,t,o,u,a,s??null]);if(!c)throw Error("Failed to create API key");return E.info({apiKeyId:c.id,tenantId:e,name:t},"API key created"),{apiKey:{...c,scopes:(0,d.k)(c.scopes),last_used_at:c.last_used_at??void 0,expires_at:c.expires_at??void 0},rawKey:n}}async function k(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let s=a.rows[0]?.key_hash;return s&&await h(e,s),E.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function m(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}s()}catch(e){s(e)}})},42609:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Cp:()=>T,Rf:()=>O,Uj:()=>R,c_:()=>I,kS:()=>N,x4:()=>A,y_:()=>x});var r=a(84770),i=a(37681),n=a(80219),o=a(66059),d=a(78518),u=a(42439),c=a(7842),_=a(99638),p=a(18500),l=a(63518),y=e([_]);_=(y.then?(await y)():y)[0];let S="session:",b=(0,l.YX)("session-auth");function f(){let e=(0,c.iE)();return new TextEncoder().encode(e.session.secret)}async function h(e){let t=(0,c.iE)(),a=f();return await new i.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function w(e){try{let t=f(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return b.debug({error:e},"Token verification failed"),null}}async function I(e){return await (0,o.hash)(e,12)}async function k(e,t){return await (0,o.compare)(e,t)}async function m(e,t,a){let s=(0,c.iE)(),i=(0,u.Vj)(),n=new Date,o=new Date(n.getTime()+s.session.maxAgeMs),d={sid:i,tid:e.id,email:t,version:1},l=await h(d),y=(0,r.createHash)("sha256").update(l).digest("hex"),f={id:i,tenantId:e.id,email:t,tenant:e,createdAt:n.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${S}${i}`,JSON.stringify(f),Math.floor(s.session.maxAgeMs/1e3)),await (0,_.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[i,a,e.id,y,o]),b.info({sessionId:i,tenantId:e.id,email:t},"Session created"),{session:f,token:l}}async function x(){let e=(0,c.iE)(),t=await (0,d.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await v(a):null}async function v(e){let t=await w(e);if(!t)return null;let a=`${S}${t.sid}`,s=await (0,p.U2)(a);if(s)try{let e=JSON.parse(s);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let r=await (0,_.pP)(`
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
  `,[t.sid]);if(!r)return null;let i={id:r.session_id,tenantId:r.tenant_id,email:r.user_email,tenant:{id:r.tenant_id,name:r.tenant_name,email:r.user_email,plan:r.tenant_plan,is_active:r.tenant_is_active,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()},createdAt:r.session_created_at.toISOString(),expiresAt:r.session_expires_at.toISOString()};(0,c.iE)();let n=Math.floor((new Date(i.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,p.t8)(a,JSON.stringify(i),n),i}async function E(e){await (0,p.IV)(`${S}${e}`),await (0,_.IO)("DELETE FROM sessions WHERE id = $1",[e]),b.info({sessionId:e},"Session invalidated")}async function g(e){let t=await (0,_.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${S}${e.id}`);return b.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function A(e,t){let a=await (0,_.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,l.oy)(b,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,l.oy)(b,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await k(t,a.password_hash)){let t=a.failed_login_attempts+1,s=t>=5;return await (0,_.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,s?new Date(Date.now()+9e5):null,a.id]),(0,l.oy)(b,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:s}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,l.oy)(b,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let s=await (0,_.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!s||!s.is_active)return(0,l.oy)(b,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,_.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:r,token:i}=await m(s,a.email,a.id);return b.info({email:e,tenantId:s.id},"User logged in"),{success:!0,session:r,token:i}}async function N(){let e=await x();e&&await E(e.id);let t=(0,c.iE)();(await (0,d.cookies)()).delete(t.session.cookieName)}async function R(e){let t=(0,c.iE)();(await (0,d.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function O(){let e=(0,c.iE)();(await (0,d.cookies)()).delete(e.session.cookieName)}async function T(e,t,a){let s=await (0,_.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!s||!await k(t,s.password_hash))return!1;let r=await I(a);return await (0,_.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[r,e]),await g(s.tenant_id),b.info({userId:e},"Password changed"),!0}s()}catch(e){s(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[5584,1515,6298,4058,207,3591,9638,9469,9801,2281],()=>a(6328));module.exports=s})();