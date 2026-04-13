"use strict";(()=>{var e={};e.id=9149,e.ids=[9149],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},89798:e=>{e.exports=require("cluster")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},85807:e=>{e.exports=require("module")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},96119:e=>{e.exports=require("perf_hooks")},35816:e=>{e.exports=require("process")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},99672:e=>{e.exports=require("v8")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},8678:e=>{e.exports=import("pg")},72254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},65714:e=>{e.exports=require("node:diagnostics_channel")},15673:e=>{e.exports=require("node:events")},70612:e=>{e.exports=require("node:os")},49411:e=>{e.exports=require("node:path")},47261:e=>{e.exports=require("node:util")},38959:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>d,requestAsyncStorage:()=>_,routeModule:()=>l,serverHooks:()=>c,staticGenerationAsyncStorage:()=>p});var s=a(46498),n=a(98498),i=a(90929),o=a(49087),u=e([o]);o=(u.then?(await u)():u)[0];let l=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/v1/me/route",pathname:"/api/v1/me",filename:"route",bundlePath:"app/api/v1/me/route"},resolvedPagePath:"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/api/v1/me/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:_,staticGenerationAsyncStorage:p,serverHooks:c}=l,m="/api/v1/me/route";function d(){return(0,i.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:p})}r()}catch(e){r(e)}})},49087:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.r(t),a.d(t,{GET:()=>h,PATCH:()=>w,POST:()=>E,dynamic:()=>f});var s=a(34753),n=a(29010),i=a(42609),o=a(99638),u=a(78045),d=a(97530),l=a(63518),_=a(97289),p=a(42439),c=e([i,o,d]);[i,o,d]=c.then?(await c)():c;let f="force-dynamic",R=n.G0([n.Z_().url().max(500),n.i0("")]).optional().nullable(),v=n.Ry({name:n.Z_().max(100).optional(),avatar_url:n.Z_().max(2e6).optional().nullable(),twitter_url:R,github_url:R,linkedin_url:R,website_url:R}),g=n.Ry({current_password:n.Z_().min(1),new_password:n.Z_().min(8).max(128)}),y=(0,l.YX)("me-api");async function m(){let e=await (0,i.y_)();return e?{session:e}:((0,l.oy)(y,"auth_failed",{reason:"No session"}),{error:s.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Authentication required. Please log in."}},{status:401})})}async function h(e){let t=(0,p.Yi)(),a=performance.now();(0,_.I9)();try{let r=new URL(e.url),n=r.pathname.endsWith("/usage")||"usage"===r.searchParams.get("include")||r.searchParams.has("include_usage"),i=await m();if("error"in i)return i.error;let{session:l}=i,{allowed:p,headers:c}=await (0,u.Dn)(l.tenantId);if(!p)return s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});let h=await (0,o.pP)(`
      SELECT id, name, plan, is_active, settings, webhook_limit, events_per_month, created_at
      FROM tenants
      WHERE id = $1
    `,[l.tenantId]);if(!h)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"Tenant not found"}},{status:404});let w=null;try{w=await (0,o.pP)(`
        SELECT id, tenant_id, email, name, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at
        FROM users WHERE email = $1
      `,[l.email])}catch{w=await (0,o.pP)(`
        SELECT id, tenant_id, email, name, NULL as avatar_url, NULL as twitter_url, NULL as github_url, NULL as linkedin_url, NULL as website_url, created_at, updated_at
        FROM users WHERE email = $1
      `,[l.email])}let E=await (0,o.pP)(`
      SELECT COUNT(*) as count FROM webhooks WHERE tenant_id = $1 AND is_active = true
    `,[l.tenantId]),f=await (0,o.pP)(`
      SELECT COUNT(*) as count FROM api_keys WHERE tenant_id = $1 AND is_active = true
    `,[l.tenantId]),R={user:{id:w?.id??l.id,email:l.email,name:w?.name??null,avatar_url:w?.avatar_url??null,twitter_url:w?.twitter_url??null,github_url:w?.github_url??null,linkedin_url:w?.linkedin_url??null,website_url:w?.website_url??null},tenant:{id:h.id,name:h.name,plan:h.plan,is_active:h.is_active,created_at:h.created_at.toISOString()},limits:{webhooks:{used:parseInt(E?.count??"0",10),limit:h.webhook_limit},api_keys:{used:parseInt(f?.count??"0",10),limit:10},events_per_month:h.events_per_month},features:{replay_enabled:h.settings.replay_enabled??!1,events_api_enabled:h.settings.events_api_enabled??!1,websocket_enabled:h.settings.websocket_enabled??!1,retention_days:h.settings.retention_days??30}};if(n){let e=(0,u.EF)(),t=await e.getUsage(l.tenantId,"events"),a=await (0,d.Zl)(l.tenantId);R.usage={events_this_month:t,events_limit:h.events_per_month,events_remaining:Math.max(0,h.events_per_month-t),usage_percentage:Math.round(t/h.events_per_month*100),deliveries:{total:a.total,delivered:a.delivered,failed:a.failed,pending:a.pending,success_rate:Math.round(100*a.successRate)/100}}}y.debug({requestId:t,sessionId:l.id},"Retrieved user profile");let v=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/me",status_code:"200"},v/1e3),s.NextResponse.json({data:R},{status:200,headers:{...c,"X-Request-Id":t}})}catch(r){y.error({error:r,requestId:t},"Failed to get user profile");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"GET",route:"/api/v1/me",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}async function w(e){let t=(0,p.Yi)(),a=performance.now();(0,_.I9)();try{let r;let n=await m();if("error"in n)return n.error;let{session:i}=n,{allowed:d,headers:l}=await (0,u.Dn)(i.tenantId);if(!d)return s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});try{r=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let p=v.safeParse(r);if(!p.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:p.error.flatten()}},{status:400});let c=p.data;if(0===Object.keys(c).length)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"No fields to update"}},{status:400});let h=["updated_at = NOW()"],w=[],E=1;void 0!==c.name&&(h.push(`name = $${E++}`),w.push(c.name)),void 0!==c.avatar_url&&(h.push(`avatar_url = $${E++}`),w.push(c.avatar_url||null)),void 0!==c.twitter_url&&(h.push(`twitter_url = $${E++}`),w.push(c.twitter_url||null)),void 0!==c.github_url&&(h.push(`github_url = $${E++}`),w.push(c.github_url||null)),void 0!==c.linkedin_url&&(h.push(`linkedin_url = $${E++}`),w.push(c.linkedin_url||null)),void 0!==c.website_url&&(h.push(`website_url = $${E++}`),w.push(c.website_url||null)),w.push(i.email);let f=null;try{(f=await (0,o.pP)(`
        UPDATE users
        SET ${h.join(", ")}
        WHERE email = $${E}
        RETURNING id, tenant_id, email, name, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at
      `,w))||(f=await (0,o.pP)(`
          INSERT INTO users (tenant_id, email, name, password_hash, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at)
          VALUES ($1, $2, $3, '', $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id, tenant_id, email, name, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at
        `,[i.tenantId,i.email,c.name||null,c.avatar_url||null,c.twitter_url||null,c.github_url||null,c.linkedin_url||null,c.website_url||null]))}catch(r){y.warn({error:r},"Profile update failed, trying name-only fallback");let e=[],t=["updated_at = NOW()"],a=1;void 0!==c.name&&(t.push(`name = $${a++}`),e.push(c.name)),e.push(i.email),f=await (0,o.pP)(`
        UPDATE users
        SET ${t.join(", ")}
        WHERE email = $${a}
        RETURNING id, tenant_id, email, name, NULL as avatar_url, NULL as twitter_url, NULL as github_url, NULL as linkedin_url, NULL as website_url, created_at, updated_at
      `,e)}if(!f)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"User not found"}},{status:404});y.info({requestId:t,userId:i.id},"User profile updated");let R=Math.round(performance.now()-a);return(0,_.bd)({method:"PATCH",route:"/api/v1/me",status_code:"200"},R/1e3),s.NextResponse.json({data:{user:{id:f.id,email:f.email,name:f.name,avatar_url:f.avatar_url,twitter_url:f.twitter_url,github_url:f.github_url,linkedin_url:f.linkedin_url,website_url:f.website_url,updated_at:f.updated_at.toISOString()}},message:"Profile updated successfully"},{status:200,headers:{...l,"X-Request-Id":t}})}catch(r){y.error({error:r,requestId:t},"Failed to update user profile");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"PATCH",route:"/api/v1/me",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}async function E(e){let t=(0,p.Yi)(),a=performance.now();(0,_.I9)();try{let r;let n=new URL(e.url).searchParams.get("action");if("change-password"!==n)return s.NextResponse.json({error:{code:"BAD_REQUEST",message:"Invalid action. Use ?action=change-password"}},{status:400});let d=await m();if("error"in d)return d.error;let{session:p}=d,{allowed:c,headers:h}=await (0,u.Dn)(p.tenantId);if(!c)return s.NextResponse.json({error:{code:"RATE_LIMITED",message:"Too many requests. Please slow down."}},{status:429});try{r=await e.json()}catch{return s.NextResponse.json({error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},{status:400})}let w=g.safeParse(r);if(!w.success)return s.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request body",details:w.error.flatten()}},{status:400});let{current_password:E,new_password:f}=w.data,R=await (0,o.pP)("SELECT id FROM users WHERE email = $1",[p.email]);if(!R)return s.NextResponse.json({error:{code:"NOT_FOUND",message:"User not found"}},{status:404});if(!await (0,i.Cp)(R.id,E,f)){(0,l.oy)(y,"password_change_failed",{userId:p.id,reason:"invalid_current_password"});let e=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/me",status_code:"400"},e/1e3),s.NextResponse.json({error:{code:"INVALID_PASSWORD",message:"Current password is incorrect"}},{status:400,headers:{"X-Request-Id":t}})}(0,l.oy)(y,"password_changed",{userId:p.id,email:p.email}),y.info({requestId:t,userId:p.id},"Password changed");let v=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/me",status_code:"200"},v/1e3),s.NextResponse.json({message:"Password changed successfully"},{status:200,headers:{...h,"X-Request-Id":t}})}catch(r){y.error({error:r,requestId:t},"Failed to change password");let e=Math.round(performance.now()-a);return(0,_.bd)({method:"POST",route:"/api/v1/me",status_code:"500"},e/1e3),s.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred"}},{status:500,headers:{"X-Request-Id":t}})}finally{(0,_.FJ)()}}r()}catch(e){r(e)}})},42609:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Cp:()=>b,Rf:()=>$,Uj:()=>O,c_:()=>f,kS:()=>T,x4:()=>x,y_:()=>g});var s=a(84770),n=a(37681),i=a(80219),o=a(66059),u=a(78518),d=a(42439),l=a(7842),_=a(99638),p=a(18500),c=a(63518),m=e([_]);_=(m.then?(await m)():m)[0];let A="session:",L=(0,c.YX)("session-auth");function h(){let e=(0,l.iE)();return new TextEncoder().encode(e.session.secret)}async function w(e){let t=(0,l.iE)(),a=h();return await new n.N(e).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(Date.now()+t.session.maxAgeMs).setIssuer("xrnotify").setAudience("xrnotify-dashboard").sign(a)}async function E(e){try{let t=h(),{payload:a}=await (0,i._)(e,t,{issuer:"xrnotify",audience:"xrnotify-dashboard"});return a}catch(e){return L.debug({error:e},"Token verification failed"),null}}async function f(e){return await (0,o.hash)(e,12)}async function R(e,t){return await (0,o.compare)(e,t)}async function v(e,t,a){let r=(0,l.iE)(),n=(0,d.Vj)(),i=new Date,o=new Date(i.getTime()+r.session.maxAgeMs),u={sid:n,tid:e.id,email:t,version:1},c=await w(u),m=(0,s.createHash)("sha256").update(c).digest("hex"),h={id:n,tenantId:e.id,email:t,tenant:e,createdAt:i.toISOString(),expiresAt:o.toISOString()};return await (0,p.t8)(`${A}${n}`,JSON.stringify(h),Math.floor(r.session.maxAgeMs/1e3)),await (0,_.IO)(`
    INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `,[n,a,e.id,m,o]),L.info({sessionId:n,tenantId:e.id,email:t},"Session created"),{session:h,token:c}}async function g(){let e=(0,l.iE)(),t=await (0,u.cookies)(),a=t.get(e.session.cookieName)?.value;return a?await y(a):null}async function y(e){let t=await E(e);if(!t)return null;let a=`${A}${t.sid}`,r=await (0,p.U2)(a);if(r)try{let e=JSON.parse(r);if(new Date(e.expiresAt)<new Date)return await (0,p.IV)(a),null;return e}catch{await (0,p.IV)(a)}let s=await (0,_.pP)(`
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
  `,[t.sid]);if(!s)return null;let n={id:s.session_id,tenantId:s.tenant_id,email:s.user_email,tenant:{id:s.tenant_id,name:s.tenant_name,email:s.user_email,plan:s.tenant_plan,is_active:s.tenant_is_active,settings:s.tenant_settings,created_at:s.tenant_created_at.toISOString(),updated_at:s.tenant_updated_at.toISOString()},createdAt:s.session_created_at.toISOString(),expiresAt:s.session_expires_at.toISOString()};(0,l.iE)();let i=Math.floor((new Date(n.expiresAt).getTime()-Date.now())/1e3);return i>0&&await (0,p.t8)(a,JSON.stringify(n),i),n}async function N(e){await (0,p.IV)(`${A}${e}`),await (0,_.IO)("DELETE FROM sessions WHERE id = $1",[e]),L.info({sessionId:e},"Session invalidated")}async function I(e){let t=await (0,_.IO)(`
    DELETE FROM sessions WHERE tenant_id = $1 RETURNING id
  `,[e]);for(let e of t.rows)await (0,p.IV)(`${A}${e.id}`);return L.info({tenantId:e,count:t.rowCount},"All sessions invalidated"),t.rowCount??0}async function x(e,t){let a=await (0,_.pP)(`
    SELECT * FROM users WHERE email = $1
  `,[e.toLowerCase()]);if(!a)return(0,c.oy)(L,"auth_failed",{email:e,reason:"User not found"}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"};if(a.locked_until&&new Date(a.locked_until)>new Date)return(0,c.oy)(L,"auth_failed",{email:e,reason:"Account locked"}),{success:!1,error:"Account is temporarily locked. Please try again later.",errorCode:"ACCOUNT_LOCKED"};if(!await R(t,a.password_hash)){let t=a.failed_login_attempts+1,r=t>=5;return await (0,_.IO)(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `,[t,r?new Date(Date.now()+9e5):null,a.id]),(0,c.oy)(L,"auth_failed",{email:e,reason:"Invalid password",attempts:t,locked:r}),{success:!1,error:"Invalid email or password",errorCode:"INVALID_CREDENTIALS"}}if(!a.is_active)return(0,c.oy)(L,"auth_failed",{email:e,reason:"Account inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};let r=await (0,_.pP)(`
    SELECT * FROM tenants WHERE id = $1
  `,[a.tenant_id]);if(!r||!r.is_active)return(0,c.oy)(L,"auth_failed",{email:e,reason:"Tenant inactive"}),{success:!1,error:"Account is inactive",errorCode:"ACCOUNT_INACTIVE"};await (0,_.IO)(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[a.id]);let{session:s,token:n}=await v(r,a.email,a.id);return L.info({email:e,tenantId:r.id},"User logged in"),{success:!0,session:s,token:n}}async function T(){let e=await g();e&&await N(e.id);let t=(0,l.iE)();(await (0,u.cookies)()).delete(t.session.cookieName)}async function O(e){let t=(0,l.iE)();(await (0,u.cookies)()).set(t.session.cookieName,e,{httpOnly:!0,secure:"production"===t.env,sameSite:"lax",maxAge:Math.floor(t.session.maxAgeMs/1e3),path:"/"})}async function $(){let e=(0,l.iE)();(await (0,u.cookies)()).delete(e.session.cookieName)}async function b(e,t,a){let r=await (0,_.pP)(`
    SELECT * FROM users WHERE id = $1
  `,[e]);if(!r||!await R(t,r.password_hash))return!1;let s=await f(a);return await (0,_.IO)(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `,[s,e]),await I(r.tenant_id),L.info({userId:e},"Password changed"),!0}r()}catch(e){r(e)}})},97530:(e,t,a)=>{a.a(e,async(e,r)=>{try{a.d(t,{Kg:()=>d,Zl:()=>m,_m:()=>c,mj:()=>p,xr:()=>_,y7:()=>l});var s=a(42439),n=a(99638),i=a(18500),o=a(63518);a(97289),a(7842);var u=e([n]);n=(u.then?(await u)():u)[0];let E="stream:deliveries",f=(0,o.YX)("delivery-service");async function d(e){let t=await _(e);return!!t&&(await (0,n.IO)(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `,[e]),await (0,i.Ug)("stream:replay",{delivery_id:e,webhook_id:t.webhook_id,tenant_id:t.tenant_id,event_id:t.event_id,event_type:t.event_type,replay_requested_at:(0,s.i2)()}),f.info({deliveryId:e},"Delivery queued for replay"),!0)}async function l(e,t){let a=["tenant_id = $1"],r=[e],s=2;t.webhookId&&(a.push(`webhook_id = $${s}`),r.push(t.webhookId),s++),t.eventType&&(a.push(`event_type = $${s}`),r.push(t.eventType),s++),t.status&&(a.push(`status = $${s}`),r.push(t.status),s++),t.startDate&&(a.push(`created_at >= $${s}`),r.push(t.startDate),s++),t.endDate&&(a.push(`created_at <= $${s}`),r.push(t.endDate),s++);let i=a.join(" AND "),o=await (0,n.Kt)(`
    SELECT id FROM deliveries
    WHERE ${i}
    LIMIT 1000
  `,r),u=0;for(let e of o)await d(e.id)&&u++;return f.info({tenantId:e,filter:t,count:u},"Batch replay queued"),u}async function _(e){let t=await (0,n.pP)(`
    SELECT * FROM deliveries WHERE id = $1
  `,[e]);return t?h(t):null}async function p(e,t){let a=await (0,n.pP)(`
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
  `,[e]);return{...h(a),attempts:r.map(w)}}async function c(e){let{tenantId:t,webhookId:a,eventType:r,status:s,startDate:i,endDate:o,limit:u=50,offset:d=0}=e,l=["tenant_id = $1"],_=[t],p=2;a&&(l.push(`webhook_id = $${p}`),_.push(a),p++),r&&(l.push(`event_type = $${p}`),_.push(r),p++),s&&(l.push(`status = $${p}`),_.push(s),p++),i&&(l.push(`created_at >= $${p}`),_.push(i),p++),o&&(l.push(`created_at <= $${p}`),_.push(o),p++);let c=l.join(" AND "),m=await (0,n.pP)(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${c}
  `,_),w=parseInt(m?.count??"0",10);return{deliveries:(await (0,n.Kt)(`
    SELECT * FROM deliveries
    WHERE ${c}
    ORDER BY created_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `,[..._,u,d])).map(h),total:w}}async function m(e,t,a){let r=["tenant_id = $1"],s=[e],i=2;t&&(r.push(`created_at >= $${i}`),s.push(t),i++),a&&(r.push(`created_at <= $${i}`),s.push(a),i++);let o=r.join(" AND "),u=await (0,n.pP)(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${o}
  `,s),d=parseInt(u?.total??"0",10),l=parseInt(u?.delivered??"0",10),_=parseInt(u?.failed??"0",10),p=parseInt(u?.pending??"0",10),c=parseInt(u?.retrying??"0",10);return{total:d,delivered:l,failed:_,pending:p,retrying:c,successRate:d>0?l/d*100:0}}function h(e){return{id:e.id,webhook_id:e.webhook_id,tenant_id:e.tenant_id,event_id:e.event_id,event_type:e.event_type,payload:"string"==typeof e.payload?JSON.parse(e.payload):e.payload,url:e.url,status:e.status,attempt_count:e.attempt_count,max_attempts:e.max_attempts,error_code:e.error_code??void 0,error_message:e.error_message??void 0,next_retry_at:e.next_retry_at??void 0,delivered_at:e.delivered_at??void 0,created_at:e.created_at,updated_at:e.updated_at}}function w(e){return{attempt_number:e.attempt_number,status_code:e.status_code,response_body:e.response_body,error_message:e.error_message,duration_ms:e.duration_ms,attempted_at:e.attempted_at}}r()}catch(e){r(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[5584,1515,6298,4058,207,3591,9638,9469,9801],()=>a(38959));module.exports=r})();