# XRNotify - Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Complete service outage | 15 minutes | Platform down, all webhooks failing |
| **SEV2** | Major degradation | 30 minutes | >50% webhook failures, XRPL disconnected |
| **SEV3** | Minor degradation | 2 hours | Elevated latency, partial failures |
| **SEV4** | Low impact | 24 hours | Single tenant issues, UI bugs |

## Incident Command Structure

```
┌─────────────────┐
│ Incident Lead   │ ← Single point of coordination
├─────────────────┤
│ Communications  │ ← Customer updates, status page
│ Engineering     │ ← Investigation & fix
│ Operations      │ ← Infrastructure & scaling
└─────────────────┘
```

## Initial Response Checklist

### 1. Acknowledge & Assess (First 5 minutes)

- [ ] Acknowledge alert/report
- [ ] Open incident channel (Slack: #incident-YYYYMMDD)
- [ ] Assess severity level
- [ ] Assign Incident Lead
- [ ] Start incident timeline log

### 2. Triage (Next 10 minutes)

- [ ] Check health endpoints
- [ ] Review Grafana dashboards
- [ ] Check recent deployments
- [ ] Identify blast radius (which tenants affected?)

### 3. Communicate (Within 15 minutes for SEV1/2)

- [ ] Update status page
- [ ] Notify affected enterprise customers
- [ ] Post to Twitter/X if public-facing

---

## Quick Diagnostics

### Health Check Commands

```bash
# Platform health
curl -s https://api.xrnotify.io/api/health | jq

# Readiness (DB, Redis, XRPL)
curl -s https://api.xrnotify.io/api/ready | jq

# Fly.io status
fly status -a xrnotify-platform
fly status -a xrnotify-worker
fly status -a xrnotify-listener
```

### Log Commands

```bash
# Recent platform errors
fly logs -a xrnotify-platform | grep -i error | tail -50

# Worker logs
fly logs -a xrnotify-worker | tail -100

# Listener logs
fly logs -a xrnotify-listener | tail -100

# SSH into container for debugging
fly ssh console -a xrnotify-platform
```

### Database Checks

```bash
# Connect to database
fly postgres connect -a xrnotify-db

# Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'xrnotify';

# Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

# Recent deliveries status
SELECT status, count(*) 
FROM deliveries 
WHERE created_at > now() - interval '1 hour' 
GROUP BY status;
```

### Redis Checks

```bash
# Connect to Redis (via platform container)
fly ssh console -a xrnotify-platform
redis-cli -u $REDIS_URL

# Check queue depth
XLEN xrnotify:events:live
XLEN xrnotify:events:dlq

# Check pending messages
XPENDING xrnotify:events:live webhook-workers

# Memory usage
INFO memory
```

---

## Common Incidents

### INC-001: Webhook Delivery Failures Spike

**Symptoms:**
- Grafana shows increased failed deliveries
- Alert: `webhook_failure_rate > 10%`

**Diagnosis:**
```bash
# Check recent failures by error type
fly postgres connect -a xrnotify-db -c "
  SELECT error_code, count(*) 
  FROM deliveries 
  WHERE status = 'failed' 
    AND created_at > now() - interval '1 hour'
  GROUP BY error_code
  ORDER BY count DESC
  LIMIT 10;
"
```

**Common Causes & Fixes:**

| Error Code | Cause | Fix |
|------------|-------|-----|
| `TIMEOUT` | Customer endpoints slow | Increase timeout, notify customer |
| `CONNECTION_REFUSED` | Customer endpoint down | Notify customer, events will retry |
| `SSL_ERROR` | Certificate issues | Check customer cert validity |
| `DNS_RESOLUTION` | DNS failure | Check if widespread or single tenant |
| `RATE_LIMITED` | Customer rate limiting us | Back off, notify customer |

**If widespread:**
1. Check if issue is with our outbound IPs
2. Verify no network policy changes
3. Check Fly.io status page

---

### INC-002: XRPL Listener Disconnected

**Symptoms:**
- No new events being processed
- Alert: `xrpl_connection_status == 0`
- Grafana shows flat event rate

**Diagnosis:**
```bash
# Check listener status
fly logs -a xrnotify-listener | grep -E "(connect|disconnect|error)" | tail -20

# Check current ledger vs processed
fly postgres connect -a xrnotify-db -c "
  SELECT * FROM ledger_cursor ORDER BY updated_at DESC LIMIT 1;
"
```

**Resolution:**

1. **Restart Listener:**
   ```bash
   fly apps restart xrnotify-listener
   ```

2. **If Primary Node Down:**
   ```bash
   # Check XRPL node status
   curl -s https://xrplcluster.com | head -20
   
   # Switch to fallback (update env)
   fly secrets set XRPL_WS_URL="wss://s1.ripple.com" -a xrnotify-listener
   ```

3. **If All Nodes Down:**
   - Check XRPL network status: https://livenet.xrpl.org/
   - This is an XRPL-wide issue; communicate to customers

**Recovery Verification:**
```bash
# Verify events flowing
fly logs -a xrnotify-listener | grep "ledger_closed"

# Check queue is filling
redis-cli -u $REDIS_URL XLEN xrnotify:events:live
```

---

### INC-003: Database Connection Pool Exhausted

**Symptoms:**
- API returning 500 errors
- Alert: `db_pool_waiting > 10`
- Logs show "connection pool exhausted"

**Diagnosis:**
```bash
# Check pool stats
curl -s https://api.xrnotify.io/api/ready | jq '.checks.database'

# Check active connections
fly postgres connect -a xrnotify-db -c "
  SELECT application_name, state, count(*) 
  FROM pg_stat_activity 
  WHERE datname = 'xrnotify'
  GROUP BY application_name, state;
"
```

**Resolution:**

1. **Kill Idle Connections:**
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'xrnotify' 
     AND state = 'idle' 
     AND state_change < now() - interval '10 minutes';
   ```

2. **Increase Pool Size (temporary):**
   ```bash
   fly secrets set DB_POOL_MAX=20 -a xrnotify-platform
   fly apps restart xrnotify-platform
   ```

3. **Scale Database:**
   ```bash
   fly postgres scale -a xrnotify-db --vm-size shared-cpu-2x
   ```

**Root Cause Investigation:**
- Check for slow queries
- Review recent code changes
- Look for connection leaks

---

### INC-004: Redis Memory Full

**Symptoms:**
- Queue operations failing
- Alert: `redis_memory_usage > 90%`

**Diagnosis:**
```bash
fly ssh console -a xrnotify-platform
redis-cli -u $REDIS_URL INFO memory
redis-cli -u $REDIS_URL DBSIZE
```

**Resolution:**

1. **Flush DLQ if necessary:**
   ```bash
   # WARNING: This deletes failed events
   redis-cli -u $REDIS_URL DEL xrnotify:events:dlq
   ```

2. **Trim Old Events:**
   ```bash
   # Keep only last 100k events
   redis-cli -u $REDIS_URL XTRIM xrnotify:events:live MAXLEN ~ 100000
   ```

3. **Upgrade Redis:**
   - Contact Upstash to upgrade plan
   - Or migrate to larger instance

---

### INC-005: High API Latency

**Symptoms:**
- Slow dashboard
- Alert: `http_request_duration_p99 > 2s`

**Diagnosis:**
```bash
# Check slow endpoints
fly logs -a xrnotify-platform | grep "duration" | sort -t= -k2 -rn | head -20
```

**Resolution:**

1. **Scale Platform:**
   ```bash
   fly scale count 4 -a xrnotify-platform
   ```

2. **Check Database:**
   ```sql
   -- Find slow queries
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Check for Missing Indexes:**
   ```sql
   -- Tables with sequential scans
   SELECT relname, seq_scan, idx_scan
   FROM pg_stat_user_tables
   WHERE seq_scan > idx_scan
   ORDER BY seq_scan DESC;
   ```

---

### INC-006: Stuck/Pending Deliveries

**Symptoms:**
- Events not being delivered
- Queue depth increasing
- Workers appear idle

**Diagnosis:**
```bash
# Check pending messages
redis-cli -u $REDIS_URL XPENDING xrnotify:events:live webhook-workers

# Check consumer info
redis-cli -u $REDIS_URL XINFO GROUPS xrnotify:events:live
```

**Resolution:**

1. **Claim Stuck Messages:**
   ```bash
   # Claim messages idle for >5 minutes
   redis-cli -u $REDIS_URL XAUTOCLAIM xrnotify:events:live webhook-workers worker-1 300000 0-0 COUNT 100
   ```

2. **Restart Workers:**
   ```bash
   fly apps restart xrnotify-worker
   ```

3. **If Consumer Group Corrupted:**
   ```bash
   # WARNING: May reprocess some events
   redis-cli -u $REDIS_URL XGROUP DESTROY xrnotify:events:live webhook-workers
   redis-cli -u $REDIS_URL XGROUP CREATE xrnotify:events:live webhook-workers 0 MKSTREAM
   ```

---

## Post-Incident

### Immediate (Within 1 hour)

- [ ] Confirm service restored
- [ ] Update status page to resolved
- [ ] Notify affected customers
- [ ] Capture timeline and actions taken

### Follow-up (Within 48 hours)

- [ ] Write post-mortem document
- [ ] Identify root cause
- [ ] Create action items to prevent recurrence
- [ ] Schedule post-mortem review meeting

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** SEV-X
**Lead:** [Name]

## Summary
[2-3 sentence summary]

## Impact
- X webhooks failed
- Y customers affected
- Z minutes of downtime

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |

## Root Cause
[Detailed explanation]

## Resolution
[What was done to fix it]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| Add monitoring for X | @engineer | YYYY-MM-DD |
| Implement circuit breaker | @engineer | YYYY-MM-DD |

## Lessons Learned
- What went well
- What could be improved
```

---

## Escalation Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-Call Engineer | PagerDuty | All SEV1/SEV2 |
| Engineering Lead | [Phone/Slack] | SEV1, extended SEV2 |
| Infrastructure | [Phone/Slack] | Database, network issues |
| Customer Success | [Slack] | Customer communications |

---

## Status Page Updates

### Templates

**Investigating:**
> We are investigating reports of [issue]. Some users may experience [symptoms]. We will provide updates as we learn more.

**Identified:**
> We have identified the cause of [issue] and are working on a fix. [Brief explanation]. ETA for resolution: [time].

**Resolved:**
> The issue affecting [service] has been resolved. [Brief explanation of fix]. We apologize for any inconvenience.

### Status Page URL
- Admin: https://manage.statuspage.io/pages/xrnotify
- Public: https://status.xrnotify.io
