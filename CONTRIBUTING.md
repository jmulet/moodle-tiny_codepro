# Contributing to moodle-tiny_codepro

Thank you for your interest in contributing to the **moodle-tiny_codepro** plugin! Your contributions help improve the plugin and make it more useful for the Moodle community.

Please take a moment to read through this guide before submitting an issue or pull request.

---

## 🔧 Branch Strategy

- **master**: Protected. This branch holds the latest stable, released code. No direct commits or pull requests should target this branch.
- **develop**: All contributions should be based on this branch. New features, bug fixes, and improvements must be merged here.

---

## 🛠️ How to Contribute

### 1. Fork the Repository
Start by [forking the repository](https://github.com/jmulet/moodle-tiny_codepro/fork) to your GitHub account.

### 2. Clone Your Fork
```bash
git clone https://github.com/jmulet/moodle-tiny_codepro.git
cd moodle-tiny_codepro
```

### 3. Create a Feature or Fix Branch
Always branch off from `develop`.

```bash
git checkout develop
git pull origin develop
git checkout -b your-feature-branch
```

### 4. Make Your Changes
Please follow Moodle coding standards where applicable:
- [Moodle Coding Style](https://moodledev.io/general/development/policies/codingstyle)

### 5. Test Your Changes
Ensure your code:
- Does not break existing functionality.
- Passes Moodle's code checks (`phpcs`, `phpunit`, etc.).
- Is compatible with Moodle versions supported by the plugin.

### 6. Commit & Push
Use meaningful commit messages. For example:

```bash
git add .
git commit -m "feat: description fo your feature"
git push origin your-feature-branch
```

---

## ✅ Pull Requests

When your feature/fix is ready:

1. Go to your fork on GitHub.
2. Create a **Pull Request** (PR) **against the `develop` branch** of the original repository.
3. Add a clear description of your changes.
4. Reference any related issues (e.g., `Closes #12`).
5. Be ready to make changes based on review feedback.

**Note**: PRs made directly to `master` will be automatically closed.

---

## 📦 Plugin Structure

Keep in mind the structure of Moodle plugins. Please do not modify version.php unless you're coordinating a release or asked to do so by a maintainer.

---

## 💬 Questions or Issues?

If you encounter a bug or have a question, please:
- Search the [issue tracker](https://github.com/jmulet/moodle-tiny_codepro/issues).
- If it’s new, [open an issue](https://github.com/jmulet/moodle-tiny_codepro/issues/new).

---

## 🙏 Thanks

Thanks again for helping improve `moodle-tiny_codepro`! Every bit of help counts!
