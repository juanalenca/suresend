#!/bin/bash

# SureSend Installer

echo "
   _____                 _____                 _ 
  / ____|               / ____|               | |
 | (___  _   _ _ __ ___| (___   ___ _ __   __| |
  \___ \| | | | '__/ _ \\___ \ / _ \ '_ \ / _\` |
  ____) | |_| | | |  __/____) |  __/ | | | (_| |
 |_____/ \__,_|_|  \___|_____/ \___|_| |_|\__,_|
                                                 
  >>> PRODUCTION INSTALLER <<<
"

echo "----------------------------------------------------"
echo "Bem-vindo ao instalador do SureSend!"
echo "Vamos configurar seu ambiente de produção."
echo "----------------------------------------------------"

# 1. Ask Configuration
read -p "🏠 Domínio de instalação (ex: app.meusite.com): " DOMAIN
read -p "👤 E-mail do Admin (Login): " ADMIN_EMAIL
read -s -p "🔑 Senha do Admin: " ADMIN_PASSWORD
echo ""
read -p "📧 Porta SMTP (Enter para 2525): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-2525}

# 2. Database/Redis defaults (randomize passwords in a real scenario, but keeping simpler here or consistent)
DB_USER="suresend"
DB_PASS=$(openssl rand -hex 12)
DB_NAME="suresend_prod"
JWT_SECRET=$(openssl rand -base64 32)
REDIS_HOST="redis"
REDIS_PORT=6379

echo ""
echo "⚙️  Gerando arquivo de configuração (.env)..."

# 3. Generate .env
cat > .env <<EOF
# --- SYSTEM ---
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# --- DATABASE ---
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}?schema=public"
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=${DB_NAME}

# --- REDIS ---
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}

# --- SECURITY ---
JWT_SECRET="${JWT_SECRET}"
INITIAL_ADMIN_PASSWORD="${ADMIN_PASSWORD}"

# --- EMAIL (SMTP) ---
SMTP_HOST=mailtrap.io # Placeholder, user configures inside app or here if we added prompts
SMTP_PORT=${SMTP_PORT}
SMTP_USER=user
SMTP_PASS=pass

# --- FRONTEND ---
VITE_API_URL="http://${DOMAIN}/api"
EOF

echo "✅ Arquivo .env criado com sucesso."

# 4. Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor, instale o Docker e o plugin Compose antes de continuar."
    exit 1
fi

echo ""
echo "🚀 Iniciando containers (Build & Up)..."
echo "Isso pode levar alguns minutos."

# 5. Run Docker Compose
docker compose -f docker-compose.prod.yml up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================================="
    echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "===================================================="
    echo "Acesse agora: http://${DOMAIN}"
    echo "Login: ${ADMIN_EMAIL} (Se você usou o padrão 'admin@suresend.com' no código)"
    echo "Nota: O usuário Admin criado será 'admin@suresend.com' se for o primeiro seed,"
    echo "mas a senha será a que você definiu."
    echo "===================================================="
else
    echo "❌ Ocorreu um erro ao subir os containers."
fi
