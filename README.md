# Premium API (Vercel)

API serverless autonome pour la **génération** et la **vérification** des codes Premium.
Seules ces deux opérations sont exposées en ligne. Le reste (UI, statut premium local) reste dans l'application.

## Endpoints

| Méthode | URL                  | Rôle                                          |
| ------- | -------------------- | --------------------------------------------- |
| POST    | `/api/generate-code` | Admin : génère un code (protégé par mot de passe) |
| POST    | `/api/verify-code`   | Public : valide un code et active 30 j sur l'appareil |

### POST /api/generate-code

```json
{
  "password": "ADMIN_PASSWORD",
  "durationDays": 30,
  "customerName": "...",
  "customerPhone": "..."
}
```

Réponse :
```json
{ "success": true, "code": "X7K9-Q4M2-P8TY-T34B" }
```

### POST /api/verify-code

```json
{ "code": "X7K9-Q4M2-P8TY-T34B", "deviceId": "DEVICE_123" }
```

Réponse :
```json
{ "success": true, "premiumUntil": "2026-07-15T12:00:00.000Z" }
```

## Déploiement Vercel

1. **Base de données Supabase**
   Exécute ce SQL une fois dans le SQL Editor :
   ```sql
   create table premium_codes (
     id uuid primary key default gen_random_uuid(),
     code text unique not null,
     duration_days integer default 30,
     created_at timestamptz default now(),
     expires_at timestamptz,
     used boolean default false,
     used_at timestamptz,
     device_id text,
     customer_name text,
     customer_phone text
   );
   alter table premium_codes enable row level security;
   ```

2. **Push sur GitHub** ce dossier `vercel-premium-api/`.

3. **Import sur Vercel** → New Project → sélectionne le repo.

4. **Variables d'environnement** (Settings → Environment Variables) :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`

5. **Deploy.** Tu obtiens une URL du type `https://premium-api.vercel.app`.

## Tests rapides (curl)

```bash
# Générer un code
curl -X POST https://premium-api.vercel.app/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"password":"TON_MOT_DE_PASSE"}'

# Vérifier
curl -X POST https://premium-api.vercel.app/api/verify-code \
  -H "Content-Type: application/json" \
  -d '{"code":"X7K9-Q4M2-P8TY-T34B","deviceId":"DEV-TEST"}'
```

## Brancher l'app Lovable sur cette API

Dans l'app, remplace les appels `/api/verify-code` par l'URL Vercel :

```ts
const API_BASE = "https://premium-api.vercel.app";
fetch(`${API_BASE}/api/verify-code`, { ... });
```

Le `check-premium` local côté app peut continuer à se baser sur le cache
localStorage `{ deviceId, premiumUntil }` — pas besoin de l'exposer en ligne.
