"use strict";(()=>{var e={};e.id=149,e.ids=[149],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},38959:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>u,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>_,staticGenerationAsyncStorage:()=>l});var r=a(46498),n=a(98498),i=a(90929),o=a(49087),d=e([o]);o=(d.then?(await d)():d)[0];let c=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/v1/me/route",pathname:"/api/v1/me",filename:"route",bundlePath:"app/api/v1/me/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/me/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:_}=c,m="/api/v1/me/route";function u(){return(0,i.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:l})}s()}catch(e){s(e)}})},49087:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{GET:()=>E,PATCH:()=>h,POST:()=>w,dynamic:()=>f});var r=a(34753),n=a(29010),i=a(42609),o=a(99638),d=a(78045),u=a(97530),c=a(63518),p=a(97289),l=a(42439),_=e([i,o,u]);[i,o,u]=_.then?(await _)():_;let f="force-dynamic",y=n.Ry({name:n.Z_().min(1).max(100).optional()}),R=n.Ry({current_password:n.Z_().min(1),new_password:n.Z_().min(8).max(128)}),v=(0,c.YX)("me-api");async function m(){let e=await (0,i.y_)();return e?{session:e}:((0,c.oy)(v,"auth_failed",{reason:"No session"}),{error:r.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Please log in."}},{status:401})})}async function E(e){let t=(0,l.Yi)(),a=performance.now();(0,p.I9)();try{let s=new URL(e.url),n=s.pathname.endsWith("/usage")||"usage"===s.searchParams.get("include"),i=await m();if("error"in i)return i.error;let{session:c}=i,{allowed:l,headers:_}=await (0,d.Dn)(c.tenantId);if(!l)return r.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});let E=await (0,o.pP)(`
      SELECT id, name, plan, is_active, settings, webhook_limit, events_per_month, created_at
      FROM tenants
      WHERE id = $1
    `,[c.tenantId]);if(!E)return r.NextResponse.json({error:{code:"NOT_FOUND",message:"Tenant not found"}},{status:404});let h=await (0,o.pP)(`
      SELECT COUNT(*) as count FROM webhooks WHERE tenant_id = $1 AND is_active = true
    `,[c.tenantId]),w=await (0,o.pP)(`
      SELECT COUNT(*) as count FROM api_keys WHERE tenant_id = $1 AND is_active = true
    `,[c.tenantId]),f={user:{id:c.id,email:c.email},tenant:{id:E.id,name:E.name,plan:E.plan,is_active:E.is_active,created_at:E.created_at.toISOString()},limits:{webhooks:{used:parseInt(h?.count??"0",10),limit:E.webhook_limit},api_keys:{used:parseInt(w?.count??"0",10),limit:10},events_per_month:E.events_per_month},features:{replay_enabled:E.settings.replay_enabled??!1,events_api_enabled:E.settings.events_api_enabled??!1,websocket_enabled:E.settings.websocket_enabled??!1,retention_days:E.settings.retention_days??30}};if(n){let e=(0,d.EF)(),t=await e.getUsage(c.tenantId,"events"),a=await (0,u.Zl)(c.tenantId);f.usage={events_this_month:t,events_limit:E.events_per_month,events_remaining:Math.max(0,E.events_per_month-t),usage_percentage:Math.round(t/E.events_per_month*100),deliveries:{total:a.total,delivered:a.delivered,failed:a.failed,pending:a.pending,success_rate:Math.round(100*a.successRate)/100}}}v.debug({requestId:t,sessionId:c.id},"Retrieved user profile");let y=Math.round(performance.now()-a);return(0,p.bd)({method:"GET",route:"/api/v1/me",status_code:"200"},y/1e3),r.NextResponse.json({data:f},{status:200,headers:{..._,"X-Request-Id":t}})}catch(s){v.error({error:s,requestId:t},"Failed to get user profile");let e=Math.round(performance.now()-a);return(0,p.bd)({method:"GET",route:"/api/v1/me",status_code:"500"},e/1e3),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,p.FJ)()}}async function h(e){let t=(0,l.Yi)(),a=performance.now();(0,p.I9)();try{let s;let n=await m();if("error"in n)return n.error;let{session:i}=n,{allowed:u,headers:c}=await (0,d.Dn)(i.tenantId);if(!u)return r.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});try{s=await e.json()}catch{return r.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let l=y.safeParse(s);if(!l.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:l.error.flatten()}},{status:400});let _=l.data;if(0===Object.keys(_).length)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"No fields to update"}},{status:400});let E=await (0,o.pP)(`
      UPDATE users
      SET name = COALESCE($1, name), updated_at = NOW()
      WHERE id = $2
      RETURNING id, tenant_id, email, name, created_at, updated_at
    `,[_.name??null,i.id]);if(!E)return r.NextResponse.json({error:{code:"NOT_FOUND",message:"User not found"}},{status:404});v.info({requestId:t,userId:i.id},"User profile updated");let h=Math.round(performance.now()-a);return(0,p.bd)({method:"PATCH",route:"/api/v1/me",status_code:"200"},h/1e3),r.NextResponse.json({data:{user:{id:E.id,email:E.email,name:E.name,updated_at:E.updated_at.toISOString()}},message:"Profile updated successfully"},{status:200,headers:{...c,"X-Request-Id":t}})}catch(s){v.error({error:s,requestId:t},"Failed to update user profile");let e=Math.round(performance.now()-a);return(0,p.bd)({method:"PATCH",route:"/api/v1/me",status_code:"500"},e/1e3),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,p.FJ)()}}async function w(e){let t=(0,l.Yi)(),a=performance.now();(0,p.I9)();try{let s;let n=new URL(e.url).searchParams.get("action");if("change-password"!==n)return r.NextResponse.json({error:{code:"BAD_REQUEST",message:"Invalid action. Use ?action=change-password"}},{status:400});let o=await m();if("error"in o)return o.error;let{session:u}=o,{allowed:l,headers:_}=await (0,d.Dn)(u.tenantId);if(!l)return r.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});try{s=await e.json()}catch{return r.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let E=R.safeParse(s);if(!E.success)return r.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:E.error.flatten()}},{status:400});let{current_password:h,new_password:w}=E.data;if(!await (0,i.Cp)(u.id,h,w)){(0,c.oy)(v,"password_change_failed",{userId:u.id,reason:"invalid_current_password"});let e=Math.round(performance.now()-a);return(0,p.bd)({method:"POST",route:"/api/v1/me",status_code:"400"},e/1e3),r.NextResponse.json({error:{code:"INVALID_PASSWORD",message:"Current password is incorrect"}},{status:400,headers:{"X-Request-Id":t}})}(0,c.oy)(v,"password_changed",{userId:u.id,email:u.email}),v.info({requestId:t,userId:u.id},"Password changed");let f=Math.round(performance.now()-a);return(0,p.bd)({method:"POST",route:"/api/v1/me",status_code:"200"},f/1e3),r.NextResponse.json({message:"Password changed successfully"},{status:200,headers:{..._,"X-Request-Id":t}})}catch(s){v.error({error:s,requestId:t},"Failed to change password");let e=Math.round(performance.now()-a);return(0,p.bd)({method:"POST",route:"/api/v1/me",status_code:"500"},e/1e3),r.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,p.FJ)()}}s()}catch(e){s(e)}})},42609:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Cp:()=>A,Rf:()=>O,Uj:()=>T,kS:()=>N,x4:()=>x,y_:()=>R});var r=a(37681),n=a(80219),i=a(66059),o=a(78518),d=a(42439),u=a(7842),c=a(99638),p=a(18500),l=a(63518),_=e([c]);c=(_.then?(await _)():_)[0];let S="session:",$=(0,l.YX)("session-auth");function m(){let e=(0,u.iE)();return new TextEncoder().encode(e.session.secret)}async function E(e){let t=(0,u.iE)(),a=m();return await new r.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function h(e){try{let t=m(),{payload:a}=await (0,n._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return $.debug({error:e},"Token verification failed"),null}}async function w(e){return await (0,i.hash)(e,12)}async function f(e,t){return await (0,i.compare)(e,t)}async function y(e,t){let a=(0,u.iE)(),s=(0,d.Vj)(),r=new Date,n=new Date(r.getTime()+a.session.maxAgeMs),i={sid:s,tid:e.id,email:t,version:1},o=await E(i),l={id:s,tenantId:e.id,email:t,tenant:e,createdAt:r.toISOString(),expiresAt:n.toISOString()};return await (0,p.t8)(`${S}${s}`,JSON.stringify(l),Math.floor(a.session.maxAgeMs/1e3)),await (0,c.IO)(`
    INSERT INTO sessions (id, tenant_id, email, expires_at)
    VALUES ($1, $2, $3, $4)
  `,[s,e.id,t,n]),$.info({sessionId:s,tenantId:e.id,email:t},"Session created"),{session:l,token:o}}async function R(){let e=(0,u.iE)(),t=await (0,o.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await v(a):null}async function v(e){let t=await h(e);if(!t)return null;let a=`${S}${t.sid}`,s=await (0,p.U2)(a);if(s)try{let e=JSON.parse(s);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let r=await (0,c.pP)(`
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
  `,[t.sid]);if(!r)return null;let n={id:r.session_id,tenantId:r.tenant_id,email:r.session_email,tenant:{id:r.tenant_id,name:r.tenant_name,email:r.tenant_email,plan:r.tenant_plan,is_active:r.tenant_is_active,settings:r.tenant_settings,created_at:r.tenant_created_at.toISOString(),updated_at:r.tenant_updated_at.toISOString()},createdAt:r.session_created_at.toISOString(),expiresAt:r.session_expires_at.toISOString()};(0,u.iE)();let i=Math.floor((new Date(n.expiresAt).getTime()-Date.now())/1e3);return i>0&&await (0,p.t8)(a,JSON.stringify(n),i),n}async function I(e){await (0,p.IV)(`${S}${e}`),await (0,c.IO)(`
    UPDATE sessions SET revoked_at = NOW() WHERE id = $1
  `,[e]),$.info({sessionId:e},"Session invalidated")}async function g(e){let t=await (0,c.IO)(`
    UPDATE sessions 
    SET revoked_at = NOW() 
    WHERE tenant_id = $1 AND revoked_at IS NULL
    RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${S}${e.id}`);return $.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function x(e,t){let a=await (0,c.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,l.oy)($,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,l.oy)($,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await f(t,a.password_hash)){let t=a.failed_login_attempts+1,s=t>=5;return await (0,c.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,s?new Date(Date.now()+9e5):null,a.id]),(0,l.oy)($,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:s}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,l.oy)($,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let s=await (0,c.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!s||!s.is_active)return(0,l.oy)($,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,c.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:r,token:n}=await y(s,a.email);return $.info({email:e,tenantId:s.id},"User logged in"),{success:!0,session:r,token:n}}async function N(){let e=await R();e&&await I(e.id);let t=(0,u.iE)();(await (0,o.cookies)()).delete(t.session.cookieName)}async function T(e){let t=(0,u.iE)();(await (0,o.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function O(){let e=(0,u.iE)();(await (0,o.cookies)()).delete(e.session.cookieName)}async function A(e,t,a){let s=await (0,c.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!s||!await f(t,s.password_hash))return!1;let r=await w(a);return await (0,c.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[r,e]),await g(s.tenant_id),$.info({userId:e},"Password changed"),!0}s()}catch(e){s(e)}})},97530:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{Kg:()=>u,Zl:()=>m,_m:()=>_,mj:()=>l,xr:()=>p,y7:()=>c});var r=a(42439),n=a(99638),i=a(18500),o=a(63518);a(97289),a(7842);var d=e([n]);n=(d.then?(await d)():d)[0];let w="stream:deliveries",f=(0,o.YX)("delivery-service");async function u(e){let t=await p(e);return!!t&&(await (0,n.IO)(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[e]),await (0,i.Ug)("stream:replay",{delivery_id:e,webhook_id:t.webhook_id,tenant_id:t.tenant_id,event_id:t.event_id,event_type:t.event_type,replay_requested_at:(0,r.i2)()}),f.info({deliveryId:e},"Delivery queued for replay"),!0)}async function c(e,t){let a=["tenant_id = $1"],s=[e],r=2;t.webhookId&&(a.push(`webhook_id = $${r}`),s.push(t.webhookId),r++),t.eventType&&(a.push(`event_type = $${r}`),s.push(t.eventType),r++),t.status&&(a.push(`status = $${r}`),s.push(t.status),r++),t.startDate&&(a.push(`created_at >= $${r}`),s.push(t.startDate),r++),t.endDate&&(a.push(`created_at <= $${r}`),s.push(t.endDate),r++);let i=a.join(" AND "),o=await (0,n.Kt)(`
    SELECT id FROM deliveries
    WHERE ${i}
    LIMIT 1000
  `,s),d=0;for(let e of o)await u(e.id)&&d++;return f.info({tenantId:e,filter:t,count:d},"Batch replay queued"),d}async function p(e){let t=await (0,n.pP)(`
    SELECT * FROM deliveries WHERE id = $1
  `,[e]);return t?E(t):null}async function l(e,t){let a=await (0,n.pP)(`
    SELECT * FROM deliveries 
    WHERE id = $1 AND tenant_id = $2
  `,[e,t]);if(!a)return null;let s=await (0,n.Kt)(`
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
  `,[e]);return{...E(a),attempts:s.map(h)}}async function _(e){let{tenantId:t,webhookId:a,eventType:s,status:r,startDate:i,endDate:o,limit:d=50,offset:u=0}=e,c=["tenant_id = $1"],p=[t],l=2;a&&(c.push(`webhook_id = $${l}`),p.push(a),l++),s&&(c.push(`event_type = $${l}`),p.push(s),l++),r&&(c.push(`status = $${l}`),p.push(r),l++),i&&(c.push(`created_at >= $${l}`),p.push(i),l++),o&&(c.push(`created_at <= $${l}`),p.push(o),l++);let _=c.join(" AND "),m=await (0,n.pP)(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${_}
  `,p),h=parseInt(m?.count??"0",10);return{deliveries:(await (0,n.Kt)(`
    SELECT * FROM deliveries
    WHERE ${_}
    ORDER BY created_at DESC
    LIMIT $${l} OFFSET $${l+1}
  `,[...p,d,u])).map(E),total:h}}async function m(e,t,a){let s=["tenant_id = $1"],r=[e],i=2;t&&(s.push(`created_at >= $${i}`),r.push(t),i++),a&&(s.push(`created_at <= $${i}`),r.push(a),i++);let o=s.join(" AND "),d=await (0,n.pP)(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${o}
  `,r),u=parseInt(d?.total??"0",10),c=parseInt(d?.delivered??"0",10),p=parseInt(d?.failed??"0",10),l=parseInt(d?.pending??"0",10),_=parseInt(d?.retrying??"0",10);return{total:u,delivered:c,failed:p,pending:l,retrying:_,successRate:u>0?c/u*100:0}}function E(e){return{id:e.id,webhook_id:e.webhook_id,tenant_id:e.tenant_id,event_id:e.event_id,event_type:e.event_type,payload:"string"==typeof e.payload?JSON.parse(e.payload):e.payload,url:e.url,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,error_code:e.error_code??void 0,error_message:e.error_message??void 0,next_retry_at:e.next_retry_at??void 0,delivered_at:e.delivered_at??void 0,created_at:e.created_at,updated_at:e.updated_at}}function h(e){return{attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}}s()}catch(e){s(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[584,808,298,591,207,58,638,469,801],()=>a(38959));module.exports=s})();