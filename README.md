# Forkwise — 3-tier food delivery application

A production-shaped, 3-tier food delivery app:

- **Frontend** — React (Vite) SPA, served by nginx, styled with Tailwind CSS
- **Backend** — Node.js/Express REST API, JWT auth, connects to PostgreSQL
- **Database** — PostgreSQL, intended to run as **AWS RDS**
- **Deployment** — Docker images for both apps, deployed to Kubernetes (EKS) via two **Helm charts**

```
Browser
  │  HTTPS
  ▼
ALB Ingress (forkwise-frontend)
  │
  ▼
frontend Pods (nginx + React build)
  │  /api/*  →  reverse-proxied, same-origin
  ▼
backend Pods (Node/Express, ClusterIP Service "forkwise-backend")
  │  TCP 5432, TLS
  ▼
AWS RDS (PostgreSQL)
```

The frontend never talks to the backend directly from the browser. nginx reverse-proxies
`/api/*` to the backend's in-cluster Service, so the browser only ever sees one origin —
no CORS, no exposed backend hostname.

## Repository layout

```
db/            schema.sql, seed.sql                  — run against RDS
backend/       Express API source, Dockerfile
frontend/      React app source, Dockerfile, nginx.conf
helm/backend/  Helm chart for the API Deployment/Service/HPA/Ingress
helm/frontend/ Helm chart for the web Deployment/Service/HPA/Ingress
docker-compose.yml  local dev (Postgres + backend + frontend), no k8s needed
```

## 1. Run it locally first (no AWS needed)

```bash
docker compose up --build
# frontend: http://localhost:8080
# backend:  http://localhost:4000/api/health
```

`db/schema.sql` and `db/seed.sql` are auto-applied to the local Postgres container on
first start, so the restaurant list and menus are populated immediately.

For frontend hot-reload during development, run it outside Docker instead:
```bash
cd frontend && npm install && npm run dev   # http://localhost:5173, proxies /api to :4000
```

## 2. Provision AWS RDS (PostgreSQL)

```bash
aws rds create-db-instance \
  --db-instance-identifier forkwise-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username forkwise_admin \
  --master-user-password '<STRONG_PASSWORD>' \
  --allocated-storage 20 \
  --vpc-security-group-ids <SG_ID> \
  --db-subnet-group-name <SUBNET_GROUP> \
  --no-publicly-accessible \
  --backup-retention-period 7
```

- Put RDS in private subnets; only allow inbound 5432 from your EKS node/pod security group.
- Once available, apply the schema from a host that can reach RDS (a bastion, Cloud9, or a
  one-off Kubernetes Job):
  ```bash
  psql "host=<rds-endpoint> port=5432 dbname=postgres user=forkwise_admin sslmode=require" \
    -c "CREATE DATABASE forkwise;"
  psql "host=<rds-endpoint> port=5432 dbname=forkwise user=forkwise_admin sslmode=require" \
    -f db/schema.sql -f db/seed.sql
  ```
- Create a least-privilege application user (`forkwise_app`) rather than using the master
  user at runtime, and store its password in AWS Secrets Manager.

## 3. Build and push the images to ECR

```bash
aws ecr create-repository --repository-name forkwise-backend
aws ecr create-repository --repository-name forkwise-frontend

aws ecr get-login-password --region <REGION> | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

docker build -t <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-backend:1.0.0 ./backend
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-backend:1.0.0

docker build -t <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-frontend:1.0.0 ./frontend
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-frontend:1.0.0
```

## 4. Deploy to EKS with Helm

Your EKS cluster needs the **AWS Load Balancer Controller** installed for the `alb` Ingress
class used by both charts (or switch `ingress.className`/annotations to whatever ingress
controller you run).

```bash
kubectl create namespace forkwise

# Backend — pass RDS + secret values explicitly (or better, use --values with a
# private values-prod.yaml that's never committed, or External Secrets Operator)
helm install forkwise-backend ./helm/backend \
  --namespace forkwise \
  --set image.repository=<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-backend \
  --set image.tag=1.0.0 \
  --set rds.host=<rds-endpoint> \
  --set rds.database=forkwise \
  --set rds.user=forkwise_app \
  --set secret.pgPassword='<APP_DB_PASSWORD>' \
  --set secret.jwtSecret="$(openssl rand -hex 32)" \
  --set ingress.enabled=true \
  --set ingress.host=api.forkwise.example.com

# Frontend
helm install forkwise-frontend ./helm/frontend \
  --namespace forkwise \
  --set image.repository=<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/forkwise-frontend \
  --set image.tag=1.0.0 \
  --set ingress.host=www.forkwise.example.com
```

Notes:
- The backend chart's Service name defaults to `forkwise-backend` (`fullnameOverride`) — this
  must match `nginx.conf`'s `proxy_pass http://forkwise-backend:4000/api/;` in the frontend
  image. If you rename the release, update `nginx.conf` and rebuild the frontend image, or set
  `fullnameOverride` back to `forkwise-backend` regardless of release name (already the default).
- `secret.create=true` (default) creates a Secret from `--set` values, fine for a quick start.
  For real production, set `secret.existingSecret=<name>` and manage that Secret with the
  **External Secrets Operator** or **AWS Secrets Manager CSI driver**, pulling from Secrets
  Manager so no credential ever appears in a `helm` command or values file.
- Both charts ship an `HorizontalPodAutoscaler` (min 2 / max 6 pods, 70% CPU) and readiness/
  liveness probes wired to `/api/health` (backend) and `/healthz` (frontend), so rollouts and
  scaling behave correctly out of the box.
- For IRSA (IAM Roles for Service Accounts) — e.g. if the backend later needs S3 or SES —
  set `serviceAccount.annotations."eks.amazonaws.com/role-arn"` in `helm/backend/values.yaml`.

Check rollout status:
```bash
kubectl -n forkwise get pods,svc,ingress
kubectl -n forkwise logs deploy/forkwise-backend
```

## API summary

| Method | Path                        | Auth | Description                          |
|--------|-----------------------------|------|---------------------------------------|
| POST   | /api/auth/signup            | –    | Create account, returns JWT           |
| POST   | /api/auth/login             | –    | Returns JWT                           |
| GET    | /api/auth/me                | ✓    | Current user                          |
| GET    | /api/restaurants             | –    | List restaurants (`?q=`, `?cuisine=`) |
| GET    | /api/restaurants/:id         | –    | Restaurant + categorized menu         |
| POST   | /api/orders                  | ✓    | Place an order from a basket          |
| GET    | /api/orders                  | ✓    | List the current user's orders        |
| GET    | /api/orders/:id               | ✓    | Order detail + status history         |
| POST   | /api/orders/:id/advance       | ✓    | Advance order status (demo/ops)       |
| GET    | /api/health                  | –    | Liveness/readiness target             |

## Design notes

- Colors, type and layout follow a "neighborhood menu board" identity (pine green,
  parchment, marigold accent, `Fraunces` display serif + `Inter` UI sans) rather than
  generic SaaS-card styling — see `frontend/tailwind.config.js` and `frontend/src/index.css`.
- Passwords are hashed with bcrypt; the API never returns `password_hash`.
- Order totals (tax, delivery fee) are computed server-side from live menu prices, not
  trusted from the client, to prevent price tampering.
- `helmet`, connection pooling, and SQL parameterization (`pg` placeholders) are applied
  throughout the backend.

## What to extend next

- Real payments (Stripe) instead of the mock payment-method selector
- Restaurant/admin dashboard (a third role beyond `customer`)
- WebSocket or polling-based live order tracking instead of the manual "simulate" button
- CI/CD (build → push to ECR → `helm upgrade`) via GitHub Actions or CodePipeline
