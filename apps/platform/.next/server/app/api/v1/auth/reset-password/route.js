"use strict";(()=>{var e={};e.id=7952,e.ids=[7952],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},17694:(e,t,s)=>{s.a(e,async(e,a)=>{try{s.r(t),s.d(t,{originalPathname:()=>w,patchFetch:()=>u,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>_,staticGenerationAsyncStorage:()=>l});var r=s(46498),n=s(98498),i=s(90929),o=s(35746),d=e([o]);o=(d.then?(await d)():d)[0];let c=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/v1/auth/reset-password/route",pathname:"/api/v1/auth/reset-password",filename:"route",bundlePath:"app/api/v1/auth/reset-password/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/auth/reset-password/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:_}=c,w="/api/v1/auth/reset-password/route";function u(){return(0,i.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:l})}a()}catch(e){a(e)}})},35746:(e,t,s)=>{s.a(e,async(e,a)=>{try{s.r(t),s.d(t,{POST:()=>l,PUT:()=>_,dynamic:()=>w});var r=s(34753),n=s(29010),i=s(84770),o=s.n(i),d=s(99638),u=s(63518),c=s(42609),p=e([d,c]);[d,c]=p.then?(await p)():p;let w="force-dynamic",E=(0,u.YX)("password-reset"),x=n.Ry({email:n.Z_().email()}),h=n.Ry({token:n.Z_().min(32),new_password:n.Z_().min(8).max(128)});async function l(e){try{let t;try{t=await e.json()}catch{return r.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let s=x.safeParse(t);if(!s.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid email address"}},{status:400});let{email:a}=s.data,n=a.toLowerCase().trim(),i=await (0,d.pP)(`
      SELECT id, tenant_id FROM users WHERE LOWER(email) = $1 AND is_active = true
    `,[n]);if(i){let e=o().randomBytes(32).toString("hex"),t=o().createHash("sha256").update(e).digest("hex"),s=new Date(Date.now()+36e5);await (0,d.ht)(`
        DELETE FROM password_reset_tokens WHERE user_id = $1
      `,[i.id]),await (0,d.ht)(`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,[i.id,t,s]),(0,u.oy)(E,"password_reset_requested",{userId:i.id,email:n})}return r.NextResponse.json({message:"If an account exists with that email, a password reset link has been sent."})}catch(e){return E.error({error:e},"Failed to process password reset request"),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500})}}async function _(e){try{let t;try{t=await e.json()}catch{return r.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let s=h.safeParse(t);if(!s.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request",details:s.error.flatten()}},{status:400});let{token:a,new_password:n}=s.data,i=o().createHash("sha256").update(a).digest("hex"),p=await (0,d.pP)(`
      SELECT user_id, expires_at FROM password_reset_tokens
      WHERE token_hash = $1
    `,[i]);if(!p)return(0,u.oy)(E,"password_reset_invalid_token",{}),r.NextResponse.json({error:{code:"INVALID_TOKEN",message:"Invalid or expired reset token."}},{status:400});if(new Date(p.expires_at)<new Date)return await (0,d.ht)("DELETE FROM password_reset_tokens WHERE token_hash = $1",[i]),r.NextResponse.json({error:{code:"TOKEN_EXPIRED",message:"Reset token has expired. Please request a new one."}},{status:400});let l=await (0,c.c_)(n);return await (0,d.ht)(`
      UPDATE users SET password_hash = $1, updated_at = NOW(), failed_login_attempts = 0, locked_until = NULL
      WHERE id = $2
    `,[l,p.user_id]),await (0,d.ht)("DELETE FROM password_reset_tokens WHERE user_id = $1",[p.user_id]),await (0,d.ht)("DELETE FROM sessions WHERE user_id = $1",[p.user_id]),(0,u.oy)(E,"password_reset_completed",{userId:p.user_id}),r.NextResponse.json({message:"Password has been reset successfully. Please sign in with your new password."})}catch(e){return E.error({error:e},"Failed to complete password reset"),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500})}}a()}catch(e){a(e)}})},42609:(e,t,s)=>{s.a(e,async(e,a)=>{try{s.d(t,{Cp:()=>v,Rf:()=>S,Uj:()=>T,c_:()=>m,kS:()=>A,x4:()=>O,y_:()=>y});var r=s(84770),n=s(37681),i=s(80219),o=s(66059),d=s(78518),u=s(42439),c=s(7842),p=s(99638),l=s(18500),_=s(63518),w=e([p]);p=(w.then?(await w)():w)[0];let D="session:",q=(0,_.YX)("session-auth");function E(){let e=(0,c.iE)();return new TextEncoder().encode(e.session.secret)}async function x(e){let t=(0,c.iE)(),s=E();return await new n.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(s)}async function h(e){try{let t=E(),{payload:s}=await (0,i._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return s}catch(e){return q.debug({error:e},"Token verification failed"),null}}async function m(e){return await (0,o.hash)(e,12)}async function f(e,t){return await (0,o.compare)(e,t)}async function R(e,t,s){let a=(0,c.iE)(),n=(0,u.Vj)(),i=new Date,o=new Date(i.getTime()+a.session.maxAgeMs),d={sid:n,tid:e.id,email:t,version:1},_=await x(d),w=(0,r.createHash)("sha256").update(_).digest("hex"),E={id:n,tenantId:e.id,email:t,tenant:e,createdAt:i.toISOString(),expiresAt:o.toISOString()};return await (0,l.t8)(`${D}${n}`,JSON.stringify(E),Math.floor(a.session.maxAgeMs/1e3)),await (0,p.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[n,s,e.id,w,o]),q.info({sessionId:n,tenantId:e.id,email:t},"Session created"),{session:E,token:_}}async function y(){let e=(0,c.iE)(),t=await (0,d.cookies)(),s=t.get(e.session.cookieName)?.value;return s?await g(s):null}async function g(e){let t=await h(e);if(!t)return null;let s=`${D}${t.sid}`,a=await (0,l.U2)(s);if(a)try{let e=JSON.parse(a);if(new Date(e.expiresAt)<new Date)return await (0,l.IV)(s),null;return e}catch{await (0,l.IV)(s)}let r=await (0,p.pP)(`
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
  `,[t.sid]);if(!r)return null;let n={id:r.session_id,tenantId:r.tenant_id,email:r.user_email,tenant:{id:r.tenant_id,name:r.tenant_name,email:r.user_email,plan:r.tenant_plan,is_active:r.tenant_is_active,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()},createdAt:r.session_created_at.toISOString(),expiresAt:r.session_expires_at.toISOString()};(0,c.iE)();let i=Math.floor((new Date(n.expiresAt).getTime()-Date.now())/1e3);return i>0&&await (0,l.t8)(s,JSON.stringify(n),i),n}async function N(e){await (0,l.IV)(`${D}${e}`),await (0,p.IO)("DELETE FROM sessions WHERE id = $1",[e]),q.info({sessionId:e},"Session invalidated")}async function I(e){let t=await (0,p.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,l.IV)(`${D}${e.id}`);return q.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function O(e,t){let s=await (0,p.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!s)return(0,_.oy)(q,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(s.locked_until&&new Date(s.locked_until)>new Date)return(0,_.oy)(q,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await f(t,s.password_hash)){let t=s.failed_login_attempts+1,a=t>=5;return await (0,p.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,a?new Date(Date.now()+9e5):null,s.id]),(0,_.oy)(q,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:a}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!s.is_active)return(0,_.oy)(q,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let a=await (0,p.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[s.tenant_id]);if(!a||!a.is_active)return(0,_.oy)(q,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,p.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[s.id]);let{session:r,token:n}=await R(a,s.email,s.id);return q.info({email:e,tenantId:a.id},"User logged in"),{success:!0,session:r,token:n}}async function A(){let e=await y();e&&await N(e.id);let t=(0,c.iE)();(await (0,d.cookies)()).delete(t.session.cookieName)}async function T(e){let t=(0,c.iE)();(await (0,d.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function S(){let e=(0,c.iE)();(await (0,d.cookies)()).delete(e.session.cookieName)}async function v(e,t,s){let a=await (0,p.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!a||!await f(t,a.password_hash))return!1;let r=await m(s);return await (0,p.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[r,e]),await I(a.tenant_id),q.info({userId:e},"Password changed"),!0}a()}catch(e){a(e)}})}};var t=require("../../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[5584,1515,6298,4058,207,9638,9469],()=>s(17694));module.exports=a})();