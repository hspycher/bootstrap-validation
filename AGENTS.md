# Agent instructions for bootstrap-validation

Standing conventions for any agent (human-directed or autonomous) working in
this repo. Read this before making changes.

## Conventions

- **Every new rule/behavior needs a test.** Run the test suite before
  considering a change done.
- **Before finishing any change:** tests and build must both pass clean.
  Treat a failing build or test as blocking, not a nice-to-have.
- **Never weaken or skip a test to make CI pass.** That directly defeats the
  gate standing between a broken change and main.
- **Commit messages:** short imperative summary line.

## Branch policy

- `main` is **protected**: no direct pushes, requires a pull request, and
  requires green CI. Nobody (human or agent) pushes to `main` directly.
- `dev` is the working integration branch (also the repo's default branch).
  Agents branch feature work off `dev` and open PRs **against `dev`**, not
  `main`.
- PRs targeting `main` (promoting `dev` -> `main`) do **not** auto-merge,
  even on green CI -- those are reviewed and merged by a human only. This
  is the deliberate human checkpoint before anything ships to the
  protected branch.

## PRs auto-merge into dev on green CI + ai-review -- the real safety gate

Any PR opened against `dev` auto-merges (squash) once BOTH required status
checks pass: CI (`test-and-build`) and `ai-review` (an automated review
pass -- see the `project-bootstrap` skill's `references/ai-review-setup.md`).
There is **no human review step** in between. This means:

- **Do not rely on "someone will catch it in review."** If a test doesn't
  exist for a behavior, that behavior is NOT verified before it ships --
  write the test. `ai-review` catches scope creep, secrets, and obviously
  broken code, but it is not a substitute for real test coverage.
- A failing/red CI or `ai-review` run simply never merges -- the PR sits
  open. That's the intended failure mode; don't force-merge around it.
- `ai-review`'s credential is deliberately narrower than everything else in
  this pipeline -- it can read PRs and post commit statuses, nothing else
  (verified merge-incapable and PR-comment-incapable). Actual merge
  authority lives only in a personal token inside GitHub Actions secrets,
  never on a local machine. Don't "fix" review-token limitations by handing
  it broader scope -- that defeats the reason it's separate.

## Testing changes to .github/workflows/ -- don't trust a read-through

A prior project had a literal `***` string hardcoded in an Authorization
header instead of referencing a real token variable. Every automated merge
silently 401'd for an unknown period -- it was invisible on a read-through,
and undetected because GET calls on a public repo don't need auth (so they
kept "working" and masked the one call that did need it). Nothing tested
the workflow files themselves; only application code had CI coverage.

`.github/workflows/lint-workflows.yml` + `.github/scripts/check_workflow_auth.py`
guard against this bug class now. Still:

- **Any non-trivial change to `.github/workflows/` needs a real throwaway-PR
  test before being trusted**, not just "looks right on read." Workflow
  bugs are invisible until exercised.
- **This machine (confirmed on at least one Windows+conda setup) has a
  display-rendering bug** where some text-reading tools can show a
  MANGLED/COLLAPSED version of file content that is actually correct on
  disk -- e.g. a real regex alternation rendering back as truncated/missing
  text. If you suspect a bug in any script, **run it and observe real
  output/exit code** before concluding it's broken -- never conclude
  "broken" from a text read alone.

## Traceability

- **Every PR uses `.github/PULL_REQUEST_TEMPLATE.md`**, which has a
  "Hermes session ID" field. If you're an AI agent (subagent, delegated
  task, local model), fill it in with `echo $HERMES_SESSION_ID` before
  opening the PR -- this is what lets anyone trace a shipped change back to
  the full reasoning/tool-call transcript that produced it, not just the diff.
- **`CHANGELOG.md` is auto-generated** on every `dev` -> `main` promotion PR
  -- don't hand-edit it; it's derived from commit messages.

## Deployment

- `dev` pushes deploy to the **preview** environment, `main` pushes deploy
  to **production** -- see `.github/workflows/deploy.yml` and
  `project-bootstrap`'s `references/aws-infra-setup.md`.
- Infra: S3 (private, OAC-gated -- never public) + CloudFront. Auth is
  GitHub OIDC -> a scoped IAM role -- no long-lived AWS keys anywhere.
- **GOTCHA:** some GitHub orgs' OIDC subject claim format is NOT the usual
  `repo:OWNER/REPO:ref:refs/heads/BRANCH` -- verify the REAL subject via
  CloudTrail `userIdentity.principalId` on a rejected
  AssumeRoleWithWebIdentity call rather than assuming the standard format.
  A wildcard on the wrong format fails silently with a generic "Not
  authorized" error that gives no hint the pattern itself is wrong.
- `auto-merge.yml` and `changelog.yml` MUST merge/push using a personal
  token, never `secrets.GITHUB_TOKEN` -- GitHub's loop-prevention means
  GITHUB_TOKEN-authored pushes never trigger downstream `push`-triggered
  workflows (like deploy), which fails *silently* and is easy to miss.

## Known state (update this section as the project evolves)

- CI (test + build) + `ai-review` run on every push/PR; both green
  auto-merges the PR into `dev`.
- Deployed: preview (dev) at <URL>, production (main) at <URL>.
