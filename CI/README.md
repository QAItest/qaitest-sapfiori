# CI templates

- `github-actions.yml`: copy to `.github/workflows/sap-fiori-tests.yml`.
- `gitlab-ci.yml`: copy or include it from `.gitlab-ci.yml`.
- `Jenkinsfile`: adapt the three Jenkins credential IDs to your installation.

The pipelines run type checking before the wdi5 suite and always retain `reports/`.
Keep the target URL and credentials in the CI secret store, never in the repository.
