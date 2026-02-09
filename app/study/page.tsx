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
