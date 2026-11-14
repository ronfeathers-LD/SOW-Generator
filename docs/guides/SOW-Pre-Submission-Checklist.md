# SOW Pre-Submission Checklist

**Why this exists:** Since launching the SOW Generator, we've had **43 rejections across 25 SOWs**. Many of these rejections are for the same recurring issues — things that could be caught and fixed before hitting "Submit for Approval." Every rejection creates rework for the author, delays for the approver, and slows down the deal.

This checklist is built directly from the actual rejection comments logged in the tool. **Please review this before submitting any SOW for approval.**

---

## 1. Salesforce Tenants Count

**This is the single most common factual error.**

Salesforce Tenants refers to the number of Salesforce **orgs** we'll need to work in — not the number of users. If the customer has even one sandbox, the count should be at least **2** (1 sandbox + 1 production).

Before submitting, ask yourself:
- [ ] Is the customer building directly in production? If not, Salesforce Tenants must be > 1.
- [ ] Does the tenant count match what was discussed in discovery?

> *Flagged on: Intentsify, Celigo, Discovery Life Sciences, Novara, AppOmni, and others*

---

## 2. Remove Scope Bloat from AI-Generated Content

The AI objectives wizard pulls from call transcripts and tends to generate sections that are either too broad, redundant, or not things LeanData actually implements. **You are expected to edit the AI output — not submit it as-is.**

Common sections that should almost always be removed or heavily trimmed:
- [ ] **Integrations** — If integrations are already called out in product-specific scope sections, remove the standalone Integrations section.
- [ ] **SLA Management** — Usually redundant with items in other sections.
- [ ] **Matching & Deduplication** — Often too basic to warrant its own section.
- [ ] **Sandbox Environment** — Not a scope item.
- [ ] **Development & Deployment** — Not a scope item.
- [ ] **Scalability & Future Growth** — Remove unless there's a specific, agreed-upon growth plan.
- [ ] **User & Pool Management** — Usually not needed.
- [ ] **Technical Requirements** — Not a scope item.
- [ ] **Project Management** (as a scope section) — Not a scope item.

**Rule of thumb:** If a section describes something that's either a given, a future consideration, or already covered elsewhere — remove it.

> *Flagged on: HeyJobs, N8N, Celigo, Lean Technologies, Rockbot, Novara, and others*

---

## 3. Don't Include User/License Counts in Scope Bullets

Scope items should describe **what we're building**, not how many licenses the customer purchased. Lines like "Connect 60 calendars for BDRs and AEs" or "Connect 12 calendars for go-live" don't belong in the scope.

- [ ] Remove any scope bullets that simply restate the number of users or licenses.
- [ ] License/user counts belong in the Products section, not in scope descriptions.

> *Flagged on: Intentsify, EverTrue, Lean Technologies*

---

## 4. Client Roles and Contact Information

Missing or incorrect role information is a frequent rejection trigger. The SOW pulls titles from Salesforce, and when those are blank, the SOW displays "N/A" — which looks unprofessional on a customer-facing document.

- [ ] **Check every client role** — Does each person have an actual title? If Salesforce shows blank/N/A, manually update it or contact the AE.
- [ ] **Check LeanData roles** — Are responsibilities populated for all internal roles? If blank, use the **"Reset Role Hours"** button on the Team Roles tab.
- [ ] **No duplicate contacts** — If a person has multiple responsibilities, combine them into one entry instead of listing the person twice.
- [ ] **Signer details** — Is the signer's email a legitimate company email? Gmail addresses on a signer should be questioned.
- [ ] **Billing email** — Same check. A gmail billing address for a corporate customer is a red flag.

> *Flagged on: N8N, Rockbot, Intentsify, Novara, AppOmni, Discovery Life Sciences, Celigo, Verato*

---

## 5. Product List Must Match Scope

If a product is listed in the Products section, it must have corresponding scope items. If scope references a product, it must be in the Products list. Mismatches get rejected.

- [ ] Every product in the Products section has scope items written for it.
- [ ] Every product referenced in the scope is included in the Products section.
- [ ] If a product was discussed but isn't being implemented, **remove it entirely** — do not leave it with "Specific solutions for this product were not discussed in detail."

> *Flagged on: Lean Technologies, N8N, Novara*

---

## 6. Lead vs. Contact Scope Accuracy

This is a domain knowledge issue, but it comes up repeatedly. Lead FlowBuilder and Contact FlowBuilder have different capabilities. Don't mix them up.

- [ ] **Contact FlowBuilder does not do lead-to-account matching.** Remove references to "existing leads" or "lead matching" from Contact FlowBuilder scope.
- [ ] **Contact FlowBuilder cannot create new accounts.** Don't promise it.
- [ ] **Lead conversion belongs in Lead FlowBuilder**, not Contact FlowBuilder.
- [ ] If the customer is building Lead Router themselves, explicitly call out what the **client** is responsible for vs. what **we** are implementing.

> *Flagged on: Crescendo, Discovery Life Sciences, SmartBear Software, HeyJobs*

---

## 7. Remove Redundant Scope Items

Each scope bullet should say something unique. If two bullets describe the same capability in slightly different words, consolidate or remove the duplicate.

- [ ] Read through all scope bullets — are any of them restating the same thing?
- [ ] Are any scope items already covered as a Key Objective? Scope should describe *what we build*, objectives describe *what the customer achieves*. Don't duplicate between them.
- [ ] Remove items that are "a given" and don't need to be explicitly stated (e.g., business hours configuration, connecting calendars).

> *Flagged on: HeyJobs, Lean Technologies, Yubico, Verato*

---

## 8. Be Specific, Not Vague

Vague scope items get rejected because they create ambiguity about what's actually being delivered. If a scope item could mean anything, it means nothing.

- [ ] Replace "notification structures" with specific notification types.
- [ ] If referencing an integration (e.g., Nooks, Lemlist, Outreach), specify exactly what the integration entails — or remove it if it's not part of this implementation.
- [ ] If referencing web forms, specify how many and whether they share logic.
- [ ] If calling out a timeline constraint (e.g., website freeze, SFDC deployment date), explain how it impacts the project timeline.

> *Flagged on: Intentsify, Lean Technologies, Crescendo, Verato, Novara*

---

## 9. Don't Commit to Specific Dates or Metrics in Scope

Avoid hard dates and performance targets in scope and objectives unless the customer has explicitly agreed to them and leadership has signed off.

- [ ] Remove specific go-live dates from scope (e.g., "live by April 10th"). Timelines belong in the project schedule, not embedded in objectives.
- [ ] Remove conversion rate or performance improvement targets (e.g., "increase conversion by 10%") unless explicitly agreed upon.
- [ ] Verify that the project duration (6 weeks vs. standard 8 weeks) is intentional, not a typo.

> *Flagged on: Novara, Yubico, Verato, Crescendo*

---

## 10. Address Every Comment Before Resubmitting

When a SOW is rejected, the approver leaves comments explaining what needs to change. **Every comment must be addressed before resubmitting.** Multiple SOWs have been rejected a second or third time because prior feedback was ignored or only partially applied.

- [ ] Before resubmitting a revision, re-read **every comment** from the previous rejection.
- [ ] If a comment asks a question, answer it in a reply — don't just silently change (or not change) the SOW.
- [ ] If you disagree with a comment, reply explaining why — don't ignore it.

> *Flagged on: Novara (3 rejections), Lean Technologies (3 rejections), Verato (4 rejections), Crescendo (4 rejections)*

---

## 11. Logo Quality

If you're uploading a customer logo, make sure it displays correctly in the SOW preview before submitting.

- [ ] Check the logo in the Print Preview — is it cut off on any side?
- [ ] If you can't find a clean version of the logo, it's better to remove it entirely than to submit a cropped or distorted version.

> *Flagged on: HeyJobs, Verato*

---

## Quick Reference: The 30-Second Pre-Submit Scan

Before clicking Submit for Approval, do one final pass:

1. **Salesforce Tenants** — Is it > 1 if they have a sandbox?
2. **Client roles** — Any "N/A" titles or blank responsibilities?
3. **Products vs. Scope** — Do they match?
4. **Scope bloat** — Any generic AI sections that should be removed?
5. **Redundancy** — Any bullet saying the same thing twice?
6. **Specificity** — Any vague promises or items we can't actually deliver?
7. **Prior comments** — If this is a resubmission, was every comment addressed?
8. **Logo & signer** — Does the preview look professional?

---

*This checklist was generated from 43 actual rejection records and their associated approval comments in the SOW Generator, covering October 2025 through April 2026.*
