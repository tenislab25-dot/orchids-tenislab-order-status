#!/bin/bash
# Script para fazer push dos commits pendentes

cd /home/ubuntu/tenislab

echo "📊 Verificando commits pendentes..."
git log origin/main..HEAD --oneline

echo ""
echo "🚀 Fazendo push para o GitHub..."
git push https://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@github.com/tenislab25-dot/orchids-tenislab-order-status.git main

if [ $? -eq 0 ]; then
    echo "✅ Push realizado com sucesso!"
else
    echo "❌ Erro ao fazer push. Tente: git push origin main"
fi
