"""Sauvegarde ponctuelle de la base PostgreSQL via pg_dump.

Usage :
    python backup_db.py

Lit DATABASE_URL depuis l'environnement (.env local, ou variable exportée
en CI/tâche planifiée) et écrit un dump horodaté dans backend/backups/.
Nécessite que l'outil `pg_dump` (client PostgreSQL) soit installé et
accessible dans le PATH.
"""

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from decouple import config

BACKUP_DIR = Path(__file__).resolve().parent / 'backups'


def main() -> None:
    database_url = config('DATABASE_URL')
    parsed = urlparse(database_url)

    if not parsed.hostname or not parsed.path.lstrip('/'):
        print('DATABASE_URL invalide ou incomplète.', file=sys.stderr)
        sys.exit(1)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    db_name = parsed.path.lstrip('/')
    output_file = BACKUP_DIR / f'{db_name}_{timestamp}.sql'

    command = [
        'pg_dump',
        f'--host={parsed.hostname}',
        f'--port={parsed.port or 5432}',
        f'--username={parsed.username}',
        '--format=plain',
        '--no-owner',
        '--no-privileges',
        f'--file={output_file}',
        db_name,
    ]

    # Supabase (et la plupart des hébergeurs PostgreSQL managés) exigent SSL,
    # mais un Postgres local n'en a généralement pas — on ne l'impose donc
    # que pour une connexion distante.
    is_local = parsed.hostname in ('localhost', '127.0.0.1')
    env = {'PGPASSWORD': parsed.password or ''}
    if not is_local:
        env['PGSSLMODE'] = 'require'

    print(f'Sauvegarde de "{db_name}" vers {output_file} ...')
    try:
        subprocess.run(command, env={**os.environ, **env}, check=True)
    except FileNotFoundError:
        print(
            "pg_dump introuvable. Installez les outils client PostgreSQL "
            "et assurez-vous qu'ils sont dans le PATH.",
            file=sys.stderr,
        )
        sys.exit(1)
    except subprocess.CalledProcessError as exc:
        print(f'Échec de pg_dump (code {exc.returncode}).', file=sys.stderr)
        sys.exit(exc.returncode)

    print(f'Sauvegarde terminée : {output_file}')


if __name__ == '__main__':
    main()
