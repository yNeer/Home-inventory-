## 2026-03-29 - [SSRF / Path Traversal via Unsanitized Template Literal]
**Vulnerability:** The \`lookupBarcode\` function passed unsanitized, un-encoded user input directly into a fetch API URL string interpolation.
**Learning:** Even though the fetch runs on the client-side, dynamic paths derived from user input must always be validated and encoded. If left untreated, this exposes the application to Server-Side Request Forgery or Path Traversal, allowing malicious endpoints to be queried.
**Prevention:** Always validate that dynamic URL path parameters match expected patterns (e.g., alphanumeric regex for barcodes) and URL-encode them using \`encodeURIComponent\` before interpolation.
