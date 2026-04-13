"use strict";exports.id=9801,exports.ids=[9801],exports.modules={97289:(e,t,n)=>{n.d(t,{FJ:()=>_,I9:()=>m,Kt:()=>p,Rs:()=>w,bd:()=>f,o:()=>g,wt:()=>h});var r=n(23591);(0,n(63518).YX)("metrics");let s=new r.Registry;s.setDefaultLabels({service:"xrnotify-platform",env:"production"}),(0,r.collectDefaultMetrics)({register:s,prefix:"xrnotify_"});let o=new r.Counter({name:"xrnotify_http_requests_total",help:"Total number of HTTP requests",labelNames:["method","route","status_code"],registers:[s]}),i=new r.Histogram({name:"xrnotify_http_request_duration_seconds",help:"HTTP request duration in seconds",labelNames:["method","route","status_code"],buckets:[.01,.025,.05,.1,.25,.5,1,2.5,5,10],registers:[s]}),a=new r.Gauge({name:"xrnotify_http_requests_in_flight",help:"Number of HTTP requests currently being processed",registers:[s]}),l=(new r.Counter({name:"xrnotify_webhook_deliveries_total",help:"Total number of webhook delivery attempts",labelNames:["status","event_type"],registers:[s]}),new r.Histogram({name:"xrnotify_webhook_delivery_duration_seconds",help:"Webhook delivery duration in seconds",labelNames:["status","event_type"],buckets:[.1,.25,.5,1,2.5,5,10,15,30],registers:[s]}),new r.Counter({name:"xrnotify_webhook_retries_total",help:"Total number of webhook delivery retries",labelNames:["event_type"],registers:[s]}),new r.Counter({name:"xrnotify_webhook_dlq_total",help:"Total number of webhooks moved to dead letter queue",labelNames:["event_type"],registers:[s]}),new r.Gauge({name:"xrnotify_active_webhooks",help:"Number of active webhook subscriptions",registers:[s]})),c=(new r.Counter({name:"xrnotify_xrpl_events_total",help:"Total number of XRPL events processed",labelNames:["event_type"],registers:[s]}),new r.Gauge({name:"xrnotify_xrpl_ledger_index",help:"Current XRPL ledger index",registers:[s]}),new r.Gauge({name:"xrnotify_xrpl_processed_ledger_index",help:"Last processed XRPL ledger index",registers:[s]}),new r.Gauge({name:"xrnotify_xrpl_connection_status",help:"XRPL WebSocket connection status (1=connected, 0=disconnected)",registers:[s]}),new r.Counter({name:"xrnotify_xrpl_reconnects_total",help:"Total number of XRPL reconnection attempts",registers:[s]}),new r.Gauge({name:"xrnotify_queue_depth",help:"Current depth of the event queue",labelNames:["queue"],registers:[s]}),new r.Gauge({name:"xrnotify_dlq_depth",help:"Current depth of the dead letter queue",registers:[s]}),new r.Histogram({name:"xrnotify_queue_processing_duration_seconds",help:"Time to process a batch from the queue",buckets:[.01,.05,.1,.25,.5,1,2.5,5],registers:[s]}),new r.Gauge({name:"xrnotify_db_pool_total",help:"Total number of database pool connections",registers:[s]})),u=new r.Gauge({name:"xrnotify_db_pool_idle",help:"Number of idle database pool connections",registers:[s]}),d=new r.Gauge({name:"xrnotify_db_pool_waiting",help:"Number of clients waiting for database connection",registers:[s]});function f(e,t){o.inc(e),i.observe(e,t)}function m(){a.inc()}function _(){a.dec()}function h(e){l.set(e)}function g(e,t,n){c.set(e),u.set(t),d.set(n)}async function p(){return await s.metrics()}function w(){return s.contentType}new r.Histogram({name:"xrnotify_db_query_duration_seconds",help:"Database query duration in seconds",labelNames:["operation"],buckets:[.001,.005,.01,.025,.05,.1,.25,.5,1],registers:[s]}),new r.Histogram({name:"xrnotify_redis_operation_duration_seconds",help:"Redis operation duration in seconds",labelNames:["operation"],buckets:[.001,.005,.01,.025,.05,.1,.25],registers:[s]}),new r.Gauge({name:"xrnotify_tenants_total",help:"Total number of tenants",labelNames:["plan"],registers:[s]}),new r.Gauge({name:"xrnotify_api_keys_total",help:"Total number of active API keys",registers:[s]}),new r.Counter({name:"xrnotify_events_processed_total",help:"Total events processed (for billing)",labelNames:["tenant_id"],registers:[s]})},78045:(e,t,n)=>{n.d(t,{Dn:()=>u,EF:()=>m});var r=n(18500),s=n(7842),o=n(63518);let i=`
  local key = KEYS[1]
  local max_tokens = tonumber(ARGV[1])
  local window_seconds = tonumber(ARGV[2])
  local burst_size = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local cost = tonumber(ARGV[5])
  
  -- Get current state
  local data = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(data[1])
  local last_refill = tonumber(data[2])
  
  -- Initialize if first request
  if not tokens then
    tokens = max_tokens + burst_size
    last_refill = now
  end
  
  -- Calculate token refill
  local elapsed = now - last_refill
  local refill_rate = max_tokens / window_seconds
  local refill_amount = elapsed * refill_rate
  
  -- Refill tokens (capped at max + burst)
  tokens = math.min(max_tokens + burst_size, tokens + refill_amount)
  last_refill = now
  
  -- Check if request can be allowed
  local allowed = 0
  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
  end
  
  -- Calculate reset time
  local tokens_needed = cost - tokens
  local reset_seconds = 0
  if tokens_needed > 0 then
    reset_seconds = math.ceil(tokens_needed / refill_rate)
  end
  
  -- Save state
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
  redis.call('EXPIRE', key, window_seconds * 2)
  
  return {allowed, math.floor(tokens), reset_seconds}
`,a=(0,o.YX)("rate-limit");class l{constructor(e){this.scriptSha=null,this.config={maxTokens:e.maxTokens,windowSizeSeconds:e.windowSizeSeconds,burstSize:e.burstSize??Math.ceil(.1*e.maxTokens),keyPrefix:e.keyPrefix??"ratelimit:"}}async check(e,t=1){let n=(0,s.Lw)(`${this.config.keyPrefix}${e}`),r=Math.floor(Date.now()/1e3);try{let s=await this.executeScript(n,r,t),i=1===s[0],l=Math.max(0,s[1]??0),c=s[2]??0;return i||(0,o.oy)(a,"rate_limited",{identifier:e,remaining:l,resetSeconds:c}),{allowed:i,remaining:l,limit:this.config.maxTokens,resetInSeconds:c,retryAfter:i?void 0:c}}catch(t){return a.error({error:t,identifier:e},"Rate limit check failed"),{allowed:!0,remaining:this.config.maxTokens,limit:this.config.maxTokens,resetInSeconds:0}}}async consume(e,t=1){await this.check(e,t)}async getInfo(e){let t=(0,s.Lw)(`${this.config.keyPrefix}${e}`),n=(0,r.QY)(),o=await n.hmget(t,"tokens","last_refill");return o[0]&&o[1]?{tokens:parseFloat(o[0]),lastRefill:parseInt(o[1],10)}:null}async reset(e){let t=(0,s.Lw)(`${this.config.keyPrefix}${e}`);await (0,r.QY)().del(t),a.debug({identifier:e},"Rate limit reset")}async executeScript(e,t,n){let s=(0,r.QY)();if(this.scriptSha)try{return await s.evalsha(this.scriptSha,1,e,this.config.maxTokens,this.config.windowSizeSeconds,this.config.burstSize,t,n)}catch(e){if(!(e instanceof Error)||!e.message.includes("NOSCRIPT"))throw e;this.scriptSha=null}return this.scriptSha=await s.script("LOAD",i),await s.evalsha(this.scriptSha,1,e,this.config.maxTokens,this.config.windowSizeSeconds,this.config.burstSize,t,n)}}let c=null;async function u(e,t){let n=t??function(){if(!c){let e=(0,s.iE)();c=new l({maxTokens:e.rateLimit.requestsPerMinute,windowSizeSeconds:60,burstSize:e.rateLimit.burst,keyPrefix:"ratelimit:api:"})}return c}(),r=await n.check(e),o={"X-RateLimit-Limit":String(r.limit),"X-RateLimit-Remaining":String(r.remaining),"X-RateLimit-Reset":String(Math.floor(Date.now()/1e3)+r.resetInSeconds)};return!r.allowed&&r.retryAfter&&(o["Retry-After"]=String(r.retryAfter)),{allowed:r.allowed,headers:o,retryAfter:r.retryAfter}}class d{constructor(e="usage:"){this.keyPrefix=e}async increment(e,t,n=1){let o=(0,r.QY)(),i=new Date,a=`${i.getUTCFullYear()}-${String(i.getUTCMonth()+1).padStart(2,"0")}`,l=(0,s.Lw)(`${this.keyPrefix}${e}:${t}:${a}`),c=await o.incrby(l,n);return await o.expire(l,3888e3),c}async getUsage(e,t,n){let o=(0,r.QY)(),i=n??this.getCurrentMonth(),a=(0,s.Lw)(`${this.keyPrefix}${e}:${t}:${i}`),l=await o.get(a);return l?parseInt(l,10):0}async getUsageHistory(e,t,n=6){let o=(0,r.QY)(),i=[];for(let r=0;r<n;r++){let n=new Date;n.setUTCMonth(n.getUTCMonth()-r);let a=`${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}`,l=(0,s.Lw)(`${this.keyPrefix}${e}:${t}:${a}`),c=await o.get(l);i.push({month:a,usage:c?parseInt(c,10):0})}return i.reverse()}getCurrentMonth(){let e=new Date;return`${e.getUTCFullYear()}-${String(e.getUTCMonth()+1).padStart(2,"0")}`}}let f=null;function m(){return f||(f=new d("usage:events:")),f}}};