"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProgressBar from "./components/ProgressBar";
import Quiz from "./components/Quiz";
import Certificate from "./components/Certificate";
import CourseCard from "./components/CourseCard";
import CourseModal from "./components/CourseModal";
import { useAuth } from "../AuthContext";

type ExerciseType = { type: 'command' | 'code' | 'project'; title?: string; instructions: string; expectedIncludes?: string[]; expectedRegexes?: string[]; language?: string };
type Lesson = { id: string; title: string; content: string; minutes: number; exercise?: ExerciseType; exercises?: ExerciseType[] };
type Module = { id: string; title: string; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  description: string;
  modules: Module[];
};

const COURSES: Course[] = [
  {
    id: "docker",
    title: "Docker - Fundamentos",
    description: "Conceitos essenciais de containers, imagens e orquestração local.",
    modules: [
      {
        id: "docker-basics",
        title: "Fundamentos do Docker",
        lessons: [
          { id: "d-1", title: "O que é Docker? - Conceitos e Motivação", content: "Docker é uma plataforma para empacotar aplicações em containers leves.\n\nMotivação: garantir que um app rode igual em dev, CI e produção; reduzir 'works on my machine'; permitir deploys mais rápidos e confiáveis.\n\nDiscussão: kernel compartilhado vs VM, isolamento de recursos, cgroups, namespaces, e casos de uso corporativos (microservices, deploys canary, blue/green).\n\nLeitura rápida: documentos do OCI e diferenças entre runtime (runc) e engines.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Container vs VM',
                instructions: 'Explique em 1-2 frases a principal diferença entre um container Docker e uma máquina virtual.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Casos de uso práticos',
                instructions: 'Liste 2-3 casos de uso reais onde Docker é particularmente útil (ex: microservices, CI/CD).',
                expectedIncludes: []
              }
            ]
          },
          { id: "d-2", title: "Imagens x Containers - Anatomia", content: "Imagem: camadas imutáveis, tags, registries.\nContainer: processo isolado, namespaces, cgroups.\n\nExemplo prático: inspecione camadas com 'docker history' e explore como pequenas mudanças afetam o tamanho da imagem.\n\nComandos úteis:\n- docker images\n- docker history <image>\n- docker inspect <image|container>\n\nPrática: crie uma imagem mínima usando 'alpine' e compare tamanhos entre versões com e sem dependências.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Camadas de imagem',
                instructions: 'Explique por que imagens Docker são organizadas em camadas e como isso afeta o cache durante build.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Inspecionar imagem',
                instructions: 'Digite o comando Docker para visualizar o histórico de camadas de uma imagem (sugestão: docker history <image>).',
                expectedIncludes: ['docker history']
              }
            ]
          },
          { id: "d-3", title: "Comandos essenciais e fluxo de trabalho", content: "Comandos essenciais:\n- docker run -d --name meuapp -p 8080:80 image\n- docker ps / docker ps -a\n- docker logs -f container\n- docker exec -it container /bin/sh\n- docker stop / docker rm / docker rmi\n\nFluxo: build → tag → push → pull → run.\n\nDemonstração prática: Dockerfile básico para Node e comandos para buildar e rodar em background com volume para desenvolvimento.", minutes: 35,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Explique o fluxo',
                instructions: 'Resuma em 1-2 frases o fluxo típico de build → tag → push → run e por que cada etapa é importante.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Teste de comandos Docker',
                instructions: 'Digite o comando que você usaria para rodar uma imagem chamada\n"meuapp" em background mapeando a porta 8080 para 80 (ex.: docker run ...).',
                expectedIncludes: ['docker run', '--name', 'meuapp', '-p']
              }
            ]
          },
        ],
      },
      {
        id: "docker-builds",
        title: "Construindo imagens e otimização",
        lessons: [
          { id: "d-4", title: "Dockerfile e boas práticas", content: `Dockerfile detalhado e boas práticas:
- Use imagens pequenas (alpine) quando possível.
- Separe etapas de build e runtime com multi-stage builds.
- Minimize número de camadas e ordene comandos para aproveitar cache.
- Inclua HEALTHCHECK para monitoramento.

Exemplo multi-stage:
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --production
CMD ["node","dist/index.js"]

Checklist de segurança: não copie .env, não use root, use users não privilegiados.`, minutes: 40,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Por que multi-stage?',
                instructions: 'Explique brevemente por que usar multi-stage builds reduz o tamanho da imagem final e melhora segurança.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Escreva um Dockerfile multi-stage mínimo',
                instructions: 'Escreva um Dockerfile que utilize multi-stage para construir uma app Node e produzir uma imagem runtime menor. Use FROM node:20-alpine e inclua CMD com node.',
                expectedRegexes: ['FROM node:20-alpine', 'COPY --from=builder', 'CMD ["node"'],
                language: 'dockerfile'
              }
            ]
          },
          { id: "d-5", title: "Cache, camadas e segurança", content: "Gerenciar cache de build, evitar salvar segredos, usar usuários não-root, varredura de vulnerabilidades (trivy/snyk).\n\nPráticas corporativas: scans automáticos em pipeline, assinatura de imagens (cosign) e políticas de retenção.\n\nExemplo: separar dependências e código-fonte para acelerar rebuilds; usar build args para secrets em CI com GitHub Actions secrets.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Segurança de imagens',
                instructions: 'Nomeie 2-3 práticas essenciais para garantir segurança em Dockerfiles (ex: não usar root, varredura de CVE).',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Build Args e secrets',
                instructions: 'Explique por que usar ARG para secrets é inadequado e qual é a alternativa segura em CI/CD (sugestão: GitHub Actions secrets).',
                expectedIncludes: []
              }
            ]
          },
        ],
      },
      {
        id: "docker-compose",
        title: "Compose e orquestração local",
        lessons: [
          { id: "d-6", title: "Docker Compose - serviços e redes", content: "Escrever docker-compose.yml com múltiplos serviços, depends_on, volumes e variáveis.\n\nExemplo real: API + Postgres + Redis + Nginx reverse proxy com certificados autoassinados para dev local.\n\nComandos: docker compose up -d, docker compose logs -f, docker compose exec api sh", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Por que Compose?',
                instructions: 'Explique em 1-2 frases o propósito do Docker Compose e quando é preferível ao `docker run` direto.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Comando de inicialização',
                instructions: 'Digite o comando Compose usado para iniciar múltiplos serviços em background (sugestão: docker compose ...).',
                expectedIncludes: ['docker compose', 'up', '-d']
              }
            ]
          },
          { id: "d-7", title: "Volumes e persistência", content: "Volumes nomeados vs bind mounts, backup/restore, permissões e performance.\n\nExemplo prático: criar volume 'pgdata' e restaurar dump:\n- docker volume create pgdata\n- docker run --rm -v pgdata:/var/lib/postgresql/data -v $(pwd):/backup postgres:16 bash -c 'pg_restore -d postgres /backup/dump.sql'", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Volume vs Bind Mount',
                instructions: 'Explique a diferença entre um volume Docker e um bind mount, e quando usar cada um.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Criar volume',
                instructions: 'Digite o comando Docker para criar um volume nomeado chamado "minha-dados".',
                expectedIncludes: ['docker volume', 'create', 'minha-dados']
              }
            ]
          },
        ],
      },
      {
        id: "docker-networking",
        title: "Redes, portas e segurança",
        lessons: [
          { id: "d-8", title: "Redes Docker e DNS interno", content: "bridge, host, overlay; comunicação entre containers; descoberta via nomes de serviço; exposição de portas e NAT.\n\nComandos: docker network create minha-rede; docker run --network=minha-rede --name svc app", minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Tipos de rede',
                instructions: 'Nomeie os 3 drivers de rede Docker e descreva quando usar bridge vs host.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Criar rede',
                instructions: 'Digite o comando para criar uma rede Docker chamada "web-net".',
                expectedIncludes: ['docker network', 'create', 'web-net']
              }
            ]
          },
          { id: "d-9", title: "Segurança e isolamento", content: "Capabilities, seccomp, AppArmor, rootless containers; hardening de imagens e runtime.\n\nExemplo: executar container com --user, definir seccomp profile e aplicar políticas de runtime.\n\nFerramentas: trivy, clair, cosign, gvisor.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Hardening',
                instructions: 'Liste 3 técnicas de hardening Docker: ex., usar --user, read-only filesystem, capabilities...',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Executar com user',
                instructions: 'Digite um comando docker run que executa um container como usuário não-root (ex: --user 1000:1000).',
                expectedIncludes: ['--user', 'docker run']
              }
            ]
          },
        ],
      },
      {
        id: "docker-prod",
        title: "Deploy e CI/CD com Docker",
        lessons: [
          { id: "d-10", title: "Registries e tags semânticas", content: "Docker Hub / private registries / GitHub Container Registry. Estratégias de tagging: semver, commit-SHA e canais (stable, canary).\n\nExemplo: docker tag image repo/image:1.2.3; docker push repo/image:1.2.3", minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Estratégia de versioning',
                instructions: 'Descreva a estratégia semver para tags Docker (ex: major.minor.patch) e por que é importante.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Fazer push',
                instructions: 'Digite o comando Docker para fazer push de uma imagem local "app:1.0" para "repo.com/myapp:1.0".',
                expectedIncludes: ['docker push', 'repo.com/myapp:1.0']
              }
            ]
          },
          { id: "d-11", title: "CI/CD patterns", content: "Como integrar Docker em pipelines (GitHub Actions, GitLab CI, Azure Pipelines): build, scan, push, deploy.\n\nExemplo: GitHub Actions workflow que builda, roda trivy e publica uma multi-arch image usando buildx e contexts.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Pipeline stages',
                instructions: 'Explique os 3-4 estágios típicos de uma pipeline CI/CD com Docker (build, scan, push, deploy).',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Trivy scan',
                instructions: 'Digite o comando usado para escanear uma imagem em busca de vulnerabilidades (sugestão: trivy image ...).',
                expectedIncludes: ['trivy', 'image']
              }
            ]
          },
          { id: "d-12", title: "Orquestração (overview) - Swarm, Kubernetes", content: "Comparação entre Swarm e Kubernetes, quando migrar, patterns de readiness/liveness, rolling updates e rollback.\n\nExemplo prático: deploy básico em Swarm com stack file; introdução a manifests Kubernetes e conceitos de Pods, Deployments e Services.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Swarm vs K8s',
                instructions: 'Compare Docker Swarm e Kubernetes em termos de complexidade, escalabilidade e curva de aprendizado.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Conceito Kubernetes básico',
                instructions: 'Defina os 3 objetos principais em Kubernetes: Pod, Deployment, Service.',
                expectedIncludes: []
              }
            ]
          },
        ],
      },
      {
        id: "intercambio-checklist",
        title: "Checklist Intercâmbio",
        lessons: [
          {
            id: "d-intercambio-1",
            title: "Checklist Intercâmbio — Tráfego de guias",
            content: `Tráfego de guias.

1º - Questionar se o erro ocorre no recebimento ou no envio das guias.

  Caso recebimento:
  O recebimento é controlado pelo webservice ws_intercambio_webptu, o serviço fica disponível no servidor do cliente, em docker.

  Caso não esteja sendo possível receber as guias, então:

  1º - Reinicie o container ou exclua o container e suba novamente. Então, veja se as transações foram normalizadas.
  2º - Caso persistir o erro, reinicializar o nginx, para garantir o correto redirecionamento.
  3º -  Caso persistir o erro, verificar com o cliente se o DNS que aponta para o servidor está bloqueado.
  4º -  Caso persistir o erro, verificar a imagem do container e atualiza-la com a imagem presente no repositório de imagens da Solus. (Importante: As imagens seguem o padrão numeral (2, 3, 4) e não o padrão de revision.) . Suba o container com a nova imagem e veja se a situação é normalizada.
  5º - Caso não seja possível baixar as imagens, geralmente o servidor do cliente está com o DNS da solus bloqueado, impedindo a conexão. Caso haja uma imagem no servidor, é possível forçar subir um container com a imagem presente, sem precisar realizar conexão externa.


2º - Para casos de envio de guias.

  O envio de guia é realizado pelo webservice ws_intercambio_consumidor.
  Nesta situação, caso as guias não estejam sendo enviadas, seguir:

  1º - Reinicie o container ou exclua o container e suba novamente. Então, veja se as transações foram normalizadas.
  2º - Caso persistir o erro, reinicializar o nginx, para garantir o correto redirecionamento.
  3º - Caso persistir o erro, verificar a imagem do container e atualiza-la com a imagem presente no repositório de imagens da Solus. (Importante: As imagens seguem o padrão numeral (2, 3, 4) e não o padrão de revision.) . Suba o container com a nova imagem e veja se a situação é normalizada.
  4º - Caso não seja possível baixar as imagens, geralmente o servidor do cliente está com o DNS da solus bloqueado, impedindo a conexão. Caso haja uma imagem no servidor, é possível forçar subir um container com a imagem presente, sem precisar realizar conexão externa.
`,
            minutes: 20,
          },
        ],
      },
    ],
  },

  {
    id: "plsql",
    title: "PL/SQL - Fundamentos",
    description: "Linguagem procedural para Oracle: blocos, cursores, procedures e tratamento de erros.",
    modules: [
      {
        id: "plsql-basics",
        title: "Fundamentos PL/SQL",
        lessons: [
          { id: "p-1", title: "Estrutura de bloco", content: "PL/SQL organiza código em blocos: declaração, seção executável e seção de exceções.\n\nExemplo anônimo:\nBEGIN\n  FOR r IN (SELECT id FROM meu_table WHERE flag=0) LOOP\n    -- processar\n    NULL;\n  END LOOP;\nEXCEPTION\n  WHEN OTHERS THEN\n    -- log\nEND;\n\nDiscussão: scoping, performance e quando transformar em procedure para reuso.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Estrutura de bloco',
                instructions: 'Nomear as 3 seções de um bloco PL/SQL (DECLARE, BEGIN, EXCEPTION) e qual é sua finalidade.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Bloco anônimo simples',
                instructions: 'Escreva um bloco PL/SQL anônimo que declare uma variável NUMBER, a inicialize com 10 e a imprima usando DBMS_OUTPUT.PUT_LINE.',
                expectedIncludes: ['BEGIN', 'END;', 'DECLARE', 'DBMS_OUTPUT.PUT_LINE'],
                language: 'sql'
              }
            ]
          },
          { id: "p-2", title: "Variáveis e tipos", content: "Tipos primitivos, atribuição, %TYPE e %ROWTYPE.\n\nExemplo:\nDECLARE\n  v_count NUMBER;\n  v_name employees.last_name%TYPE;\nBEGIN\n  SELECT COUNT(*) INTO v_count FROM employees;\nEND;\n\nUse %TYPE para manter compatibilidade com colunas do banco; %ROWTYPE para representar linhas inteiras. Trate NULLs e use NVL/COALESCE quando necessário.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — %TYPE vs %ROWTYPE',
                instructions: 'Explique a diferença entre %TYPE (referência de coluna) e %ROWTYPE (referência de linha) e quando usar cada uma.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Usar %TYPE',
                instructions: 'Declare uma variável que herda o tipo de uma coluna usando %TYPE (ex: v_name employees.last_name%TYPE).',
                expectedIncludes: ['%TYPE', 'employees'],
                language: 'sql'
              }
            ]
          },
        ],
      },
      {
        id: "plsql-advanced",
        title: "Procedures, Functions e Triggers",
        lessons: [
          { id: "p-3", title: "Procedures e Functions", content: "Procedures e functions:\n\nCREATE OR REPLACE PROCEDURE p_process(p_id IN NUMBER) IS\nBEGIN\n  -- lógica\nEND p_process;\n\nCREATE OR REPLACE FUNCTION f_get_total RETURN NUMBER IS\n  v_total NUMBER;\nBEGIN\n  SELECT SUM(amount) INTO v_total FROM invoices;\n  RETURN v_total;\nEND;\n\nBoas práticas: contratos claros, tratamento de exceções internamente e evitar side-effects em functions usadas em SQL.", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Vantagens de Procedures',
                instructions: 'Explique em 1-2 frases as vantagens de encapsular lógica em procedures no banco e quando preferir uma function.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Criar procedure simples',
                instructions: 'Escreva uma procedure chamada p_process que receba um parâmetro p_id IN NUMBER e faça um UPDATE em uma tabela exemplo. Use CREATE OR REPLACE PROCEDURE... BEGIN ... END;.',
                expectedIncludes: ['CREATE OR REPLACE PROCEDURE', 'BEGIN', 'END;'],
                expectedRegexes: ['CREATE\\s+OR\\s+REPLACE\\s+PROCEDURE', 'END;'],
                language: 'sql'
              }
            ]
          },
          { id: "p-4", title: "Tratamento de exceções", content: "Tratamento estruturado de erros em PL/SQL: WHEN OTHERS, propagação de erros, uso de raise_application_error para códigos e mensagens customizadas.\n\nPadrão: capturar, logar (tabela audit_logs) e propagar ou normalizar mensagem para o cliente.\n\nExemplo de logging e rethrow.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Tratamento de erros',
                instructions: 'Explique por que é importante capturar e tratar exceções em PL/SQL e qual é a sintaxe básica de WHEN ... THEN.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Bloco com tratamento',
                instructions: 'Escreva um bloco PL/SQL que tente dividir um número por zero e capture a exceção ZERO_DIVIDE, exibindo mensagem de erro.',
                expectedIncludes: ['BEGIN', 'EXCEPTION', 'WHEN', 'ZERO_DIVIDE'],
                language: 'sql'
              }
            ]
          },
          { id: "p-5", title: "Cursores e performance", content: "Cursores explícitos e implícitos, uso de BULK COLLECT e FORALL para minimizar roundtrips e melhorar throughput.\n\nExemplo:\nOPEN c; FETCH c BULK COLLECT INTO l_tab LIMIT 1000; FORALL i IN l_tab.FIRST..l_tab.LAST INSERT INTO target ...;\n\nInvestigue planos de execução (EXPLAIN PLAN), use binds e evite cursores linha-a-linha (N+1).", minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Bulk vs row-by-row',
                instructions: 'Explique por que operações em batch (BULK COLLECT / FORALL) reduzem roundtrips e melhoram throughput.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Snippet BULK COLLECT + FORALL',
                instructions: 'Escreva um snippet PL/SQL que use BULK COLLECT para buscar em um cursor e use FORALL para inserir em target em batch.',
                expectedIncludes: ['BULK COLLECT', 'FORALL'],
                expectedRegexes: ['BULK\\s+COLLECT', 'FORALL'],
                language: 'sql'
              }
            ]
          },
        ],
      },
    ],
  },

  {
    id: "delphi",
    title: "Delphi - Fundamentos",
    description: "Introdução ao desenvolvimento com Object Pascal, formulários e acesso a banco de dados.",
    modules: [
      {
        id: "delphi-basics",
        title: "Iniciando em Delphi",
        lessons: [
          { id: "del-1", title: "IDE e projeto", content: "Visão geral da RAD Studio/Delphi: projeto, units, forms e ciclo de compilação.\n\nDemonstre criação de um novo projeto VCL/FireMonkey, organização de units, e gerenciamento de recursos e pacotes.", minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Estrutura do projeto',
                instructions: 'Explique as diferenças entre VCL (Windows) e FireMonkey (multi-plataforma) em Delphi.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Unit e program',
                instructions: 'Descreva o papel de uma unit em Delphi e como ela se relaciona com o arquivo .dfm (formulário).',
                expectedIncludes: []
              }
            ]
          },
          { id: "del-2", title: "Componentes comuns", content: "Componentes visuais e não-visuais: TButton, TEdit, TLabel, TListBox, TDataSource, TClientDataSet.\n\nEventos mais comuns (OnClick, OnCreate, OnDestroy) e como escrever código limpo e modular em Object Pascal.", minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Como funcionam eventos',
                instructions: 'Explique em 1-2 frases como eventos como OnClick são vinculados a handlers e o ciclo de vida de um Form.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Criando um evento OnClick',
                instructions: 'Escreva um pequeno trecho Object Pascal que define um procedimento OnClick para um TButton que altera o texto de um TLabel.',
                expectedIncludes: ['procedure', 'TButton', 'TLabel', 'begin', 'end;'],
                expectedRegexes: ['procedure\\s+\\w+\\s*\\(Sender: TObject\\)', 'begin', 'end;'],
                language: 'pascal'
              }
            ]
          },
        ],
      },
      {
        id: "delphi-data",
        title: "Banco de Dados e conectividade",
        lessons: [
          { id: "del-3", title: "Conexões com DB", content: "Conectividade via FireDAC, dbExpress e componentes nativos: configuração de pools, transações, prepared statements e tratamento de erros.\n\nExemplo prático: leitura/escrita usando TFDQuery com parâmetros e uso de transações para manter atomicidade.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Transações e atomicidade',
                instructions: 'Explique por que usar transações ao escrever múltiplas operações no banco e o papel do rollback em erros.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Snippet FireDAC básico',
                instructions: 'Escreva um exemplo minimal de uso de TFDQuery para executar um SELECT com parâmetro e ler o resultado.',
                expectedIncludes: ['TFDQuery', 'ParamByName', 'Open', 'Close'],
                expectedRegexes: ['TFDQuery', 'ParamByName\\(', 'Open\\('],
                language: 'pascal'
              }
            ]
          },
          { id: "del-4", title: "Práticas e deploy", content: "Compilação para múltiplas plataformas (Windows, macOS, iOS, Android), empacotamento, atualizações e instalação.\n\nBoas práticas: logging, tratamento de exceções, assinatura de executáveis e estratégias de atualização em ambiente corporativo.", minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Multiplataforma',
                instructions: 'Explique como Delphi permite compilar a mesma aplicação para Windows, macOS e mobile (iOS/Android).',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Boas práticas',
                instructions: 'Liste 3 boas práticas para produção: logging, exception handling, versionamento...',
                expectedIncludes: []
              }
            ]
          },
        ],
      },

      // Additional Delphi interactive modules: Beginner -> Intermediate -> Advanced
      {
        id: "delphi-beginner",
        title: "Delphi - Beginner (Prático)",
        lessons: [
          { id: "delb-1", title: "Projecto VCL simples", content: `Crie um projeto VCL simples com um form, um botão e um label. Explique a estrutura de units e onde colocar código.`, minutes: 20,
            exercise: {
              type: 'code',
              title: 'Form básico em Object Pascal',
              instructions: 'Escreva a declaração de uma unit mínima contendo um form com um TButton e um TLabel, incluindo o evento OnClick que altera o Caption do label.',
              expectedIncludes: ['unit', 'interface', 'type', 'TForm', 'TButton', 'TLabel', 'procedure', 'implementation'],
              language: 'pascal'
            }
          },
          { id: "delb-2", title: "Variáveis e Tipos", content: `Tipos primitivos (Integer, String, Boolean), arrays, records e uso de strong typing no Object Pascal.`, minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Tipos em Object Pascal',
                instructions: 'Explique a diferença entre tipos primitivos (Integer, String) e tipos compostos (records, arrays) e quando usar cada um.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Declarar variáveis e record',
                instructions: 'Declare variáveis locais e um record simples que represente um Cliente (ID: Integer; Nome: String; Ativo: Boolean).',
                expectedIncludes: ['record', 'end;', 'type', 'Integer', 'String'],
                language: 'pascal'
              }
            ]
          },
          { id: "delb-3", title: "Controle de fluxo", content: `IF, CASE, FOR, WHILE e REPEAT. Exemplos práticos de iteração e branching.`, minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Laços e loops',
                instructions: 'Explique as diferenças entre FOR, WHILE e REPEAT: quando cada um é mais apropriado?',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Laço FOR e IF',
                instructions: 'Escreva um laço FOR que percorre um array de inteiros e conta quantos são pares usando IF.',
                expectedIncludes: ['for', 'if', 'begin', 'end;'],
                language: 'pascal'
              }
            ]
          },
          { id: "delb-4", title: "Procedures e Functions", content: `Criação de procedures e functions, passagem por valor e referência, escopo e visibilidade.`, minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Procedure vs Function',
                instructions: 'Explique a diferença entre uma Procedure (sem retorno) e uma Function (com retorno).',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Criar uma função utilitária',
                instructions: 'Implemente uma function que recebe duas Strings e retorna a concatenação com espaço entre elas.',
                expectedIncludes: ['function', 'Result', 'begin', 'end;'],
                language: 'pascal'
              }
            ]
          },
          { id: "delb-5", title: "Evento OnClick interativo", content: `Atrelando eventos a componentes visuais e atualizando estado do form.`, minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Manipulação de UI',
                instructions: 'Descreva como alterar propriedades visuais de um componente (ex: Label1.Caption := "novo texto").',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Escreva o procedimento OnClick',
                instructions: 'Digite apenas o bloco procedure <Nome>\(Sender: TObject\); ... end; que altera Label1.Caption para "Olá Delphi".',
                expectedIncludes: ['procedure', 'Label1.Caption', 'Olá Delphi'],
                language: 'pascal'
              }
            ]
          },
        ],
      },

      {
        id: "delphi-intermediate",
        title: "Delphi - Intermediate (APIs & DB)",
        lessons: [
          { id: "deli-1", title: "Forms avançados e DataModules", content: `Separação de lógica com DataModules, ciclo de vida e injeção de dependências simples.`, minutes: 25,
            exercise: {
              type: 'code',
              title: 'Criar DataModule básico',
              instructions: 'Declare uma unit com um TDataModule que tenha um componente TDataSource e um método público para inicializar conexões.',
              expectedIncludes: ['TDataModule', 'TDataSource', 'unit', 'implementation'],
              language: 'pascal'
            }
          },
          { id: "deli-2", title: "Acesso a banco com FireDAC", content: `Configuração de connections, drivers, TFdManager e TFDQuery para operações CRUD.`, minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — FireDAC CRUD',
                instructions: 'Explique a diferença entre Open (SELECT), ExecSQL (Insert/Update/Delete) e o uso de ParamByName para evitar SQL injection.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'CRUD básico com TFDQuery',
                instructions: 'Escreva um snippet que mostre Insert/Update/Delete usando TFDQuery com ParamByName.',
                expectedIncludes: ['TFDQuery', 'ParamByName', 'ExecSQL', 'Open'],
                language: 'pascal'
              }
            ]
          },
          { id: "deli-3", title: "Bindings e LiveBindings", content: `Vinculação entre componentes visuais e datasets usando LiveBindings para reduzir código boilerplate.`, minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Data binding',
                instructions: 'Descreva como LiveBindings vinculam automaticamente componentes visuais a datasets, reduzindo boilerplate.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Usar LiveBindings',
                instructions: 'Explique os passos para vincular um Edit a um campo TFDQuery usando LiveBindings na IDE.',
                expectedIncludes: []
              }
            ]
          },
          { id: "deli-4", title: "Threads e sincronização", content: `Trabalhar com TThread, sincronização com Synchronize/Queue e evitar deadlocks.`, minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — TThread e Synchronize',
                instructions: 'Explique por que usar Synchronize/Queue ao acessar UI de uma thread e o que é deadlock.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Uso básico de TThread',
                instructions: 'Escreva a declaração de uma classe TThread descendente que sobrecarrega Execute e usa Synchronize para atualizar UI.',
                expectedIncludes: ['class', 'TThread', 'procedure Execute', 'Synchronize'],
                language: 'pascal'
              }
            ]
          },
          { id: "deli-5", title: "Testes e logging", content: `Estratégias de logs, uso de frameworks de testes unitários e técnicas para instrumentar código.`, minutes: 20,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Logging e testes',
                instructions: 'Descreva como um sistema de logging ajuda no debugging e qual é a diferença entre logs de desenvolvimento e produção.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Escrever log',
                instructions: 'Escreva uma linha de código que registra uma mensagem em um arquivo de log (ex: "Operação concluída com sucesso").',
                expectedIncludes: []
              }
            ]
          },
        ],
      },

      {
        id: "delphi-advanced",
        title: "Delphi - Advanced (Arquitetura & Deploy)",
        lessons: [
          { id: "dela-1", title: "Padrões arquiteturais", content: `Design patterns aplicáveis em Delphi (MVC, MVP, MVVM), injeção de dependência e módulos desacoplados.`, minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Padrões de design',
                instructions: 'Explique os padrões MVC, MVP e MVVM: qual separa Model de View? Como reduzem acoplamento?',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Aplicar MVC',
                instructions: 'Descreva como estruturar uma aplicação Delphi seguindo MVC (onde fica UI, lógica, dados).',
                expectedIncludes: []
              }
            ]
          },
          { id: "dela-2", title: "Interoperabilidade e DLLs", content: `Chamar bibliotecas externas, criar e consumir DLLs, e interoperabilidade com COM/.NET.`, minutes: 25,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Integração com DLLs',
                instructions: 'Explique como chamar uma função em uma DLL externa e por que stdcall é importante para compatibilidade.',
                expectedIncludes: []
              },
              {
                type: 'code',
                title: 'Assinatura externa',
                instructions: 'Escreva a declaração externa de uma função em uma DLL: function Add(a: Integer; b: Integer): Integer; stdcall; external "mylib.dll";',
                expectedIncludes: ['external', 'stdcall', 'function'],
                language: 'pascal'
              }
            ]
          },
          { id: "dela-3", title: "Mobile e FMX", content: `Noções de FireMonkey, adaptação de UI para mobile e práticas de performance em dispositivos.`, minutes: 30,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — FireMonkey cross-platform',
                instructions: 'Explique as diferenças entre VCL (Windows-only) e FireMonkey (multiplataforma): layout, componentes, rendering.',
                expectedIncludes: []
              },
              {
                type: 'command',
                title: 'Adaptação para mobile',
                instructions: 'Descreva 3 técnicas para otimizar uma UI Delphi para mobile (tamanho de botões, orientação, etc).',
                expectedIncludes: []
              }
            ]
          },
          { id: "dela-4", title: "Projeto final: Aplicação CRUD completa", content: `Projeto hands-on: construa uma aplicação CRUD com formulário, DataModule, FireDAC e deploy mínimo. Este projeto será avaliado como prova final do módulo Delphi.`, minutes: 120,
            exercises: [
              {
                type: 'command',
                title: 'Conceito — Arquitetura da aplicação',
                instructions: 'Descreva a arquitetura de sua aplicação CRUD: quais são os módulos (UI, dados, lógica) e como se comunicam?',
                expectedIncludes: []
              },
              {
                type: 'project',
                title: 'Projeto CRUD final',
                instructions: 'Implemente uma aplicação Delphi que permita criar, ler, atualizar e excluir registros de uma tabela Cliente. Utilize TFDQuery e um DataModule para separar a lógica de dados. Submeta um resumo do fluxo e os principais snippets usados.',
                expectedIncludes: ['TFDQuery', 'Insert', 'Update', 'Delete', 'TDataModule'],
                language: 'pascal'
              }
            ]
          },
        ],
      },

    ],
  },

  {
    id: "php",
    title: "PHP - Fundamentos e Boas Práticas",
    description: "Server-side scripting: variáveis, funções, POO, Laravel e padrões de desenvolvimento.",
    modules: [
      {
        id: "php-basics",
        title: "Fundamentos PHP",
        lessons: [
          {
            id: "php-1",
            title: "Instalação, sintaxe básica e tipos",
            content: `## COMPREENDER: O que é PHP?

PHP é uma linguagem de programação server-side, dinamicamente tipada, desenvolvida especificamente para web. Criada em 1995, evoluiu muito e hoje é usada em 77% de todos os websites com tecnologia conhecida.

### Por que PHP?
- Fácil de aprender
- Rápido em prototipagem
- Ecossistema maduro (Laravel, Symfony)
- Hospedagem compartilhada amplamente disponível
- Performance satisfatória para maioria dos casos
- Comunidade gigantesca

### Ciclo de vida de um request HTTP em PHP

1. Servidor recebe requisição HTTP
2. PHP interpreta o arquivo .php
3. Código é executado no servidor
4. Resultado (HTML, JSON, etc) é retornado ao cliente
5. Navegador exibe o resultado

### Diferença crucial: Client-side vs Server-side

JavaScript (client-side): executado no navegador do usuário
PHP (server-side): executado no servidor, usuário não vê o código

### Instalação local para testes

Linux/Mac:
\`\`\`bash
brew install php  # Mac
sudo apt-get install php  # Linux
php -S localhost:8000  # Rodar servidor de teste
\`\`\`

Windows: download de php.net ou use WSL

Verifique instalação:
\`\`\`bash
php -v
php -a  # Interactive shell
\`\`\`

## APLICAR: Sua primeira sintaxe PHP

### Tags PHP

Código PHP SEMPRE dentro de <?php ... ?>

<?php
echo "Olá, Mundo!";
?>

### Variáveis e tipos primitivos

<?php
// String
$nome = "João";
$saudacao = 'Olá'; // Single ou double quotes

// Número inteiro
$idade = 30;
$quantidade = -5;

// Float
$preco = 99.90;
$taxa = 0.15;

// Boolean
$ativo = true;
$deletado = false;

// NULL
$vazio = null;

// Exibir valores
echo $nome;
echo "Idade: " . $idade; // Concatenação
echo "Idade: {$idade}"; // Interpolação (dentro de double quotes)
?>

### Diferença entre == e ===

== compara VALOR (type juggling)
=== compara VALOR E TIPO

<?php
var_dump(5 == "5");   // true (mesmo valor)
var_dump(5 === "5");  // false (tipos diferentes)

var_dump(0 == false); // true (type juggling)
var_dump(0 === false); // false (tipos diferentes)

// Sempre use === em produção!
?>

### Type hints (PHP 7+)

Declare tipos explícitos para melhor manutenibilidade e detecção de erros:

<?php
function soma(int $a, int $b): int {
  return $a + $b;
}

function nomeCompleto(string $primeiro, string $segundo): string {
  return $primeiro . " " . $segundo;
}

function temDesconto(float $preco): bool {
  return $preco > 100;
}

// Type hints ajudam a capturar erros
echo soma(5, 10); // OK: 15
// soma("5", 10); // Erro: TypeError
?>

### var_dump() vs print_r()

Para debug, use:

<?php
$dados = ["nome" => "João", "idade" => 30];

var_dump($dados);  // Mostra tipo e estrutura
print_r($dados);   // Mostra estrutura legível
echo json_encode($dados); // Mostra como JSON
?>

## PRODUZIR: Exercício prático

Crie um arquivo index.php que:
1. Declare 5 variáveis de tipos diferentes
2. Use type hints em uma função
3. Exiba os valores de forma legível
4. Compare == vs === pelo menos uma vez

Submeta o arquivo de código completo.

## AVALIAR

Perguntas para testar compreensão:

1. Qual é a diferença entre == e ===? Por que === é mais seguro?
2. O que é type hint e por que usar em PHP 7+?
3. Single quotes vs double quotes: qual é a diferença em PHP?
4. Qual é o ciclo de vida de um request HTTP em PHP?`,
            minutes: 45,
            exercises: [
              {
                type: "command",
                title: "Conceito — Type juggling",
                instructions: "Explique 'type juggling' em PHP usando exemplos como (5 == '5'). Por que usar === é mais seguro?",
                expectedIncludes: [],
              },
              {
                type: "code",
                title: "Script com type hints",
                instructions: "Escreva um script PHP com pelo menos 3 funções usando type hints (int, string, bool). Inclua uma função que retorna valor.",
                expectedIncludes: ["<?php", "function", ": ", "return"],
                language: "php",
              },
              {
                type: "project",
                title: "Calculadora básica",
                instructions: "Crie um arquivo PHP que implemente uma calculadora com funções soma, subtrai, multiplica, divide. Use type hints. Teste todas as operações.",
                expectedIncludes: ["function", "int", "float", "return"],
                language: "php",
              },
              {
                type: "command",
                title: "Avaliação — Client vs Server",
                instructions: "Explique a diferença entre código client-side (JavaScript) e server-side (PHP). Por que PHP não é visível no navegador?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "php-2",
            title: "Arrays e iteração",
            content: `## COMPREENDER: O que são arrays?

Arrays são estruturas de dados que armazenam múltiplos valores. PHP oferece dois tipos principais:

1. **Indexed arrays**: índices numéricos (0, 1, 2...)
2. **Associative arrays**: índices customizados (chaves)

Em PHP 7.4+, também existe **typed arrays** (type hints).

### Por que arrays são fundamentais?

- Representam listas (usuarios, produtos, etc)
- Simulam banco de dados em memória
- Essenciais para processar múltiplos registros
- Base para JSON (formato de dados mais usado em web)

### Array indexado vs Associativo

**Indexed Array** (índices numéricos):
<?php
$frutas = ["maçã", "banana", "laranja"];
echo $frutas[0]; // maçã
echo $frutas[1]; // banana
?>

**Associative Array** (chaves customizadas):
<?php
$pessoa = [
  "nome" => "João",
  "idade" => 30,
  "email" => "joao@ex.com"
];

echo $pessoa["nome"];  // João
echo $pessoa["idade"]; // 30
?>

### Array multidimensional

<?php
$usuarios = [
  [
    "id" => 1,
    "nome" => "João",
    "role" => "admin"
  ],
  [
    "id" => 2,
    "nome" => "Maria",
    "role" => "user"
  ]
];

echo $usuarios[0]["nome"]; // João
echo $usuarios[1]["role"]; // user
?>

## APLICAR: Manipulando Arrays

### Iteração com foreach

<?php
$pessoas = [
  "João" => 30,
  "Maria" => 25,
  "Pedro" => 35
];

// Iteração simples
foreach ($pessoas as $idade) {
  echo "Idade: " . $idade;
}

// Iteração com chave e valor
foreach ($pessoas as $nome => $idade) {
  echo "{$nome} tem {$idade} anos\\n";
}
?>

### Funções úteis de array

<?php
$numeros = [1, 2, 3, 4, 5];

// array_map: transformar cada elemento
$dobrados = array_map(fn($n) => $n * 2, $numeros);
// Resultado: [2, 4, 6, 8, 10]

// array_filter: filtrar elementos
$pares = array_filter($numeros, fn($n) => $n % 2 == 0);
// Resultado: [2, 4]

// array_reduce: agregar em um único valor
$soma = array_reduce($numeros, fn($carry, $n) => $carry + $n, 0);
// Resultado: 15

// count: tamanho do array
echo count($numeros); // 5

// in_array: verificar existência
if (in_array(3, $numeros)) {
  echo "3 existe no array";
}

// array_keys, array_values
$chaves = array_keys($pessoas);
$valores = array_values($pessoas);
?>

### Difference between [] e array()

<?php
// Antigo (PHP < 5.4)
$arr1 = array("a", "b", "c");

// Moderno (PHP 5.4+)
$arr2 = ["a", "b", "c"];

// Ambos são equivalentes, mas [] é mais moderno
?>

### Spread operator

<?php
$arr1 = [1, 2, 3];
$arr2 = [4, 5, 6];

// Unir arrays
$merged = [...$arr1, ...$arr2];
// Resultado: [1, 2, 3, 4, 5, 6]

// Desempacotar em função
function soma(int $a, int $b, int $c): int {
  return $a + $b + $c;
}

echo soma(...[1, 2, 3]); // 6
?>

### Type hints para arrays (PHP 7.4+)

<?php
function processar_usuarios(array $usuarios): array {
  return array_filter($usuarios, fn($u) => isset($u["ativo"]));
}

// Melhor ainda: use typed properties
class Usuario {
  public array $permissoes = [];
  public int $id;
  public string $nome;
}
?>

## PRODUZIR: Projeto prático

Crie um script que:
1. Define um array de 5 produtos (id, nome, preco, estoque)
2. Filtre produtos em estoque
3. Aplique desconto de 10% em produtos > R$ 100
4. Calcule o valor total do inventário
5. Exiba relatório formatado

Exemplo de output:
\`\`\`
=== RELATÓRIO DE INVENTÁRIO ===
Total de produtos: 5
Produto em estoque: Notebook - R$ 2.700,00 (10 un)
Valor total: R$ 15.250,00
\`\`\`

## AVALIAR

1. Qual é a diferença entre array indexado e associativo?
2. Como usar array_map vs foreach? Qual é mais eficiente?
3. O que faz o spread operator (...) com arrays?
4. Quando usar array_filter vs foreach com if?
5. Implemente um array_reduce customizado para multiplicar números.`,
            minutes: 50,
            exercises: [
              {
                type: "command",
                title: "Conceito — Array associativo",
                instructions: "Explique quando usar array indexado vs associativo com exemplos reais (lista de compras vs dados de usuário).",
                expectedIncludes: [],
              },
              {
                type: "code",
                title: "Manipular com array_map e filter",
                instructions: "Crie um array de números de 1-10. Use array_map para dobrar cada um, depois array_filter para manter apenas pares.",
                expectedIncludes: ["array_map", "array_filter", "fn("],
                language: "php",
              },
              {
                type: "code",
                title: "Iteração com foreach",
                instructions: "Crie um array de 5 pessoas com nome e idade. Itere exibindo: 'João tem 30 anos'.",
                expectedIncludes: ["foreach", "=>", "as"],
                language: "php",
              },
              {
                type: "project",
                title: "Carrinho de compras",
                instructions: "Implemente um carrinho com [id, produto, preco, qtd]. Calcule subtotal, aplique 15% de imposto, exiba total. Use array_reduce para soma.",
                expectedIncludes: ["array_reduce", "array", "=>"],
                language: "php",
              },
              {
                type: "command",
                title: "Avaliação — Performance",
                instructions: "Comparar performance: foreach com if vs array_filter. Qual é melhor? Por quê?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "php-3",
            title: "Funções e escopo",
            content: `## COMPREENDER: Functions são blocos de código reutilizáveis

Uma função permite:
- Reutilizar código sem repetição (DRY - Don't Repeat Yourself)
- Organizar lógica em partes menores
- Facilitar testes e manutenção
- Melhorar legibilidade

### Estrutura básica de função

<?php
function saudacao(string $nome): string {
  return "Olá, {$nome}!";
}

echo saudacao("João"); // Saída: Olá, João!
?>

**Componentes:**
- \`function\`: palavra-chave
- \`saudacao\`: nome da função
- \`(string $nome)\`: parâmetro com type hint
- \`: string\`: tipo de retorno
- \`return\`: valor retornado

### Parâmetros com valores padrão

<?php
function cumprimentar(string $nome = "Visitante"): string {
  return "Bem-vindo, {$nome}!";
}

echo cumprimentar();          // Bem-vindo, Visitante!
echo cumprimentar("Alice");   // Bem-vindo, Alice!
?>

Valores padrão precisam estar no final da lista de parâmetros.

### Passing by value vs by reference

**By value** (padrão): função recebe CÓPIA

<?php
function incrementar(int $x): int {
  $x++;
  return $x;
}

$numero = 5;
$resultado = incrementar($numero);
echo $numero; // 5 (não mudou!)
echo $resultado; // 6
?>

**By reference** (&): função modifica ORIGINAL

<?php
function incrementar_referencia(int &$x): void {
  $x++;
}

$numero = 5;
incrementar_referencia($numero);
echo $numero; // 6 (mudou!)
?>

Use reference quando precisa modificar variável original.

### Escopo de variáveis

**Global** (evite!):

<?php
$contador = 0;

function incrementar_global(): void {
  global $contador;  // Declare como global
  $contador++;
}

incrementar_global();
echo $contador; // 1
?>

**Static** (mantém valor entre chamadas):

<?php
function contador_chamadas(): int {
  static $chamadas = 0;
  $chamadas++;
  return $chamadas;
}

echo contador_chamadas(); // 1
echo contador_chamadas(); // 2 (static mantém valor!)
echo contador_chamadas(); // 3
?>

**Local** (padrão, melhor prática):

<?php
function local_scope(): void {
  $variavel = "local";
  echo $variavel; // OK
}

// echo $variavel; // ERRO: variável não existe aqui
?>

## APLICAR: Diferentes tipos de funções

### Arrow functions (PHP 7.4+)

Sintaxe curta para funções simples:

<?php
// Função tradicional
$dobro = function($n) {
  return $n * 2;
};

// Arrow function (mais concisa)
$dobro_arrow = fn($n) => $n * 2;

echo $dobro_arrow(5); // 10
?>

**Vantagem:** Capture variáveis do escopo externo:

<?php
$taxa = 1.1;

$aplicar_taxa = fn($preco) => $preco * $taxa;

echo aplicar_taxa(100); // 110
?>

### Closures

Funções que capturam variáveis do contexto:

<?php
$multiplicador = 2;

$multiplicar = function($n) use ($multiplicador) {
  return $n * $multiplicador;
};

echo $multiplicar(5); // 10

// Modificar captura por referência
$soma_ref = function($n) use (&$multiplicador) {
  $multiplicador += $n;
};

$soma_ref(5);
echo $multiplicador; // 7
?>

### Variadic functions (...$args)

Aceita número variável de argumentos:

<?php
function somar(...$numeros): int {
  $total = 0;
  foreach ($numeros as $n) {
    $total += $n;
  }
  return $total;
}

echo somar(1, 2, 3, 4, 5); // 15
?>

### Type declaration e void

<?php
// Função que não retorna nada
function exibir_message(string $msg): void {
  echo $msg;
}

// Union types (PHP 8+)
function processar(int|string $valor): float {
  if (is_int($valor)) {
    return $valor * 1.1;
  }
  return (float)$valor;
}
?>

## PRODUZIR: Projeto de calculadora avançada

Crie um módulo matemático com:
1. Função para soma com variadic args
2. Função para média aritmética
3. Função para calcular desconto (com valor default)
4. Usar arrow functions onde possível
5. Use closures para aplicar operações

Exemplo:
\`\`\`
calcular_media(10, 20, 30) // 20
aplicar_desconto(100, 0.1) // 90
\`\`\`

## AVALIAR

1. Qual é a diferença entre by value e by reference?
2. Quando usar arrow functions vs funções tradicionais?
3. O que é closure e como capture variáveis?
4. Explique por que evitar global e preferir local scope.
5. Quando usar variadic functions?`,
            minutes: 55,
            exercises: [
              {
                type: "code",
                title: "Função com type hints",
                instructions: "Escreva uma função que recebe name (string) e age (int), retorna bool indicando se é maior de idade. Use type hints.",
                expectedIncludes: ["function", "string", "int", "bool", "return"],
                language: "php",
              },
              {
                type: "code",
                title: "By reference",
                instructions: "Crie função que recebe &$array e adiciona 10 ao último elemento. Mostre antes e depois.",
                expectedIncludes: ["&", "array_push", "function"],
                language: "php",
              },
              {
                type: "code",
                title: "Variadic function",
                instructions: "Escreva função somar(...$nums) que soma qualquer quantidade de números. Teste com 2, 3 e 5 argumentos.",
                expectedIncludes: ["...", "function", "foreach"],
                language: "php",
              },
              {
                type: "code",
                title: "Arrow function com uso",
                instructions: "Crie arrow function que dobra um número. Capture uma variável \`$multiplicador\` do escopo externo.",
                expectedIncludes: ["fn(", "=>", "use"],
                language: "php",
              },
              {
                type: "project",
                title: "Calculadora com closures",
                instructions: "Implemente operações (soma, mult, div) como closures. Cada uma captura uma \`$resultado\` inicial. Demonstre 3 operações.",
                expectedIncludes: ["function", "use", "return"],
                language: "php",
              },
              {
                type: "command",
                title: "Avaliação — Escopo",
                instructions: "Explique por que usar global é problemático e qual é a melhor prática para compartilhar dados.",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "php-oop",
        title: "Programação Orientada a Objetos",
        lessons: [
          {
            id: "php-4",
            title: "Classes, propriedades e métodos",
            content: `## COMPREENDER: Programação Orientada a Objetos (POO)

POO é um paradigma que organiza código em "objetos" que combinam dados (propriedades) e comportamento (métodos).

### Por que POO?

- **Modularidade**: codigo organizado em blocos independentes
- **Reutilização**: classes podem ser estendidas e reutilizadas
- **Manutenibilidade**: código mais fácil de entender e modificar
- **Profissionalismo**: padrão em desenvolvimento corporativo
- **Frameworks modernos**: Laravel, Symfony usam POO intensamente

### Conceitos fundamentais

1. **Classe**: blueprint, template para criar objetos
2. **Objeto**: instância de uma classe
3. **Propriedade**: dados do objeto
4. **Método**: função dentro do objeto
5. **Visibilidade**: public, private, protected

### Sintaxe básica de classe

<?php
class Usuario {
  // Propriedades (dados)
  public string $nome;
  private string $email;
  protected int $idade;

  // Magic method: construtor chamado ao criar objeto
  public function __construct(string $nome, string $email, int $idade) {
    $this->nome = $nome;
    $this->email = $email;
    $this->idade = $idade;
  }

  // Método público: acessível de fora
  public function obterEmail(): string {
    return $this->email;
  }

  // Método privado: acessível apenas dentro da classe
  private function validar(): bool {
    return strlen($this->email) > 5;
  }

  // Magic method: toString
  public function __toString(): string {
    return "Usuario: {$this->nome}";
  }
}

// Usar a classe
$usuario = new Usuario("João", "joao@ex.com", 30);
echo $usuario->nome; // João
echo $usuario->obterEmail(); // joao@ex.com
?>

### Visibilidade: public, private, protected

| Visibilidade | Dentro da classe | Subclasses | Fora da classe |
|--------------|-----------------|-----------|----------------|
| public       | ✅              | ✅        | ✅             |
| protected    | ✅              | ✅        | ❌             |
| private      | ✅              | ❌        | ❌             |

**Boa prática**: Mantenha dados (propriedades) like **private** ou **protected**, use **getters/setters** para acesso controlado.

### Getters e Setters

<?php
class Produto {
  private string $nome;
  private float $preco;

  public function getNome(): string {
    return $this->nome;
  }

  public function setNome(string $nome): void {
    if (strlen($nome) < 3) {
      throw new Exception("Nome muito curto");
    }
    $this->nome = $nome;
  }

  public function setPreco(float $preco): void {
    if ($preco <= 0) {
      throw new Exception("Preço deve ser positivo");
    }
    $this->preco = $preco;
  }
}

$produto = new Produto();
$produto->setNome("Notebook"); // Valida!
$produto->setPreco(2500);
echo $produto->getNome(); // Notebook
?>

**Benefício**: Controlar e validar dados antes de atribuir.

### Magic Methods

Métodos especiais que PHP chama automaticamente:

<?php
class Pessoa {
  private array $dados = [];

  // Chamado quando tenta acessar propriedade inacessível
  public function __get(string $nome): mixed {
    return $this->dados[$nome] ?? null;
  }

  // Chamado quando tenta setar propriedade inacessível
  public function __set(string $nome, mixed $valor): void {
    $this->dados[$nome] = $valor;
  }

  // Chamado ao converterem objeto para string
  public function __toString(): string {
    return json_encode($this->dados);
  }

  // Chamado ao chamar método que não existe
  public function __call(string $metodo, array $args): void {
    echo "Método $metodo não existe";
  }

  // Versão static
  public static function __callStatic(string $metodo, array $args): void {
    echo "Método static $metodo não existe";
  }
}

$p = new Pessoa();
$p->nome = "Alice"; // Chama __set
echo $p->nome;      // Chama __get
?>

## APLICAR: Construindo classes reais

### Classe com validação completa

<?php
class Conta {
  private string $titular;
  private float $saldo;
  private string $tipo; // "corrente" ou "poupança"

  public function __construct(string $titular, float $saldoInicial = 0) {
    if (strlen($titular) < 3) {
      throw new Exception("Titular deve ter pelo menos 3 caracteres");
    }
    $this->titular = $titular;
    $this->saldo = max(0, $saldoInicial);
    $this->tipo = "corrente";
  }

  public function depositar(float $valor): void {
    if ($valor <= 0) {
      throw new Exception("Valor deve ser positivo");
    }
    $this->saldo += $valor;
  }

  public function sacar(float $valor): bool {
    if ($valor <= 0) {
      throw new Exception("Valor deve ser positivo");
    }
    if ($valor > $this->saldo) {
      return false; // Saldo insuficiente
    }
    $this->saldo -= $valor;
    return true;
  }

  public function getSaldo(): float {
    return $this->saldo;
  }

  public function getTitular(): string {
    return $this->titular;
  }

  public function extrato(): string {
    return "Conta de {$this->titular}: R$ " . number_format($this->saldo, 2);
  }
}

// Usar
$conta = new Conta("João Silva", 1000);
$conta->depositar(500);
$conta->sacar(300);
echo $conta->extrato(); // Conta de João Silva: R$ 1.200,00
?>

### Propriedades estáticas

<?php
class Configuracao {
  public static string $versao = "1.0.0";
  public static int $maxTentativas = 3;
  private static int $contador = 0;

  public static function incrementar(): void {
    self::$contador++;
  }

  public static function getContador(): int {
    return self::$contador;
  }
}

// Acessar sem criar instância
echo Configuracao::$versao; // 1.0.0
Configuracao::incrementar();
echo Configuracao::getContador(); // 1
?>

### Typografia forte com typed properties

<?php
class Veiculo {
  public string $marca;
  public string $modelo;
  public int $ano;
  public float $velocidade = 0.0; // Valor default

  public function __construct(string $marca, string $modelo, int $ano) {
    $this->marca = $marca;
    $this->modelo = $modelo;
    $this->ano = $ano;
  }

  public function acelerar(float $incremento): void {
    $this->velocidade = min(250, $this->velocidade + $incremento);
  }
}
?>

## PRODUZIR: Projeto prático

Implemente uma classe **Biblioteca** que:
1. Armazena nome, livros (array de titles)
2. Método para adicionar livro (validar duplicatas)
3. Método para remover livro
4. Método para buscar livro
5. Método para listar todos
6. Use private/public adequadamente
7. Validação completa de entrada

Classe deve permitir:
\`\`\`
$bib = new Biblioteca("Minha Bib");
$bib->adicionar("Clean Code");
$bib->listar();
\`\`\`

## AVALIAR

1. Qual é a diferença entre classe e objeto?
2. Quando usar private vs public para propriedades?
3. O que são getters/setters e por que usar?
4. Qual magic method é chamado com \`new\`?
5. Propriedades estáticas mantêm valor entre instâncias? Por quê?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Classe básica",
                instructions: "Crie classe Livro com propriedades titulo (string), autor (string), ano (int). Defina construtor e método toString.",
                expectedIncludes: ["class", "public function", "__construct", "private", "string"],
                language: "php",
              },
              {
                type: "code",
                title: "Getters e Setters",
                instructions: "Implemente classe Pessoa com preco (private). Crie getter e setter com validação de valor positivo.",
                expectedIncludes: ["private", "public function get", "public function set"],
                language: "php",
              },
              {
                type: "code",
                title: "Validação em construtor",
                instructions: "Crie classe Email que valida email no construtor usando filter_var. Jogue exception se invalido.",
                expectedIncludes: ["__construct", "throw new Exception", "filter_var"],
                language: "php",
              },
              {
                type: "project",
                title: "Classe Carrinho de compras",
                instructions: "Implemente classe Carrinho com: adicionar(produto, qtd), remover(id), calcularTotal(), listar(). Teste todas operações.",
                expectedIncludes: ["class", "private", "public", "array"],
                language: "php",
              },
              {
                type: "command",
                title: "Avaliação — Encapsulamento",
                instructions: "Espandir por que encapsular dados com private e fornecer getters/setters é importante.",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "php-5",
            title: "Herança, Interfaces e Traits",
            content: `## COMPREENDER: Reutilização de código além da composição

### Problema: Copy-paste de código

\`\`\`php
class Cachorro {
  public function latir() { echo "Au!"; }
  public function correr() { echo "Correndo..."; }
}

class Gato {
  // ❌ Repetindo correr()
  public function latir() { echo "Miau!"; }
  public function correr() { echo "Correndo..."; }
}
\`\`\`

Solução: Herança, Interfaces e Traits

### Herança: Relação "is-a"

Um Cachorro IS-A Animal:

\`\`\`php
class Animal {
  protected $nome;
  
  public function __construct($nome) {
    $this->nome = $nome;
  }
  
  public function dormir() {
    echo "{$this->nome} dormindo...";
  }
  
  public function fazer_som() {
    // implementação padrão
  }
}

class Cachorro extends Animal {
  // Herda dormir() do Animal
  // Sobrescreve fazer_som()
  public function fazer_som() {
    echo "{$this->nome}: Au Au!";
  }
  
  public function buscar_bolinha() {
    echo "{$this->nome} buscando bolinha!";
  }
}

$cachorro = new Cachorro("Rex");
$cachorro->dormir();         // Herdado
$cachorro->fazer_som();      // Sobrescrito
$cachorro->buscar_bolinha(); // Próprio
\`\`\`

**Sobrescrita (Override):** Filho redefine método do pai

\`\`\`php
class Gato extends Animal {
  public function fazer_som() {
    echo "{$this->nome}: Miau!";  // Diferente do pai
  }
}
\`\`\`

**parent::** Chamar método do pai

\`\`\`php
class Pato extends Animal {
  public function fazer_som() {
    parent::fazer_som();  // Executa Animal::fazer_som()
    echo " Quack!";       // Depois adiciona próprio comportamento
  }
}
\`\`\`

### Interfaces: Contrato sem implementação

Interfaces DEFINEM O QUE fazer, mas não COMO fazer:

\`\`\`php
interface Piloto {
  public function acelerar();
  public function frear();
  public function virar($direcao);
}

class Carro implements Piloto {
  public function acelerar() {
    echo "Carro acelerando..";
  }
  public function frear() {
    echo "Carro freando..";
  }
  public function virar($direcao) {
    echo "Carro virando para $direcao";
  }
}

class Bicicleta implements Piloto {
  public function acelerar() {
    echo "Bicicleta pedalando..";
  }
  public function frear() {
    echo "Bicicleta freando com calcanhar..";
  }
  public function virar($direcao) {
    echo "Bicicleta virando para $direcao";
  }
}

// Polimorfismo: qualquer Piloto pode fazer essas ações
function testar_veiculo(Piloto $v) {
  $v->acelerar();
  $v->virar('esquerda');
  $v->frear();
}

testar_veiculo(new Carro());
testar_veiculo(new Bicicleta());
\`\`\`

**Benefício:** Design flexível, teste fácil com mocks

### Traits: Reutilização horizontal

Traits são como "ingredientes" que vários componentes usam:

\`\`\`php
trait Timestamp {
  public function getCriadoEm() {
    return $this->criado_em ?? null;
  }
  
  public function setCriadoEm() {
    $this->criado_em = date('Y-m-d H:i:s');
  }
}

class Usuario {
  use Timestamp;
  
  public function __construct() {
    $this->setCriadoEm();
  }
}

class Post {
  use Timestamp;
  
  public function __construct() {
    $this->setCriadoEm();
  }
}

// Ambos têm Timestamp sem duplicar código!
\`\`\`

**Diferença de Herança:**
- Herança: linear (fil só herda de 1 pai)
- Traits: múltiplos (use Timestamp, use Auditoria, use Cache)

\`\`\`php
class Produto {
  use Timestamp;      // Tem getCriadoEm(), setCriadoEm()
  use Auditoria;      // Tem registrarMudanca()
  use Cache;          // Tem get(), set() para cache
}
\`\`\`

### Classes abstratas: Herança com interface

Abstract = "Must override em subclass":

\`\`\`php
abstract class FormaPagamento {
  protected $valor;
  
  abstract public function processar();
  abstract public function gerar_recibo();
  
  public function validar() {
    return $this->valor > 0;
  }
}

// ❌ new FormaPagamento() — ERRO! É abstrata
// ✅ new Dinheiro() — OK se implementou métodos abstratos

class Cartao extends FormaPagamento {
  public function processar() {
    echo "Processando cartão...";
  }
  public function gerar_recibo() {
    echo "Recibo do cartão";
  }
}
\`\`\`

## APLICAR: Herança prática

### Exemplo 1: Hierarquia de animais

\`\`\`php
abstract class Animal {
  protected $nome;
  protected $idade = 0;
  
  public function __construct($nome) {
    $this->nome = $nome;
  }
  
  abstract public function fazer_som();
  
  public function envelhecer() {
    $this->idade++;
  }
}

class Carnivoro extends Animal {
  public function cacar() {
    echo "{$this->nome} caçando...";
  }
}

class Leao extends Carnivoro {
  public function fazer_som() {
    echo "Rugido!";
  }
}

class Herbivoro extends Animal {
  public function pastar() {
    echo "{$this->nome} pastando...";
  }
}

class Ovelha extends Herbivoro {
  public function fazer_som() {
    echo "Bê!";
  }
}
\`\`\`

### Exemplo 2: Interface + múltiplas implementações

\`\`\`php
interface Persistivel {
  public function salvar();
  public function carregar($id);
}

class usuarioDB implements Persistivel {
  public function salvar() {
    // Salva em banco de dados
  }
  public function carregar($id) {
    // Carrega de banco de dados
  }
}

class usuarioJSON implements Persistivel {
  public function salvar() {
    // Salva em arquivo JSON
  }
  public function carregar($id) {
    // Carrega de arquivo JSON
  }
}

// Mesmo contrato, implementações diferentes!
\`\`\`

### Exemplo 3: Traits para comportamentos compartilhados

\`\`\`php
trait Loggavel {
  public function log($mensagem) {
    file_put_contents('log.txt', "[" . date('Y-m-d H:i:s') . "] $mensagem\n", FILE_APPEND);
  }
}

trait Paginavel {
  public function paginar($items, $por_pagina = 10) {
    return array_chunk($items, $por_pagina);
  }
}

class RelatorioVendas {
  use Loggavel, Paginavel;
  
  public function gerar() {
    $this->log('Iniciando relatório');
  }
}
\`\`\`

## PRODUZIR: Sistema de pagamento

Implemente:

1. **Abstract Class FormaPagamento**
   - $valor, $data, $status
   - Abstract: processar(), gerar_recibo()
   - Concreto: validar(), obter_status()

2. **Interface Reembolsavel**
   - reembolsar()
   - obter_taxa_reembolso()

3. **4 Implementações**
   - Cartao (extends FormaPagamento, implements Reembolsavel)
   - Dinheiro (extends FormaPagamento)
   - PIX (extends FormaPagamento, implements Reembolsavel)
   - Boleto (extends FormaPagamento)

4. **Trait Loggavel**
   - registrar_transacao()
   - obter_log()

5. **Usado em:** Cartao, PIX usam Loggavel

Requisitos:
- Herança em cadeia
- Múltiplas interfaces
- Traits compartilhadas
- Polimorfismo em ação

## AVALIAR

1. Por que usar interfaces em vez de apenas herança?
2. Qual é a diferença entre extends e implements?
3. Quando usar trait vs herança?
4. O que é polimorfismo e por que é útil?
5. Uma classe pode estar em múltipla herança?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Herança simples",
                instructions: "Crie Animal base, depois Cachorro e Gato que herdam. Sobrescreva fazer_som().",
                expectedIncludes: ["extends", "class", "public function"],
                language: "php",
              },
              {
                type: "code",
                title: "Interface + implementação",
                instructions: "Interface Veiculo com acelerar(), frear(). Carro e Bicicleta implementam.",
                expectedIncludes: ["interface", "implements"],
                language: "php",
              },
              {
                type: "code",
                title: "Trait compartilhada",
                instructions: "Trait Auditoria com log_acao(). Use em Usuario e Post.",
                expectedIncludes: ["trait", "use"],
                language: "php",
              },
              {
                type: "code",
                title: "Class abstrata",
                instructions: "Abstract classe FormaPagamento com abstract processar(). Implemente Cartao.",
                expectedIncludes: ["abstract", "class"],
                language: "php",
              },
              {
                type: "project",
                title: "Sistema de formas de pagamento",
                instructions: "FormaPagamento abstract, 3+ implementações (Cartao, PIX, Dinheiro). Trait Loggavel em algumas.",
                expectedIncludes: ["abstract", "implements", "trait"],
                language: "php",
              },
              {
                type: "command",
                title: "Pergunta — Polimorfismo",
                instructions: "Explique como polimorfismo permite passar Cartao ou PIX onde FormaPagamento é esperado.",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "php-web",
        title: "Web e Banco de Dados",
        lessons: [
          {
            id: "php-6",
            title: "Superglobals, Formulários e Segurança Web",
            content: `## COMPREENDER: Dados vêm do usuário, deve validar!

### Problema: Confiança cega em entrada

❌ PERIGO:
\`\`\`php
<?php
$email = $_POST['email'];  // Usuário digita o quê?
$query = "SELECT * FROM usuarios WHERE email = '$email'";
exec($query);
\`\`\`

Usuário entra: \`' OR 'a'='a\` → Query fica: \`WHERE email = '' OR 'a'='a'\` → Todos os usuários!

✅ SEGURO: Validar + sanitizar + usar prepared statements

### Superglobals: Variáveis mágicas do PHP

#### $_GET: Dados na URL

\`\`\`php
// URL: /produto.php?id=123&sort=preco
echo $_GET['id'];    // "123"
echo $_GET['sort'];  // "preco"

// Problema: Visível na URL, limitado a 2KB
\`\`\`

#### $_POST: Dados do formulário (corpo HTTP)

\`\`\`html
<form method="POST" action="processar.php">
  <input type="text" name="nome" required>
  <input type="email" name="email" required>
  <button type="submit">Enviar</button>
</form>
\`\`\`

\`\`\`php
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $nome = $_POST['nome'];
  $email = $_POST['email'];
  // Processar
}
?>
\`\`\`

**Vantagens:** Invisível na URL, sem limite de tamanho

#### $_REQUEST: GET ou POST (evite!)

\`\`\`php
// Mistura GET e POST - ambíguo, perigoso
$valor = $_REQUEST['id'];  // Poderia vir de qualquer lugar
\`\`\`

#### $_SERVER: Informações do servidor/requisição

\`\`\`php
echo $_SERVER['REQUEST_METHOD'];     // GET, POST, PUT, DELETE
echo $_SERVER['HTTP_HOST'];           // example.com
echo $_SERVER['REQUEST_URI'];         // /pagina.php?id=123
echo $_SERVER['REMOTE_ADDR'];        // IP do cliente
echo $_SERVER['PHP_SELF'];            // /index.php
echo $_SERVER['SERVER_NAME'];         // hostname
echo $_SERVER['HTTPS'];               // on/off
\`\`\`

#### $_COOKIE: Cookies persistidos no navegador

\`\`\`php
// Salvar cookie (válido por 30 dias)
setcookie('preferencia', 'modo-escuro', time() + (30 * 24 * 60 * 60));

// Ler cookie
echo $_COOKIE['preferencia'];  // "modo-escuro"

// Deletar
setcookie('preferencia', '', time() - 3600);
\`\`\`

#### $_SESSION: Dados persistidos no servidor

\`\`\`php
session_start();  // DEVE ser primeira linha!

// Salvar na sessão
$_SESSION['usuario_id'] = 42;
$_SESSION['carrinho'] = ['item1', 'item2'];

// Ler
echo $_SESSION['usuario_id'];

// Deletar
unset($_SESSION['usuario_id']);
session_destroy();  // Limpa tudo
\`\`\`

### Validação e Sanitização: Defesa contra ataque

Validação = "Isto é o que eu espero?"  
Sanitização = "Remover caracteres perigosos"

#### filter_input(): O jeito certo

\`\`\`php
// Validar e-mail
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
if ($email === false) {
  echo "E-mail inválido";
}

// Validar Integer
$idade = filter_input(INPUT_POST, 'idade', FILTER_VALIDATE_INT);
if ($idade === false || $idade < 0 || $idade > 150) {
  echo "Idade inválida";
}

// Validar URL
$url = filter_input(INPUT_POST, 'url', FILTER_VALIDATE_URL);

// Sanitizar (remover caracteres perigosos)
$texto = filter_input(INPUT_POST, 'bio', FILTER_SANITIZE_STRING);
// Resultado: sem tags HTML, mais seguro
\`\`\`

#### Validação customizada

\`\`\`php
function validar_telefone($fone) {
  // Remove não-dígitos
  $fone = preg_replace('/\\D/', '', $fone);
  
  // Valida formato brasileiro (11 dígitos)
  return strlen($fone) === 11 && $fone[0] === '1';
}

if (!validar_telefone($_POST['telefone'])) {
  echo "Telefone inválido";
}
\`\`\`

### Proteção contra XSS (Cross-Site Scripting)

❌ PERIGO: Usuário digita < script > alert('hackeado') < /script >

\`\`\`php
// Sin validação
echo $_POST['comentario'];  // Executa JavaScript!
\`\`\`

✅ SOLUÇÃO: htmlspecialchars() ou attr

\`\`\`php
$comentario = htmlspecialchars($_POST['comentario'], ENT_QUOTES, 'UTF-8');
echo $comentario;  // < e > viram &lt; e &gt; - inócuo
\`\`\`

### Proteção contra CSRF (Cross-Site Request Forgery)

Ataque: Site malicioso faz requisição em nome do usuário

Solução: CSRF Token (valor aleatório validado)

\`\`\`php
// Na página do formulário
session_start();
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
?>
<form method="POST" action="processar.php">
  <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
  <input type="email" name="email">
  <button>Enviar</button>
</form>

// No processamento
session_start();
if ($_POST['csrf_token'] !== $_SESSION['csrf_token']) {
  die('CSRF token inválido');
}
// Processar com segurança
\`\`\`

## PRODUZIR: Formulário seguro com validação

Implemente **FormularioCadastro.php**:

1. **Campos**
   - Nome (string, 3-100 caracteres)
   - E-mail (válido, único)
   - Telefone (brasileiro)
   - Data de Nasc (válida, > 13 anos)
   - Senha (mín. 8, maiúscula, número)

2. **Validações**
   - Usar filter_input() quando possível
   - Validação custom para telefone
   - CSRF token
   - htmlspecialchars() ao exibir erro

3. **Segurança**
   - Sanitizar entrada
   - Preparar para banco de dados
   - Gerar token CSRF
   - Log de tentativas

4. **Requisitos**
   - POST method
   - session_start()
   - Tratamento de erro
   - Mensagens claras ao usuário

## AVALIAR

1. Diferença entre $_GET e $_POST?
2. Por que $_SESSION é mais seguro que cookies?
3. O que é CSRF token e por que usar?
4. htmlspecialchars() previne qual tipo de ataque?
5. Como prevenir SQL injection sem usar prepared statements (melhor: use!)?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Validar e-mail com filter_input",
                instructions: "POST form com e-mail. Valide usando filter_input + FILTER_VALIDATE_EMAIL. Exiba erro se inválido.",
                expectedIncludes: ["filter_input", "INPUT_POST", "FILTER_VALIDATE_EMAIL"],
                language: "php",
              },
              {
                type: "code",
                title: "CSRF token em formulário",
                instructions: "Gere token com random_bytes(), salve em SESSION, inclua no form hidden, valide ao processar.",
                expectedIncludes: ["random_bytes", "csrf_token", "session_start"],
                language: "php",
              },
              {
                type: "code",
                title: "htmlspecialchars() contra XSS",
                instructions: "Receba comentário de $_POST, use htmlspecialchars(), exiba com segurança.",
                expectedIncludes: ["htmlspecialchars", "ENT_QUOTES"],
                language: "php",
              },
              {
                type: "code",
                title: "Validação customizada",
                instructions: "Função validar_telefone() que valida telefone brasileiro (11 dígitos começando com 1).",
                expectedIncludes: ["preg_replace", "strlen"],
                language: "php",
              },
              {
                type: "project",
                title: "Cadastro seguro completo",
                instructions: "Formulário com: nome, e-mail, telefone. Validação em cada, CSRF token, htmlspecialchars ao exibir.",
                expectedIncludes: ["filter_input", "csrf_token", "htmlspecialchars"],
                language: "php",
              },
              {
                type: "command",
                title: "Pergunta — Segurança",
                instructions: "Um prepared statement impede SQL injection?  Explique por quê.",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "php-7",
            title: "Banco de Dados com PDO e Prepared Statements",
            content: `## COMPREENDER: Camadas de abstração de banco

### Problema: MySQLi vs PDO vs Query raw

❌ NUNCA fazer direto:
\`\`\`php
$query = "SELECT * FROM users WHERE email = '" . $_POST['email'] . "'";
// SQL injection!
\`\`\`

✅ PDO: Camada abstrata para qualquer banco de dados

### Virtual DOM: Como React funciona

React não atualiza TODO o DOM, apenas o necessário:

\`\`\`javascript
// Antes
<div>
  <p>Contador: 5</p>
  <button>Incrementar</button>
</div>

// Usuário clica, state muda para 6
// Depois
<div>
  <p>Contador: 6</p>
  <button>Incrementar</button>
</div>

// React detecta:
// - <div> não mudou (não re-renderiza)
// - <p> conteúdo mudou (atualiza APENAS esse texto)
// - <button> não mudou

// Resultado: Performance!!
\`\`\`

### PDO (PHP Data Objects): Banco agnóstico

Mesmo código para MySQL, PostgreSQL, SQLite, SQL Server:

\`\`\`php
// MySQL
$pdo = new PDO('mysql:host=localhost;dbname=myapp', 'user', 'pass');

// PostgreSQL
$pdo = new PDO('pgsql:host=localhost;dbname=myapp', 'user', 'pass');

// SQLite
$pdo = new PDO('sqlite:/caminho/banco.db');
\`\`\`

### Prepared Statements: Prevenção de SQL injection

❌ Perígoso:
\`\`\`php
$email = $_POST['email'];  // User digita: ' OR '1'='1
$query = "SELECT * FROM users WHERE email = '$email'";
// Executa: SELECT * FROM users WHERE email = '' OR '1'='1'
// Retorna TODOS os usuários!
\`\`\`

✅ Seguro com prepared:
\`\`\`php
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$_POST['email']]);
// O ? é placeholder, SQL e dados são separados
// Mesmo que user digite ' OR '1'='1', é tratado como string literal
\`\`\`

### Dois estilos de placeholders

#### Positional (?) - melhor para listas simples

\`\`\`php
$stmt = $pdo->prepare('INSERT INTO users (nome, email, idade) VALUES (?, ?, ?)');
$stmt->execute(['João', 'joao@ex.com', 30]);
\`\`\`

#### Named (:name) - melhor para legibilidade

\`\`\`php
$stmt = $pdo->prepare('INSERT INTO users (nome, email, idade) VALUES (:nome, :email, :idade)');
$stmt->execute([
  ':nome' => 'João',
  ':email' => 'joao@ex.com',
  ':idade' => 30
]);
\`\`\`

## APLICAR: CRUD prático com PDO

### Conectar ao banco

\`\`\`php
<?php
try {
  $pdo = new PDO('mysql:host=localhost;dbname=blog', 'root', '');
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
  die('Erro ao conectar: ' . $e->getMessage());
}
?>
\`\`\`

**setAttribute**: Modo de erro para exceções (melhor para debug)

### CREATE (INSERT)

\`\`\`php
$nome = 'Maria';
$email = 'maria@ex.com';

$stmt = $pdo->prepare('INSERT INTO users (nome, email, criado_em) VALUES (?, ?, NOW())');
$stmt->execute([$nome, $email]);

// Obter ID do registro inserido
$id = $pdo->lastInsertId();
echo "Usuário $id criado!";
\`\`\`

### READ (SELECT)

#### Fetch um resultado

\`\`\`php
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([1]);

// PDO::FETCH_ASSOC = array associativo ['nome' => 'João', 'email' => ...]
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if ($usuario) {
  echo "Encontrado: " . $usuario['nome'];
} else {
  echo "Usuário não encontrado";
}
\`\`\`

#### Fetch todos os resultados

\`\`\`php
$stmt = $pdo->prepare('SELECT * FROM users WHERE ativo = ? ORDER BY nome');
$stmt->execute([1]);

$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($usuarios as $u) {
  echo $u['nome'] . " - " . $u['email'] . "<br>";
}
\`\`\`

#### Fetch com COUNT, SUM, etc

\`\`\`php
$stmt = $pdo->prepare('SELECT COUNT(*) as total FROM users WHERE ativo = ?');
$stmt->execute([1]);
$resultado = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Total de usuários: " . $resultado['total'];
\`\`\`

### UPDATE

\`\`\`php
$nome = 'João Silva';
$id = 1;

$stmt = $pdo->prepare('UPDATE users SET nome = ?, atualizado_em = NOW() WHERE id = ?');
$stmt->execute([$nome, $id]);

$linhas = $stmt->rowCount();  // Quantas linhas foram modificadas
echo "$linhas usuário(s) atualizado(s)";
\`\`\`

### DELETE

\`\`\`php
$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([1]);

echo $stmt->rowCount() . " usuário(s) deletado(s)";
\`\`\`

### Transações: Multiple queries atomicamente

\`\`\`php
try {
  $pdo->beginTransaction();
  
  // Débito de conta A
  $stmt = $pdo->prepare('UPDATE contas SET saldo = saldo - ? WHERE id = ?');
  $stmt->execute([100, 1]);
  
  // Crédito em conta B
  $stmt = $pdo->prepare('UPDATE contas SET saldo = saldo + ? WHERE id = ?');
  $stmt->execute([100, 2]);
  
  $pdo->commit();  // Tudo sucesso, salva tudo
} catch (Exception $e) {
  $pdo->rollBack();  // Erro, desfaz tudo
  echo "Erro: " . $e->getMessage();
}
\`\`\`

## PRODUZIR: API de TODO com PDO

Implemente **TodoAPI.php** com:

1. **Tabela: todos**
   - id (PK)
   - titulo (varchar 200)
   - descricao (text)
   - completo (boolean)
   - criado_em (timestamp)

2. **Endpoints**
   - GET /todos (lista tudo)
   - GET /todos/1 (um específico)
   - POST /todos (cria)
   - PUT /todos/1 (atualiza)
   - DELETE /todos/1 (deleta)

3. **Requisitos**
   - Prepared statements com ?
   - PDO::FETCH_ASSOC
   - rowCount() para confirmação
   - try-catch com PDOException
   - JSON response

4. **Implementar**
   - CRUD completo
   - Validação antes de BD
   - Tratamento de erro

## AVALIAR

1. Como prepared statements previnem SQL injection?
2. Diferença entre ? e :named placeholders?
3. O que PDO::lastInsertId() retorna?
4. Por que usar transaction em transfer entre contas?
5. fetchAll() vs fetch()?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Preparar e executar SELECT",
                instructions: "Query preparado: SELECT por ID com ?. Use fetch() e PDO::FETCH_ASSOC.",
                expectedIncludes: ["prepare", "execute", "fetch", "FETCH_ASSOC"],
                language: "php",
              },
              {
                type: "code",
                title: "INSERT com lastInsertId()",
                instructions: "Inserir registro e obter ID com lastInsertId(). Exiba 'Criado com ID X'.",
                expectedIncludes: ["(INSERT INTO", "lastInsertId"],
                language: "php",
              },
              {
                type: "code",
                title: "UPDATE com rowCount()",
                instructions: "Atualizar registro, use rowCount() para mostrar quantos foram modificados.",
                expectedIncludes: ["UPDATE", "rowCount"],
                language: "php",
              },
              {
                type: "code",
                title: "Fetch múltiplos com loop",
                instructions: "Query que retorna vários, use fetchAll() e foreach para exibir.",
                expectedIncludes: ["fetchAll", "foreach"],
                language: "php",
              },
              {
                type: "project",
                title: "CRUD TODO com PDO",
                instructions: "Create, Read, Update, Delete de TODOs. Prepared statements, tratamento erro.",
                expectedIncludes: ["prepare", "execute", "PDO"],
                language: "php",
              },
              {
                type: "command",
                title: "Pergunta — Transação",
                instructions: "Em uma transfer bancária, se falhar no meio, o que rollBack() faz?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "php-frameworks",
        title: "Laravel e Frameworks Modernos",
        lessons: [
          {
            id: "php-8",
            title: "Introdução ao Laravel e Frameworks Modernos",
            content: `## COMPREENDER: Por que usar framework?

### Problema: Escrever tudo à mão

✅ PDO puro:
- Controle total
- Leve
- Poder é necessário

❌ Mas:
- Muito código repetido
- Autenticação, validação, routing manual
- Fácil cometer erros de segurança
- Desenvolvimento lento

### Solução: Laravel (framework)

Laravel fornece:
- Routing automático
- ORM (Eloquent) em vez de raw SQL
- Autenticação built-in
- Validação nativa
- Migrations (versionamento DB)
- Testes integrados

### O que é Laravel?

Laravel é um **framework fullstack** para aplicações web modernas em PHP.

## APLICAR: Estrutura e conceitos básicos

### Instalação

\`\`\`bash
# Via Composer
composer create-project laravel/laravel meu-app
cd meu-app
php artisan serve
# http://localhost:8000
\`\`\`

### Estrutura de pastas

\`\`\`
laravel-app/
├── app/           # Código da aplicação
│   ├── Models/    # Classes de modelo (DB)
│   ├── Http/
│   │   └── Controllers/  # Controllers (lógica)
│   └── Rules/     # Regras de validação
├── routes/        # Definição de rotas
│   └── web.php    # Rotas web
├── resources/
│   └── views/     # Templates Blade
├── database/
│   ├── migrations/  # Versionamento DB
│   └── seeders/     # Dados fake
├── config/        # Configuração
└── bootstrap/     # Boot
\`\`\`

### Eloquent ORM: SQL em PHP

#### Consultas básicas

\`\`\`php
use App\\Models\\Usuario;

// SELECT * FROM usuarios
$usuarios = Usuario::all();

// SELECT * FROM usuarios WHERE ativo = 1
$ativos = Usuario::where('ativo', 1)->get();

// SELECT * FROM usuarios WHERE id = 1
$usuario = Usuario::find(1);

// SELECT * FROM usuarios WHERE email = 'joao@ex.com' LIMIT 1
$usuario = Usuario::where('email', 'joao@ex.com')->first();
\`\`\`

#### CRUD com Eloquent

\`\`\`php
// CREATE
$usuario = Usuario::create([
  'nome' => 'João',
  'email' => 'joao@ex.com',
  'senha' => bcrypt('senha123')
]);

// READ (já vimos)
$usuario = Usuario::find(1);

// UPDATE
$usuario->nome = 'João Silva';
$usuario->save();

// Ou direto:
Usuario::where('id', 1)->update(['nome' => 'João Silva']);

// DELETE
$usuario->delete();
\`\`\`

#### Relacionamentos

\`\`\`php
// Um usuário TEM MUITOS posts
class Usuario extends Model {
  public function posts() {
    return $this->hasMany(Post::class);
  }
}

// Uso:
$usuario = Usuario::find(1);
$posts = $usuario->posts()->get();
\`\`\`

### Routing: Mapear URLs

\`\`\`php
// routes/web.php
Route::get('/', [PaginasController::class, 'home']);           // GET /
Route::get('/posts', [PostsController::class, 'index']);      // GET /posts
Route::get('/posts/{id}', [PostsController::class, 'show']);  // GET /posts/1
Route::post('/posts', [PostsController::class, 'store']);     // POST /posts
Route::put('/posts/{id}', [PostsController::class, 'update']); // PUT /posts/1
Route::delete('/posts/{id}', [PostsController::class, 'destroy']); // DELETE /posts/1
\`\`\`

### Controllers: Lógica

\`\`\`php
namespace App\\Http\\Controllers;

use App\\Models\\Post;
use Illuminate\\Http\\Request;

class PostsController extends Controller {
  // Listar todos
  public function index() {
    $posts = Post::all();
    return view('posts.index', compact('posts'));
  }
  
  // Mostrar específico
  public function show($id) {
    $post = Post::find($id);
    return view('posts.show', compact('post'));
  }
  
  // Criar (POST)
  public function store(Request $request) {
    $validated = $request->validate([
      'titulo' => 'required|string|max:200',
      'conteudo' => 'required|string',
    ]);
    
    Post::create($validated);
    return redirect('/posts')->with('sucesso', 'Post criado!');
  }
}
\`\`\`

### Validação em Laravel

\`\`\`php
$request->validate([
  'nome' => 'required|string|min:3|max:100',
  'email' => 'required|email|unique:usuarios,email',
  'idade' => 'required|integer|min:13|max:120',
  'genero' => 'required|in:masculino,feminino,outro',
]);
\`\`\`

Se falhar, automaticamente redireciona com erros em $errors.

### Migrations: Versionamento DB

\`\`\`bash
php artisan make:migration create_posts_table
\`\`\`

\`\`\`php
Schema::create('posts', function (Blueprint $table) {
  $table->id();
  $table->string('titulo');
  $table->text('conteudo');
  $table->timestamps();  // created_at, updated_at
});

php artisan migrate  // Executa migration
\`\`\`

## PRODUZIR: Blog simples em Laravel

Implemente:

1. **Model Post**
   - id, titulo, conteudo, usuario_id, created_at

2. **Migration**
   - Crie tabela posts com campos

3. **Controller PostsController**
   - index(), show(), store(), update(), destroy()

4. **Routes**
   - GET /posts, POST /posts, GET /posts/{id}, PUT /posts/{id}, DELETE /posts/{id}

5. **Validação**
   - Titulo requerido, max 200
   - Conteudo requerido

6. **Requisitos**
   - Eloquent ORM
   - Validação Laravel
   - Controllers
   - Routing

## AVALIAR

1. Por que usar ORM em vez de SQL puro?
2. Qual é a diferença entre Model e Controller?
3. O que faz uma migration?
4. Como Laravel valida entrada?
5. O que é Eloquent relationship?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Consultar com Eloquent",
                instructions: "SELECT com where(), first(), get(). Exemplo: buscar usuários ativos.",
                expectedIncludes: ["where", "get", "first"],
                language: "php",
              },
              {
                type: "code",
                title: "CRUD com Eloquent",
                instructions: "Create novo Post, atualizar titulo, deletar. Tudo com Eloquent.",
                expectedIncludes: ["create", "save", "delete"],
                language: "php",
              },
              {
                type: "code",
                title: "Validação em request",
                instructions: "Validar nome (min 3), email (unique), idade (13-120).",
                expectedIncludes: ["validate", "required", "unique"],
                language: "php",
              },
              {
                type: "code",
                title: "Controller com store()",
                instructions: "Controller POST que valida, cria Post, redireciona com mensagem.",
                expectedIncludes: ["store", "validate", "redirect"],
                language: "php",
              },
              {
                type: "project",
                title: "CRUD Blog em Laravel",
                instructions: "Projeto: Posts (CRUD). Model, Migration, Controller, Routes, Validação.",
                expectedIncludes: ["Model", "Controller", "validate"],
                language: "php",
              },
              {
                type: "command",
                title: "Pergunta — Migrações",
                instructions: "Por que usar migrations em vez de criar tabelas manualmente?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "php-9",
            title: "Boas Práticas, SOLID e Testes em PHP",
            content: `## COMPREENDER: Código de qualidade

### Problema: Código "que funciona"

❌ Sem padrões:
- Difícil de manter
- Fácil cometer erros
- Difícil testar
- Medo de refatorar

✅ Com padrões (SOLID):
- Fácil de entender
- Fácil de estender
- Fácil de testar
- Confiança ao mudar

### PSR: Padrões PHP

**PSR-1** (Basic Coding Standard)
- Abra classes em <?php
- Use camelCase para nomes

**PSR-12** (Extended Coding Style)
- Indentação 4 espaços
- Max 120 caracteres por linha
- class { abre na mesma linha

**PSR-4** (Autoloading)
\`\`\`php
// Namespace App\\Models
// Arquivo: app/Models/Usuario.php
namespace App\\Models;

class Usuario { }
\`\`\`

### SOLID: 5 Princípios da OOP

#### 1) Single Responsibility: 1 motivo para mudar

❌ ERRADO:
\`\`\`php
class Usuario {
  public function criar($dados) {
    // validar
    // salvar BD
    // enviar email
    // log ao arquivo
    // gerar PDF
  }
}
\`\`\`

✅ CORRETO:
\`\`\`php
class Cliente {
  public function criar($dados) {
    // Apenas validar e salvar
  }
}

class EmailService {
  public function enviar_confirmacao(Cliente $cliente) { }
}

class AuditoriaService {
  public function log($acao) { }
}
\`\`\`

#### 2) Open/Closed: Aberto para extensão, fechado para modificação

❌ Ruim:
\`\`\`php
class Relatorio {
  public function gerar($tipo) {
    if ($tipo === 'pdf') { /* código PDF */ }
    elseif ($tipo === 'excel') { /* código Excel */ }
    // Cada novo tipo = modificar classe
  }
}
\`\`\`

✅ Bom:
\`\`\`php
interface GeradorRelatorio {
  public function gerar();
}

class GeradorPDF implements GeradorRelatorio {
  public function gerar() { }
}

class GeradorExcel implements GeradorRelatorio {
  public function gerar() { }
}

class Relatorio {
  private $gerador;
  
  public function __construct(GeradorRelatorio $gerador) {
    $this->gerador = $gerador;
  }
  
  public function gerar() {
    return $this->gerador->gerar();
  }
}
\`\`\`

#### 3) Liskov Substitution: Subtipos devem ser intercambiáveis

✅ Correto:
\`\`\`php
class Veiculo {
  public function acelerar() { }
}

class Carro extends Veiculo {
  public function acelerar() {
    $this->velocidade += 10;  // Mesmo contrato
  }
}

// Qualquer código que espera Veiculo funciona com Carro
\`\`\`

#### 4) Interface Segregation: Prefira muitas interfaces específicas

❌ Ruim:
\`\`\`php
interface Veiculo {
  public function acelerar();
  public function frear();
  public function voar();  // Nem todo veiculo voa!
}
\`\`\`

✅ Bom:
\`\`\`php
interface Motorizado {
  public function acelerar();
  public function frear();
}

interface Aéreo {
  public function voar();
}

class Aviao implements Motorizado, Aéreo { }
class Carro implements Motorizado { }
\`\`\`

#### 5) Dependency Inversion: Dependa de abstrações

❌ Ruim (Coupling forte):
\`\`\`php
class Usuario {
  public function salvar() {
    $db = new DatabaseMySQL();  // Hardcoded
    $db->insert('usuarios', [...]);
  }
}
\`\`\`

✅ Bom (Loose Coupling):
\`\`\`php
interface Database {
  public function insert($table, $data);
}

class Usuario {
  private $db;
  
  public function __construct(Database $db) {
    $this->db = $db;  // Injetado
  }
  
  public function salvar() {
    $this->db->insert('usuarios', [...]);
  }
}

// Trocar de MySQL para PostgreSQL? Apenas altere a implementação!
\`\`\`

## APLICAR: Testes com PHPUnit

### Estrutura básica de teste

\`\`\`php
use PHPUnit\\Framework\\TestCase;

class UsuarioTest extends TestCase {
  public function test_usuario_pode_fazer_login() {
    // Arrange (preparar)
    $usuario = new Usuario('joao@ex.com', 'senha123');
    
    // Act (executar)
    $logado = $usuario->verificar_senha('senha123');
    
    // Assert (afirmar)
    $this->assertTrue($logado);
  }
  
  public function test_usuario_recusa_senha_errada() {
    $usuario = new Usuario('joao@ex.com', 'senha123');
    $logado = $usuario->verificar_senha('errada');
    
    $this->assertFalse($logado);
  }
}
\`\`\`

### Executar testes

\`\`\`bash
composer require --dev phpunit/phpunit
php vendor/bin/phpunit tests/
\`\`\`

### Assertions comuns

\`\`\`php
// Booleanos
$this->assertTrue($condicao);
$this->assertFalse($condicao);

// Igualdade
$this->assertEquals(10, $valor);
$this->assertNotEquals(10, $valor);

// Null
$this->assertNull($valor);
$this->assertNotNull($valor);

// Arrays
$this->assertArrayHasKey('nome', $array);
$this->assertEmpty($array);

// Strings
$this->assertStringContains('substring', $string);

// Exceções
$this->expectException(Exception::class);
$metodo_que_lanca();
\`\`\`

### Mock: Fingir dependências

\`\`\`php
public function test_email_service_chamado() {
  // Mock do EmailService
  $emailMock = $this->createMock(EmailService::class);
  $emailMock->expects($this->once())
    ->method('enviar')
    ->with('joao@ex.com');
  
  $usuario = new Usuario('joao@ex.com', $emailMock);
  $usuario->registrar();
}
\`\`\`

### DRY: Reutilize código

\`\`\`php
// ❌ Repetição
class UserService {
  public function criar() {
    if (!isset($dados['nome'])) throw new Exception();
    if (strlen($dados['nome']) < 3) throw new Exception();
    // ...
  }
  
  public function atualizar() {
    if (!isset($dados['nome'])) throw new Exception();
    if (strlen($dados['nome']) < 3) throw new Exception();
    // ...
  }
}

// ✅ Extraia
class UserService {
  private function validar($dados) {
    if (!isset($dados['nome'])) throw new Exception();
    if (strlen($dados['nome']) < 3) throw new Exception();
  }
  
  public function criar($dados) {
    $this->validar($dados);
  }
  
  public function atualizar($dados) {
    $this->validar($dados);
  }
}
\`\`\`

## PRODUZIR: Projeto com padrões e testes

Implemente **CarrinhoCompras** com:

1. **Classes**
   - Produto (id, nome, preco)
   - Carrinho (items, calcular_total)
   - PagamentoService (processar)

2. **SOLID**
   - Single Responsibility: cada classe 1 coisa
   - Dependency Injection: PagamentoService injetada
   - Interface: GeradorRecibo para diferentes tipos

3. **Testes (mínimo 5)**
   - Adicionar item ao carrinho
   - Calcular total correto
   - Remover item
   - Aplicar desconto
   - Erro ao processar pagamento

4. **Requisitos**
   - PHPUnit setup
   - Testes com setUp() para shared data
   - Mocks onde necessário
   - 80%+ cobertura

## AVALIAR

1. O que Single Responsibility significa?
2. Por que Dependency Injection é importante?
3. Qual é o objetivo de um teste unitário?
4. Como mocks ajudam em testes?
5. Por que DRY melhora manutenção?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Aplicar Single Responsibility",
                instructions: "Classe com 3 responsabilidades. Divida em 3 classes separadas.",
                expectedIncludes: ["class", "function"],
                language: "php",
              },
              {
                type: "code",
                title: "Dependency Injection",
                instructions: "Classe que recebe dependência via __construct. Evite new DatabaseSQL().",
                expectedIncludes: ["__construct", "private"],
                language: "php",
              },
              {
                type: "code",
                title: "Teste unitário básico",
                instructions: "PHPUnit test: verificar que Calculadora::somar(2,3) retorna 5.",
                expectedIncludes: ["TestCase", "assertEquals"],
                language: "php",
              },
              {
                type: "code",
                title: "Teste com Mock",
                instructions: "Mock de EmailService. Verificar que foi chamado com email correto.",
                expectedIncludes: ["createMock", "expects"],
                language: "php",
              },
              {
                type: "project",
                title: "Sistema com SOLID + Testes",
                instructions: "Projeto: Usuario, Autenticacao, EmailService. SOLID principles + 5+ testes.",
                expectedIncludes: ["SOLID", "TestCase", "assertEquals"],
                language: "php",
              },
              {
                type: "command",
                title: "Pergunta — Cobertura",
                instructions: "O que é code coverage? 100% é sempre melhor? Por que ou por que não?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "react",
    title: "React - Desenvolvimento de Interfaces",
    description: "Biblioteca JavaScript para construir interfaces modernas com componentes reutilizáveis e hooks.",
    modules: [
      {
        id: "react-basics",
        title: "Fundamentos React",
        lessons: [
          {
            id: "react-1",
            title: "React Fundamentals: Components, JSX e Props",
            content: `## COMPREENDER: O que é React?

React é uma **biblioteca JavaScript** para construir **UIs dinâmicas** usando **componentes reutilizáveis**.

### Por que React?

Sem React (JavaScript vanilla):
\`\`\`javascript
// Problema: Imperativo - diga ao DOM O QUE FAZER
const button = document.getElementById('btn');
button.addEventListener('click', () => {
  const count = parseInt(button.textContent);
  button.textContent = count + 1;
});
// Conforme UI cresce, código fica caótico
\`\`\`

Com React (Declarativo - descreva o que QUER):
\`\`\`javascript
function Contador() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Contagem: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
}
// React cuida de atualizar DOM
\`\`\`

### Três pilares do React

1. **Components** — Blocos de construção reutilizáveis
2. **JSX** — Sintaxe que mistura HTML com JavaScript
3. **Virtual DOM** — Sistema de renderização otimizado

## APLICAR: JSX e Components praticamente

### JSX: HTML em JavaScript

JSX permite escrever tags HTML diretamente em JavaScript:

\`\`\`javascript
// JSX (o que você escreve)
const elemento = <h1>Olá, mundo!</h1>;

// JavaScript compilado (o que React executa)
const elemento = React.createElement('h1', null, 'Olá, mundo!');
\`\`\`

**JSX é açúcar sintático** — fica lindamente legível!

### Regras do JSX

#### 1) Expressões entre chaves

\`\`\`javascript
const nome = 'Maria';
const idade = 25;

function Perfil() {
  return (
    <div>
      <p>Nome: {nome}</p>
      <p>Idade: {idade}</p>
      <p>Próximo ano: {idade + 1}</p>
      <p>Adulta? {idade >= 18 ? 'Sim' : 'Não'}</p>
    </div>
  );
}
\`\`\`

#### 2) Condicional renderização

\`\`\`javascript
function Saudacao({ logado }) {
  if (logado) {
    return <p>Bem-vindo de volta!</p>;
  }
  return <p>Por favor, faça login</p>;
}

// Ou ternário:
function Status({ status }) {
  return (
    <div>
      {status === 'sucesso' ? (
        <p style={{ color: 'green' }}>✓ Sucesso</p>
      ) : (
        <p style={{ color: 'red' }}>✗ Erro</p>
      )}
    </div>
  );
}

// Ou &&:
function Notificacao({ mensagem }) {
  return (
    <div>
      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}
\`\`\`

#### 3) Listas com map()

\`\`\`javascript
function ListaUsuarios({ usuarios }) {
  return (
    <ul>
      {usuarios.map(usuario => (
        <li key={usuario.id}>{usuario.nome}</li>
      ))}
    </ul>
  );
}

// ⚠️ IMPORTANT: Sempre use 'key' prop para listas
// ❌ ERRADO: key={index}
// ✅ CORRETO: key={usuario.id}
\`\`\`

#### 4) Estilos em JSX

\`\`\`javascript
function Card({ corFundo }) {
  const estilos = {
    backgroundColor: corFundo,
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };
  
  return <div style={estilos}>Conteúdo</div>;
}

// className para estilos CSS
// ❌ ERRADO: <div class="card">
// ✅ CORRETO: <div className="card">
\`\`\`

### Componentes: Blocos reutilizáveis

#### Componente simples (apresentacional)

\`\`\`javascript
function Botao({ texto, onClick, cor = 'blue' }) {
  return (
    <button 
      onClick={onClick}
      style={{
        backgroundColor: cor,
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {texto}
    </button>
  );
}

// Uso
<Botao texto="Clique aqui" cor="green" onClick={() => alert('Clicou!')} />
\`\`\`

#### Props: Dados do pai para filho

Props são como argumentos de função:

\`\`\`javascript
function Cartao({ titulo, descricao, imagem, preco }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '16px' }}>
      <img src={imagem} alt={titulo} style={{ width: '100%' }} />
      <h2>{titulo}</h2>
      <p>{descricao}</p>
      <p style={{ fontSize: '20px', fontWeight: 'bold' }}>R$ {preco}</p>
    </div>
  );
}

// Uso
<Cartao 
  titulo="Laptop"
  descricao="Computador de alto desempenho"
  imagem="/laptop.jpg"
  preco="3000"
/>
\`\`\`

#### Props obrigatórias vs opcionais

\`\`\`javascript
function Produto({ nome, preco, descricao = 'Sem descrição' }) {
  // nome e preco são obrigatórios
  // descricao tem valor padrão
  return (
    <div>
      <h3>{nome}</h3>
      <p>R$ {preco}</p>
      <p>{descricao}</p>
    </div>
  );
}
\`\`\`

#### Props destructuring

\`\`\`javascript
// ❌ Sem destructuring (verboso)
function Usuario(props) {
  return <p>{props.nome} - {props.email}</p>;
}

// ✅ Com destructuring (limpo)
function Usuario({ nome, email }) {
  return <p>{nome} - {email}</p>;
}

// ✅ Com spread operator
function Usuario({ nome, ...resto }) {
  return <p>{nome} e mais {Object.keys(resto).length} props</p>;
}
\`\`\`

### Virtual DOM: Como React funciona

#### Reconciliation (React Diffing Algorithm)

React não atualiza TODO o DOM, apenas o necessário:

\`\`\`javascript
// Antes
<div>
  <p>Contador: 5</p>
  <button>Incrementar</button>
</div>

// Usuário clica, state muda para 6
// Depois
<div>
  <p>Contador: 6</p>
  <button>Incrementar</button>
</div>

// React detecta:
// - <div> não mudou (não re-renderiza)
// - <p> conteúdo mudou (atualiza APENAS esse texto)
// - <button> não mudou

// Resultado: Performance!!
\`\`\`

#### Por que Virtual DOM é rápido?

1. **Operações em memória são rápidas** — Comparação de objects é rápido
2. **Batch updates** — Agrupa múltiplas mudanças em uma atualização
3. **Evita reflow desnecessário** — DOM reflow é a operação mais cara

\`\`\`javascript
// SEM Virtual DOM (cada atualização re-renderiza tudo):
// 5 setState = 5 reflows = LENTO

// COM Virtual DOM (agrupa):
// 5 setState = 1 reflow = RÁPIDO
\`\`\`

### Componentes Funcionais vs Classe

**Antes (Class Components):**
\`\`\`javascript
class Contador extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  render() {
    return (
      <div>
        <p>{this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Incrementar
        </button>
      </div>
    );
  }
}
\`\`\`

**Agora (Functional Components com Hooks):**
\`\`\`javascript
function Contador() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
}
\`\`\`

**Vantagens de Functional:**
- ✅ Código mais limpo
- ✅ Sem confusão com \`this\`
- ✅ Hooks reutilizáveis
- ✅ Melhor performance

## PRODUZIR: Criar aplicativo de galeria

Implemente **GaleriaFotos** com:

1. **Array de fotos**
   \`\`\`javascript
   const fotos = [
     { id: 1, titulo: 'Praia', url: '...', descricao: 'Pôr do sol' },
     { id: 2, titulo: 'Montanha', url: '...', descricao: 'Vista 360°' }
   ]
   \`\`\`

2. **Componentes**
   - \`Galeria\` — Container principal
   - \`CartaoFoto\` — Card individual (reutilizável)
   - \`Filtro\` — Componente de filtro

3. **Features**
   - Renderize lista de fotos dinâmico
   - Cada foto em CartaoFoto com props
   - Styling com estilos em objeto
   - Props obrigatórias e opcionais

4. **Requisitos**
   - 3+ componentes
   - Props bem definidas
   - map() para listas
   - Condicional rendering
   - Estilos inline

## AVALIAR

1. O que é JSX e por que é útil?
2. Qual é a diferença entre props e state?
3. Como React sabe qual DOM atualizar (Virtual DOM)?
4. Por que componentes funcionais são preferíveis?
5. Como passar dados entre componentes (parent → child)?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Componente de saudação com props",
                instructions: "Crie componente Saudacao que recebe nome e sobrenome, combine e exiba 'Olá, [nome] [sobrenome]!'.",
                expectedIncludes: ["function", "props", "return"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Componente com condicional",
                instructions: "Componente Status que recebe booleano 'ativo'. Se true, exibe 'Online', se false 'Offline'.",
                expectedIncludes: ["ativo", "?", ":"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Renderizar lista com map",
                instructions: "Array de objetos {id, nome}. Componente que renderiza <li> para cada item com key={id}.",
                expectedIncludes: ["map", "key=", ".id"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Componente reutilizável",
                instructions: "Crie Botao que aceita props: texto, onClick, cor. Mostre 3 botões com cores diferentes.",
                expectedIncludes: ["Botao", "onClick", "style"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Galeria simples com CartaoFoto",
                instructions: "6 fotos em array, componente CartaoFoto com props (titulo, url, descricao). Renderize com map.",
                expectedIncludes: ["map", "CartaoFoto", "titulo", "url"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Virtual DOM",
                instructions: "Explique como React sabe QUAL parte do DOM mudar sem re-renderizar tudo.",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "react-2",
            title: "State e Hooks (useState)",
            content: `## COMPREENDER: O que é State?

State é a "memória" de um componente. Sem state, React seria apenas uma biblioteca para renderizar templates estáticos. State permite:
- Armazenar dados que mudam
- Reagir a mudanças dos usuários
- Criar UIs interativas
- Gerenciar dados do formulário

### Por que Hooks?

Antes (Class components):
- Código repetitivo
- Difficuldade em reutilizar lógica
- Confusion com \`this\` binding

Depois (Hooks, React 16.8+):
- Código mais limpo
- Reutilização fácil
- Melhor organização

### Ciclo de renderização com state

1. Componente renderiza
2. Usuário interage (clica, digita, etc)
3. setState é chamado
4. React detecta mudança
5. Componente re-renderiza com novo state
6. UI atualiza

### Regra fundamental do state

**NUNCA mutue state diretamente!**

❌ ERRADO:
\`\`\`javascript
this.state.count = this.state.count + 1; // ERRADO!
\`\`\`

✅ CORRETO:
\`\`\`javascript
setCount(count + 1); // Permite React rastrear mudanças
\`\`\`

## APLICAR: useState prático

### Sintaxe básica

\`\`\`javascript
import { useState } from 'react';

function Contador() {
  const [count, setCount] = useState(0);
  //     ↑                      ↑
  //   valor atual         função para atualizar

  return (
    <div>
      <p>Contagem: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
}
\`\`\`

**useState retorna:**
- [0] = valor atual do state
- [1] = função para atualizar esse state

### Estado inicial complexo

\`\`\`javascript
// Estado de formulário
const [form, setForm] = useState({
  nome: '',
  email: '',
  idade: ''
});

// Atualizar um campo
const handleChange = (e) => {
  const { name, value } = e.target;
  setForm(prev => ({
    ...prev,
    [name]: value
  }));
};

// Em JSX
<input
  name="nome"
  value={form.nome}
  onChange={handleChange}
/>
\`\`\`

**Importante:** Sempre usar spread operator (...) para manter outros campos!

### Múltiplos states

\`\`\`javascript
function UserProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscarUsuario = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      setName(data.name);
      setEmail(data.email);
    } catch (err) {
      setError('Erro ao buscar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <p>Carregando...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
      <p>{name}</p>
      <p>{email}</p>
      <button onClick={buscarUsuario}>Buscar dados</button>
    </>
  );
}
\`\`\`

### Conditional rendering com state

\`\`\`javascript
function LoginForm() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (isLoggedIn) {
    return < > Bem-vindo! </>;
  }

  return (
    <button onClick={() => setIsLoggedIn(true)}>
      Login
    </button>
  );
}
\`\`\`

### State updater function

Para updates baseadas no state anterior:

\`\`\`javascript
// PROBLEMA: pode perder updates em rápida sucessão
setCount(count + 1);
setCount(count + 1); // Ambas baseadas no mesmo 'count'

// SOLUÇÃO: usar função updater
setCount(prev => prev + 1);
setCount(prev => prev + 1); // Corretamente incrementa 2 vezes
\`\`\`

### Bad practice: State props

\`\`\`javascript
// ❌ ERRADO: Não use state para dados que nunca mudam
const [nome] = useState('João'); // Nunca muda

// ✅ CORRETO: Use props para dados que não mudam
function Perfil({ nome, email }) {
  return <p>{nome} - {email}</p>;
}
\`\`\`

## PRODUZIR: Projeto interativo prático

Implemente um **TODO List** com:
1. Input para adicionar novo todo
2. State ['todos', setTodos] = useState([])
3. Botão "Adicionar" que insere na lista
4. Cada todo tem {id, text, completed}
5. Checkbox para marcar como completo
6. Botão para deletar

Requisitos:
- Use state adequadamente
- Nunca mutue array diretamente
- Use spread operator para novas arrays
- Validar input vazio
- Remova com filter()

Exemplo:
\`\`\`
[x] Aprender React
[ ] Fazer projeto
\`\`\`

## AVALIAR

1. Qual é a diferença entre state e props?
2. Por que nunca mutar state diretamente?
3. Quando usar única função updater com callback?
4. Como atualizar um campo específico em estado objeto?
5. Qual é o overhead de múltiplos useState vs um único useState com objeto?`,
            minutes: 60,
            exercises: [
              {
                type: "code",
                title: "Componente com estado simples",
                instructions: "Crie um contador que incrementa e decrementa usando useState. Mostre valor e dois botões.",
                expectedIncludes: ["useState", "setCount", "onClick"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Toggleador de visibilidade",
                instructions: "Crie componente com um parágrafo oculto e botão 'mostrar/ocultar' usando estado booleano.",
                expectedIncludes: ["useState", "true", "false", "onClick"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Formulário controlado",
                instructions: "Crie input de e-mail controlado: mantenha valor em state, exiba valor abaixo enquanto digita.",
                expectedIncludes: ["useState", "onChange", "value", "e.target.value"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Update com callback",
                instructions: "Crie botão que adiciona 1 ao contador 3 vezes rapidamente. Use setCount(prev => prev + 1) para garantir corretude.",
                expectedIncludes: ["setCount", "prev", "=>"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Aplicativo TODO List simples",
                instructions: "Lista dinâmica: input + botão 'Adicionar'. Cada todo com {id, texto}. Mostrar lista. Deletar com botão.",
                expectedIncludes: ["useState", "map", "filter", "onClick"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Avaliação — Performance",
                instructions: "Quando é melhor usar um único useState com objeto vs múltiplos useState? Qual é mais performático?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "react-3",
            title: "Effects e Ciclo de Vida (useEffect)",
            content: `## COMPREENDER: O que são Side Effects?

Side effects são operações que afetam coisas fora do componente:
- Buscar dados da API
- Salvar no LocalStorage
- Adicionar event listeners
- Atualizar DOM diretamente
- Timers/Intervals
- Logging

React é reativo - sem controlar side effects, eles rodariam toda render!

### Problema: Sem useEffect

\`\`\`javascript
function UserList() {
  const [users, setUsers] = useState([]);

  // ❌ Isto roda a CADA render - chama API infinitas vezes!
  fetch('/api/users')
    .then(r => r.json())
    .then(data => setUsers(data));

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
\`\`\`

### Ciclo de vida anterior (Class components)

Class components tinham métodos específicos:
- \`componentDidMount\` - após primeira render
- \`componentDidUpdate\` - após toda atualização
- \`componentWillUnmount\` - antes de remover

### Hook useEffect

useEffect consolidou tudo em um lugar:

\`\`\`javascript
useEffect(() => {
  // Código executado após a render
}, [dependencies]);
\`\`\`

## APLICAR: useEffect prático

### Sintaxe básica

\`\`\`javascript
import { useEffect, useState } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => setUsers(data));
  }, []); // [] = executa APENAS uma vez

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
\`\`\`

**[] = dependency array (lista de dependências)**

### Três formas críticas de useEffect

#### 1) Sem dependency array

\`\`\`javascript
useEffect(() => {
  console.log('Executa após CADA render!');
});
\`\`\`

❌ Use raramente - causa loops.

#### 2) Array vazio []

\`\`\`javascript
useEffect(() => {
  console.log('Executa UMA vez, após primeira render');
  // Ideal para: buscar dados, preparar recursos
}, []);
\`\`\`

✅ Use para inicialização.

#### 3) Com dependências

\`\`\`javascript
const [userId, setUserId] = useState(1);

useEffect(() => {
  fetch(\`/api/users/\${userId}\`)
    .then(r => r.json())
    .then(setUser);
}, [userId]); // Re-executa se userId mudar
\`\`\`

✅ Use para reagir a mudanças específicas.

### Cleanup function (desmontagem)

\`\`\`javascript
useEffect(() => {
  const handleScroll = () => console.log('scrollou');
  
  // Adiciona listener
  window.addEventListener('scroll', handleScroll);

  // CLEANUP: Remove listener (executa ANTES de cada novo effect, ou ao desmontar)
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);
\`\`\`

**Crítico:** Sempre limpar resources!

### Exemplo: Timer com limpeza

\`\`\`javascript
function Cronômetro() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    // LIMPEZA: Remove interval quando componente desmonta
    return () => clearInterval(interval);
  }, []);

  return <p>Tempo: {seconds}s</p>;
}
\`\`\`

### Múltiplos useEffect

\`\`\`javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  
  // Effect 1: Buscar usuário
  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(r => r.json())
      .then(setUser);
  }, [userId]); // React quando userId muda
  
  // Effect 2: Buscar posts (separado para melhor organização)
  useEffect(() => {
    if (!user) return;
    
    fetch(\`/api/posts?userId=\${user.id}\`)
      .then(r => r.json())
      .then(setPosts);
  }, [user]); // React quando user muda

  return (
    <>
      {user && <h1>{user.name}</h1>}
      {posts.map(p => <p key={p.id}>{p.title}</p>)}
    </>
  );
}
\`\`\`

### Erro comum: Falta de dependências

\`\`\`javascript
const [count, setCount] = useState(0);

// ❌ ERRADO: count mudou mas effect não re-executa
useEffect(() => {
  console.log('Count é:', count);
}, []); // Falta 'count' nas dependências
// Nunca log novo count!

// ✅ CORRETO:
useEffect(() => {
  console.log('Count é:', count);
}, [count]); // count incluído
\`\`\`

### Padrão: Buscar dados com erro

\`\`\`javascript
function Dados({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // Previne memory leak

    setLoading(true);
    
    fetch(\`/api/data/\${id}\`)
      .then(r => r.json())
      .then(d => {
        if (isMounted) setData(d); // Só atualiza se montado
      })
      .catch(e => {
        if (isMounted) setError(e.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false; // Cleanup
    };
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;
  return <div>{JSON.stringify(data)}</div>;
}
\`\`\`

## PRODUZIR: Projeto com API real

### Tarefas:

1. **Componente SearchUsers**
   - Input controlado com nome
   - useEffect que busca em /api/users?q={query}
   - Exiba lista de resultados
   - Cleanup: Cancelar requisição pendente se componente desmontar
   
2. **Componente PreviewImg**
   - Props: imageUrl
   - useEffect: Carregue imagem, mostre loading
   - Adicione listener de scroll para scroll infinito
   - Na cleanup: remova listener

3. **Componente Timer**
   - Botão start/stop
   - useEffect com setInterval
   - Cleanup: clearInterval
   - Exiba tempo em MM:SS format

Requisitos:
- Use 3+ useEffect
- Tenha cleanup em pelo menos 1
- Array vazio [] em pelo menos 1
- Tenha dependências específicas em 1

## AVALIAR

1. Diferencie os 3 tipos de useEffect (sem deps, [], [deps])
2. Por que cleanup é crítico em listeners?
3. Como prevenir memory leak no useEffect?
4. Qual é o ciclo: render → effect → re-render?
5. Se useEffect modifica state que está em dependencies, o que acontece?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "useEffect com array vazio",
                instructions: "Componente que busca dados UMA VEZ ao montar. Use fetch e useState para dados/carregamento.",
                expectedIncludes: ["useEffect", "[]", "fetch", "useState"],
                language: "javascript",
              },
              {
                type: "code",
                title: "useEffect com dependências",
                instructions: "Componente que busca dados quando uma prop 'id' muda. Inclua loading e erro.",
                expectedIncludes: ["useEffect", "[id]", "id"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Cleanup em event listener",
                instructions: "Adicione e remova um listener de 'resize'. useEffect com cleanup que remove o listener.",
                expectedIncludes: ["addEventListener", "removeEventListener", "return"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Múltiplos useEffect",
                instructions: "Dois useEffect: (1) buscar usuário, (2) buscar posts do usuário. Ambos com suas dependências.",
                expectedIncludes: ["useEffect", "fetch", "useState", "user", "posts"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Buscador de repositórios GitHub",
                instructions: "Input com termo de busca. useEffect busca repos em GitHub API quando termo muda. Mostre lista com nome, stars, links.",
                expectedIncludes: ["useEffect", "fetch", "github", "api"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Memory Leak",
                instructions: "Você deixou 'isMounted' no cleanup de um componente? Explique por que isso previne memory leak.",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "react-advanced",
        title: "Hooks Avançados e Padrões",
        lessons: [
          {
            id: "react-4",
            title: "useContext e useReducer",
            content: `## COMPREENDER: Prop Drilling vs Context

### O Problema: Prop Drilling

Sem Context, dados precisam passar por muitos componentes:

\`\`\`javascript
// App passa tema para Layout
<App tema="escuro">
  <Header tema={tema} />
  <Layout tema={tema}>
    <Sidebar tema={tema} />
    <Content>
      <Button tema={tema} />
    </Content>
  </Layout>
</App>
\`\`\`

Problemas:
- Passar dados através de muitos componentes intermediários
- Componentes intermediários não usam dados, apenas passam adiante
- Refatorações são custosas
- Código fica verboso

### Solução: useContext

Context permite "teleportar" dados para componentes profundos:

\`\`\`javascript
const TemaContext = createContext('claro'); // valor padrão

function App() {
  const [tema, setTema] = useState('claro');
  
  return (
    <TemaContext.Provider value={{ tema, setTema }}>
      {/* Qualquer componente aqui pode acessar TemaContext */}
      <Header />
      <Content />
    </TemaContext.Provider>
  );
}

// Em qualquer componente profundo:
function Button() {
  const { tema } = useContext(TemaContext);
  return <button className={tema}>Clique</button>;
}
\`\`\`

### Estado complexo: useReducer

useState é ótimo para estado simples, mas e para complexo?

\`\`\`javascript
// ❌ Muitos useState
const [count, setCount] = useState(0);
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// ✅ Um único useReducer
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

useReducer vem de model Redux - ações explícitas do que muda.

## APLICAR: useContext prático

### Criar e usar Context

\`\`\`javascript
import { createContext, useState, useContext } from 'react';

// 1) Criar contexto
const AutenticacaoContext = createContext();

// 2) Provider (torno contexto disponível)
export function ProvedorAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, senha) => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha })
      });
      const data = await response.json();
      setUsuario(data);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUsuario(null);

  return (
    <AutenticacaoContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AutenticacaoContext.Provider>
  );
}

// 3) Hook customizado para usar context
export function useAutenticacao() {
  const context = useContext(AutenticacaoContext);
  if (!context) throw new Error('useAutenticacao deve estar dentro de ProvedorAutenticacao');
  return context;
}

// 4) Em App
function App() {
  return (
    <ProvedorAutenticacao>
      <HomePage />
    </ProvedorAutenticacao>
  );
}

// 5) Usar anywhere
function UserProfile() {
  const { usuario, logout } = useAutenticacao();
  
  if (!usuario) return <p>Não autenticado</p>;
  
  return (
    <>
      <h1>{usuario.nome}</h1>
      <button onClick={logout}>Logout</button>
    </>
  );
}
\`\`\`

### useReducer prático

\`\`\`javascript
import { useReducer } from 'react';

// Actions
const ADICIONAR_TODO = 'ADICIONAR_TODO';
const REMOVER_TODO = 'REMOVER_TODO';
const MARCAR_COMPLETO = 'MARCAR_COMPLETO';

// Reducer: função pura que retorna novo estado
function todoReducer(state, action) {
  switch (action.type) {
    case ADICIONAR_TODO:
      return {
        ...state,
        todos: [...state.todos, { id: Date.now(), text: action.payload, completo: false }]
      };
    
    case REMOVER_TODO:
      return {
        ...state,
        todos: state.todos.filter(t => t.id !== action.payload)
      };
    
    case MARCAR_COMPLETO:
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === action.payload ? { ...t, completo: !t.completo } : t
        )
      };
    
    default:
      return state;
  }
}

// Componente
function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, { todos: [] });
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      dispatch({ type: ADICIONAR_TODO, payload: input });
      setInput('');
    }
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleAdd}>Adicionar</button>
      
      <ul>
        {state.todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completo}
              onChange={() => dispatch({ type: MARCAR_COMPLETO, payload: todo.id })}
            />
            <span style={{ textDecoration: todo.completo ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
            <button onClick={() => dispatch({ type: REMOVER_TODO, payload: todo.id })}>
              Remover
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`

### Context + useReducer (combinados)

\`\`\`javascript
// Criar contexto com reducer
const TodoContext = createContext();

export function TodoProvider({ children }) {
  const [state, dispatch] = useReducer(todoReducer, { todos: [] });

  return (
    <TodoContext.Provider value={{ state, dispatch }}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo() {
  return useContext(TodoContext);
}

// Em componentes
function TodoList() {
  const { state, dispatch } = useTodo();
  
  return (
    <ul>
      {state.todos.map(todo => (
        <li key={todo.id} onClick={() => dispatch({ type: MARCAR_COMPLETO, payload: todo.id })}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
\`\`\`

## PRODUZIR: Sistema de temas com Context + useReducer

Implemente:

1. **Contexto TemaReducer**
   - Actions: ALTERNAR_TEMA, SALVAR_PREFERENCIA
   - State: { temaCurrent, preferencias }
   - useReducer gerencia

2. **ProvedorTema**
   - Wraps toda aplicação
   - Carrega tema do localStorage

3. **Múltiplos componentes**
   - Header (botão para alternar tema)
   - Sidebar (mostra tema atual)
   - Card (usa contexto para styling)

4. **LocalStorage**
   - Salve preferência no effect
   - Carregue ao inicializar

Requisitos:
- useContext com Provider
- useReducer para lógica
- useLocalStorage pattern
- 3+ componentes usando contexto

## AVALIAR

1. Diferença entre prop drilling vs Context
2. Quando usar useContext vs props?
3. Como criar um hook customizado com useContext?
4. Qual é a vantagem de useReducer sobre múltiplos useState?
5. Como combinar Context com useReducer para estado global?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Criar Context básico",
                instructions: "Crie TemaContext, Provider, e use em dois componentes que mostram e alternam o tema.",
                expectedIncludes: ["createContext", "useContext", "Provider"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Hook customizado com Context",
                instructions: "Crie useAutenticacao() hook que retorna dados do AutenticacaoContext com validação.",
                expectedIncludes: ["useContext", "throw Error", "useAutenticacao"],
                language: "javascript",
              },
              {
                type: "code",
                title: "useReducer simples",
                instructions: "Contador com useReducer em vez de useState. Ações: INCREMENT, DECREMENT, RESET.",
                expectedIncludes: ["useReducer", "switch", "case"],
                language: "javascript",
              },
              {
                type: "code",
                title: "useReducer com múltiplos estados",
                instructions: "Formulário com useReducer: {nome, email, errors, submitting}. Ações para cada campo.",
                expectedIncludes: ["useReducer", "dispatch", "action.payload"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Sistema global de notificações",
                instructions: "Context + useReducer para gerenciar notificações. Ações: SHOW, HIDE. Auto-dismiss após 3s.",
                expectedIncludes: ["useReducer", "Context", "useEffect", "setTimeout"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Escalabilidade",
                instructions: "Para estado global grande (múltiplas features), seria melhor Context ou Redux? Por quê?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "react-5",
            title: "Performance: useMemo e useCallback",
            content: `## COMPREENDER: Por que se importar com performance?

### Problema: Re-renders desnecessários

\`\`\`javascript
function ListaUsuarios({ usuarios, onSelecionar }) {
  // Este componente re-renderiza a cada render do pai
  // Mesmo que usuarios e onSelecionar não mudaram!
  const nomes = usuarios.map(u => u.nome);
  
  return (
    <div>
      {nomes.map(nome => (
        <button key={nome} onClick={() => onSelecionar(nome)}>
          {nome}
        </button>
      ))}
    </div>
  );
}

// Pai que chamada:
function App() {
  const [count, setCount] = useState(0); // State não relacionado!
  const usuarios = [{ nome: 'João' }, { nome: 'Maria' }];
  
  // ❌ onSelecionar nova função a cada render
  const onSelecionar = (nome) => console.log(nome);
  
  // Incrementar count causa:
  // 1) App re-renderiza
  // 2) onSelecionar é uma função NOVA
  // 3) ListaUsuarios vê onSelecionar "diferente"
  // 4) ListaUsuarios re-renderiza desnecessariamente!
  
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ListaUsuarios usuarios={usuarios} onSelecionar={onSelecionar} />
    </>
  );
}
\`\`\`

### Sintomas de performance ruim
- App fica "lento" ao interagir
- Componentes piscam/flicker
- Computador esquenta (CPU alta)
- Diffs desnecessários

### Solução: Memoização

**Memoização** = armazenar resultado de cálculo custoso e reutilizar se inputs não mudaram.

## APLICAR: useMemo prático

### Caso 1: Cálculo custoso

\`\`\`javascript
function RelatorioVendas({ vendas }) {
  // ❌ Recalcula total a cada render mesmo se vendas não mudou
  const total = vendas.reduce((sum, v) => sum + v.valor, 0);
  const media = total / vendas.length;
  const maximo = Math.max(...vendas.map(v => v.valor));
  
  return <p>Total: {total}, Média: {media}, Máximo: {maximo}</p>;
}

// ✅ Memorizar cálculos
function RelatorioVendas({ vendas }) {
  const stats = useMemo(() => {
    console.log('Calculando...'); // Log apenas quando vendas muda
    const total = vendas.reduce((sum, v) => sum + v.valor, 0);
    return {
      total,
      media: total / vendas.length,
      maximo: Math.max(...vendas.map(v => v.valor))
    };
  }, [vendas]); // Recalcula APENAS se vendas mudar
  
  return <p>Total: {stats.total}, Média: {stats.media}, Máximo: {stats.maximo}</p>;
}
\`\`\`

### Caso 2: Array/object filtradas

\`\`\`javascript
function ListaFiltrada({ usuarios, filtro }) {
  // ❌ Cria nova array a cada render
  const filtrados = usuarios.filter(u => u.nome.includes(filtro));
  
  // Problema: filho recebe "nova" array mesmo com dados iguais
  return <UserList items={filtrados} />; // Força re-render do filho
}

// ✅ Memoizar resultado
function ListaFiltrada({ usuarios, filtro }) {
  const filtrados = useMemo(
    () => usuarios.filter(u => u.nome.includes(filtro)),
    [usuarios, filtro]
  );
  
  return <UserList items={filtrados} />; // Passa mesma referência se dados iguais
}
\`\`\`

### useCallback: Memoizar funções

\`\`\`javascript
function Pai() {
  const [count, setCount] = useState(0);
  
  // ❌ Nova função a cada render
  const handleClick = () => console.log('Clicou');
  
  // Filho recebe "nova" função props a cada render do pai
  return <Botao onClick={handleClick} />;
}

// ✅ Memoizar função
function Pai() {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    console.log('Clicou');
  }, []); // Mesma função função sempre
  
  return <Botao onClick={handleClick} />;
}

// Filho (otimizado com React.memo)
const Botao = React.memo(({ onClick }) => {
  console.log('Renderizado');
  return <button onClick={onClick}>Click</button>;
});
\`\`\`

**Regra:** useCallback é útil principalmente quando passando para React.memo components.

### Exemplo real: Busca em tempo real

\`\`\`javascript
function SearchUsers({ onSearch }) {
  const [query, setQuery] = useState('');
  
  // ❌ ERRADO: busca a cada keystroke
  // const handleSearch = () => {
  //   onSearch(query);
  // };
  // <input onChange={() => handleSearch()} />
  
  // ✅ CORRETO: Debounce + useCallback
  const [debounceTimer, setDebounceTimer] = useState(null);
  
  const handleSearch = useCallback((value) => {
    clearTimeout(debounceTimer);
    
    const timer = setTimeout(() => {
      onSearch(value);
    }, 500); // Busca após 500ms de inatividade
    
    setDebounceTimer(timer);
  }, [onSearch, debounceTimer]);

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        handleSearch(e.target.value);
      }}
      placeholder="Buscar usuários..."
    />
  );
}
\`\`\`

### Combinando useMemo + useCallback

\`\`\`javascript
function DataGrid({ dados, onRowClick }) {
  const [sortColumn, setSortColumn] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  
  // Memoizar dados ordenados
  const dadosOrdenados = useMemo(() => {
    return [...dados].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [dados, sortColumn, sortDir]);
  
  // Memoizar callback de click
  const handleRowClick = useCallback((row) => {
    onRowClick(row);
  }, [onRowClick]);
  
  return (
    <table>
      <tbody>
        {dadosOrdenados.map(row => (
          <tr key={row.id} onClick={() => handleRowClick(row)}>
            <td>{row.nome}</td>
            <td>{row.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
\`\`\`

## PRODUZIR: Aplicativo otimizado

Implemente **ProductGrid** com:

1. **Data**
   - 1000 produtos com nome, preço, categoria
   - Gere dados fake

2. **Features**
   - Filtro por categoria
   - Busca por nome
   - Ordenação
   - Pagination (10 itens/página)

3. **Otimizações**
   - useMemo para: filtrados, ordenados, paginados
   - useCallback para: handleFilter, handleSort, handlePageChange
   - React.memo em ProductCard
   - Console.log para ver re-renders

4. **Requisitos**
   - 3+ useMemo
   - 3+ useCallback
   - React.memo em ao menos 2 componentes
   - Mostre quantas vezes renderizou (log)

## AVALIAR

1. Qual é o problema que useMemo e useCallback resolvem?
2. Quando é apropriado usar useMemo?
3. Por que useCallback precisa de React.memo para ter benefício?
4. Como medir se otimização é realmente necessária?
5. Qual é o custo de useMemo/useCallback se mal usado?`,
            minutes: 60,
            exercises: [
              {
                type: "code",
                title: "useMemo com cálculo custoso",
                instructions: "Array de números, componente que soma, encontra máximo, mínimo. Memoize resultado.",
                expectedIncludes: ["useMemo", "reduce", "Math.max"],
                language: "javascript",
              },
              {
                type: "code",
                title: "useCallback com dependências",
                instructions: "Componente pai com useState, passe callback memoizado para filho com React.memo.",
                expectedIncludes: ["useCallback", "React.memo"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Filtro otimizado",
                instructions: "Lista com filtro: memoize array filtrada com useMemo, mantenha a mesma referência.",
                expectedIncludes: ["useMemo", "filter", "dependencies"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Debounce com useCallback",
                instructions: "Input de busca que chama callback com delay (useCallback + setTimeout).",
                expectedIncludes: ["useCallback", "setTimeout", "clearTimeout"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Galeria de imagens otimizada",
                instructions: "1000 imagens, filtro, busca. Memoize dados filtrados. React.memo em ImageCard. Log renders.",
                expectedIncludes: ["useMemo", "useCallback", "React.memo"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Custo vs benefício",
                instructions: "Se mal usado, useMemo pode ser mais lento que cálculo diretamente. Como medir corretamente?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "react-patterns",
        title: "Boas Práticas e Padrões React",
        lessons: [
          {
            id: "react-6",
            title: "Controlled vs Uncontrolled Components",
            content: `## COMPREENDER: Quem controla o input?

### Controlled: React é a "fonte da verdade"

\`\`\`javascript
function LoginForm() {
  const [email, setEmail] = useState('');
  
  // React CONTROLA o valor via state
  return (
    <input
      value={email}        // Sempre sincronizado com state
      onChange={(e) => setEmail(e.target.value)}  // Atualiza state
    />
  );
}
\`\`\`

Fluxo:
1. Usuário digita "j"
2. onChange dispara
3. setEmail('j')
4. Componente re-renderiza
5. input.value agora é 'j'

### Uncontrolled: DOM é a "fonte da verdade"

\`\`\`javascript
function LoginForm() {
  const inputRef = useRef(null);
  
  const handleSubmit = () => {
    const valor = inputRef.current.value;  // Lê diretamente do DOM
    console.log(valor);
  };
  
  // input é "uncontrolled" - React não controla seu valor
  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
\`\`\`

Fluxo:
1. Usuário digita no input
2. DOM actualiza diretamente
3. React não sabe ou se importa
4. Ao submeter, lemos inputRef.current.value

### Qual usar?

| Aspecto | Controlled | Uncontrolled |
|---------|-----------|--------------|
| State | React | DOM |
| Validação em tempo real | ✅ Fácil | ❌ Difícil |
| Formulários complexos | ✅ Melhor | ❌ Pior |
| Acessibilidade | ✅ Ótima | ❌ Ruim |
| Preenchimento de campos | ✅ Trivial | ❌ Complexo |
| File inputs | ❌ Impossível | ✅ Necessário |

## APLICAR: Controlled Components prático

### Formulário simples

\`\`\`javascript
function Cadastro() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  
  const [erros, setErros] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validação em tempo real
    if (name === 'email' && !value.includes('@')) {
      setErros(prev => ({ ...prev, email: 'Email inválido' }));
    } else {
      setErros(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (Object.values(erros).some(e => e)) {
      return; // Não submete com erros
    }
    
    const response = await fetch('/api/cadastro', {
      method: 'POST',
      body: JSON.stringify(form)
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="nome"
        value={form.nome}
        onChange={handleChange}
        placeholder="Nome"
      />
      
      <input
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Email"
      />
      {erros.email && <span style={{color: 'red'}}>{erros.email}</span>}
      
      <input
        name="senha"
        type="password"
        value={form.senha}
        onChange={handleChange}
        placeholder="Senha"
      />
      
      <button type="submit">Cadastrar</button>
    </form>
  );
}
\`\`\`

### Checkboxes e selects

\`\`\`javascript
function Preferencias() {
  const [prefs, setPrefs] = useState({
    recebeEmails: true,
    newsletter: false,
    pais: 'BR',
    temas: [] // Multi-select
  });

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setPrefs(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSelect = (e) => {
    const { name, value } = e.target;
    setPrefs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setPrefs(prev => ({
      ...prev,
      temas: selected
    }));
  };

  return (
    <>
      <label>
        <input
          type="checkbox"
          name="recebeEmails"
          checked={prefs.recebeEmails}
          onChange={handleCheckbox}
        />
        Receber e-mails
      </label>

      <label>
        <input
          type="checkbox"
          name="newsletter"
          checked={prefs.newsletter}
          onChange={handleCheckbox}
        />
        Inscrever-se na newsletter
      </label>

      <select name="pais" value={prefs.pais} onChange={handleSelect}>
        <option value="BR">Brasil</option>
        <option value="PT">Portugal</option>
        <option value="US">Estados Unidos</option>
      </select>

      <select multiple name="temas" value={prefs.temas} onChange={handleMultiSelect}>
        <option value="esportes">Esportes</option>
        <option value="tech">Tecnologia</option>
        <option value="saude">Saúde</option>
      </select>
    </>
  );
}
\`\`\`

### Reset de formulário

\`\`\`javascript
const initialForm = {
  nome: '',
  email: '',
  mensagem: ''
};

function Contato() {
  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(initialForm); // React re-renderiza e limpa inputs
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Enviando:', form);
    setForm(initialForm); // Clear after submit
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="nome"
        value={form.nome}
        onChange={handleChange}
      />
      <textarea
        name="mensagem"
        value={form.mensagem}
        onChange={handleChange}
      />
      <button type="submit">Enviar</button>
      <button type="button" onClick={handleReset}>Limpar</button>
    </form>
  );
}
\`\`\`

## Uncontrolled: Quando necessário

### File inputs (não podem ser controlled)

\`\`\`javascript
function ImageUpload() {
  const fileRef = useRef(null);

  const handleUpload = async () => {
    const file = fileRef.current.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
  };

  return (
    <>
      <input ref={fileRef} type="file" />
      <button onClick={handleUpload}>Upload</button>
    </>
  );
}
\`\`\`

### Acessar input diretamente (raro)

\`\`\`javascript
function AudioPlayer() {
  const audioRef = useRef(null);

  const handlePlay = () => {
    audioRef.current.play();
  };

  const handleStop = () => {
    audioRef.current.pause();
  };

  const handleSeek = (time) => {
    audioRef.current.currentTime = time;
  };

  return (
    <>
      <audio ref={audioRef} src="music.mp3" />
      <button onClick={handlePlay}>Play</button>
      <button onClick={handleStop}>Stop</button>
      <input
        type="range"
        min="0"
        max="100"
        onChange={(e) => handleSeek((e.target.value / 100) * audioRef.current.duration)}
      />
    </>
  );
}
\`\`\`

## PRODUZIR: Formulário profissional

Implemente **FormularioCadastro** com:

1. **Campos**
   - Nome, Email, Senha, Confirmar Senha
   - País (select)
   - Aceitar termos (checkbox)
   - Bio (textarea)

2. **Validações**
   - Nome: mínimo 3 caracteres
   - Email: formato válido
   - Senha: mínimo 8, maiúscula, números
   - Confirmação: coincide com senha
   - Termos: deve estar checked

3. **Features**
   - Validação em tempo real (error abaixo de cada campo)
   - Desabilita botão se erros
   - Reset limpa tudo
   - Submit log deveria exibir form

4. **Requisitos**
   - Todos inputs controlled
   - handleChange genérico
   - Validação centralizada
   - Estado organizado

## AVALIAR

1. Qual é a diferença ente controlled e uncontrolled?
2. Por que controlled é melhor para validação?
3. Como resetar um formulário controlled?
4. File inputs podem ser controlled?
5. Qual padrão usar: um state objeto ou múltiplos useState?`,
            minutes: 60,
            exercises: [
              {
                type: "code",
                title: "Formulário controlled simples",
                instructions: "Form com nome e email controlados. Mostre valores abaixo do form enquanto digita.",
                expectedIncludes: ["useState", "onChange", "value"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Validação em tempo real",
                instructions: "Email input que mostra erro se não tem @. Checkbox que ativa/desativa submit.",
                expectedIncludes: ["includes", "disabled", "error"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Reset de formulário",
                instructions: "Form com três inputs e botão reset que volta todos aos valores iniciais.",
                expectedIncludes: ["initialState", "setForm", "handleReset"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Select e checkboxes",
                instructions: "Form com select (país), checkbox (termos), e multi-select (interesses).",
                expectedIncludes: ["select", "checkbox", "selectedOptions"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Formulário de login avançado",
                instructions: "Email, senha, 'lembrar-me' checkbox. Validação real-time. Submit faz fetch POST.",
                expectedIncludes: ["useState", "validação", "fetch"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Trade-offs",
                instructions: "Quando seria apropriado usar uncontrolled em vez de controlled, e por quê?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "react-7",
            title: "Padrões Avançados: Compound Components e Render Props",
            content: `## COMPREENDER: Por que padrões avançados?

### Problema: Componentes rígidos

\`\`\`javascript
// Menu pré-fabricado - pouco flexível
function Menu({ items, onSelect }) {
  return (
    <div className="menu">
      {items.map(item => (
        <div key={item.id} className="menu-item" onClick={() => onSelect(item)}>
          {item.label}
        </div>
      ))}
    </div>
  );
}

// Uso:
<Menu items={[...]} onSelect={...} />
\`\`\`

Problemas:
- Estrutura fixa
- Impossível adicionar ícones, custom styling por item
- Difícil estender funcionalidade
- Props explosion

### Solução: Compound Components

Deixe o pai e filhos compartilharem state implícito:

\`\`\`javascript
<Menu>
  <Menu.Button>Abrir</Menu.Button>
  <Menu.List>
    <Menu.Item>Opção 1</Menu.Item>
    <Menu.Item>Opção 2</Menu.Item>
  </Menu.List>
</Menu>
\`\`\`

Benefícios:
- Estrutura flexível
- Parece HTML natural
- Filhos "conhecem" contexto do pai
- Fácil de modificar

### Render Props (alternativa histórica)

\`\`\`javascript
<DataFetcher url="/api/users">
  {(data, loading, error) => (
    loading ? <p>Carregando...</p> :
    error ? <p>Erro: {error}</p> :
    <UserList users={data} />
  )}
</DataFetcher>
\`\`\`

Modernamente (React 16.8+), hooks são preferíveis.

## APLICAR: Compound Components prático

### Exemplo 1: Menu simples

\`\`\`javascript
import { createContext, useContext, useState } from 'react';

// Context interna
const MenuContext = createContext();

function Menu({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="menu">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

Menu.Button = function MenuButton({ children }) {
  const { isOpen, setIsOpen } = useContext(MenuContext);
  
  return (
    <button onClick={() => setIsOpen(!isOpen)}>
      {children}
    </button>
  );
};

Menu.List = function MenuList({ children }) {
  const { isOpen } = useContext(MenuContext);
  
  if (!isOpen) return null;
  
  return <ul className="menu-list">{children}</ul>;
};

Menu.Item = function MenuItem({ onClick, children }) {
  const { setIsOpen } = useContext(MenuContext);
  
  const handleClick = () => {
    onClick?.();
    setIsOpen(false);
  };
  
  return <li onClick={handleClick}>{children}</li>;
};

// Uso
<Menu>
  <Menu.Button>🍔 Menu</Menu.Button>
  <Menu.List>
    <Menu.Item onClick={() => console.log('Home')}>Home</Menu.Item>
    <Menu.Item onClick={() => console.log('About')}>About</Menu.Item>
    <Menu.Item onClick={() => console.log('Contact')}>Contact</Menu.Item>
  </Menu.List>
</Menu>
\`\`\`

### Exemplo 2: Accordion (sem Context)

\`\`\`javascript
function Accordion({ children }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      {children && children.map(child =>
        React.cloneElement(child, { expanded, setExpanded })
      )}
    </div>
  );
}

Accordion.Header = function AccordionHeader({ id, expanded, setExpanded, children }) {
  return (
    <button onClick={() => setExpanded(expanded === id ? null : id)}>
      {children}
      {expanded === id ? '▼' : '▶'}
    </button>
  );
};

Accordion.Content = function AccordionContent({ id, expanded, children }) {
  return expanded === id ? <div>{children}</div> : null;
};

// Uso
<Accordion>
  <Accordion.Header id="1">Seção 1</Accordion.Header>
  <Accordion.Content id="1">Conteúdo 1</Accordion.Content>
  
  <Accordion.Header id="2">Seção 2</Accordion.Header>
  <Accordion.Content id="2">Conteúdo 2</Accordion.Content>
</Accordion>
\`\`\`

### Exemplo 3: Tabs

\`\`\`javascript
const TabContext = createContext();

function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">
        {children}
      </div>
    </TabContext.Provider>
  );
}

Tabs.Links = function TabLinks({ children }) {
  const { activeTab, setActiveTab } = useContext(TabContext);
  
  return (
    <div className="tab-links">
      {children && children.map((child, idx) =>
        React.cloneElement(child, { idx, isActive: activeTab === idx, setActiveTab })
      )}
    </div>
  );
};

Tabs.Link = function TabLink({ idx, isActive, setActiveTab, children }) {
  return (
    <button
      className={isActive ? 'active' : ''}
      onClick={() => setActiveTab(idx)}
    >
      {children}
    </button>
  );
};

Tabs.Panels = function TabPanels({ children }) {
  const { activeTab } = useContext(TabContext);
  
  return children[activeTab];
};

Tabs.Panel = function TabPanel({ children }) {
  return <div>{children}</div>;
};

// Uso
<Tabs>
  <Tabs.Links>
    <Tabs.Link>Tab 1</Tabs.Link>
    <Tabs.Link>Tab 2</Tabs.Link>
  </Tabs.Links>
  <Tabs.Panels>
    <Tabs.Panel>Conteúdo 1</Tabs.Panel>
    <Tabs.Panel>Conteúdo 2</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
\`\`\`

### Render Props (pattern antigo, mas útil)

\`\`\`javascript
function useDataFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

// Componente com render prop
function DataFetcher({ url, children }) {
  const state = useDataFetch(url);
  return children(state);
}

// Uso
<DataFetcher url="/api/users">
  {({ data, loading, error }) => (
    loading ? <p>Carregando...</p> :
    error ? <p>Erro: {error}</p> :
    <div>{data.map(u => <p key={u.id}>{u.name}</p>)}</div>
  )}
</DataFetcher>

// Moderna: hook é mais simples
function UserList() {
  const { data, loading } = useDataFetch('/api/users');
  return loading ? <p>...</p> : <div>{...}</div>;
}
\`\`\`

## PRODUZIR: Componente Compound complexo

Implemente **Card** compound component:

\`\`\`javascript
<Card>
  <Card.Header>
    <Card.Title>Título</Card.Title>
    <Card.Subtitle>Subtítulo</Card.Subtitle>
  </Card.Header>
  <Card.Body>
    Conteúdo aqui
  </Card.Body>
  <Card.Footer>
    <Card.Action>Cancelar</Card.Action>
    <Card.Action primary>Salvar</Card.Action>
  </Card.Footer>
</Card>
\`\`\`

Requisitos:
- Context interno para compartilhar estado
- 5+subcomponentes (Header, Title, Body, Footer, Action)
- Context.Provider no pai
- Uso flexível
- CSS bem estruturado

## AVALIAR

1. Por que compound components são mais flexíveis que components rígidos?
2. Como Context é usado internamente em compound components?
3. Qual é a diferença entre render props e hooks?
4. Quando usar React.cloneElement?
5. Qual é a desvantagem de render props vs hooks?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Menu compound component",
                instructions: "Menu, Menu.Button, Menu.List, Menu.Item. Use Context para compartilhar estado isOpen.",
                expectedIncludes: ["createContext", "useContext", "Menu.Button"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Tabs compound",
                instructions: "Tabs, Tabs.Links, Tabs.Link, Tabs.Panels, Tabs.Panel. Alterne abas com estado.",
                expectedIncludes: ["setActiveTab", "cloneElement"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Hook customizado useFetch",
                instructions: "Hook que retorna {data, loading, error}. Use com componente que renderiza dados.",
                expectedIncludes: ["useEffect", "useState", "fetch"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Render props component",
                instructions: "DataFetcher que recebe url e função como children, passa {data, loading, error}.",
                expectedIncludes: ["children", "data", "loading"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Modal compound component",
                instructions: "Modal, Modal.Header, Modal.Body, Modal.Footer com botões. State compartilhado via Context.",
                expectedIncludes: ["createContext", "Context.Provider"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Quando usar qual",
                instructions: "Você teria que escolher entre compound components ou passar tudo como props. Por quê escolher compound?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "react-8",
            title: "Testes, Performance e Deploy",
            content: `## COMPREENDER: Testando componentes React

### Por que testar?

- Código quebrado é descoberto cedo (antes de ir ao production)
- Refatorações seguras (se teste quebra, saiba que algo mudou)
- Documentação viva (testes mostram como usar componente)
- Confiança (diminui bugs)

### Tipos de testes

#### Unitários
Testam uma coisa isolada (função, componente sem props externas)

\`\`\`javascript
function somar(a, b) {
  return a + b;
}

test('somar retorna soma correta', () => {
  expect(somar(2, 3)).toBe(5);
});
\`\`\`

#### Integração
Testam múltiplos componentes trabalhando juntos

\`\`\`javascript
test('formulário submete dados corretamente', () => {
  // Renderiza Form que contém Input, Label, Button
  // Testa que ao submeter, dados chegam corretamente
});
\`\`\`

#### E2E (end-to-end)
Testam a aplicação inteira como usuário final (Cypress, Playwright)

\`\`\`javascript
cy.visit('/');
cy.get('input[name="email"]').type('test@test.com');
cy.get('button').click();
cy.contains('Bem-vindo').should('be.visible');
\`\`\`

## APLICAR: Testing Library prático

### Setup básico

\`\`\`javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('incrementar contador', async () => {
  render(<Contador />);
  
  const button = screen.getByRole('button', { name: /incrementar/i });
  
  await userEvent.click(button);
  
  expect(screen.getByText(/contagem: 1/i)).toBeInTheDocument();
});
\`\`\`

**Mantra:** Teste o que o usuário VÊ e FAZ, não a implementação.

### Queries (formas de encontrar elementos)

\`\`\`javascript
// POR ROLE (acessibilidade forte) ✅
screen.getByRole('button', { name: /enviar/i })

// POR LABEL (input associado) ✅
screen.getByLabelText('Email')

// POR PLACEHOLDER ✅
screen.getByPlaceholderText('Digite seu nome')

// POR TEXT (último recurso) ⚠️
screen.getByText('Bem-vindo')

// POR TESTID (escape hatch) ⚠️
screen.getByTestId('user-avatar')
\`\`\`

### Exemplos práticos

#### Teste de formulário

\`\`\`javascript
test('submete formulário com dados corretos', async () => {
  const mockSubmit = jest.fn();
  
  render(<LoginForm onSubmit={mockSubmit} />);
  
  const emailInput = screen.getByLabelText('Email');
  const passwordInput = screen.getByLabelText('Senha');
  const submitButton = screen.getByRole('button', { name: /entrar/i });
  
  await userEvent.type(emailInput, 'user@test.com');
  await userEvent.type(passwordInput, 'password123');
  await userEvent.click(submitButton);
  
  expect(mockSubmit).toHaveBeenCalledWith({
    email: 'user@test.com',
    password: 'password123'
  });
});
\`\`\`

#### Teste de lista dinâmica

\`\`\`javascript
test('lista renderiza items corretamente', async () => {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  
  render(<List items={items} />);
  
  items.forEach(item => {
    expect(screen.getByText(item)).toBeInTheDocument();
  });
});
\`\`\`

#### Teste com fetch

\`\`\`javascript
test('carrega e exibe usuários', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([
        { id: 1, name: 'João' },
        { id: 2, name: 'Maria' }
      ])
    })
  );
  
  render(<UserList />);
  
  expect(screen.getByText('Carregando...')).toBeInTheDocument();
  
  // Espera dados carregar
  const joao = await screen.findByText('João');
  expect(joao).toBeInTheDocument();
  
  expect(fetch).toHaveBeenCalledWith('/api/users');
});
\`\`\`

#### Teste de interação assíncrona

\`\`\`javascript
test('abre modal ao clicar', async () => {
  render(<App />);
  
  const openButton = screen.getByRole('button', { name: /abrir/i });
  
  await userEvent.click(openButton);
  
  // waitFor espera condição ser verdadeira
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
\`\`\`

## Performance no React

### React DevTools Profiler

1. Abra React DevTools
2. Vá para Profiler
3. Clique record
4. Interaja com app
5. Analise: qual componente renderizou?
6. Por quanto tempo?

### Code Splitting com Suspense

\`\`\`javascript
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./AdminPanel'));
const UserProfile = lazy(() => import('./UserProfile'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPanel />
      <UserProfile />
    </Suspense>
  );
}

// AdminPanel e UserProfile carregam APENAS quando importados
// No bundle inicial, não estão inclusos
\`\`\`

### Lazy loading de rotas

\`\`\`javascript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Admin = lazy(() => import('./pages/Admin'));

export function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}

// Admin JS NUNCA carrega até usuário navegar para /admin
\`\`\`

### Bundle Analysis

\`\`\`bash
npm install --save-dev webpack-bundle-analyzer

// build.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

plugins: [
  new BundleAnalyzerPlugin()
]
\`\`\`

Analise visualmente qual package ocupa espaço.

## PRODUZIR: Suite de testes completa

Implemente testes para **TodoApp**:

\`\`\`javascript
// TodoApp features:
// 1. Input controlado
// 2. AddTodo button
// 3. List of todos com checkboxes
// 4. Delete button
// 5. Mark complete
\`\`\`

Testes para criar:
1. Renderiza input vazio
2. Digitando atualiza input
3. Click "adicionar" adiciona todo à lista
4. Deletar remove todo
5. Marcar completo risca texto
6. Input limpa após adicionar

Requisitos:
- 6+ testes passvando
- Use getByRole, getByLabelText
- userEvent para interações
- waitFor se assíncrono
- Mock callbacks se necessário

## Deploy

### Build otimizado

\`\`\`bash
npm run build

# Saída:
# .next/
#   ├─ static/
#   │  ├─ _app-xxxxx.js (400KB)
#   │  ├─ _document-xxxxx.js (10KB)
#   │  ├─ pages/admin-xxxxx.js (200KB, lazy loaded)
#   │  └─ chunks/...
\`\`\`

### Deploy em produção

**Vercel (Next.js optimizado)**
\`\`\`bash
npm install -g vercel
vercel
\`\`\`

**Docker**
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
\`\`\`

## AVALIAR

1. Qual é a diferença entre testes unitários e integração?
2. Por que Testing Library favorece queries por role?
3. Como testar componentes assíncronos?
4. O que é code splitting e quando usar?
5. Como analisar bundle size e otimizar?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Teste básico com userEvent",
                instructions: "Teste que: input renderiza, digitar atualiza valor, valor mostra abaixo.",
                expectedIncludes: ["render", "userEvent", "expect"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Mock callback com jest.fn",
                instructions: "Botão com onClick callback. Teste que callback foi chamado com dados corretos.",
                expectedIncludes: ["jest.fn", "toHaveBeenCalledWith"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Teste assíncrono com waitFor",
                instructions: "Componente que busca dados. Teste que dados aparecem após fetch.",
                expectedIncludes: ["waitFor", "findByText", "fetch"],
                language: "javascript",
              },
              {
                type: "code",
                title: "Teste de lista",
                instructions: "Array de items, componente renderiza lista. Teste cada item aparece.",
                expectedIncludes: ["getByText", "forEach"],
                language: "javascript",
              },
              {
                type: "project",
                title: "Suite de testes TodoApp",
                instructions: "Mínimo 6 testes para TodoApp: render, input, add, delete, complete, clear.",
                expectedIncludes: ["test", "render", "userEvent"],
                language: "javascript",
              },
              {
                type: "command",
                title: "Pergunta — Cobertura",
                instructions: "O que é code coverage e qual % é aceitável? Por que 100% nem sempre é meta?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "html",
    title: "HTML - Semântica e Boas Práticas",
    description: "Fundamentos de HTML5: semântica, acessibilidade, SEO e estrutura correta de documentos.",
    modules: [
      {
        id: "html-basics",
        title: "Fundamentos HTML5",
        lessons: [
          {
            id: "html-1",
            title: "Estrutura HTML5 e Semântica Web",
            content: `## COMPREENDER: HTML é a estrutura

### Por que HTML importa?

HTML não é sobre **belo visual** (isso é CSS).  
HTML é sobre **significado e estrutura**.

❌ Sem semântica:
\`\`\`html
<div id="header">
  <div id="nav">
    <div id="link"><a href="/">Home</a></div>
    <div id="link"><a href="/about">About</a></div>
  </div>
</div>
<div id="main">
  <div id="content">Artigo...</div>
  <div id="sidebar">Links úteis</div>
</div>
<div id="footer">Copyright</div>
\`\`\`

✅ Com semântica:
\`\`\`html
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <article>Artigo...</article>
  <aside>Links úteis</aside>
</main>
<footer>Copyright</footer>
\`\`\`

**Benefícios:**
- SEO: Buscadores entendem conteúdo
- Acessibilidade: Leitores de tela navegam melhor
- Legibilidade: Código mais limpo
- Manutenção: Código mais fácil de entender

### Estrutura básica HTML5

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <!-- METADADOS -->
  
  <!-- Encoding (caracteres especiais) -->
  <meta charset="UTF-8">
  
  <!-- Responsivo (mobile) -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Descrição para buscadores -->
  <meta name="description" content="Descrição breve da página">
  
  <!-- Título (abas navegador) -->
  <title>Meu Site - Home</title>
  
  <!-- CSS -->
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- CONTEÚDO VISÍVEL -->
  
  <header>
    <h1>Nome do Site</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">Sobre</a>
      <a href="/contact">Contato</a>
    </nav>
  </header>
  
  <main>
    <article>
      <h2>Título do Artigo</h2>
      <p>Conteúdo aqui...</p>
    </article>
    
    <aside>
      <h3>Sidebar</h3>
      <p>Conteúdo relacionado</p>
    </aside>
  </main>
  
  <footer>
    <p>&copy; 2025 Meu Site</p>
  </footer>
  
  <!-- JavaScript -->
  <script src="app.js"></script>
</body>
</html>
\`\`\`

## APLICAR: Elementos semânticos

### Elementos principais

| Tag | Significado | Uso |
|-----|-----------|-----|
| \`<header>\` | Cabeçalho da página/seção | Logotipo, nav, título |
| \`<nav>\` | Navegação | Links de menu |
| \`<main>\` | Conteúdo principal | UMA por página |
| \`<article>\` | Conteúdo independente | Post, notícia |
| \`<section>\` | Agrupamento temático | Grupos de conteúdo |
| \`<aside>\` | Conteúdo relacionado | Sidebar, publicidade |
| \`<footer>\` | Rodapé | Copyright, links |

### Exemplo: Blog post

\`\`\`html
<article>
  <header>
    <h1>10 Dicas de CSS</h1>
    <p>Por <address>João Silva</address></p>
    <time datetime="2025-02-09">9 de fevereiro de 2025</time>
  </header>
  
  <p>Introdução aqui...</p>
  
  <section>
    <h2>Dica 1: Flexbox</h2>
    <p>Conteúdo...</p>
  </section>
  
  <section>
    <h2>Dica 2: Grid</h2>
    <p>Conteúdo...</p>
  </section>
  
  <footer>
    <p>Tags: <a href="/tags/css">CSS</a>, <a href="/tags/design">Design</a></p>
  </footer>
</article>
\`\`\`

### Elementos de texto semântico

\`\`\`html
<strong>Texto muito importante</strong>  <!-- vs <b> apenas visual -->
<em>Ênfase</em>                       <!-- vs <i> apenas visual -->
<mark>Destaque</mark>                 <!-- Marca/highlight -->
<del>Deletado</del>                   <!-- Texto removido -->
<ins>Inserido</ins>                   <!-- Texto adicionado -->
<code>código_aqui</code>              <!-- Código -->
<kbd>Ctrl + C</kbd>                   <!-- Tecla do teclado -->
<samp>Saída de programa</samp>        <!-- Sample output -->
<var>variável</var>                   <!-- Variável -->
<abbr title="HyperText Markup Language">HTML</abbr>  <!-- Abreviação -->
<q>Citação curta</q>                  <!-- Quote -->
<blockquote>(Citação longa)</blockquote> <!-- Bloco de citação -->
\`\`\`

### \`<meta>\` tags importantes para SEO

\`\`\`html
<!-- Descrição Google -->
<meta name="description" content="Descrição resumida (160 caracteres)">

<!-- Palavras-chave -->
<meta name="keywords" content="html, tutorial, web">

<!-- Autor -->
<meta name="author" content="João Silva">

<!-- Tema color (navegador mobile) -->
<meta name="theme-color" content="#4285f4">

<!-- Viewport para responsivo (CRÍTICO!) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Open Graph (redes sociais) -->
<meta property="og:title" content="Título da página">
<meta property="og:description" content="Descrição">
<meta property="og:image" content="/imagem.jpg">
<meta property="og:type" content="website">
\`\`\`

### Estrutura de página profissional

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Descrição da página">
  <title>Página - Meu Site</title>
  <link rel="stylesheet" href="style.css">
  <link rel="canonical" href="https://exemplo.com/pagina">
</head>
<body>
  <header>
    <nav>
      <a href="/">Logo</a>
      <ul>
        <li><a href="/about">Sobre</a></li>
        <li><a href="/contact">Contato</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <h1>Título principal</h1>
    
    <article>
      <h2>Título artigo</h2>
      <p>Conteúdo...</p>
    </article>
    
    <aside>
      <h3>Leia também</h3>
      <ul>
        <li><a href="/article1">Artigo 1</a></li>
        <li><a href="/article2">Artigo 2</a></li>
      </ul>
    </aside>
  </main>
  
  <footer>
    <p>&copy; 2025 Meu Site. Todos direitos.</p>
  </footer>
</body>
</html>
\`\`\`

## PRODUZIR: Página semântica com múltiplas seções

Implemente **website de portfólio** com:

1. **\`<header>\`**
   - Logo/título
   - Nav com links (Home, Projetos, Sobre, Contato)

2. **\`<main>\`**
   - Section "Sobre mim" com parágrafo
   - Section "Projetos" com 3 articles
   - Cada article com h3, descrição, link

3. **\`<aside>\`**
   - "Habilidades" com lista
   - "Links úteis" com lista

4. **\`<footer>\`**
   - Copyright
   - Links de contato

5. **Requisitos**
   - Estrutura semântica
   - Sem divs onde desnecessário
   - Meta descriptions
   - Open Graph tags
   - Responsivo (viewport meta)

## AVALIAR

1. Por que \`<header>\` é melhor que \`<div id="header">\`?
2. Uma página pode ter múltiplos \`<main>\`?
3. Qual é a diferença entre \`<section>\` e \`<article>\`?
4. Por que \`<meta name="viewport">\` é crítico?
5. Como SEO beneficia de semântica HTML?`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Estrutura semântica simples",
                instructions: "Página com header, nav, main, article, aside, footer. Use elementos semânticos corretos.",
                expectedIncludes: ["<header>", "<nav>", "<main>", "<article>", "<footer>"],
                language: "html",
              },
              {
                type: "code",
                title: "Meta tags SEO",
                instructions: "Adicione meta description, og:title, og:description, viewport em <head>.",
                expectedIncludes: ["meta", "viewport", "og:", "description"],
                language: "html",
              },
              {
                type: "code",
                title: "Texto semântico",
                instructions: "Parágrafo usando <strong>, <em>, <code>, <mark>, <abbr>. Cada um com significado correto.",
                expectedIncludes: ["<strong>", "<em>", "<code>"],
                language: "html",
              },
              {
                type: "code",
                title: "Article com seções",
                instructions: "Blog post: h1, múltiplos <section> com h2, footer com tags. Tudo aninhado em <article>.",
                expectedIncludes: ["<article>", "<section>", "<footer>"],
                language: "html",
              },
              {
                type: "project",
                title: "Website profissional",
                instructions: "Portfólio pessoal: header, nav, main (about + projects), aside, footer. Semântico, meta tags, responsivo.",
                expectedIncludes: ["<header>", "<section>", "<article>"],
                language: "html",
              },
              {
                type: "command",
                title: "Pergunta — SEO",
                instructions: "Como estrutura semântica HTML afeta ranking no Google?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "html-2",
            title: "Formulários Acessíveis e Validação",
            content: `## COMPREENDER: Formulários são interação

### Por que formulários são críticos?

Formulários são **o principal meio de interação**.

- Login: \`<input type="password">\`
- Busca: \`<input type="search">\`
- Pagamento: \`<input type="number">\` + \`<input type="email">\`
- Acessibilidade: \`<label for="id">\` conecta ao input

### Acessibilidade em formulários

❌ Inacessível:
\`\`\`html
<div>
  Email:
  <input id="email-input">
</div>
\`\`\`

✅ Acessível:
\`\`\`html
<div>
  <label for="email-input">Email:</label>
  <input id="email-input" type="email" required>
</div>
\`\`\`

**Benefício:** Leitores de tela conectam label → input.

### Relação entre \`<label>\` e \`<input>\`

\`\`\`html
<!-- Método 1: atributo for -->
<label for="user-email">Email:</label>
<input id="user-email" type="email">

<!-- Método 2: form implícito (menos comum) -->
<label>
  Email:
  <input type="email">
</label>
\`\`\`

**Benefícios:**
- Clique no label = foca no input
- Mobile: área maior para tocar
- Acessibilidade: leitores de tela leem label

## APLICAR: Tipos de input HTML5

### Input types validação nativa

\`\`\`html
<!-- Texto -->
<input type="text" placeholder="Nome">
<input type="email" required>  <!-- Valida @ -->
<input type="url">              <!-- Valida protocolo -->
<input type="password">         <!-- Mascara caracteres -->
<input type="search">           <!-- Busca com ícone X -->

<!-- Números -->
<input type="number" min="1" max="100">
<input type="range" min="0" max="100">

<!-- Datas/Hora -->
<input type="date">
<input type="time">
<input type="datetime-local">
<input type="month">
<input type="week">

<!-- Outros -->
<input type="color">            <!-- Seletor cor -->
<input type="file">             <!-- Upload -->
<input type="checkbox">         <!-- Sim/Não -->
<input type="radio" name="g">   <!-- Múltiplo exclusivo -->
<input type="tel">              <!-- Teclado telefone -->
<input type="email">            <!-- Teclado @. -->
\`\`\`

### Exemplo: Formulário de cadastro completo

\`\`\`html
<form id="signup" method="POST" action="/register">
  
  <fieldset>
    <legend>Dados Pessoais</legend>
    
    <div>
      <label for="nome">Nome completo:</label>
      <input id="nome" type="text" name="nome" required>
    </div>
    
    <div>
      <label for="email">Email:</label>
      <input id="email" type="email" name="email" required>
    </div>
    
    <div>
      <label for="tel">Telefone:</label>
      <input id="tel" type="tel" name="tel">
    </div>
  </fieldset>
  
  <fieldset>
    <legend>Endereço</legend>
    
    <div>
      <label for="cep">CEP:</label>
      <input id="cep" type="text" pattern="[0-9]{5}-[0-9]{3}">
    </div>
    
    <div>
      <label for="city">Cidade:</label>
      <input id="city" type="text" name="city" required>
    </div>
  </fieldset>
  
  <fieldset>
    <legend>Preferências</legend>
    
    <div>
      <input type="checkbox" id="news" name="subscribe">
      <label for="news">Receber newsletter</label>
    </div>
    
    <div>
      <input type="radio" id="male" name="gender" value="m">
      <label for="male">Masculino</label>
      
      <input type="radio" id="female" name="gender" value="f">
      <label for="female">Feminino</label>
    </div>
  </fieldset>
  
  <button type="submit">Cadastrar</button>
  <button type="reset">Limpar</button>
  
</form>
\`\`\`

### Atributos validação

\`\`\`html
<!-- required: Obrigatório -->
<input type="text" required>

<!-- minlength/ maxlength: Comprimento -->
<input type="password" minlength="8">

<!-- min/max: Valor numérico -->
<input type="number" min="1" max="100">

<!-- pattern: Regex -->
<input type="text" pattern="[A-Za-z0-9]+" title="Só letras e números">

<!-- step: Intervalo (number) -->
<input type="number" step="0.01">

<!-- disabled: Desabilitado -->
<input type="text" disabled>

<!-- readonly: Apenas leitura -->
<input type="text" readonly value="Fixa">

<!-- autocomplete: Sugestões -->
<input type="email" autocomplete="email">

<!-- placeholder: Dica -->
<input type="text" placeholder="Digite aqui...">

<!-- autofocus: Foca ao carregar -->
<input type="text" autofocus>
\`\`\`

### \`<select>\` e \`<textarea>\`

\`\`\`html
<!-- Dropdown -->
<label for="country">País:</label>
<select id="country" name="country">
  <option value="">-- Selecione --</option>
  <option value="br">Brasil</option>
  <option value="us">EUA</option>
  <option value="pt">Portugal</option>
</select>

<!-- Dropdown múltiplo -->
<label for="skills">Habilidades:</label>
<select id="skills" name="skills" multiple>
  <option>HTML</option>
  <option>CSS</option>
  <option>JavaScript</option>
</select>

<!-- Texto longo -->
<label for="message">Mensagem:</label>
<textarea id="message" name="message" rows="5" cols="40" 
          placeholder="Digite aqui..." maxlength="500"></textarea>

<!-- Agrupamento optgroup -->
<select>
  <optgroup label="Linguagens">
    <option>Python</option>
    <option>JavaScript</option>
  </optgroup>
  <optgroup label="Banco de dados">
    <option>MySQL</option>
    <option>PostgreSQL</option>
  </optgroup>
</select>
\`\`\`

### Validação com CSS

\`\`\`html
<!-- :valid / :invalid CSS pseudo-classes -->
<input 
  type="email" 
  style="border: 2px solid green" 
  value="user@example.com">
<!-- Verde (válido) -->

<input 
  type="email" 
  style="border: 2px solid red" 
  value="invalid-email">
<!-- Vermelho (inválido) -->

<!-- CSS no style.css -->
input:valid {
  border-color: green;
  background-color: #f0fff0;
}

input:invalid {
  border-color: red;
  background-color: #fff0f0;
}

input:required {
  border: 2px solid blue;
}
\`\`\`

## PRODUZIR: Formulário de contato profissional

Crie **formulário de contato** com:

1. **Campos**
   - Nome (text, required)
   - Email (email, required)
   - Telefone (tel, opcional)
   - Assunto (select com 3 opções)
   - Mensagem (textarea, maxlength=500)
   - Tipo (radio: dúvida/sugestão/reclamação)
   - Newsletter (checkbox)

2. **Acessibilidade**
   - Label para CADA input
   - IDs únicos
   - Atributo name em todos
   - fieldset + legend para agrupar

3. **Validação**
   - required nos obrigatórios
   - type="email" para email
   - minlength="10" na mensagem
   - pattern para telefone "(\\d{2}) \\d{4,5}-\\d{4}"

4. **Estrutura**
   - Form com method="POST" action="/contact"
   - Grupos de campos com \`<fieldset>\`
   - Botões submit e reset
   - Sem JavaScript (validação HTML5!)

5. **Bônus**
   - Placeholder em inputs
   - Autocomplete onde apropriado
   - \`<datalist>\` para cidades (autocomplete)

## AVALIAR

1. Por que \`<label for="id">\` é melhor que placeholder?
2. Qual input type valida formato de email automaticamente?
3. Como \`<fieldset>\` e \`<legend>\` melhoram acessibilidade?
4. Qual atributo HTML5 impede envio se campo em branco?
5. Como usar \`<datalist>\` para sugestões sem dropdown?`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Form básico acessível",
                instructions: "Formulário login: email, senha, lembrar-me (checkbox). Cada input com label conectado.",
                expectedIncludes: ["<label", 'for="', '<input', 'type="email"', 'type="password"'],
                language: "html",
              },
              {
                type: "code",
                title: "Múltiplos fieldsets",
                instructions: "Cadastro: fieldset Dados, fieldset Endereço. Cada com legend e 3 campos.",
                expectedIncludes: ["<fieldset>", "<legend>", "form"],
                language: "html",
              },
              {
                type: "code",
                title: "Validação HTML5",
                instructions: "Inputs com type específicos (email, tel, number), required, pattern. Sem JavaScript.",
                expectedIncludes: ["required", "pattern", "type="],
                language: "html",
              },
              {
                type: "code",
                title: "Select e textarea",
                instructions: "Select país com 3 opções. Textarea mensagem com maxlength. Label + id para ambos.",
                expectedIncludes: ["<select>", "<option>", "<textarea>"],
                language: "html",
              },
              {
                type: "project",
                title: "Formulário profissional",
                instructions: "Contato: 7 campos (nome, email, tel, assunto select, mensagem, tipo radio, newsletter). Fieldsets. Validação HTML5. Acessível.",
                expectedIncludes: ["<form>", "<fieldset>", "<label"],
                language: "html",
              },
              {
                type: "command",
                title: "Pergunta — Acessibilidade",
                instructions: "Como leitores de tela usam <label> para facilitar navegação em formulários?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "html-3",
            title: "SEO e Meta tags para Buscadores",
            content: `## COMPREENDER: SEO começa no HTML

### Por que meta tags importam?

Google precisa **entender** sua página. As meta tags contam a história.

❌ Sem meta tags:
\`\`\`html
<head>
  <title>Página</title>
</head>
<body>
  <h1>Conteúdo</h1>
</body>
\`\`\`

✅ Com SEO básico:
\`\`\`html
<head>
  <meta charset="UTF-8">
  <meta name="description" content="Descrição clara em 155-160 caracteres">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Palavra-chave Principal | Nome Site</title>
</head>
\`\`\`

**Importância:**
- Title (~60 chars): Aparece em abas, Google, redes sociais
- Description (~160 chars): Snippet no Google
- Viewport: Necessário para mobile (critério de ranking)
- Charset: Impede problemas de acentuação

### Hierarquia de Headings correta

❌ Errado:
\`\`\`html
<h1>Página</h1>
<h3>Seção 1</h3>  <!-- Pulou h2! -->
<h2>Seção 2</h2>  <!-- Ordem quebrada -->
\`\`\`

✅ Correto:
\`\`\`html
<h1>Título Principal</h1>
<h2>Seção 1</h2>
<h3>Subsection 1.1</h3>
<h3>Subsection 1.2</h3>
<h2>Seção 2</h2>
<h3>Subsection 2.1</h3>
\`\`\`

**Regra:** Uma página = UMA h1, depois h2 e h3 em ordem lógica.

## APLICAR: Meta tags essenciais para SEO

### Meta tags básicas

\`\`\`html
<!-- Codificação e responsivo -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Descrição para Google -->
<meta name="description" content="Breve descrição (155-160 chars) que aparece em buscas">

<!-- Palavras-chave (menos importante agora) -->
<meta name="keywords" content="palavra1, palavra2, palavra3">

<!-- Autor do site -->
<meta name="author" content="Nome do Autor">

<!-- Tema color (navegadores mobile) -->
<meta name="theme-color" content="#4285f4">

<!-- Robôs: follow/nofollow, índex/noindex -->
<meta name="robots" content="index, follow">
\`\`\`

### Open Graph para redes sociais

\`\`\`html
<!-- Quando compartilha no Facebook, WhatsApp, LinkedIn -->
<meta property="og:title" content="Título atrativo (diferente do <title> ok)">
<meta property="og:description" content="Descrição para redes sociais">
<meta property="og:image" content="https://seu-site.com/imagem-1200x630.jpg">
<meta property="og:url" content="https://seu-site.com/pagina-exata">
<meta property="og:type" content="website">

<!-- Twitter (X) -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Título">
<meta name="twitter:description" content="Descrição">
<meta name="twitter:image" content="URL_imagem">
\`\`\`

### Exemplo: Blog post profissional

\`\`\`html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Guia completo de CSS Flexbox para iniciantes. Aprenda como usar display: flex, justify-content, align-items e domine layouts responsivos.">
  <meta name="keywords" content="CSS, Flexbox, layout, tutorial">
  <meta name="author" content="João Silva">
  <title>CSS Flexbox - Guia Completo para Iniciantes | Blog Dev</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="Domine CSS Flexbox: Guia Prático">
  <meta property="og:description" content="Aprenda Flexbox com exemplos práticos e exercícios">
  <meta property="og:image" content="https://blog-dev.com/img/flexbox-cover.jpg">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://blog-dev.com/css-flexbox">
  
  <!-- Canonical (evita conteúdo duplicado) -->
  <link rel="canonical" href="https://blog-dev.com/css-flexbox">
</head>
<body>
  <h1>CSS Flexbox - Guia Completo</h1>
  <p>Publicado por <strong>João Silva</strong> em 10 de fevereiro de 2025</p>
  
  <h2>O que é Flexbox?</h2>
  <p>...</p>
  
  <h2>Começando com display: flex</h2>
  <h3>Sintaxe básica</h3>
  <p>...</p>
  
  <h2>Propriedades principais</h2>
  <h3>justify-content</h3>
  <p>...</p>
  <h3>align-items</h3>
  <p>...</p>
  
  <h2>Exercícios práticos</h2>
  <p>...</p>
</body>
</html>
\`\`\`

### Canonical URL (conteúdo duplicado)

\`\`\`html
<!-- Se você tem www.seu-site.com/artigo E seu-site.com/artigo -->
<!-- Diga qual é a "versão canônica" para Google não penalizar -->
<link rel="canonical" href="https://seu-site.com/artigo">
\`\`\`

### Preload e Prefetch (performance)

\`\`\`html
<!-- Preload: recurso que será usado LOGO na página atual -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="crítico.css" as="style">

<!-- Prefetch: recurso que pode ser usado em PRÓXIMAS páginas -->
<link rel="prefetch" href="proxima-pagina.html">
<link rel="prefetch" href="imagem-grande.jpg">
\`\`\`

## PRODUZIR: HEAD completo de site profissional

Crie estrutura HTML5 completa com:

1. **Meta tags obrigatórias**
   - charset UTF-8
   - viewport
   - description (160 chars)
   - author
   - robots info

2. **Open Graph completo**
   - og:title
   - og:description
   - og:image (1200x630px recomendado)
   - og:type
   - og:url

3. **Twitter Card**
   - twitter:card
   - twitter:title
   - twitter:description
   - twitter:image

4. **Headings semânticos no body**
   - h1 único
   - h2, h3 em hierarquia lógica
   - Mínimo 3 sections

5. **Links úteis**
   - canonical URL
   - preload (uma fonte)
   - prefetch (próxima página)

## AVALIAR

1. Qual é diferença entre <title> e <h1>? Onde cada um aparece?
2. Por que Open Graph é importante em 2025?
3. Qual deve ser a ordem correta de headings: h1, h2, h2, h3, h2?
4. Quantos caracteres devem ter title e description para SEO?
5. Quando usar canonical URL? Dê exemplo real.`,
            minutes: 65,
            exercises: [
              {
                type: "code",
                title: "Meta tags básicas",
                instructions: "Head com charset, viewport, description, author, title com palavra-chave. SEO essencial.",
                expectedIncludes: ["<meta", "charset", "viewport", "description"],
                language: "html",
              },
              {
                type: "code",
                title: "Open Graph completo",
                instructions: "Adicione og:title, og:description, og:image, og:type, og:url. Pronto para compartilhar em redes.",
                expectedIncludes: ["og:", "property=\"", "content="],
                language: "html",
              },
              {
                type: "code",
                title: "Headings em ordem",
                instructions: "Artigo com h1, depois 3 seções (h2), 2 seções com subsections (h3). Sem pular níveis.",
                expectedIncludes: ["<h1>", "<h2>"],
                language: "html",
              },
              {
                type: "code",
                title: "Twitter Card",
                instructions: "Adicione twitter:card, twitter:title, twitter:description, twitter:image. Pronto para X.",
                expectedIncludes: ["twitter:", "name=\""],
                language: "html",
              },
              {
                type: "project",
                title: "Site completo com SEO",
                instructions: "Blog post: head com todas meta tags, Open Graph, Twitter Card, headings corretos, canonical URL. Pronto para ranquear.",
                expectedIncludes: ["<head>", "<title>", "og:", "twitter:"],
                language: "html",
              },
              {
                type: "command",
                title: "Pergunta — SEO moderno",
                instructions: "Como meta tags influenciam ranking e compartilhamento em redes sociais?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
      {
        id: "html-advanced",
        title: "HTML5 Avançado e Boas Práticas",
        lessons: [
          {
            id: "html-4",
            title: "Media, embeds e acessibilidade",
            content: `<img> com alt text obrigatório:
<img src="logo.png" alt="Logo da empresa XYZ">

<video> e <audio>:
<video controls width="400" height="300">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  Seu navegador não suporta vídeo.
</video>

Embed responsível:
<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  title="Vídeo"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>

Picture element para imagens responsivas:
<picture>
  <source media="(min-width: 768px)" srcset="grande.jpg">
  <img src="pequena.jpg" alt="Descrição">
</picture>`,
            minutes: 30,
            exercises: [
              {
                type: "command",
                title: "Conceito — Alt text",
                instructions: "Por que alt text é importante? O que um bom alt text deve conter?",
                expectedIncludes: [],
              },
              {
                type: "code",
                title: "Imagem responsiva",
                instructions: "Crie um <picture> element que exibe uma imagem diferente para mobile e desktop.",
                expectedIncludes: ["<picture>", "<source>", "media"],
                language: "html",
              },
            ],
          },
          {
            id: "html-5",
            title: "Data Attributes e Interatividade HTML",
            content: `## COMPREENDER: HTML como banco de dados leve

### Data attributes armazenam contexto

❌ Sem dados no HTML:
\`\`\`html
<div id="produto-123">Smartphone</div>
<div id="produto-456">Notebook</div>
<!-- Teremos que buscar dados via API de novo -->
\`\`\`

✅ Com dados atrelados:
\`\`\`html
<div 
  id="produto" 
  data-id="12345" 
  data-preco="899.90" 
  data-categoria="eletrônicos"
  data-estoque="15">
  iPhone 15 Pro
</div>
<!--
Agora JavaScript pode ler diretamente sem nova requisição
-->
\`\`\`

### Convenção data-*

\`\`\`html
<!-- data-[nome-em-kebab-case] -->
<button data-action="save">Salvar</button>
<img data-src="real-image.jpg" data-format="webp">
<div data-user-id="42" data-role="admin">Admin Panel</div>
<input data-field-type="email" data-required="true">
\`\`\`

**Benefício:** HTML semântico + dados estruturados sem cluttered attributes.

## APLICAR: Data attributes em prática

### JavaScript acessa dataset

\`\`\`html
<div data-id="123" data-preco="99.90" data-categoria="tech">
  Produto
</div>

<script>
const el = document.querySelector('div');
console.log(el.dataset.id); // \"123\"
console.log(el.dataset.preco); // \"99.90\"
console.log(el.dataset.categoria); // \"tech\"

// Modificar
el.dataset.preco = \"79.90\";
el.dataset.ativo = \"true\";
</script>
\`\`\`

### CSS pode ler data attributes

\`\`\`html
<button data-status=\"ativo\">Ativo</button>
<button data-status=\"inativo\">Inativo</button>

<style>
/* Estilizar baseado em data attribute */
button[data-status=\"ativo\"] {
  background: green;
  color: white;
}

button[data-status=\"inativo\"] {
  background: gray;
  opacity: 0.5;
}

/* Antes do atributo -->
button[data-status]::before {
  content: attr(data-status);
}
</style>
\`\`\`

### Caso real: Carrinho de compras

\`\`\`html
<div id=\"cart\">
  <article data-product-id=\"101\" data-price=\"29.90\" data-qty=\"1\">
    Livro: Clean Code
    <button class=\"remove\" data-id=\"101\">Remove</button>
  </article>
  
  <article data-product-id=\"102\" data-price=\"15.50\" data-qty=\"2\">
    Livro: Design Patterns
    <button class=\"remove\" data-id=\"102\">Remove</button>
  </article>
</div>

<script>
document.querySelectorAll('.remove').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    const article = document.querySelector(\`[data-product-id=\\\"\${id}\\\"]\`);
    
    // Salvar via API
    fetch(\`/cart/\${id}\`, {method: 'DELETE'}).then(() => {
      article.remove();
    });
  });
});
</script>
\`\`\`

### Validação HTML5 nativa

\`\`\`html
<!-- required: obrigatório -->
<input type=\"text\" name=\"nome\" required>

<!-- type: valida formato -->
<input type=\"email\" name=\"email\">  <!-- Valida @ -->
<input type=\"url\" name=\"site\">     <!-- Valida http:// -->
<input type=\"number\" min=\"1\" max=\"100\">  <!-- 1-100 -->

<!-- pattern: regex customizado -->
<input pattern=\"^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}\" title=\"CPF formato: XXX.XXX.XXX-XX\">

<!-- minlength/maxlength: tamanho -->
<input minlength=\"8\" maxlength=\"20\">

<!-- step: intervalo (números) -->
<input type=\"number\" step=\"0.01\">  <!-- Até 2 decimais -->
\`\`\`

### Mensagens de validação customizadas

\`\`\`html
<form id=\"myForm\">
  <input type=\"email\" id=\"email\" required>
  <span class=\"error\" id=\"emailError\"></span>
  
  <button type=\"submit\">Enviar</button>
</form>

<script>
const email = document.getElementById('email');
const form = document.getElementById('myForm');

email.addEventListener('invalid', (e) => {
  e.preventDefault();
  
  if (!e.target.value) {
    e.target.setCustomValidity('Email obrigatório!');
  } else if (!e.target.validity.typeMismatch) {
    e.target.setCustomValidity('Email inválido!');
  }
});

email.addEventListener('input', () => {
  email.setCustomValidity(''); // Limpar mensagem ao digitar
});

form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    alert('Preencha todos os campos corretamente');
  }
});
</script>
\`\`\`

## PRODUZIR: Formulário com data attributes + validação

Crie formulário profissional com:

1. **Data attributes úteis**
   - data-field-name em cada input
   - data-validation-type (email, cpf, phone)
   - data-required=\"true\" em obrigatórios
   - data-field-index para tab order

2. **Validação HTML5**
   - type=\"email\"
   - pattern para CPF e telefone
   - required
   - minlength/maxlength

3. **JavaScript validação**
   - Intercepta submit
   - Valida com setCustomValidity()
   - Mostra erros ao lado de cada campo
   - Foco no primeiro erro

4. **Estrutura**
   - Fieldset com legend
   - Label + input separados
   - Div para mensagem erro
   - Botões submit/reset

5. **Bônus**
   - CSS para estados :valid/:invalid
   - Tooltip com data-help attribute
   - Array.from() para percorrer inputs

## AVALIAR

1. Por que data-* melhor que id-preco ou class-preco?
2. Como acessar data attributes em JavaScript?
3. Pattern para validar CPF: [0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2} está certo?
4. Qual evento HTML5 dispara ao enviar form inválido?
5. Como limpar mensagem de validação customizada?
`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Data attributes em cards",
                instructions: "3 cards com data-id, data-price, data-stock. JavaScript lê dataset e exibe no console.",
                expectedIncludes: ["data-", "dataset"],
                language: "html",
              },
              {
                type: "code",
                title: "Validação padrão CPF",
                instructions: "Input CPF com pattern regex [0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2} e required.",
                expectedIncludes: ["pattern", "required"],
                language: "html",
              },
              {
                type: "code",
                title: "CSS por data attribute",
                instructions: "Buttons com data-status (ativo/inativo/pendente). CSS estiliza por [data-status].",
                expectedIncludes: ["[data-", "content: attr"],
                language: "html",
              },
              {
                type: "code",
                title: "Validação customizada JS",
                instructions: "Form com validação: email, senha (8+ chars), confirm. setCustomValidity() e listeners.",
                expectedIncludes: ["addEventListener", "setCustomValidity"],
                language: "html",
              },
              {
                type: "project",
                title: "Cadastro profissional completo",
                instructions: "Form completo: data-* em todos inputs, validação HTML5 + JS, erros ao lado, focus no primeiro erro. Production-ready.",
                expectedIncludes: ["<form>", "data-"],
                language: "html",
              },
              {
                type: "command",
                title: "Pergunta — Boas práticas",
                instructions: "Por que HTML5 validation é preferível a 100% de validação JavaScript?",
                expectedIncludes: [],
              },
            ],
          },
          {
            id: "html-6",
            title: "Acessibilidade WCAG 2.1 e Performance",
            content: `## COMPREENDER: Acessibilidade é direito, não luxo

### Estatísticas realidade

- **15% da população** tem alguma deficiência
- **50% da web** é inacessível para pessoas com deficiência
- **Leis nascendo:** LGPD Brasil, ADA EUA, AODA Canadá
- **Negócios:** Acessibilidade = +30% de usuários potenciais

### WCAG 2.1 níveis

**Level A:** Mínimo
- Alt text em imagens
- Navegação por teclado
- Labels em inputs

**Level AA:** Padrão ouro (alvo)
- Contraste 4.5:1 para texto
- Sem movimento automático > 5 segundos
- Estrutura semântica (headings, lists)

**Level AAA:** Máximo
- Contraste 7:1
- Legendas em vídeos
- Linguagem simples (8º grau)

## APLICAR: WCAG na prática

### 1. Contraste de cores (AA: 4.5:1)

\`\`\`html
✅ Bom (ratio 7:1):
<p style=\"color: #000000; background: #FFFFFF;\">Texto preto no branco</p>

❌ Ruim (ratio 2:1)
<p style=\"color: #999999; background: #EEEEEE;\">Cinza claro no fundo claro</p>

<!-- Verificar: https://webaim.org/resources/contrastchecker/ -->
\`\`\`

### 2. Navegação por teclado

\`\`\`html
<!-- :focus visible sempre deve estar visível -->
<style>
button:focus-visible {
  outline: 3px solid #4299E1;
  outline-offset: 2px;
}

input:focus-visible {
  border: 2px solid #4299E1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}
</style>

<!-- Tab order controlado -->
<input tabindex=\"1\" placeholder=\"Nome\">
<input tabindex=\"2\" placeholder=\"Email\">
<button tabindex=\"3\">Enviar</button>
\`\`\`

### 3. Headings semânticos (estrutura)

\`\`\`html
✅ Correto:
<h1>Site Title</h1>
<h2>Section 1</h2>
<h3>Subsection</h3>
<h2>Section 2</h2>

❌ Errado:
<h1>Site Title</h1>
<h4>Section (pulou h2 e h3!)</h4>
\`\`\`

### 4. ARIA attributes (Advanced)

\`\`\`html
<!-- Se semântica não basta, use ARIA -->

<!-- role quando não há elemento semântico -->
<div role=\"button\" tabindex=\"0\">Clique aqui</div>

<!-- aria-label: rótulo para screen readers -->
<button aria-label=\"Fechar menu\">×</button>

<!-- aria-hidden: esconde de leitores de tela -->
<span aria-hidden=\"true\">→</span> <!-- Apenas visual -->

<!-- aria-live: anuncia mudanças dinâmicas -->
<div aria-live=\"polite\">Itens no carrinho: 5</div>

<!-- aria-expanded: menu aberto/fechado -->
<button aria-expanded=\"false\" aria-controls=\"menu\">Menu</button>
<nav id=\"menu\" style=\"display:none\">...</nav>
\`\`\`

### 5. Legendas e transcrições

\`\`\`html
<!-- Vídeo COM legendas -->
<video controls>
  <source src=\"video.mp4\" type=\"video/mp4\">
  <track kind=\"captions\" src=\"captions-pt.vtt\" srclang=\"pt\" label=\"Português\">
</video>

<!-- Podcast com transcrição -->
<h2>Episódio: AI Future</h2>
<audio controls src=\"episode.mp3\"></audio>
<details>
  <summary>Ler transcrição</summary>
  <p>Neste episódio discutimos...</p>
</details>
\`\`\`

## Performance: Otimizações HTML

### 1. Lazy loading (performance + SEO)

\`\`\`html
<!-- Imagens só carregam quando próximas -->
<img src=\"img.jpg\" loading=\"lazy\" alt=\"...\">

<!-- Iframes (YouTube, maps) -->
<iframe src=\"...\" loading=\"lazy\"></iframe>
\`\`\`

### 2. Preload crítico

\`\`\`html
<!-- Fonte que será usada LOGO -->
<link rel=\"preload\" href=\"font.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>

<!-- CSS crítico acima da dobra -->
<link rel=\"preload\" href=\"critical.css\" as=\"style\">
\`\`\`

### 3. Prefetch para próximas navegações

\`\`\`html
<!-- Próxima página provável -->
<link rel=\"prefetch\" href=\"sobre.html\">

<!-- Recurso que será usado em outra página -->
<link rel=\"prefetch\" href=\"imagem-produtos.jpg\">
\`\`\`

### 4. DNS prefetch

\`\`\`html
<!-- Resolve DNS de terceiros antes de precisar -->
<link rel=\"dns-prefetch\" href=\"https://cdn.example.com\">
\`\`\`

### 5. Exemplo: Head otimizado

\`\`\`html
<head>
  <!-- Critical: acima da dobra -->
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Site Rápido</title>
  
  <!-- Preload crítico -->
  <link rel=\"preload\" href=\"layout.css\" as=\"style\">
  <link rel=\"preload\" href=\"font-main.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>
  
  <!-- CSS -->
  <link rel=\"stylesheet\" href=\"layout.css\">
  
  <!-- Hints para otimização -->
  <link rel=\"dns-prefetch\" href=\"https://cdn.cloudflare.com\">
  <link rel=\"prefetch\" href=\"proxima-pagina.html\">
  
  <!-- SEO -->
  <meta name=\"description\" content=\"...\">
  <meta property=\"og:title\" content=\"...\">
</head>
\`\`\`

## PRODUZIR: Site acessível e rápido

Crie página profissional com:

1. **Acessibilidade AA (WCAG 2.1)**
   - Contraste mínimo 4.5:1
   - Navegação por teclado (Tab, Enter)
   - Headings em ordem (h1, h2, h3)
   - Alt text em TODAS imagens
   - Labels conectados a inputs
   - Focus-visible visível em buttons

2. **Performance otimizada**
   - loading=\"lazy\" em imagens
   - 1 preload de fonte crítica
   - 1 prefetch de próxima página
   - Nenhuma img sem width/height

3. **Estrutura**
   - page: header, nav, main (3+ sections), aside, footer
   - min 2 videos COM legendas
   - min 8 imagens responsivas

4. **Validação**
   - Sem erros HTML5
   - Sem warnings de acessibilidade
   - Lighthouse 90+ em Accessibility

5. **Bônus**
   - Dark mode com prefers-color-scheme
   - ARIA roles onde apropriado
   - Transcrição de podcast

## AVALIAR

1. Qual contraste mínimo WCAG 2.1 Level AA exige?
2. Por que loading=\"lazy\" melhora performance?
3. Diferença entre preload e prefetch?
4. Quando usar role=\"button\" vs <button>?
5. Como testar acessibilidade: ferramentas/testes manuais?
`,
            minutes: 70,
            exercises: [
              {
                type: "code",
                title: "Contraste e acessibilidade visual",
                instructions: "Textos com contraste 4.5:1 comprovado. Teste em WebAIM. Inclua 3 combinações diferentes.",
                expectedIncludes: ["style", "color"],
                language: "html",
              },
              {
                type: "code",
                title: "Navegação por teclado",
                instructions: "Form com inputs, buttons. Todos com :focus-visible visível. Tabindex logicamente ordenado.",
                expectedIncludes: ["focus-visible", "tabindex"],
                language: "html",
              },
              {
                type: "code",
                title: "Vídeo com legendas",
                instructions: "<video> com <track> subtítulos. Controla reprodução. Alt text descritivo.",
                expectedIncludes: ["<video>", "<track>", "captions"],
                language: "html",
              },
              {
                type: "code",
                title: "Performance hints",
                instructions: "<head> com preload (font), prefetch (página), dns-prefetch (CDN). Tudo correto.",
                expectedIncludes: ["preload", "prefetch", "dns-prefetch"],
                language: "html",
              },
              {
                type: "project",
                title: "Site acessível e rápido",
                instructions: "Header, nav, 3 sections com imagens lazy, aside, footer. WCAG AA passando. Lighthouse 90+ accessibility. Tudo validado.",
                expectedIncludes: ["<header>", "loading=\""],
                language: "html",
              },
              {
                type: "command",
                title: "Pergunta — Acessibilidade",
                instructions: "Por que acessibilidade melhora experience para TODOS, não apenas pessoas com deficiências?",
                expectedIncludes: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

function getTotalMinutes(course: Course) {
  return course.modules.flatMap(m => m.lessons).reduce((s, l) => s + l.minutes, 0);
}

function storageKey(courseId: string) {
  return `studyProgress_${courseId}`;
}

export default function StudyPage() {
  const { user } = useAuth();

  const [modalCourseId, setModalCourseId] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // load when modalCourseId changes (open modal)
  useEffect(() => {
    if (!modalCourseId) return;
    try {
      const raw = localStorage.getItem(storageKey(modalCourseId));
      if (raw) {
        const parsed = JSON.parse(raw);
        setCompleted(parsed.completed || {});
        setCurrentLessonId(parsed.currentLessonId || null);
      } else {
        setCompleted({});
        setCurrentLessonId(null);
      }
    } catch {
      setCompleted({});
      setCurrentLessonId(null);
    }
  }, [modalCourseId]);

  // persist completed/currentLessonId
  useEffect(() => {
    if (!modalCourseId) return;
    const payload = { completed, currentLessonId };
    localStorage.setItem(storageKey(modalCourseId), JSON.stringify(payload));
  }, [completed, currentLessonId, modalCourseId]);

  const courses = useMemo(() => COURSES, []);

  const openCourse = (courseId: string) => {
    setModalCourseId(courseId);
    const course = COURSES.find(c => c.id === courseId)!;
    const flat = course.modules.flatMap(m => m.lessons);
    if (!flat.length) return;
    setCurrentLessonId(prev => prev || flat[0].id);
  };

  const computePercent = (course: Course) => {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const raw = localStorage.getItem(storageKey(course.id));
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      const completedMap: Record<string, boolean> = parsed.completed || {};
      const total = course.modules.flatMap(m => m.lessons).length;
      const done = Object.values(completedMap).filter(Boolean).length;
      return Math.round((done / total) * 100) || 0;
    } catch { return 0; }
  };

  const selectedCourse = modalCourseId ? COURSES.find(c => c.id === modalCourseId) || null : null;

  const lessonsFlat = selectedCourse ? selectedCourse.modules.flatMap(m => m.lessons) : [];
  const currentIndex = lessonsFlat.findIndex(l => l.id === currentLessonId);

  const markComplete = (id: string) => setCompleted(s => ({ ...s, [id]: true }));

  const handleNext = () => {
    if (currentIndex < lessonsFlat.length - 1) {
      setCurrentLessonId(lessonsFlat[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentLessonId(lessonsFlat[currentIndex - 1].id);
  };

  const checkpointAndExit = () => {
    // localStorage already persists; just close modal
    setModalCourseId(null);
    setCurrentLessonId(null);
    setFinalScore(null);
    setCompleted({});
  };

  const finalQuestions = [
    { id: "q1", text: "O que é um container?", options: ["Uma VM", "Uma unidade isolada para executar apps", "Um banco de dados"], answer: 1 },
    { id: "q2", text: "PL/SQL é usado em qual SGBD principalmente?", options: ["MySQL", "Oracle", "Postgres"], answer: 1 },
    { id: "q3", text: "Delphi usa qual linguagem principal?", options: ["Pascal/Object Pascal", "C#", "Java"], answer: 0 },
  ];

  const handleFinishQuiz = (score: number) => {
    setFinalScore(score);
    if (score >= 70 && selectedCourse) {
      const newCompleted: Record<string, boolean> = {};
      selectedCourse.modules.flatMap(m => m.lessons).forEach(l => newCompleted[l.id] = true);
      setCompleted(newCompleted);
    }
  };

  return (
    <div className="space-y-6">
      {!modalCourseId && (
        <div>
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Área de Estudos</h1>
              <p className="text-sm text-zinc-400">Escolha o curso que deseja iniciar ou continuar.</p>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <CourseCard
                key={c.id}
                title={c.title}
                description={c.description}
                minutes={getTotalMinutes(c)}
                percent={computePercent(c)}
                onOpen={() => openCourse(c.id)}
                onResume={() => openCourse(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedCourse && modalCourseId && (
        <CourseModal
          course={selectedCourse}
          initialCurrentLessonId={currentLessonId}
          initialCompleted={completed}
          onClose={() => { setModalCourseId(null); setCurrentLessonId(null); setCompleted({}); setFinalScore(null); }}
          onMarkComplete={(id) => markComplete(id)}
          onNavigateNext={handleNext}
          onNavigatePrev={handlePrev}
          quizQuestions={finalQuestions}
          onFinishQuiz={handleFinishQuiz}
          finalScore={finalScore}
          userName={user?.displayName || 'Aluno'}
          userId={user?.uid || null}
        />
      )}
    </div>
  );
}
