"use strict";exports.id=281,exports.ids=[281],exports.modules={52281:(t,e,r)=>{r.a(t,async(t,a)=>{try{r.d(e,{$1:()=>v,N:()=>h,bB:()=>p,jD:()=>R,m2:()=>f,tr:()=>u,zt:()=>_});var o=r(42439),i=r(99638),s=r(18500),n=r(63518),l=r(93996),d=r(97289),c=t([i]);i=(c.then?(await c)():c)[0];let L="webhook:",E=(0,n.YX)("webhook-service");async function u(t,e){let r=(0,l.n6)(e.url);if(!r.valid)throw new R(r.error??"Invalid URL","URL_INVALID");let a=await (0,l.sp)(e.url);if(!a.valid)throw new R(a.error??"Invalid URL","URL_VALIDATION_FAILED");for(let t of e.event_types)if(!o.E_.includes(t))throw new R(`Invalid event type: ${t}`,"INVALID_EVENT_TYPE");let{secret:s,prefix:n}=(0,o.A$)(),d=(0,o.Vj)(),c=await (0,i.pP)(`
    INSERT INTO webhooks (
      id,
      tenant_id,
      url,
      secret,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
  `,[d,t,e.url,s,n,e.event_types,e.account_filters??[],e.description??null,e.metadata??{},!0]);if(!c)throw Error("Failed to create webhook");return await w(t),await I(),E.info({webhookId:c.id,tenantId:t,url:function(t){try{let e=new URL(t);return`${e.protocol}//${e.host}/***`}catch{return"[invalid-url]"}}(e.url),eventTypes:e.event_types},"Webhook created"),{...$(c),secret:s}}async function _(t,e){let r=`${L}${t}`,a=await (0,s.LK)(r);if(a&&a.tenant_id===e)return a;let o=await (0,i.pP)(`
    SELECT 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
    FROM webhooks
    WHERE id = $1 AND tenant_id = $2
  `,[t,e]);if(!o)return null;let n=$(o);return await (0,s.eT)(r,n,300),n}async function p(t){let{tenantId:e,isActive:r,eventTypes:a,limit:o=50,offset:s=0}=t,n=["tenant_id = $1"],l=[e],d=2;void 0!==r&&(n.push(`is_active = $${d}`),l.push(r),d++),a&&a.length>0&&(n.push(`event_types && $${d}`),l.push(a),d++);let c=n.join(" AND "),u=await (0,i.pP)(`
    SELECT COUNT(*) as count FROM webhooks WHERE ${c}
  `,l),_=parseInt(u?.count??"0",10);return{webhooks:(await (0,i.Kt)(`
    SELECT 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
    FROM webhooks
    WHERE ${c}
    ORDER BY created_at DESC
    LIMIT $${d} OFFSET $${d+1}
  `,[...l,o,s])).map($),total:_}}async function v(t,e,r){if(r.url){let t=(0,l.n6)(r.url);if(!t.valid)throw new R(t.error??"Invalid URL","URL_INVALID");let e=await (0,l.sp)(r.url);if(!e.valid)throw new R(e.error??"Invalid URL","URL_VALIDATION_FAILED")}if(r.event_types){for(let t of r.event_types)if(!o.E_.includes(t))throw new R(`Invalid event type: ${t}`,"INVALID_EVENT_TYPE")}let a=["updated_at = NOW()"],s=[],n=1;void 0!==r.url&&(a.push(`url = $${n}`),s.push(r.url),n++),void 0!==r.event_types&&(a.push(`event_types = $${n}`),s.push(r.event_types),n++),void 0!==r.account_filters&&(a.push(`account_filters = $${n}`),s.push(r.account_filters),n++),void 0!==r.description&&(a.push(`description = $${n}`),s.push(r.description),n++),void 0!==r.metadata&&(a.push(`metadata = $${n}`),s.push(r.metadata),n++),void 0!==r.is_active&&(a.push(`is_active = $${n}`),s.push(r.is_active),n++,!0===r.is_active&&a.push("consecutive_failures = 0")),s.push(t,e);let d=await (0,i.pP)(`
    UPDATE webhooks
    SET ${a.join(", ")}
    WHERE id = $${n} AND tenant_id = $${n+1}
    RETURNING 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
  `,s);return d?(await w(e,t),await I(),E.info({webhookId:t,tenantId:e},"Webhook updated"),$(d)):null}async function h(t,e){let r=await (0,i.IO)(`
    DELETE FROM webhooks
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `,[t,e]);return 0!==r.rowCount&&(await w(e,t),await I(),E.info({webhookId:t,tenantId:e},"Webhook deleted"),!0)}async function f(t,e){let{secret:r,prefix:a}=(0,o.A$)(),s=await (0,i.IO)(`
    UPDATE webhooks
    SET secret = $1, secret_prefix = $2, updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
    RETURNING id
  `,[r,a,t,e]);return 0===s.rowCount?null:(await w(e,t),E.info({webhookId:t,tenantId:e},"Webhook secret rotated"),{secret:r})}async function w(t,e){let r=[(0,s.IV)(`webhooks:tenant:${t}`),(0,s.kt)("webhook:match:*")];e&&r.push((0,s.IV)(`${L}${e}`)),await Promise.all(r)}async function I(){try{let t=await (0,i.pP)(`
      SELECT COUNT(*) as count FROM webhooks WHERE is_active = true
    `);(0,d.wt)(parseInt(t?.count??"0",10))}catch(t){E.error({error:t},"Failed to update webhook metrics")}}function $(t){return{id:t.id,tenant_id:t.tenant_id,url:t.url,secret_prefix:t.secret_prefix,event_types:t.event_types,account_filters:t.account_filters??[],description:t.description??void 0,metadata:t.metadata??{},is_active:t.is_active,consecutive_failures:t.consecutive_failures??0,last_delivery_at:t.last_delivery_at??void 0,last_success_at:t.last_success_at??void 0,last_failure_at:t.last_failure_at??void 0,created_at:t.created_at,updated_at:t.updated_at}}class R extends Error{constructor(t,e){super(t),this.name="WebhookValidationError",this.code=e}}a()}catch(t){a(t)}})},93996:(t,e,r)=>{r.d(e,{n6:()=>f,sp:()=>v});var a=r(74932),o=r(7842),i=r(63518);let s=[{start:"10.0.0.0",end:"10.255.255.255"},{start:"172.16.0.0",end:"172.31.255.255"},{start:"192.168.0.0",end:"192.168.255.255"},{start:"100.64.0.0",end:"100.127.255.255"},{start:"169.254.0.0",end:"169.254.255.255"},{start:"127.0.0.0",end:"127.255.255.255"},{start:"192.0.2.0",end:"192.0.2.255"},{start:"198.51.100.0",end:"198.51.100.255"},{start:"203.0.113.0",end:"203.0.113.255"},{start:"255.255.255.255",end:"255.255.255.255"},{start:"0.0.0.0",end:"0.255.255.255"}],n=["localhost","localhost.localdomain","127.0.0.1","::1","0.0.0.0","[::1]","[0:0:0:0:0:0:0:1]"],l=["internal","local","localhost","localdomain","intranet","corp","home","lan","private"],d=[443,8443,8080,80],c=(0,i.YX)("url-policy");function u(t){let e=t.split(".").map(Number);return((e[0]??0)<<24)+((e[1]??0)<<16)+((e[2]??0)<<8)+(e[3]??0)}function _(t){let e=u(t);for(let t of s){let r=u(t.start),a=u(t.end);if(e>=r&&e<=a)return!0}return!1}function p(t){return/^\d+\.\d+\.\d+\.\d+$/.test(t)?_(t):function(t){let e=t.toLowerCase();if("::1"===e||"0:0:0:0:0:0:0:1"===e||e.startsWith("fe8")||e.startsWith("fe9")||e.startsWith("fea")||e.startsWith("feb")||e.startsWith("fc")||e.startsWith("fd"))return!0;if(e.startsWith("::ffff:")){let t=e.slice(7);if(/^\d+\.\d+\.\d+\.\d+$/.test(t))return _(t)}return!1}(t)}async function v(t){let e;let r=(0,o.iE)();try{e=new URL(t)}catch{return{valid:!1,error:"Invalid URL format",errorCode:"INVALID_URL"}}let a="production"!==r.env&&r.webhook.allowLocalhost;if("https:"!==e.protocol&&!(a&&"http:"===e.protocol))return{valid:!1,error:"URL must use HTTPS protocol",errorCode:"INVALID_PROTOCOL"};let s=e.hostname.toLowerCase();if(n.includes(s))return r.webhook.allowLocalhost?(c.debug({url:t},"Allowing localhost URL in development mode"),{valid:!0}):((0,i.oy)(c,"blocked_request",{url:t,reason:"Localhost not allowed"}),{valid:!1,error:"Localhost URLs are not allowed",errorCode:"LOCALHOST"});let u=s.split("."),_=u[u.length-1];if(_&&l.includes(_))return(0,i.oy)(c,"blocked_request",{url:t,reason:"Blocked TLD",tld:_}),{valid:!1,error:`Domain ending in .${_} is not allowed`,errorCode:"BLOCKED_DOMAIN"};if(e.port){let t=parseInt(e.port,10);if(!d.includes(t)&&"production"===r.env)return{valid:!1,error:`Port ${t} is not allowed. Use standard HTTPS ports.`,errorCode:"INVALID_PORT"}}if(/^\d+\.\d+\.\d+\.\d+$/.test(s)||s.startsWith("[")){let e=s.replace(/^\[|\]$/g,"");return p(e)&&!r.webhook.allowPrivateIps?((0,i.oy)(c,"blocked_request",{url:t,reason:"Private IP address",ip:e}),{valid:!1,error:"Private IP addresses are not allowed",errorCode:"PRIVATE_IP"}):{valid:!0,resolvedIps:[e]}}try{let e=await h(s);if(0===e.length)return{valid:!1,error:"Could not resolve hostname",errorCode:"DNS_RESOLUTION_FAILED"};if(!r.webhook.allowPrivateIps){for(let r of e)if(p(r))return(0,i.oy)(c,"blocked_request",{url:t,reason:"Resolved to private IP",ip:r,hostname:s}),{valid:!1,error:"URL resolves to a private IP address",errorCode:"PRIVATE_IP"}}return c.debug({url:t,resolvedIps:e},"URL validated successfully"),{valid:!0,resolvedIps:e}}catch(e){return c.warn({error:e,url:t},"DNS resolution failed"),{valid:!1,error:"Could not resolve hostname",errorCode:"DNS_RESOLUTION_FAILED"}}}async function h(t){let e=[];try{let r=await (0,a.resolve4)(t);e.push(...r)}catch{}try{let r=await (0,a.resolve6)(t);e.push(...r)}catch{}return e}function f(t){let e;let r=(0,o.iE)();try{e=new URL(t)}catch{return{valid:!1,error:"Invalid URL format",errorCode:"INVALID_URL"}}let a="production"!==r.env&&r.webhook.allowLocalhost;if("https:"!==e.protocol&&!(a&&"http:"===e.protocol))return{valid:!1,error:"URL must use HTTPS protocol",errorCode:"INVALID_PROTOCOL"};let i=e.hostname.toLowerCase();if(n.includes(i)&&!r.webhook.allowLocalhost)return{valid:!1,error:"Localhost URLs are not allowed",errorCode:"LOCALHOST"};let s=i.split("."),d=s[s.length-1];return d&&l.includes(d)?{valid:!1,error:`Domain ending in .${d} is not allowed`,errorCode:"BLOCKED_DOMAIN"}:(/^\d+\.\d+\.\d+\.\d+$/.test(i)||i.startsWith("["))&&p(i.replace(/^\[|\]$/g,""))&&!r.webhook.allowPrivateIps?{valid:!1,error:"Private IP addresses are not allowed",errorCode:"PRIVATE_IP"}:{valid:!0}}}};