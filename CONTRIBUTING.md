# Contributing Guide — HR Management System

## 🌿 Branching Strategy

We use a simple **main / feature branches** workflow.

```
main
├── feature/auth-module
├── feature/attendance-management
├── feature/permission-requests
├── feature/task-management
├── feature/payroll-module
├── feature/notifications
├── fix/attendance-late-flag
└── chore/prettier-setup
```

### Rules

- `main` is always **stable and deployable** — never push directly to it
- Every new feature or fix lives in its own branch
- Branch names must be **lowercase, kebab-case**, prefixed with type:

| Prefix      | When to use                          |
| ----------- | ------------------------------------ |
| `feature/`  | New functionality                    |
| `fix/`      | Bug fixes                            |
| `chore/`    | Config, tooling, dependencies        |
| `refactor/` | Code restructure, no behavior change |
| `docs/`     | Documentation only                   |

### Workflow

```bash
# 1. Always branch off main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Work, commit often

# 3. Push and open a Pull Request into main
git push origin feature/your-feature-name
```

---

## 📝 Commit Message Convention

We follow **Conventional Commits** — [conventionalcommits.org](https://www.conventionalcommits.org)

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type       | When to use                                        |
| ---------- | -------------------------------------------------- |
| `feat`     | A new feature                                      |
| `fix`      | A bug fix                                          |
| `chore`    | Tooling, config, dependencies (no production code) |
| `refactor` | Code change that is neither a fix nor a feature    |
| `docs`     | Documentation only                                 |
| `style`    | Formatting, missing semicolons — no logic change   |
| `test`     | Adding or updating tests                           |
| `perf`     | Performance improvements                           |

### Scopes (this project)

| Scope           | Covers                                |
| --------------- | ------------------------------------- |
| `auth`          | Login, JWT, guards                    |
| `employees`     | Employee CRUD, profile                |
| `attendance`    | Attendance entry, reports             |
| `permissions`   | Leave/permission requests & approvals |
| `tasks`         | Task assignment, lifecycle            |
| `payroll`       | Salary calculation, payslips          |
| `notifications` | Socket.io, email alerts               |
| `dashboard`     | All dashboard components              |
| `config`        | Project setup, env, tooling           |

### Examples

```bash
feat(auth): add JWT login with refresh token rotation
fix(attendance): correct late flag logic when grace period is 0
chore(config): add prettier and gitignore setup
feat(permissions): implement manager approval workflow
refactor(payroll): extract salary calculation into service layer
docs: add contributing guide and commit conventions
```

### Rules

- Use **present tense**: "add feature" not "added feature"
- Keep the subject line **under 72 characters**
- No capital letter at the start of the description
- No period at the end
- Reference issues when relevant: `fix(tasks): resolve overdue flag bug (closes #12)`

---

## 🔀 Pull Request Checklist

Before opening a PR make sure:

- [ ] Branch is up to date with `main`
- [ ] Code is formatted with Prettier (`pnpm run format:check`)
- [ ] No `console.log` left in production code
- [ ] `.env` files are **not** committed
- [ ] PR title follows the same Conventional Commits format

---

## 🚀 First Commit Reference

This was the initial commit that set up the repository:

```
chore(config): initial project setup

- Add .gitignore for Angular + Node.js monorepo
- Add Prettier config and ignore files for frontend and backend
- Add CONTRIBUTING guide with commit conventions and branching strategy
```
