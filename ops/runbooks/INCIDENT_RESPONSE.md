# XRNotify - Incident Response Runbook

## Overview

This runbook provides procedures for identifying, responding to, and resolving incidents affecting the XRNotify platform. All team members should be familiar with these procedures.

---

## Table of Contents

1. [Incident Severity Levels](#incident-severity-levels)
2. [On-Call Responsibilities](#on-call-responsibilities)
3. [Incident Response Process](#incident-response-process)
4. [Communication Templates](#communication-templates)
5. [Common Incidents & Resolutions](#common-incidents--resolutions)
6. [Post-Incident Process](#post-incident-process)
7. [Escalation Paths](#escalation-paths)
8. [Contact Information](#contact-information)

---

## Incident Severity Levels

### SEV-1: Critical

**Definition**: Complete service outage or data loss affecting all customers.

**Examples**:
- API returning 5xx for all requests
- Database corruption or data loss
- Security breach or data exposure
- All webhook deliveries failing

**Response Time**: Immediate (< 5 minutes)
**Resolution Target**: < 1 hour
**Communication**: Immediate status page update, customer notification within 15 minutes

---

### SEV-2: Major

**Definition**: Significant degradation affecting many customers or critical functionality.

**Examples**:
- Webhook delivery delays > 5 minutes
- XRPL listener disconnected > 2 minutes
- API latency > 5 seconds
- Partial outage (one region or service)

**Response Time**: < 15 minutes
**Resolution Target**: < 4 hours
**Communication**: Status page update within 15 minutes

---

### SEV-3: Minor

**Definition**: Limited impact affecting few customers or non-critical functionality.

**Examples**:
- Dashboard UI issues
- Metrics not updating
- Single customer webhook failures
- Documentation errors

**Response Time**: < 1 hour
**Resolution Target**: < 24 hours
**Communication**: Status page update if customer-facing

---

### SEV-4: Low

**Definition**: Minimal impact, cosmetic issues, or improvement opportunities.

**Examples**:
- Minor UI bugs
- Log formatting issues
- Non-critical performance improvements

**Response Time**: Next business day
**Resolution Target**: Next sprint
**Communication**: None required

---

## On-Call Responsibilities

### Primary On-Call

- Acknowledge alerts within 5 minutes
- Assess severity and begin initial response
- Escalate to secondary if unable to resolve within 30 minutes
- Update status page and stakeholders
- Document all actions taken

### Secondary On-Call

- Available for escalation
- Provide expertise for complex issues
- Take over if primary is unavailable
- Assist with customer communication

### On-Call Schedule

- Rotations: Weekly, Monday 9 AM UTC to Monday 9 AM UTC
- Schedule maintained in PagerDuty/Opsgenie
- Swap requests: Minimum 24 hours notice

### On-Call Tools Access Required

- [ ] Fly.io dashboard and CLI
- [ ] Database access (read-only production)
- [ ] Redis access
- [ ] Grafana dashboards
- [ ] PagerDuty/Opsgenie
- [ ] Status page admin
- [ ] Slack #incidents channel

---

## Incident Response Process

### Phase 1: Detection & Alert (0-5 minutes)

