# Lead Import

The import page accepts CSV and XLSX files up to 10 MB and 5,000 data rows.

1. The server validates extension, size, and content.
2. Headers are auto-mapped and remain editable.
3. Rows are staged in `import_jobs` and `import_rows` (or the deterministic demo
   store), with the original private file under `<workspace>/imports/...`.
4. Preview reports invalid, duplicate, and suppressed rows.
5. Confirmation imports valid rows without overwriting existing leads.
6. The result reports imported, updated, skipped, duplicate, invalid, and
   suppressed counts.

Business name is required. Emails and scores are validated. Imported contact values
are normalized and remain unverified unless stored evidence supports verification.
