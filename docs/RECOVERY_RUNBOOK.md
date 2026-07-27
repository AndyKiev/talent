# Recovery runbook — Docker collapse after an unclean shutdown

Written 2026-07-27 after recovering the TALENT project from a power loss that
destroyed every Docker container.

**Point a new session at this file.** A new session cannot read the chat this
came from.

---

## The single most important fact

**Destroying containers does not destroy data. Data lives in _volumes_.**

After the crash, `docker ps -a` was empty and it looked like everything was
gone. It was not. The volume was intact and every row came back.

**So: do not restore from a backup until you have checked the volume.** A
restore overwrites good data with older data. In our case the JSON snapshot was
9 days older than what was actually still sitting in the volume.

Check first:

```bash
docker volume ls
docker run --rm -v <volume>:/v alpine sh -c "cat /v/PG_VERSION; du -sh /v"
```

A few hundred MB or more, with a `PG_VERSION` file, means the database is
probably still there.

---

## Recovery, in order

### 1. Copy the volume before touching it

Postgres must replay its write-ahead log to recover, and that writes to the data
directory. Work on a copy so the original stays pristine.

```bash
docker run --rm -v <volume>:/from -v <volume>_rescue:/to alpine sh -c "cp -a /from/. /to/"
```

### 2. Start Postgres on the copy

The image **must match `PG_VERSION`** — an older major version refuses the data
directory.

```bash
docker run --rm -v <volume>_rescue:/v alpine rm -f /v/postmaster.pid
docker run -d --name rescue -v <volume>_rescue:/var/lib/postgresql/data -p 55432:5432 postgres:16
docker logs rescue
```

Wait for `database system is ready to accept connections`. Recovery messages
like `database system was not properly shut down; automatic recovery in
progress` are normal and expected.

### 3. Dump, and verify the dump is real

```bash
docker exec rescue pg_dump -U <user> -d <db> -Fc -f /tmp/db.dump
docker cp rescue:/tmp/db.dump ./db.dump
```

**Write the row counts down now.** They are how you prove the restore worked.
An exit code of 0 does not prove a dump has content.

```sql
select (select count(*) from <big_table>) a, (select count(*) from <other>) b;
select version_num from alembic_version;
```

### 4. Restore, then compare counts

Restore, then run the *same* query and compare against the numbers from step 3.
Equal numbers, or it did not work.

---

## Moving the database out of Docker (optional)

Docker was never the real risk here — the volume survived. But keeping the
database on the host means no `docker` command can ever touch it, and it matches
production, where the database is an external server.

**You do not need the forgotten `postgres` superuser password.** Make a *new*
cluster in a folder you own. No admin rights, no `pg_hba.conf` bypass.

```powershell
initdb -D C:\Users\<you>\PostgresData\<name> -U admin --pwfile=<file> `
  --encoding=UTF8 --locale-provider=icu --icu-locale=uk-UA --locale=C -A scram-sha-256
pg_ctl -D C:\Users\<you>\PostgresData\<name> -l <log> -o "-p 5433" start
```

Notes:

- `-A scram-sha-256` matters. Without it `initdb` silently uses `trust`, meaning
  no password at all.
- Pick the port the app already uses (5433 here) and nothing else needs changing.
- No admin rights are needed, so it is **not** a Windows service: it does not
  start at boot. Wire it into however you start the project.

**Never reset a forgotten password by setting `pg_hba.conf` to `trust`.** Make a
new cluster instead.

---

## Letting containers reach a database on the host

Containers are a different network, so `127.0.0.1` does not reach the host.

1. `postgresql.conf`: `listen_addresses = '*'`
2. `pg_hba.conf`: allow the Docker range, scoped as tightly as possible —

   ```
   host    <db>    <user>    172.16.0.0/12      scram-sha-256
   host    <db>    <user>    192.168.65.0/24    scram-sha-256
   ```

3. compose: `extra_hosts: ["host.docker.internal:host-gateway"]`, and point the
   app at `host.docker.internal:<port>`

Test it before debugging anything else:

```bash
docker run --rm -e PGPASSWORD=<pw> postgres:16 \
  psql -h host.docker.internal -p 5433 -U <user> -d <db> -c "select 1"
```

If that fails, nothing else will work — fix it first.

---

## Bugs that only appear once you containerize

Every one of these existed for a long time and was invisible while the app ran
natively. Check them in any project you move into containers.

| Symptom | Cause | Fix |
|---|---|---|
| `pyproject.toml changed significantly since poetry.lock was last generated` | lock file stale; native dev uses the existing venv and never notices | `poetry lock` (Poetry 2 keeps locked versions; check the diff) |
| base image not found | an office-internal image (`python:3.11.9-custom`) | use the public equivalent |
| `apt`/`npm` fail outside the office | proxy set to an empty string | only set the proxy `if [ -n "$PROXY" ]` |
| `COPY` says a file is missing that clearly exists | root `.dockerignore` excludes that folder; the image builds from the root context | build from the subfolder so its own `.dockerignore` applies |
| `Command not found: alembic` in the image | `.venv/` in `.dockerignore` only matches the **root**, so the host's Windows venv is copied over the Linux one | add `**/.venv/` |
| `ModuleNotFoundError` for a package that works locally | installed by hand into the venv, never declared | declare it; audit with the import scan below |
| every API call 404s through nginx | `proxy_pass http://backend:8004/;` — the trailing slash rewrites `/api/v1/x` to `/v1/x` | drop the trailing slash |
| `Address already in use` on a second service | it inherits a fixed `ipv4_address` from a YAML anchor | override `networks:` for that service |

### Find undeclared dependencies

Collect the third-party modules the code imports, then check them inside the
image with `importlib.util.find_spec`. Anything that resolves locally but not in
the container was hand-installed and never declared.

---

## Auth keys and migrations

If the app reads its JWT private key at **import** time, then `alembic` needs
those keys too — its `env.py` imports the app. A migration service that
overrides the entrypoint will crash without them.

- generate keys before running alembic
- keep the keys in a volume, or every restart invalidates all issued tokens

---

## Gotchas worth remembering

- **Automated `ruff`/isort fixes can break working code.** Sorting imports
  reorders package `__init__.py` re-exports, which breaks code that silently
  depended on import order. Symptom: `ImportError: cannot import name X
  (most likely due to a circular import)`. Fix the dependency — import from the
  concrete module, not the half-initialized package — rather than restoring the
  old order.
- **Verify a big auto-fix commit by importing the app**, not just by starting
  it. And remember an import check does not catch a name used only inside a
  function body.
- **`docker compose` reads `.env` for `${VAR}` substitution — not `env_file`.**
  A variable that only exists in `stack.env` resolves to empty.
- **Real environment variables beat a mounted `.env`** in pydantic-settings.
  That is how a container overrides values meant for native dev.
- **Check whether an env file is committed.** Ours held a proxy URL with a
  corporate password and had been pushed. `git ls-files --error-unmatch <file>`.

---

## Backups

A volume surviving one crash is luck, not a backup. Dump to plain files on disk:

```powershell
pg_dump -U <user> -h 127.0.0.1 -p <port> -d <db> -Fc -f <dir>\<db>_<stamp>.dump
```

Two layers are worth having, and they are not interchangeable:

- **`pg_dump` files** — the normal restore. Complete and exact.
- **A JSON/app-level snapshot** — for rebuilding into an empty database.

Whichever you keep, **refresh it after big data changes**. A stale snapshot is
worse than none, because it looks usable. Ours was 9 days old and restoring it
would have destroyed a week of work.
