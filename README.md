# 🧮 CodeMetrics

![CodeMetrics Banner](https://img.shields.io/badge/CodeMetrics-CLI-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

> A CLI tool for analyzing code metrics, complexity, and unused code in JavaScript and TypeScript projects.

---

## 🚀 Overview

**CodeMetrics** is a command-line utility that analyzes your codebase and generates detailed metrics about code quality and structure.

It helps developers understand and improve their code by reporting on:

- Total, comment, and blank lines
- Code complexity estimation
- Number of functions and classes
- Code duplication ratio
- 🔍 **Unused variables and imports**
- ⚠️ **Unsafe TypeScript types (`any`, `unknown`)**

---

## 📦 Installation

### 1️⃣ Clone the repository

```bash
git clone https://github.com/jhuliangr/codemetrics.git
cd codemetrics
```

### 2️⃣ Install dependencies

```bash
pnpm install
```

### 3️⃣ (Optional) Build the project

```bash
pnpm build
```

### 🧰 Usage

```bash
pnpm analyze <path> [options]
```

### 📊 Analyze your codebase

Analyze code metrics for a directory or a single file.

```bash
pnpm analyze ./src -f table
```

### Options

| Option                        | Description                         | Default |
| ----------------------------- | ----------------------------------- | ------- |
| `-f, --format <type>`         | Output format (`table`, `json`)     | `table` |
| `-e, --exclude <patterns...>` | Glob-like patterns to exclude files | —       |
| `--max-complexity <number>`   | Maximum allowed complexity          | `10`    |

### Example

```bash
pnpm analyze ./src -f json -e "node_modules" "dist"

```

### 🧠 Metrics Collected

| Metric                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `lines.total`            | Total number of lines                             |
| `lines.code`             | Lines containing actual code                      |
| `lines.comment`          | Lines containing comments                         |
| `lines.blank`            | Blank or empty lines                              |
| `complexity`             | Estimated cyclomatic complexity                   |
| `functions`              | Number of functions detected                      |
| `classes`                | Number of classes detected                        |
| `duplication.percentage` | Percentage of duplicated lines                    |
| `unusedVariables`        | Declared variables never used                     |
| `unusedImports`          | Imported modules not used                         |
| `typeIssues`             | Use of `any` or `unknown` types (TypeScript only) |

### 📈 Example Output

```bash
📊 Code Metrics Summary
──────────────────────────────────────────────
File: src/utils/helpers.ts
──────────────────────────────────────────────
Lines: total=120, code=90, comment=20, blank=10
Complexity: 8
Functions: 5
Classes: 1
Duplication: 12.5%
Unused Variables: tempVar
Unused Imports: lodash
Type Issues: Use of type "any" detected
──────────────────────────────────────────────

```
