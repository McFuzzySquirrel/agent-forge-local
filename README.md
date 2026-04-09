# Agent Forge Local

> Can we run a mcfuzzy-agent-forge local only and use EJS as the context management as well

## Overview

This repository has been refactored to serve as a test harness for evaluating different combinations of **agent-forge** (CLI cloud) and **agent-forge-local** (CLI local) for PRD creation, agent generation, and build execution — with **EJS (Engineering Journey System)** bootstrapped throughout as the context management layer.

---

## Test Scenarios

Three distinct test scenarios are being evaluated, each on its own branch:

### Test 1 — CLI Cloud: End-to-End (`test/1-cloud-end-to-end`)

- Create PRD using **CLI cloud** (agent-forge)
- Generate agents using **CLI cloud** (agent-forge)
- Execute / build using **CLI cloud** (agent-forge)
- EJS is bootstrapped and records the full journey

### Test 2 — CLI Local: End-to-End (`test/2-local-end-to-end`)

- Create PRD using **CLI local** (agent-forge-local)
- Generate agents using **CLI local** (agent-forge-local)
- Execute / build using **CLI local** (agent-forge-local)
- EJS is bootstrapped and records the full journey

### Test 3 — CLI Cloud PRD/Agents → CLI Local Execution (`test/3-cloud-prd-local-execute`)

- Create PRD using **CLI cloud** (agent-forge)
- Generate agents using **CLI cloud** (agent-forge)
- Execute / build using **CLI local** (agent-forge-local)
- EJS is bootstrapped and records the full journey

---

## Branch Structure

| Branch | Test |
|--------|------|
| `test/1-cloud-end-to-end` | Test 1 — Full CLI cloud workflow |
| `test/2-local-end-to-end` | Test 2 — Full CLI local workflow |
| `test/3-cloud-prd-local-execute` | Test 3 — Cloud PRD/agents, local execution |
| `main` | Bootstrapped base with EJS integration |

---

## EJS Integration

EJS (Engineering Journey System) is bootstrapped across all three tests. It serves as the shared context management layer, recording decisions, agent interactions, and outcomes for each session. Journey files are stored under `ejs-docs/journey/`.

To enable EJS write-back, set `ejs.write_enabled: true` in your config.

