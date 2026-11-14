# Slack Notification Examples for Multi-Step Approval

## 📱 Notification Design

### Example 1: Stage Started (Professional Services)
**Trigger:** SOW submitted for review, first stage becomes pending

```json
{
  "text": "🎯 New SOW Requires Approval",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🎯 SOW Requires Your Approval"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*SOW:*\nCustomer Migration Project"
        },
        {
          "type": "mrkdwn",
          "text": "*Client:*\nAcme Corporation"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📋 *Current Stage: Professional Services*\n`Pending` - Awaiting your review"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Approval Workflow:*\n"
      },
      "fields": [
        {
          "type": "mrkdwn",
          "text": "✅ <https://sow-url|View SOW>"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "🕐 Submitted on Jan 15, 2024 | 📊 Progress: 0% (0 of 3 stages)"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*📋 Remaining Approvals:*\n"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "⏳ *Stage 2:* Project Management (PMO team)\n⏳ *Stage 3:* Sr. Leadership"
      }
    }
  ]
}
```

**Visual Representation:**
```
╔══════════════════════════════════════╗
║ 🎯 SOW Requires Your Approval        ║
╠══════════════════════════════════════╣
║ SOW: Customer Migration Project     ║
║ Client: Acme Corporation            ║
╠══════════════════════════════════════╣
║ 📋 Current Stage: Professional       ║
║ Services                              ║
║ [Pending] Awaiting your review       ║
╠══════════════════════════════════════╣
║ ✅ [View SOW Button]                ║
╠══════════════════════════════════════╣
║ 🕐 Submitted on Jan 15, 2024        ║
║ 📊 Progress: 0% (0 of 3 stages)     ║
╠══════════════════════════════════════╣
║ 📋 Remaining Approvals:              ║
║   ⏳ Stage 2: Project Management     ║
║      (PMO team)                      ║
║   ⏳ Stage 3: Sr. Leadership         ║
╚══════════════════════════════════════╝
```

---

### Example 2: Stage Approved (Moving to Next)
**Trigger:** Professional Services approved, moving to PMO

```json
{
  "text": "✅ SOW Approved - Next Stage Required",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ SOW Approved - Next Review Required"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Professional Services* stage approved by *<@U12345> John Smith*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*SOW:*\nCustomer Migration Project"
        },
        {
          "type": "mrkdwn",
          "text": "*Client:*\nAcme Corporation"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📋 *Current Stage: Project Management*\n`Pending` - PMO team review required"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📊 Progress: 33% (1 of 3 stages completed)\n✅ Professional Services ✓\n⏳ Project Management (Your turn!) ⏳\n⏳ Sr. Leadership"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "<@U67890> You can approve this stage if you have PMO permissions"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Review & Approve"
          },
          "style": "primary",
          "url": "https://sow-url"
        }
      ]
    }
  ]
}
```

**Visual Representation:**
```
╔══════════════════════════════════════╗
║ ✅ SOW Approved - Next Review       ║
║ Required                             ║
╠══════════════════════════════════════╣
║ Professional Services ✓ approved by  ║
║ John Smith                           ║
╠══════════════════════════════════════╣
║ SOW: Customer Migration Project     ║
║ Client: Acme Corporation            ║
╠══════════════════════════════════════╣
║ 📋 Current Stage: Project           ║
║ Management                            ║
║ [Pending] PMO review required        ║
╠══════════════════════════════════════╣
║ 📊 Progress: 33% (1 of 3 stages)    ║
║ ✅ Professional Services ✓           ║
║ ⏳ Project Management [Your Turn!]   ║
║ ⏳ Sr. Leadership                     ║
╠══════════════════════════════════════╣
║ You can approve this if you're PMO  ║
║ [Review & Approve Button]           ║
╚══════════════════════════════════════╝
```

---

### Example 3: All Stages Complete
**Trigger:** Sr. Leadership approved, SOW fully approved

```json
{
  "text": "🎉 SOW Fully Approved!",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🎉 SOW Fully Approved - Ready for Client!"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*SOW:*\nCustomer Migration Project"
        },
        {
          "type": "mrkdwn",
          "text": "*Client:*\nAcme Corporation"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Sr. Leadership* stage approved by *<@U11111> Sarah Johnson*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "✅ *All Stages Complete!*\n\n✅ Professional Services (approved by John Smith)\n✅ Project Management (approved by Jane Doe)\n✅ Sr. Leadership (approved by Sarah Johnson)"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📊 *Progress: 100%*\n🎯 SOW is now ready for client signature"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "⏱️ Total approval time: 2 days"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Approved SOW"
          },
          "style": "primary",
          "url": "https://sow-url"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Export for Client"
          },
          "url": "https://sow-export-url"
        }
      ]
    }
  ]
}
```

---

### Example 4: Stage Rejected
**Trigger:** A stage was rejected

```json
{
  "text": "❌ SOW Rejected",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "❌ SOW Rejected - Requires Revisions"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*SOW:*\nCustomer Migration Project"
        },
        {
          "type": "mrkdwn",
          "text": "*Client:*\nAcme Corporation"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Project Management* stage rejected by *<@U67890> Jane Doe*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Reason:*\nTimeline is too aggressive for the scope. Please extend by 2 weeks."
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📋 *Approval Progress:*\n✅ Professional Services (completed)\n❌ Project Management (rejected)\n⏳ Sr. Leadership (cancelled)"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "💬 SOW has been returned to draft status. Please revise and resubmit."
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Edit SOW"
          },
          "style": "primary",
          "url": "https://sow-edit-url"
        }
      ]
    }
  ]
}
```

---

### Example 5: Conditional PMO (2-Stage Workflow)
**Trigger:** Small SOW, no PMO stage required

```json
{
  "text": "SOW Ready for Final Approval",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ Ready for Final Approval"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Professional Services* stage approved by *<@U12345> John Smith*"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*SOW:*\nSmall Implementation Project"
        },
        {
          "type": "mrkdwn",
          "text": "*Client:*\nSmall Corp"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "ℹ️ *Note:* This SOW does not include PM hours, so PMO review is not required."
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "📊 Progress: 50% (1 of 2 stages)\n✅ Professional Services ✓\n⏳ Sr. Leadership (awaiting approval)"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Approve Final Stage"
          },
          "style": "primary",
          "url": "https://sow-url"
        }
      ]
    }
  ]
}
```

---

## 🎨 Design Features

### Color Coding
- 🎯 Blue: New approval needed
- ✅ Green: Stage approved
- ❌ Red: Stage rejected
- ⏳ Gray: Pending/future stages
- ℹ️ Yellow: Info/warnings

### Progress Indicators
- Progress bar showing completion %
- Visual checklist of completed stages
- Current stage highlighted
- Future stages grayed out

### User Mentions
- `@user` mentions for approvers
- Direct link to SOW in button
- Context about who can approve next

### Action Buttons
- Primary action based on stage
- Multiple actions when appropriate
- Direct links to SOW view/edit

---

## 📊 Summary of Notification Types

| Trigger | Notification | Audience |
|---------|-------------|----------|
| Stage started | Current stage + who's next | Next approver |
| Stage approved | Progress update + next stage | Next approver |
| Stage rejected | Rejection reason | SOW author |
| All complete | Success + summary | All involved |
| Conditional PMO skip | Info message | Current approver |

