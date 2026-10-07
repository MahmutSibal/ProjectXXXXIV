# AppSukran API — Backend notes

Local development uses `appsettings.json` for defaults. **Do not** commit production secrets.

Preferred secret management:
- Use environment variables in CI/CD or container orchestrator.
- Example env vars are in `.env.example`.

JWT signing key:
- The app reads `JWT_SIGNING_KEY` if present. Provide a strong secret in production.

Running locally:
- Ensure SQL Server / Mongo are available or update connection strings.
- Run migrations before starting the app.

Security:
- Use secure cookies and HttpOnly cookies for production (frontend should prefer server-set cookies).
- Configure CORS origins explicitly in production.
