"use strict";(()=>{var e={};e.id=7441,e.ids=[7441],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},16636:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>u,requestAsyncStorage:()=>c,routeModule:()=>_,serverHooks:()=>l,staticGenerationAsyncStorage:()=>p});var s=a(46498),i=a(98498),n=a(90929),o=a(31291),d=e([o]);o=(d.then?(await d)():d)[0];let _=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/api-keys/route",pathname:"/api/v1/api-keys",filename:"route",bundlePath:"app/api/v1/api-keys/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/api-keys/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:c,staticGenerationAsyncStorage:p,serverHooks:l}=_,y="/api/v1/api-keys/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:p})}r()}catch(e){r(e)}})},31291:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>f,POST:()=>k,dynamic:()=>h});var s=a(34753),i=a(42439),n=a(42609),o=a(18473),d=a(25665),u=a(78045),_=a(63518),c=a(97289),p=e([n,o]);[n,o]=p.then?(await p)():p;let h="force-dynamic",x=(0,_.YX)("api-keys-api");async function l(){let e=await (0,n.y_)();return e?e.tenant.is_active?{tenantId:e.tenantId,email:e.email}:{error:s.NextResponse.json({error:{code:"ACCOUNT_INACTIVE",message:"Your account is inactive."}},{status:403})}:((0,_.oy)(x,"auth_failed",{reason:"No session"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Please log in."}},{status:401})})}async function y(e){let{allowed:t,headers:a,retryAfter:r}=await (0,u.Dn)(e);return t?{allowed:!0,headers:a}:((0,_.oy)(x,"rate_limited",{tenantId:e}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function f(e){let t=(0,i.Yi)(),a=performance.now();(0,c.I9)();try{let e=await l();if("error"in e)return e.error;let{tenantId:r}=e,i=await y(r);if("error"in i)return i.error;let n=await (0,o.bF)(r);x.debug({requestId:t,tenantId:r,count:n.length},"Listed API keys");let d=Math.round(performance.now()-a);return(0,c.bd)({method:"GET",route:"/api/v1/api-keys",status_code:"200"},d/1e3),s.NextResponse.json({data:n.map(I),meta:{total:n.length}},{status:200,headers:{...i.headers,"X-Request-Id":t}})}catch(r){x.error({error:r,requestId:t},"Failed to list API keys");let e=Math.round(performance.now()-a);return(0,c.bd)({method:"GET",route:"/api/v1/api-keys",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,c.FJ)()}}async function k(e){let t=(0,i.Yi)(),a=performance.now();(0,c.I9)();try{let r;let n=await l();if("error"in n)return n.error;let{tenantId:d}=n,u=await y(d);if("error"in u)return u.error;if((await (0,o.bF)(d)).length>=10)return s.NextResponse.json({error:{code:"LIMIT_EXCEEDED",message:"API key limit reached (10). Delete unused keys to create new ones."}},{status:403});try{r=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let _=i.w5.safeParse(r);if(!_.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:_.error.flatten()}},{status:400});let p=_.data,{apiKey:f,rawKey:k}=await (0,o.Qd)(d,p.name,p.scopes,p.expires_at?new Date(p.expires_at):void 0);x.info({requestId:t,tenantId:d,apiKeyId:f.id,name:p.name,scopes:p.scopes},"API key created");let h=Math.round(performance.now()-a);return(0,c.bd)({method:"POST",route:"/api/v1/api-keys",status_code:"201"},h/1e3),s.NextResponse.json({data:{...I(f),key:k},message:"API key created successfully. Copy the key now - it will not be shown again."},{status:201,headers:{...u.headers,"X-Request-Id":t}})}catch(r){x.error({error:r,requestId:t},"Failed to create API key");let e=Math.round(performance.now()-a);return(0,c.bd)({method:"POST",route:"/api/v1/api-keys",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,c.FJ)()}}function I(e){return{id:e.id,name:e.name,key_prefix:e.key_prefix,scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at,expires_at:e.expires_at,is_active:e.is_active,created_at:e.created_at,updated_at:e.updated_at}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>c,MU:()=>l,Qd:()=>h,bF:()=>w,jU:()=>x,r$:()=>_});var s=a(42439),i=a(99638),n=a(18500),o=a(63518),d=a(25665),u=e([i]);i=(u.then?(await u)():u)[0];let m="auth:apikey:",E="x-xrnotify-key",A=(0,o.YX)("api-key-auth");function _(e){let t=e[E]||e[E.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function c(e){if(!(0,s.aQ)(e))return A.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await y(e);if(t)return p(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(A,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(A,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:(0,d.k)(r.api_key_scopes),last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},u={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await f(e,{apiKey:n,tenant:u}),p({apiKey:n,tenant:u},e)}function p(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(A,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(I(a.id).catch(e=>{A.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),A.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(A,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(A,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function l(e,t){return e.scopes.includes(t)}async function y(e){let t=`${m}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function f(e,t){let a=`${m}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function k(e,t){let a=`${m}${t}`;await (0,n.IV)(a),A.debug({apiKeyId:e},"API key cache invalidated")}async function I(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function h(e,t,a,r){let{key:n,hash:o,prefix:u}=(0,s._4)(),_=await (0,i.pP)(`
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
  `,[e,t,o,u,a,r??null]);if(!_)throw Error("Failed to create API key");return A.info({apiKeyId:_.id,tenantId:e,name:t},"API key created"),{apiKey:{..._,scopes:(0,d.k)(_.scopes),last_used_at:_.last_used_at??void 0,expires_at:_.expires_at??void 0},rawKey:n}}async function x(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await k(e,r),A.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function w(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",scopes:(0,d.k)(e.scopes),last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},42609:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Cp:()=>S,Rf:()=>R,Uj:()=>O,c_:()=>h,kS:()=>N,x4:()=>g,y_:()=>m});var s=a(84770),i=a(37681),n=a(80219),o=a(66059),d=a(78518),u=a(42439),_=a(7842),c=a(99638),p=a(18500),l=a(63518),y=e([c]);c=(y.then?(await y)():y)[0];let T="session:",P=(0,l.YX)("session-auth");function f(){let e=(0,_.iE)();return new TextEncoder().encode(e.session.secret)}async function k(e){let t=(0,_.iE)(),a=f();return await new i.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function I(e){try{let t=f(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return P.debug({error:e},"Token verification failed"),null}}async function h(e){return await (0,o.hash)(e,12)}async function x(e,t){return await (0,o.compare)(e,t)}async function w(e,t,a){let r=(0,_.iE)(),i=(0,u.Vj)(),n=new Date,o=new Date(n.getTime()+r.session.maxAgeMs),d={sid:i,tid:e.id,email:t,version:1},l=await k(d),y=(0,s.createHash)("sha256").update(l).digest("hex"),f={id:i,tenantId:e.id,email:t,tenant:e,createdAt:n.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${T}${i}`,JSON.stringify(f),Math.floor(r.session.maxAgeMs/1e3)),await (0,c.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[i,a,e.id,y,o]),P.info({sessionId:i,tenantId:e.id,email:t},"Session created"),{session:f,token:l}}async function m(){let e=(0,_.iE)(),t=await (0,d.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await E(a):null}async function E(e){let t=await I(e);if(!t)return null;let a=`${T}${t.sid}`,r=await (0,p.U2)(a);if(r)try{let e=JSON.parse(r);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let s=await (0,c.pP)(`
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
  `,[t.sid]);if(!s)return null;let i={id:s.session_id,tenantId:s.tenant_id,email:s.user_email,tenant:{id:s.tenant_id,name:s.tenant_name,email:s.user_email,plan:s.tenant_plan,is_active:s.tenant_is_active,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()},createdAt:s.session_created_at.toISOString(),expiresAt:s.session_expires_at.toISOString()};(0,_.iE)();let n=Math.floor((new Date(i.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,p.t8)(a,JSON.stringify(i),n),i}async function A(e){await (0,p.IV)(`${T}${e}`),await (0,c.IO)("DELETE FROM sessions WHERE id = $1",[e]),P.info({sessionId:e},"Session invalidated")}async function v(e){let t=await (0,c.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${T}${e.id}`);return P.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function g(e,t){let a=await (0,c.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,l.oy)(P,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,l.oy)(P,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await x(t,a.password_hash)){let t=a.failed_login_attempts+1,r=t>=5;return await (0,c.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,r?new Date(Date.now()+9e5):null,a.id]),(0,l.oy)(P,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:r}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,l.oy)(P,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let r=await (0,c.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!r||!r.is_active)return(0,l.oy)(P,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,c.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:s,token:i}=await w(r,a.email,a.id);return P.info({email:e,tenantId:r.id},"User logged in"),{success:!0,session:s,token:i}}async function N(){let e=await m();e&&await A(e.id);let t=(0,_.iE)();(await (0,d.cookies)()).delete(t.session.cookieName)}async function O(e){let t=(0,_.iE)();(await (0,d.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function R(){let e=(0,_.iE)();(await (0,d.cookies)()).delete(e.session.cookieName)}async function S(e,t,a){let r=await (0,c.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!r||!await x(t,r.password_hash))return!1;let s=await h(a);return await (0,c.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[s,e]),await v(r.tenant_id),P.info({userId:e},"Password changed"),!0}r()}catch(e){r(e)}})},25665:(e,t,a)=>{a.d(t,{k:()=>r});function r(e){if(Array.isArray(e))return e;if("string"==typeof e)try{return JSON.parse(e)}catch{}return[]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,4058,207,3591,9638,9469,9801],()=>a(16636));module.exports=r})();