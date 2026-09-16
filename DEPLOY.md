# Despliegue en Hostinger VPS con Docker

## 0. Antes de nada: rota la contraseña de Supabase

El repo tuvo credenciales de la base de datos hardcodeadas en el código
(`server.ts` y `test-direct-config.ts`). Si el repositorio fue público en
algún momento, esa contraseña sigue siendo válida para cualquiera que la
haya visto. Antes de desplegar:

1. Entra a Supabase → tu proyecto → **Project Settings → Database**.
2. Resetea la contraseña del usuario `postgres`.
3. Usa la contraseña nueva en el `DATABASE_URL` del paso 3 más abajo.
4. Aplica el parche de `server.ts` descrito en `SECURITY_PATCH.md` para
   quitar la credencial hardcodeada del código.

## 1. Preparar el VPS

Conectate por SSH e instala Docker (si no lo tienes):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# cierra sesión y vuelve a entrar para que aplique el grupo docker
```

Verifica:

```bash
docker --version
docker compose version
```

## 2. Subir el código al VPS

```bash
git clone -b claude/tender-hopper-xznqnp https://github.com/klever747/CRM-AGENCIAS.git
cd CRM-AGENCIAS
```

(o `git pull` si ya lo tenías clonado).

## 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Como mínimo necesitas:

```
DATABASE_URL=postgresql://postgres:TU_PASSWORD_NUEVA@db.jhdvsnpxypszwslhsivg.supabase.co:5432/postgres
NODE_ENV=production
PORT=3000
```

La base de datos sigue viviendo en Supabase (no se levanta Postgres en el
VPS), así que el contenedor solo necesita poder salir a internet.

## 4. Levantar el contenedor

Prueba rápida por IP, sin dominio ni HTTPS:

```bash
docker compose up -d --build
```

La app queda disponible en `http://IP_DE_TU_VPS:3000`.

Revisa logs:

```bash
docker compose logs -f app
```

## 5. (Opcional) HTTPS con dominio propio

Si tienes un dominio apuntando (registro A) a la IP del VPS:

1. Edita `Caddyfile` y reemplaza `your-domain.com` por tu dominio real.
2. Abre los puertos 80 y 443 en el firewall del VPS (Hostinger suele traer
   `ufw`):

   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. Levanta con el overlay de Caddy (gestiona el certificado SSL solo):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
   ```

Con esto la app queda en `https://tu-dominio.com`, con certificado
renovado automáticamente por Caddy.

## 6. Actualizar tras un cambio de código

```bash
git pull
docker compose up -d --build
```

(agrega `-f docker-compose.caddy.yml` si usas el overlay de HTTPS).
