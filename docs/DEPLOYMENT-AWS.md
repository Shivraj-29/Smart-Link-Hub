# Deploying Smart-Link to AWS

Two paths, pick one:

- **Path A — ECS Fargate + RDS** (recommended; proper containers, auto-restart, no server patching)
- **Path B — Single EC2 instance + RDS** (simplest, cheapest, good enough for a portfolio/viva demo)

Either way, the app is a single Docker image (Express serves the built React
app **and** the API from one process — see `Dockerfile`), talking to a
Postgres database. In AWS, that database is **RDS**, not a container.

---

## 1. Create the database (RDS) — both paths need this

1. RDS console → **Create database** → Engine: **PostgreSQL** → Templates: **Free tier** (fine for a demo).
2. DB instance identifier: `smartlink-db`. Set a master username/password — save these.
3. **Public access: No** if your app runs inside the same VPC (ECS/EC2 below) — keep the DB private and only reachable from your app's security group. Only set it to Yes temporarily if you need to run migrations from your laptop.
4. VPC security group: create one (e.g. `smartlink-db-sg`) that allows inbound port `5432` **only** from your app's security group (added in step 2 of whichever path you choose below) — not from `0.0.0.0/0`.
5. Once created, copy the endpoint hostname. Your `DATABASE_URL` becomes:
   ```
   postgresql://<master-user>:<master-password>@<rds-endpoint>:5432/postgres
   ```
   The app creates its own tables automatically on first boot (see `initDB()` in `server/index.js`) — no manual migration step needed.

Generate a real `JWT_SECRET` now, you'll need it below:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Path A — ECS Fargate + RDS

### A1. Push the image to ECR
```bash
aws ecr create-repository --repository-name smart-link
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com

docker build -t smart-link .
docker tag smart-link:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/smart-link:latest
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/smart-link:latest
```

### A2. Store secrets
AWS Systems Manager → Parameter Store → create two `SecureString` params:
- `/smartlink/DATABASE_URL`
- `/smartlink/JWT_SECRET`

### A3. Create the ECS service
Easiest path is the ECS console's **"Create service"** wizard:
- Launch type: **Fargate**
- Task definition: point at the ECR image above; container port `3001`
- Task role: allow reading the two SSM parameters; wire them in as the container's environment via "Secrets" (not plain env vars)
- Also set plain env vars: `NODE_ENV=production`, `PORT=3001`, `FRONTEND_URL=` (your CloudFront/ALB domain, once you know it)
- Health check path: `/api/health` (already implemented, and there's a `HEALTHCHECK` in the Dockerfile too)
- Networking: put the service in the **same VPC** as the RDS instance, in private subnets; attach a security group that's allowed into the RDS security group on port 5432
- Load balancer: create an **Application Load Balancer**, target group forwarding to container port 3001, health check path `/api/health`

### A4. DNS + HTTPS
Route 53 → point your domain at the ALB. ACM → request a free TLS cert for that domain, attach it to the ALB's HTTPS (443) listener. Redirect HTTP→HTTPS on the ALB.

### A5. Deploys
Rebuild, retag, push a new image, then `aws ecs update-service --force-new-deployment` (or click "Update service" in the console). ECS Fargate handles rolling restarts for you — this is why the app has a `SIGTERM` handler for graceful shutdown.

---

## Path B — Single EC2 instance + RDS (simpler, cheaper)

1. Launch a `t3.micro` (free-tier eligible) Ubuntu 24.04 instance in the **same VPC** as your RDS database.
2. Security group: allow inbound 80/443 from anywhere, and outbound to RDS on 5432 (RDS's security group should allow inbound from *this* instance's security group).
3. SSH in and install Node + git:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```
4. Clone your repo, install, build:
   ```bash
   git clone <your-repo-url> smart-link && cd smart-link
   npm ci
   npm run build
   ```
5. Create `.env` (see `.env.example`) with your real `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` (or leave `FRONTEND_URL` blank if serving frontend+API from the same origin, which this setup does).
6. Run it under a process manager so it survives reboots/crashes:
   ```bash
   sudo npm i -g pm2
   pm2 start server/index.js --name smart-link
   pm2 startup && pm2 save
   ```
7. Put **nginx** in front for TLS (or attach an ALB / use an Elastic IP + Route 53 + `certbot` for a free Let's Encrypt cert directly on the box). Proxy `/` to `http://localhost:3001`.
8. Deploys become: `git pull && npm ci && npm run build && pm2 restart smart-link`.

---

## Notes that apply to both paths

- **`trust proxy` is already set** in `server/index.js`, so `req.ip` (used for geo-based link rules) and rate limiting correctly see the real client IP when you're behind an ALB or nginx — as long as `X-Forwarded-For` is passed through (ALB does this by default; for nginx add `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
- **Never** set `FRONTEND_URL` to `*` — it's validated against an explicit allow-list now (see the CORS fix). Set it to your real domain(s), comma-separated if you have more than one (e.g. apex + `www`).
- The app auto-creates its tables on boot (`CREATE TABLE IF NOT EXISTS`), so first deploy against a fresh RDS instance "just works" — there's no separate migration step to remember.
- Rotate `JWT_SECRET` only if you're OK invalidating every existing login session — every issued token stops verifying immediately.
- If you outgrow the free tier / `t3.micro`, RDS and Fargate both scale by just bumping instance size / task CPU-RAM in the console, no code changes needed.
