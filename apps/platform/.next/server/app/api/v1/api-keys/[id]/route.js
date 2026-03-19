"use strict";(()=>{var e={};e.id=60,e.ids=[60],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},79127:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>y,patchFetch:()=>u,requestAsyncStorage:()=>c,routeModule:()=>_,serverHooks:()=>l,staticGenerationAsyncStorage:()=>p});var s=a(46498),i=a(98498),n=a(90929),o=a(23802),d=e([o]);o=(d.then?(await d)():d)[0];let _=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/api-keys/[id]/route",pathname:"/api/v1/api-keys/[id]",filename:"route",bundlePath:"app/api/v1/api-keys/[id]/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/api-keys/[id]/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:c,staticGenerationAsyncStorage:p,serverHooks:l}=_,y="/api/v1/api-keys/[id]/route";function u(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:p})}r()}catch(e){r(e)}})},23802:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{DELETE:()=>k,GET:()=>f,PATCH:()=>I,dynamic:()=>x});var s=a(34753),i=a(42439),n=a(42609),o=a(18473),d=a(99638),u=a(78045),_=a(63518),c=a(97289),p=e([n,o,d]);[n,o,d]=p.then?(await p)():p;let x="force-dynamic",E=(0,_.YX)("api-key-api");async function l(){let e=await (0,n.y_)();return e?e.tenant.is_active?{tenantId:e.tenantId,email:e.email}:{error:s.NextResponse.json({error:{code:"ACCOUNT_INACTIVE",message:"Your account is inactive."}},{status:403})}:((0,_.oy)(E,"auth_failed",{reason:"No session"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Please log in."}},{status:401})})}async function y(e){let{allowed:t,headers:a,retryAfter:r}=await (0,u.Dn)(e);return t?{allowed:!0,headers:a}:((0,_.oy)(E,"rate_limited",{tenantId:e}),{error:s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429,headers:{...a,"Retry-After":String(r??60)}})})}async function f(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),n=performance.now();(0,c.I9)();try{let e=await l();if("error"in e)return e.error;let{tenantId:t}=e,i=await y(t);if("error"in i)return i.error;let o=await (0,d.pP)(`
      SELECT 
        id, tenant_id, name, key_prefix, scopes,
        last_used_at, expires_at, is_active,
        created_at, updated_at
      FROM api_keys
      WHERE id = $1 AND tenant_id = $2
    `,[a,t]);if(!o)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"API key not found"}},{status:404,headers:{"X-Request-Id":r}});E.debug({requestId:r,apiKeyId:a},"Retrieved API key");let u=Math.round(performance.now()-n);return(0,c.bd)({method:"GET",route:"/api/v1/api-keys/[id]",status_code:"200"},u/1e3),s.NextResponse.json({data:h(o)},{status:200,headers:{...i.headers,"X-Request-Id":r}})}catch(t){E.error({error:t,requestId:r,apiKeyId:a},"Failed to get API key");let e=Math.round(performance.now()-n);return(0,c.bd)({method:"GET",route:"/api/v1/api-keys/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,c.FJ)()}}async function I(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),n=performance.now();(0,c.I9)();try{let t;let o=await l();if("error"in o)return o.error;let{tenantId:u}=o,_=await y(u);if("error"in _)return _.error;try{t=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let p=i.cG.safeParse(t);if(!p.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:p.error.flatten()}},{status:400});let f=p.data;if(0===Object.keys(f).length)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"No fields to update"}},{status:400});let I=["updated_at = NOW()"],k=[],x=1;void 0!==f.name&&(I.push(`name = $${x}`),k.push(f.name),x++),void 0!==f.scopes&&(I.push(`scopes = $${x}`),k.push(f.scopes),x++),void 0!==f.is_active&&(I.push(`is_active = $${x}`),k.push(f.is_active),x++),k.push(a,u);let m=await (0,d.pP)(`
      UPDATE api_keys
      SET ${I.join(", ")}
      WHERE id = $${x} AND tenant_id = $${x+1}
      RETURNING 
        id, tenant_id, name, key_prefix, scopes,
        last_used_at, expires_at, is_active,
        created_at, updated_at
    `,k);if(!m)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"API key not found"}},{status:404,headers:{"X-Request-Id":r}});E.info({requestId:r,apiKeyId:a,updates:Object.keys(f)},"API key updated");let w=Math.round(performance.now()-n);return(0,c.bd)({method:"PATCH",route:"/api/v1/api-keys/[id]",status_code:"200"},w/1e3),s.NextResponse.json({data:h(m)},{status:200,headers:{..._.headers,"X-Request-Id":r}})}catch(t){E.error({error:t,requestId:r,apiKeyId:a},"Failed to update API key");let e=Math.round(performance.now()-n);return(0,c.bd)({method:"PATCH",route:"/api/v1/api-keys/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,c.FJ)()}}async function k(e,{params:t}){let{id:a}=await t,r=(0,i.Yi)(),n=performance.now();(0,c.I9)();try{let e=await l();if("error"in e)return e.error;let{tenantId:t}=e,i=await y(t);if("error"in i)return i.error;let d=await (0,o.bF)(t),u=d.filter(e=>e.is_active&&e.id!==a);if(0===u.length){let e=d.find(e=>e.id===a);if(e?.is_active)return s.NextResponse.json({error:{code:"LAST_KEY",message:"Cannot delete the last active API key. Create a new key first."}},{status:400})}if(!await (0,o.jU)(a,t))return s.NextResponse.json({error:{code:"NOT_FOUND",message:"API key not found"}},{status:404,headers:{"X-Request-Id":r}});E.info({requestId:r,apiKeyId:a},"API key revoked");let _=Math.round(performance.now()-n);return(0,c.bd)({method:"DELETE",route:"/api/v1/api-keys/[id]",status_code:"204"},_/1e3),new s.NextResponse(null,{status:204,headers:{...i.headers,"X-Request-Id":r}})}catch(t){E.error({error:t,requestId:r,apiKeyId:a},"Failed to delete API key");let e=Math.round(performance.now()-n);return(0,c.bd)({method:"DELETE",route:"/api/v1/api-keys/[id]",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":r}})}finally{(0,c.FJ)()}}function h(e){return{id:e.id,name:e.name,key_prefix:e.key_prefix,scopes:e.scopes,last_used_at:e.last_used_at?.toISOString()??null,expires_at:e.expires_at?.toISOString()??null,is_active:e.is_active,created_at:e.created_at.toISOString(),updated_at:e.updated_at.toISOString()}}r()}catch(e){r(e)}})},18473:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Gw:()=>_,MU:()=>p,Qd:()=>k,bF:()=>x,jU:()=>h,r$:()=>u});var s=a(42439),i=a(99638),n=a(18500),o=a(63518),d=e([i]);i=(d.then?(await d)():d)[0];let E="auth:apikey:",m="x-xrnotify-key",w=(0,o.YX)("api-key-auth");function u(e){let t=e[m]||e[m.toLowerCase()];if(t)return Array.isArray(t)?t[0]??null:t;let a=e.authorization||e.Authorization;if(a){let e=Array.isArray(a)?a[0]:a;if(e?.startsWith("Bearer "))return e.slice(7)}return null}async function _(e){if(!(0,s.aQ)(e))return w.debug("Invalid API key format"),{valid:!1,error:"Invalid API key format",errorCode:"INVALID_FORMAT"};let t=await l(e);if(t)return c(t,e);let a=(0,s.Sr)(e),r=await (0,i.pP)(`
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
  `,[a]);if(!r)return(0,o.oy)(w,"auth_failed",{reason:"API key not found"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};if(!(0,s.V8)(e,r.api_key_hash))return(0,o.oy)(w,"auth_failed",{reason:"API key hash mismatch"}),{valid:!1,error:"Invalid API key",errorCode:"NOT_FOUND"};let n={id:r.api_key_id,tenant_id:r.tenant_id,name:r.api_key_name,key_hash:r.api_key_hash,key_prefix:r.api_key_prefix,scopes:r.api_key_scopes,last_used_at:r.api_key_last_used_at?.toISOString(),expires_at:r.api_key_expires_at?.toISOString(),is_active:r.api_key_is_active,created_at:r.api_key_created_at.toISOString(),updated_at:r.api_key_updated_at.toISOString()},d={id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,stripe_customer_id:r.tenant_stripe_customer_id??void 0,stripe_subscription_id:r.tenant_stripe_subscription_id??void 0,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()};return await y(e,{apiKey:n,tenant:d}),c({apiKey:n,tenant:d},e)}function c(e,t){let{apiKey:a,tenant:r}=e;return a.is_active?a.expires_at&&new Date(a.expires_at)<new Date?((0,o.oy)(w,"auth_failed",{reason:"API key expired",apiKeyId:a.id}),{valid:!1,error:"API key has expired",errorCode:"EXPIRED"}):r.is_active?(I(a.id).catch(e=>{w.error({err:e,apiKeyId:a.id},"Failed to update API key last_used_at")}),w.debug({apiKeyId:a.id,tenantId:r.id,scopes:a.scopes},"API key validated"),{valid:!0,context:{tenantId:r.id,tenant:r,apiKeyId:a.id,apiKey:a,scopes:a.scopes}}):((0,o.oy)(w,"auth_failed",{reason:"Tenant inactive",tenantId:r.id}),{valid:!1,error:"Account is inactive",errorCode:"TENANT_INACTIVE"}):((0,o.oy)(w,"auth_failed",{reason:"API key inactive",apiKeyId:a.id}),{valid:!1,error:"API key is inactive",errorCode:"INACTIVE"})}function p(e,t){return e.scopes.includes(t)}async function l(e){let t=`${E}${(0,s.Sr)(e)}`,a=await (0,n.U2)(t);if(!a)return null;try{return JSON.parse(a)}catch{return null}}async function y(e,t){let a=`${E}${(0,s.Sr)(e)}`;await (0,n.t8)(a,JSON.stringify(t),300)}async function f(e,t){let a=`${E}${t}`;await (0,n.IV)(a),w.debug({apiKeyId:e},"API key cache invalidated")}async function I(e){await (0,i.IO)("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",[e],{log:!1})}async function k(e,t,a,r){let{key:n,hash:o,prefix:d}=(0,s._4)(),u=await (0,i.pP)(`
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
  `,[e,t,o,d,a,r??null]);if(!u)throw Error("Failed to create API key");return w.info({apiKeyId:u.id,tenantId:e,name:t},"API key created"),{apiKey:{...u,last_used_at:u.last_used_at??void 0,expires_at:u.expires_at??void 0},rawKey:n}}async function h(e,t){let a=await (0,i.IO)(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `,[e,t]);if(0===a.rowCount)return!1;let r=a.rows[0]?.key_hash;return r&&await f(e,r),w.info({apiKeyId:e,tenantId:t},"API key revoked"),!0}async function x(e){return(await (0,i.IO)(`
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
  `,[e])).rows.map(e=>({...e,key_hash:"[REDACTED]",last_used_at:e.last_used_at??void 0,expires_at:e.expires_at??void 0}))}r()}catch(e){r(e)}})},42609:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Cp:()=>g,Rf:()=>O,Uj:()=>R,kS:()=>N,x4:()=>v,y_:()=>E});var s=a(37681),i=a(80219),n=a(66059),o=a(78518),d=a(42439),u=a(7842),_=a(99638),c=a(18500),p=a(63518),l=e([_]);_=(l.then?(await l)():l)[0];let T="session:",S=(0,p.YX)("session-auth");function y(){let e=(0,u.iE)();return new TextEncoder().encode(e.session.secret)}async function f(e){let t=(0,u.iE)(),a=y();return await new s.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function I(e){try{let t=y(),{payload:a}=await (0,i._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return S.debug({error:e},"Token verification failed"),null}}async function k(e){return await (0,n.hash)(e,12)}async function h(e,t){return await (0,n.compare)(e,t)}async function x(e,t){let a=(0,u.iE)(),r=(0,d.Vj)(),s=new Date,i=new Date(s.getTime()+a.session.maxAgeMs),n={sid:r,tid:e.id,email:t,version:1},o=await f(n),p={id:r,tenantId:e.id,email:t,tenant:e,createdAt:s.toISOString(),expiresAt:i.toISOString()};return await (0,c.t8)(`${T}${r}`,JSON.stringify(p),Math.floor(a.session.maxAgeMs/1e3)),await (0,_.IO)(`
    INSERT INTO sessions (id, tenant_id, email, expires_at)
    VALUES ($1, $2, $3, $4)
  `,[r,e.id,t,i]),S.info({sessionId:r,tenantId:e.id,email:t},"Session created"),{session:p,token:o}}async function E(){let e=(0,u.iE)(),t=await (0,o.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await m(a):null}async function m(e){let t=await I(e);if(!t)return null;let a=`${T}${t.sid}`,r=await (0,c.U2)(a);if(r)try{let e=JSON.parse(r);if(new Date(e.expiresAt)<new Date)return await (0,c.IV)(a),null;return e}catch{await (0,c.IV)(a)}let s=await (0,_.pP)(`
    SELECT 
      s.id as session_id,
      s.email as session_email,
      s.expires_at as session_expires_at,
      s.created_at as session_created_at,
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.plan as tenant_plan,
      t.is_active as tenant_is_active,
      t.settings as tenant_settings,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM sessions s
    JOIN tenants t ON s.tenant_id = t.id
    WHERE s.id = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL
  `,[t.sid]);if(!s)return null;let i={id:s.session_id,tenantId:s.tenant_id,email:s.session_email,tenant:{id:s.tenant_id,name:s.tenant_name,email:s.tenant_email,plan:s.tenant_plan,is_active:s.tenant_is_active,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()},createdAt:s.session_created_at.toISOString(),expiresAt:s.session_expires_at.toISOString()};(0,u.iE)();let n=Math.floor((new Date(i.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,c.t8)(a,JSON.stringify(i),n),i}async function w(e){await (0,c.IV)(`${T}${e}`),await (0,_.IO)(`
    UPDATE sessions SET revoked_at = NOW() WHERE id = $1
  `,[e]),S.info({sessionId:e},"Session invalidated")}async function A(e){let t=await (0,_.IO)(`
    UPDATE sessions 
    SET revoked_at = NOW() 
    WHERE tenant_id = $1 AND revoked_at IS NULL
    RETURNING id
  `,[e]);for(let e of t.rows)await (0,c.IV)(`${T}${e.id}`);return S.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function v(e,t){let a=await (0,_.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,p.oy)(S,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,p.oy)(S,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await h(t,a.password_hash)){let t=a.failed_login_attempts+1,r=t>=5;return await (0,_.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,r?new Date(Date.now()+9e5):null,a.id]),(0,p.oy)(S,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:r}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,p.oy)(S,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let r=await (0,_.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!r||!r.is_active)return(0,p.oy)(S,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,_.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:s,token:i}=await x(r,a.email);return S.info({email:e,tenantId:r.id},"User logged in"),{success:!0,session:s,token:i}}async function N(){let e=await E();e&&await w(e.id);let t=(0,u.iE)();(await (0,o.cookies)()).delete(t.session.cookieName)}async function R(e){let t=(0,u.iE)();(await (0,o.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function O(){let e=(0,u.iE)();(await (0,o.cookies)()).delete(e.session.cookieName)}async function g(e,t,a){let r=await (0,_.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!r||!await h(t,r.password_hash))return!1;let s=await k(a);return await (0,_.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[s,e]),await A(r.tenant_id),S.info({userId:e},"Password changed"),!0}r()}catch(e){r(e)}})}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[584,808,298,591,207,58,638,469,801],()=>a(79127));module.exports=r})();