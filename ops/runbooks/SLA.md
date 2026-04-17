# XRNotify — Service Level Agreement
## Effective Date: April 16, 2026

---

## 1. Service Commitment

XRNotify commits to maintaining the availability and performance standards defined in this agreement for all customers on paid plans (Builder, Professional, Compliance, Enterprise).

---

## 2. Uptime Commitment

| Plan | Monthly Uptime Target | Maximum Downtime/Month |
|---|---|---|
| Builder | 99.5% | ~3.6 hours |
| Professional | 99.9% | ~43 minutes |
| Compliance | 99.9% | ~43 minutes |
| Enterprise | 99.95% | ~22 minutes |

"Uptime" is measured as the percentage of time the XRNotify API (`api.xrnotify.io/v1/*`) and webhook delivery pipeline are operational and processing events within normal latency parameters.

Excluded from uptime calculations: scheduled maintenance windows (announced 48 hours in advance), force majeure events, issues caused by customer infrastructure, and XRPL network-level outages.

---

## 3. Webhook Delivery Performance

| Metric | Target |
|---|---|
| Event detection to delivery | < 5 seconds (p95) |
| Delivery attempt timeout | 5 seconds per attempt |
| Retry policy | Up to 10 attempts over 12 hours |
| Dead-letter recovery | Available via dashboard and API |
| HMAC signature on every delivery | Guaranteed |

---

## 4. Support Response Times

| Severity | Description | Builder | Professional | Compliance | Enterprise |
|---|---|---|---|---|---|
| P1 — Critical | Platform down, deliveries stopped | 4 hours | 2 hours | 1 hour | 15 minutes |
| P2 — High | Major feature degraded | 8 hours | 4 hours | 2 hours | 1 hour |
| P3 — Medium | Minor feature issue | 24 hours | 12 hours | 4 hours | 4 hours |
| P4 — Low | Cosmetic or documentation | 72 hours | 48 hours | 24 hours | 24 hours |

Support channels: Email (all plans), dedicated Slack channel (Enterprise).

---

## 5. Service Credits

If XRNotify fails to meet the monthly uptime commitment, affected customers are eligible for service credits applied to future invoices.

| Monthly Uptime | Credit (% of Monthly Fee) |
|---|---|
| 99.0% – below target | 10% |
| 95.0% – 98.99% | 25% |
| 90.0% – 94.99% | 50% |
| Below 90.0% | 100% |

Credits must be requested within 30 days of the affected month. Maximum credit per month is 100% of that month's fee. Credits are not transferable, not redeemable for cash, and do not apply to overages or one-time fees.

---

## 6. Scheduled Maintenance

Planned maintenance that may affect service availability will be announced at least 48 hours in advance via email to affected customers. Maintenance windows are scheduled during low-traffic periods (Sunday 02:00–06:00 UTC preferred).

Emergency maintenance required for security or data integrity may occur without advance notice. Customers will be notified as soon as possible.

---

## 7. Data Retention

| Plan | Delivery Log Retention | Event Data Retention |
|---|---|---|
| Developer (Free) | 3 days | 3 days |
| Builder | 30 days | 30 days |
| Professional | 90 days | 90 days |
| Compliance | 1 year | 1 year |
| Enterprise | Custom | Custom |

---

## 8. Security Commitments

- All webhook deliveries signed with HMAC-SHA256
- API keys stored as SHA-256 hashes — raw keys never retained
- SSRF protection on all webhook delivery URLs
- TLS encryption on all API and webhook traffic
- Rate limiting on all API endpoints
- Input validation on all public endpoints
- SOC 2 Type II certification in progress

---

## 9. Termination and Data Export

Customers may cancel their subscription at any time. Upon cancellation:
- Webhook deliveries stop at the end of the current billing period
- Delivery logs and event data are available for export for 30 days after cancellation
- After 30 days, all customer data is permanently deleted
- Enterprise customers with custom retention agreements follow their contract terms

---

## 10. SLA Exclusions

This SLA does not apply to:
- Free (Developer) tier accounts
- Issues caused by customer endpoint failures or misconfigurations
- Network issues between XRNotify and customer endpoints
- XRPL network-level outages or consensus failures
- Features labeled as beta or preview
- Abuse or violation of acceptable use policies

---

## 11. Modifications

XRNotify may update this SLA with 30 days written notice to affected customers. Changes do not apply retroactively. Enterprise customers with custom SLA terms follow their contract.

---

## Contact

**Support:** support@xrnotify.io
**Enterprise Sales:** enterprise@xrnotify.io
**Licensing:** licensing@xrnotify.io

---

*XRNotify is a Jonomor ecosystem product. Built by Ali Morgan.*
*xrnotify.io — Brooklyn, New York*
