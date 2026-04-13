"use strict";(()=>{var e={};e.id=8613,e.ids=[8613],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},89508:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{originalPathname:()=>f,patchFetch:()=>d,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>_,staticGenerationAsyncStorage:()=>p});var r=a(46498),i=a(98498),n=a(90929),o=a(17252),u=e([o]);o=(u.then?(await u)():u)[0];let c=new r.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/v1/auth/register/route",pathname:"/api/v1/auth/register",filename:"route",bundlePath:"app/api/v1/auth/register/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/auth/register/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:l,staticGenerationAsyncStorage:p,serverHooks:_}=c,f="/api/v1/auth/register/route";function d(){return(0,n.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:p})}s()}catch(e){s(e)}})},17252:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{POST:()=>c,dynamic:()=>l});var r=a(34753),i=a(42439),n=a(99638),o=a(42609),u=a(63518),d=e([n,o]);[n,o]=d.then?(await d)():d;let l="force-dynamic",p=(0,u.YX)("auth-register");async function c(e){let t;try{t=await e.json()}catch{return r.NextResponse.json({success:!1,error:"Request body must be valid JSON"},{status:400})}let a=i.gY.safeParse(t);if(!a.success){let e={},t=a.error.flatten();for(let[a,s]of Object.entries(t.fieldErrors))s?.[0]&&(e[a]=s[0]);return r.NextResponse.json({success:!1,error:"Validation failed",errors:e},{status:400})}let{name:s,email:d,password:c}=a.data,l=t,_="string"==typeof l.company?l.company:void 0,f=d.toLowerCase();if(await (0,n.pP)("SELECT id FROM users WHERE email = $1",[f]))return r.NextResponse.json({success:!1,error:"An account with this email already exists",errors:{email:"An account with this email already exists"}},{status:409});let w=await (0,o.c_)(c),x=_?.trim()||s.trim(),m=await (0,n.pP)(`INSERT INTO tenants (name, plan, events_per_month, webhook_limit)
     VALUES ($1, 'free', 500, 1)
     RETURNING id`,[x]);if(!m)return p.error({email:f},"Failed to create tenant during registration"),r.NextResponse.json({success:!1,error:"Registration failed. Please try again."},{status:500});let E=await (0,n.pP)(`INSERT INTO users (tenant_id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,[m.id,f,w,s.trim()]);return E?((0,u.oy)(p,"login_success",{userId:E.id,tenantId:m.id,email:f}),p.info({userId:E.id,tenantId:m.id,email:f},"User registered"),r.NextResponse.json({success:!0},{status:201})):(p.error({tenantId:m.id,email:f},"Failed to create user during registration"),r.NextResponse.json({success:!1,error:"Registration failed. Please try again."},{status:500}))}s()}catch(e){s(e)}})},42609:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Cp:()=>T,Rf:()=>v,Uj:()=>S,c_:()=>E,kS:()=>R,x4:()=>A,y_:()=>y});var r=a(84770),i=a(37681),n=a(80219),o=a(66059),u=a(78518),d=a(42439),c=a(7842),l=a(99638),p=a(18500),_=a(63518),f=e([l]);l=(f.then?(await f)():f)[0];let q="session:",$=(0,_.YX)("session-auth");function w(){let e=(0,c.iE)();return new TextEncoder().encode(e.session.secret)}async function x(e){let t=(0,c.iE)(),a=w();return await new i.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function m(e){try{let t=w(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return $.debug({error:e},"Token verification failed"),null}}async function E(e){return await (0,o.hash)(e,12)}async function g(e,t){return await (0,o.compare)(e,t)}async function h(e,t,a){let s=(0,c.iE)(),i=(0,d.Vj)(),n=new Date,o=new Date(n.getTime()+s.session.maxAgeMs),u={sid:i,tid:e.id,email:t,version:1},_=await x(u),f=(0,r.createHash)("sha256").update(_).digest("hex"),w={id:i,tenantId:e.id,email:t,tenant:e,createdAt:n.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${q}${i}`,JSON.stringify(w),Math.floor(s.session.maxAgeMs/1e3)),await (0,l.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[i,a,e.id,f,o]),$.info({sessionId:i,tenantId:e.id,email:t},"Session created"),{session:w,token:_}}async function y(){let e=(0,c.iE)(),t=await (0,u.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await I(a):null}async function I(e){let t=await m(e);if(!t)return null;let a=`${q}${t.sid}`,s=await (0,p.U2)(a);if(s)try{let e=JSON.parse(s);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let r=await (0,l.pP)(`
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
  `,[t.sid]);if(!r)return null;let i={id:r.session_id,tenantId:r.tenant_id,email:r.user_email,tenant:{id:r.tenant_id,name:r.tenant_name,email:r.user_email,plan:r.tenant_plan,is_active:r.tenant_is_active,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()},createdAt:r.session_created_at.toISOString(),expiresAt:r.session_expires_at.toISOString()};(0,c.iE)();let n=Math.floor((new Date(i.expiresAt).getTime()-Date.now())/1e3);return n>0&&await (0,p.t8)(a,JSON.stringify(i),n),i}async function N(e){await (0,p.IV)(`${q}${e}`),await (0,l.IO)("DELETE FROM sessions WHERE id = $1",[e]),$.info({sessionId:e},"Session invalidated")}async function O(e){let t=await (0,l.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${q}${e.id}`);return $.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function A(e,t){let a=await (0,l.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,_.oy)($,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,_.oy)($,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await g(t,a.password_hash)){let t=a.failed_login_attempts+1,s=t>=5;return await (0,l.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,s?new Date(Date.now()+9e5):null,a.id]),(0,_.oy)($,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:s}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,_.oy)($,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let s=await (0,l.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!s||!s.is_active)return(0,_.oy)($,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,l.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:r,token:i}=await h(s,a.email,a.id);return $.info({email:e,tenantId:s.id},"User logged in"),{success:!0,session:r,token:i}}async function R(){let e=await y();e&&await N(e.id);let t=(0,c.iE)();(await (0,u.cookies)()).delete(t.session.cookieName)}async function S(e){let t=(0,c.iE)();(await (0,u.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function v(){let e=(0,c.iE)();(await (0,u.cookies)()).delete(e.session.cookieName)}async function T(e,t,a){let s=await (0,l.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!s||!await g(t,s.password_hash))return!1;let r=await E(a);return await (0,l.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[r,e]),await O(s.tenant_id),$.info({userId:e},"Password changed"),!0}s()}catch(e){s(e)}})}};var t=require("../../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[5584,1515,6298,4058,207,9638,9469],()=>a(89508));module.exports=s})();