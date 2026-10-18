# aiOS modules

Each module is a playbook an agent can execute end to end. Every module file uses the same contract:

- **Purpose**: the one job this module does.
- **When to run**: trigger or cadence.
- **Inputs**: what the agent needs (files in `workspace/`, exports, owner answers).
- **Procedure**: numbered steps the agent follows.
- **Decision rules**: thresholds and if/then rules. The agent recommends, and the human decides.
- **Outputs**: files the agent writes, using `templates/`.
- **Human gate**: what must go to the owner for approval, usually through the Content Review app.
- **Agent prompt spec**: a system prompt you can paste into any agent.

| # | Module | One-line job |
|---|---|---|
| 00 | [Operating principles](00-operating-principles.md) | The rules every other module obeys |
| 01 | [Opportunity & offer fit](01-opportunity-offer-fit.md) | Decide what to sell, to whom, where, at what price |
| 02 | [Creator partnerships](02-creator-partnerships.md) | Find, reach, and keep the right creators |
| 03 | [Content engine](03-content-engine.md) | Produce short videos and posts that sell, and turn winners into reusable assets |
| 04 | [Paid amplification](04-paid-amplification.md) | Put money behind proven assets, by growth stage |
| 05 | [Measure & learn](05-measure-and-learn.md) | Run the hypothesis ledger, diagnosis, and retrospectives |
| 06 | [Operating cadence](06-operating-cadence.md) | The daily, weekly, and 30-day rhythm that ties it together |
| 07 | [AI-native team](07-ai-native-team.md) | Turn roles into SOPs and SOPs into agents |
| 08 | [Channel flywheel](08-channel-flywheel.md) | Ignite demand on creator platforms, then capture and compound it in owned channels |

Recommended order for a new business: 00 → 01 → 05 (set up the ledger) → 02 + 03 in parallel → 04 → 06 → 07 → 08.
