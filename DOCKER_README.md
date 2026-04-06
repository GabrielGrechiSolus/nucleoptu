# Docker Setup for Nucleoptu

Este projeto inclui configuração Docker para facilitar o deploy e execução em containers.

## Arquivos Criados

- `Dockerfile`: Configuração para build da imagem Docker
- `.dockerignore`: Arquivos a serem ignorados durante o build
- `docker-compose.yml`: Configuração opcional para execução com Docker Compose
- `build-and-run.sh`: Script simples para build e execução

## Como usar

### Opção 1: Usando Docker Compose (Recomendado)

```bash
# Build e run da aplicação
docker-compose up --build

# Ou em background
docker-compose up -d --build
```

### Opção 2: Usando Docker diretamente

```bash
# Build da imagem
docker build -t nucleoptu .

# Run do container
docker run -p 3000:3000 nucleoptu
```

### Opção 3: Usando o script fornecido

```bash
# Dar permissão de execução ao script (Linux/Mac)
chmod +x build-and-run.sh

# Executar
./build-and-run.sh
```

## Configuração

A aplicação será executada na porta 3000. Você pode acessar em:
- http://localhost:3000

## Variáveis de Ambiente

Se sua aplicação precisa de variáveis de ambiente:

1. Crie um arquivo `.env.local` na raiz do projeto
2. Modifique o `docker-compose.yml` para incluir:
   ```yaml
   env_file:
     - .env.local
   ```
3. Ou passe as variáveis diretamente:
   ```bash
   docker run -p 3000:3000 -e VAR_NAME=value nucleoptu
   ```

## Comandos Úteis

```bash
# Parar containers
docker-compose down

# Ver logs
docker-compose logs -f

# Rebuild forçado
docker-compose up --build --force-recreate

# Limpar imagens não utilizadas
docker image prune -f

# Ver tamanho da imagem
docker images nucleoptu
```

## Estrutura do Dockerfile

O Dockerfile usa uma abordagem single-stage otimizada:
- Base: Node.js 20 Alpine (imagem leve)
- Instala apenas dependências de produção
- Faz build da aplicação Next.js
- Cria usuário não-root para segurança
- Expõe porta 3000

## Segurança

- Executa como usuário não-root (`nextjs`)
- Usa imagem Alpine para reduzir superfície de ataque
- Remove cache do npm após instalação