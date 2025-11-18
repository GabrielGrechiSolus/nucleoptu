"use client";

import React, { useEffect, useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { Plus, Trash2, Edit3, Upload, Download, Search, X, User, Network, Monitor, Server, Eye, EyeOff, HelpCircle, Copy, Check } from "lucide-react";
import { toast } from "react-toastify";

interface ServiceUser {
  id: string;
  username: string;
  password?: string;
  description?: string;
}

interface VPN {
  id: string;
  name: string;
  host: string;
  port: string;
  description?: string;
  users: ServiceUser[];
}

interface DockerServer {
  id: string;
  name: string;
  host: string;
  port: string;
  environment: "producao" | "homologacao";
  description?: string;
  users: ServiceUser[];
}

interface TerminalService {
  id: string;
  name: string;
  host: string;
  port: string;
  description?: string;
  users: ServiceUser[];
}

interface AnyDesk {
  id: string;
  name: string;
  anydeskId: string;
  password?: string;
  description?: string;
  users: ServiceUser[];
}

interface TeamViewer {
  id: string;
  name: string;
  teamviewerId: string;
  password?: string;
  description?: string;
  users: ServiceUser[];
}

interface ClientConnection {
  id: string;
  clientName: string;
  description?: string;
  vpns: VPN[];
  dockerServers: DockerServer[];
  terminalServices: TerminalService[];
  anydesks: AnyDesk[];
  teamviewers: TeamViewer[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "client_connections";

export default function ClientConnectionsPage() {
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ClientConnection | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [currentConnection, setCurrentConnection] = useState<ClientConnection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<ClientConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar conexões do localStorage
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ClientConnection[];
        // Migração: converter estrutura antiga para nova se necessário
        const migrated = parsed.map((conn: any) => {
          // Se não tem a nova estrutura, migrar
          if (!conn.vpns && !conn.dockerServers && !conn.terminalServices && !conn.anydesks && !conn.teamviewers) {
            return {
              id: conn.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              clientName: conn.clientName || "",
              description: conn.description || "",
              vpns: [],
              dockerServers: [],
              terminalServices: [],
              anydesks: [],
              teamviewers: [],
              createdAt: conn.createdAt || Date.now(),
              updatedAt: conn.updatedAt || Date.now(),
            };
          }
          return {
            ...conn,
            vpns: conn.vpns || [],
            dockerServers: conn.dockerServers || [],
            terminalServices: conn.terminalServices || [],
            anydesks: conn.anydesks || [],
            teamviewers: conn.teamviewers || [],
          };
        });
        setConnections(migrated);
      }
    } catch (error) {
      console.error("Erro ao carregar conexões:", error);
      toast.error("Erro ao carregar conexões do armazenamento local");
    }
  };

  const saveConnections = (newConnections: ClientConnection[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConnections));
      setConnections(newConnections);
    } catch (error) {
      console.error("Erro ao salvar conexões:", error);
      toast.error("Erro ao salvar conexões no armazenamento local");
    }
  };

  // Filtrar conexões
  const filteredConnections = connections.filter((conn) =>
    conn.clientName.toLowerCase().includes(search.toLowerCase())
  );

  // Abrir modal para adicionar/editar
  const openModal = (connection?: ClientConnection) => {
    if (connection) {
      setCurrentConnection({ ...connection });
    } else {
      setCurrentConnection({
        id: "",
        clientName: "",
        description: "",
        vpns: [],
        dockerServers: [],
        terminalServices: [],
        anydesks: [],
        teamviewers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentConnection(null);
  };

  // Funções genéricas para gerenciar serviços
  const addServiceUser = (serviceType: string, serviceId: string) => {
    if (!currentConnection) return;
    const newUser: ServiceUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: "",
      password: "",
      description: "",
    };

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId ? { ...s, users: [...(s.users || []), newUser] } : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  const updateServiceUser = (serviceType: string, serviceId: string, userId: string, field: keyof ServiceUser, value: string) => {
    if (!currentConnection) return;

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              users: s.users.map((u: ServiceUser) =>
                u.id === userId ? { ...u, [field]: value } : u
              ),
            }
          : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  const removeServiceUser = (serviceType: string, serviceId: string, userId: string) => {
    if (!currentConnection) return;

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId
          ? { ...s, users: s.users.filter((u: ServiceUser) => u.id !== userId) }
          : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  // Gerenciar VPNs
  const addVPN = () => {
    if (!currentConnection) return;
    const newVPN: VPN = {
      id: `vpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      host: "",
      port: "",
      description: "",
      users: [],
    };
    setCurrentConnection({ ...currentConnection, vpns: [...currentConnection.vpns, newVPN] });
  };

  const updateVPN = (vpnId: string, field: keyof VPN, value: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      vpns: currentConnection.vpns.map((v) =>
        v.id === vpnId ? { ...v, [field]: value } : v
      ),
    });
  };

  const removeVPN = (vpnId: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      vpns: currentConnection.vpns.filter((v) => v.id !== vpnId),
    });
  };

  // Gerenciar Docker Servers
  const addDockerServer = () => {
    if (!currentConnection) return;
    const newDocker: DockerServer = {
      id: `docker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      host: "",
      port: "",
      environment: "producao",
      description: "",
      users: [],
    };
    setCurrentConnection({ ...currentConnection, dockerServers: [...currentConnection.dockerServers, newDocker] });
  };

  const updateDockerServer = (dockerId: string, field: keyof DockerServer, value: string | "producao" | "homologacao") => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      dockerServers: currentConnection.dockerServers.map((d) =>
        d.id === dockerId ? { ...d, [field]: value } : d
      ),
    });
  };

  const removeDockerServer = (dockerId: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      dockerServers: currentConnection.dockerServers.filter((d) => d.id !== dockerId),
    });
  };

  // Gerenciar Terminal Services
  const addTerminalService = () => {
    if (!currentConnection) return;
    const newTS: TerminalService = {
      id: `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      host: "",
      port: "",
      description: "",
      users: [],
    };
    setCurrentConnection({ ...currentConnection, terminalServices: [...currentConnection.terminalServices, newTS] });
  };

  const updateTerminalService = (tsId: string, field: keyof TerminalService, value: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      terminalServices: currentConnection.terminalServices.map((ts) =>
        ts.id === tsId ? { ...ts, [field]: value } : ts
      ),
    });
  };

  const removeTerminalService = (tsId: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      terminalServices: currentConnection.terminalServices.filter((ts) => ts.id !== tsId),
    });
  };

  // Gerenciar AnyDesk
  const addAnyDesk = () => {
    if (!currentConnection) return;
    const newAnyDesk: AnyDesk = {
      id: `anydesk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      anydeskId: "",
      password: "",
      description: "",
      users: [],
    };
    setCurrentConnection({ ...currentConnection, anydesks: [...currentConnection.anydesks, newAnyDesk] });
  };

  const updateAnyDesk = (anydeskId: string, field: keyof AnyDesk, value: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      anydesks: currentConnection.anydesks.map((a) =>
        a.id === anydeskId ? { ...a, [field]: value } : a
      ),
    });
  };

  const removeAnyDesk = (anydeskId: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      anydesks: currentConnection.anydesks.filter((a) => a.id !== anydeskId),
    });
  };

  // Gerenciar TeamViewer
  const addTeamViewer = () => {
    if (!currentConnection) return;
    const newTeamViewer: TeamViewer = {
      id: `teamviewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      teamviewerId: "",
      password: "",
      description: "",
      users: [],
    };
    setCurrentConnection({ ...currentConnection, teamviewers: [...currentConnection.teamviewers, newTeamViewer] });
  };

  const updateTeamViewer = (teamviewerId: string, field: keyof TeamViewer, value: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      teamviewers: currentConnection.teamviewers.map((t) =>
        t.id === teamviewerId ? { ...t, [field]: value } : t
      ),
    });
  };

  const removeTeamViewer = (teamviewerId: string) => {
    if (!currentConnection) return;
    setCurrentConnection({
      ...currentConnection,
      teamviewers: currentConnection.teamviewers.filter((t) => t.id !== teamviewerId),
    });
  };

  // Salvar conexão (criar ou editar)
  const handleSave = () => {
    if (!currentConnection) return;

    // Validação básica
    if (!currentConnection.clientName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    const now = Date.now();
    let updatedConnections: ClientConnection[];

    if (currentConnection.id) {
      // Editar
      updatedConnections = connections.map((conn) =>
        conn.id === currentConnection.id
          ? { ...currentConnection, updatedAt: now }
          : conn
      );
      toast.success("Conexão atualizada com sucesso!");
    } else {
      // Criar
      const newConnection: ClientConnection = {
        ...currentConnection,
        id: `conn_${now}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      };
      updatedConnections = [...connections, newConnection];
      toast.success("Conexão cadastrada com sucesso!");
    }

    saveConnections(updatedConnections);
    closeModal();
  };

  // Excluir conexão
  const openDeleteModal = (connection: ClientConnection) => {
    setConnectionToDelete(connection);
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!connectionToDelete) return;

    const updatedConnections = connections.filter(
      (conn) => conn.id !== connectionToDelete.id
    );
    saveConnections(updatedConnections);
    setDeleteModalOpen(false);
    setConnectionToDelete(null);
    toast.success("Conexão excluída com sucesso!");
  };

  // Importar JSON
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text) as ClientConnection[];

        if (!Array.isArray(imported)) {
          toast.error("Formato de arquivo inválido. Esperado um array de conexões.");
          return;
        }

        // Validar e migrar estrutura
        const validConnections = imported.map((conn: any) => ({
          id: conn.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clientName: conn.clientName || "",
          description: conn.description || "",
          vpns: conn.vpns || [],
          dockerServers: conn.dockerServers || [],
          terminalServices: conn.terminalServices || [],
          anydesks: conn.anydesks || [],
          teamviewers: conn.teamviewers || [],
          createdAt: conn.createdAt || Date.now(),
          updatedAt: conn.updatedAt || Date.now(),
        })).filter((conn) => conn.clientName);

        if (validConnections.length === 0) {
          toast.error("Nenhuma conexão válida encontrada no arquivo.");
          return;
        }

        // Mesclar com conexões existentes (evitar duplicatas por ID)
        const existingIds = new Set(connections.map((c) => c.id));
        const newConnections = validConnections.filter((c) => !existingIds.has(c.id));
        const mergedConnections = [...connections, ...newConnections];

        saveConnections(mergedConnections);
        toast.success(`${newConnections.length} conexão(ões) importada(s) com sucesso!`);
      } catch (error) {
        console.error("Erro ao importar:", error);
        toast.error("Erro ao importar arquivo. Verifique se é um JSON válido.");
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Exportar para JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(connections, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `client-connections-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Arquivo JSON exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar arquivo JSON");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pt-BR");
  };

  // Função para copiar texto
  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set([...prev, itemId]));
      toast.success("Copiado para a área de transferência!");
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar texto");
    }
  };

  // Abrir modal de detalhes
  const openDetailsModal = (connection: ClientConnection) => {
    setSelectedConnection(connection);
    setDetailsModalOpen(true);
  };

  // Componente para renderizar usuários de um serviço
  const renderServiceUsers = (serviceType: string, serviceId: string, users: ServiceUser[]) => {
    return (
      <div className="ml-4 mt-2 space-y-2">
        {users.map((user, userIndex) => (
          <div key={user.id} className="bg-zinc-700 p-2 rounded border border-zinc-600">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-300">Usuário {userIndex + 1}</span>
              <button
                onClick={() => removeServiceUser(serviceType, serviceId, user.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Usuário *"
                className="p-1.5 rounded bg-zinc-600 border border-zinc-500 text-zinc-50 text-xs focus:border-sky-500 focus:outline-none"
                value={user.username}
                onChange={(e) => updateServiceUser(serviceType, serviceId, user.id, "username", e.target.value)}
              />
              <input
                type="password"
                placeholder="Senha"
                className="p-1.5 rounded bg-zinc-600 border border-zinc-500 text-zinc-50 text-xs focus:border-sky-500 focus:outline-none"
                value={user.password || ""}
                onChange={(e) => updateServiceUser(serviceType, serviceId, user.id, "password", e.target.value)}
              />
              <input
                type="text"
                placeholder="Descrição"
                className="p-1.5 rounded bg-zinc-600 border border-zinc-500 text-zinc-50 text-xs focus:border-sky-500 focus:outline-none"
                value={user.description || ""}
                onChange={(e) => updateServiceUser(serviceType, serviceId, user.id, "description", e.target.value)}
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => addServiceUser(serviceType, serviceId)}
          className="ml-2 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
        >
          <Plus size={14} /> Adicionar Usuário
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sky-400">Conexões de Clientes</h1>
          <button
            onClick={() => setHelpModalOpen(true)}
            className="p-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors"
            title="Ajuda / Manual"
          >
            <HelpCircle size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImport}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white flex items-center gap-2"
          >
            <Upload size={18} /> Importar JSON
          </button>
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white flex items-center gap-2"
            disabled={connections.length === 0}
          >
            <Download size={18} /> Exportar JSON
          </button>
          <button
            onClick={() => openModal()}
            className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white flex items-center gap-2"
          >
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          className="w-full pl-10 pr-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Lista de conexões */}
      <div className="flex flex-col gap-4">
        {filteredConnections.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 text-center text-zinc-400">
            {connections.length === 0
              ? "Nenhum cliente cadastrado. Clique em 'Novo Cliente' para começar."
              : "Nenhum cliente encontrado com os filtros aplicados."}
          </div>
        ) : (
          filteredConnections.map((connection) => (
            <div
              key={connection.id}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-sky-500 transition-colors cursor-pointer"
              onClick={() => openDetailsModal(connection)}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-sky-400">
                      {connection.clientName}
                    </h3>
                  </div>

                  {/* Resumo de serviços */}
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Network className="w-4 h-4" />
                      <span>{connection.vpns.length} VPN(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="w-4 h-4" />
                      <span>{connection.dockerServers.length} Docker Server(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Monitor className="w-4 h-4" />
                      <span>{connection.terminalServices.length} Terminal Service(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{connection.anydesks.length} AnyDesk(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <EyeOff className="w-4 h-4" />
                      <span>{connection.teamviewers.length} TeamViewer(s)</span>
                    </div>
                  </div>

                  {connection.description && (
                    <p className="mt-2 text-sm text-zinc-400">{connection.description}</p>
                  )}
                  <div className="mt-2 text-xs text-zinc-500">
                    Criado em: {formatDate(connection.createdAt)} | Atualizado em:{" "}
                    {formatDate(connection.updatedAt)}
                  </div>
                </div>
                <div className="flex gap-2 items-start" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal(connection)}
                    className="p-2 rounded bg-blue-500 hover:bg-blue-400 text-white"
                    title="Editar"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(connection)}
                    className="p-2 rounded bg-red-500 hover:bg-red-400 text-white"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Modal de adicionar/editar */}
      <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2">
            <Dialog.Title className="text-xl font-bold text-sky-400 mb-4">
              {currentConnection?.id ? "Editar Cliente" : "Novo Cliente"}
            </Dialog.Title>

            <div className="flex flex-col gap-6">
              {/* Informações básicas do cliente */}
              <div className="border-b border-zinc-700 pb-4">
                <h3 className="text-lg font-semibold text-zinc-300 mb-4">Informações do Cliente</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none"
                      value={currentConnection?.clientName || ""}
                      onChange={(e) =>
                        setCurrentConnection((prev) =>
                          prev ? { ...prev, clientName: e.target.value } : null
                        )
                      }
                      placeholder="Ex: Cliente ABC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Descrição
                    </label>
                    <textarea
                      className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none resize-none"
                      rows={2}
                      value={currentConnection?.description || ""}
                      onChange={(e) =>
                        setCurrentConnection((prev) =>
                          prev ? { ...prev, description: e.target.value } : null
                        )
                      }
                      placeholder="Informações adicionais sobre o cliente..."
                    />
                  </div>
                </div>
              </div>

              {/* VPNs */}
              <div className="border-b border-zinc-700 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                    <Network className="w-5 h-5" /> VPNs ({currentConnection?.vpns.length || 0})
                  </h3>
                  <button
                    onClick={addVPN}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar VPN
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {currentConnection?.vpns.map((vpn, index) => (
                    <div key={vpn.id} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">VPN {index + 1}</span>
                        <button
                          onClick={() => removeVPN(vpn.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome da VPN *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={vpn.name}
                          onChange={(e) => updateVPN(vpn.id, "name", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Host *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={vpn.host}
                          onChange={(e) => updateVPN(vpn.id, "host", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Porta *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={vpn.port}
                          onChange={(e) => updateVPN(vpn.id, "port", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none sm:col-span-3"
                          value={vpn.description || ""}
                          onChange={(e) => updateVPN(vpn.id, "description", e.target.value)}
                        />
                      </div>
                      {renderServiceUsers("vpn", vpn.id, vpn.users)}
                    </div>
                  ))}
                  {(!currentConnection?.vpns || currentConnection.vpns.length === 0) && (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      Nenhuma VPN cadastrada. Clique em "Adicionar VPN" para adicionar uma VPN.
                    </p>
                  )}
                </div>
              </div>

              {/* Docker Servers */}
              <div className="border-b border-zinc-700 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                    <Server className="w-5 h-5" /> Servidores Docker ({currentConnection?.dockerServers.length || 0})
                  </h3>
                  <button
                    onClick={addDockerServer}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar Servidor
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {currentConnection?.dockerServers.map((docker, index) => (
                    <div key={docker.id} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">Servidor Docker {index + 1}</span>
                        <button
                          onClick={() => removeDockerServer(docker.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Nome do Servidor *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={docker.name}
                          onChange={(e) => updateDockerServer(docker.id, "name", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Host *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={docker.host}
                          onChange={(e) => updateDockerServer(docker.id, "host", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Porta *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={docker.port}
                          onChange={(e) => updateDockerServer(docker.id, "port", e.target.value)}
                        />
                        <select
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={docker.environment}
                          onChange={(e) => updateDockerServer(docker.id, "environment", e.target.value as "producao" | "homologacao")}
                        >
                          <option value="producao">Produção</option>
                          <option value="homologacao">Homologação</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none sm:col-span-4"
                          value={docker.description || ""}
                          onChange={(e) => updateDockerServer(docker.id, "description", e.target.value)}
                        />
                      </div>
                      {renderServiceUsers("docker", docker.id, docker.users)}
                    </div>
                  ))}
                  {(!currentConnection?.dockerServers || currentConnection.dockerServers.length === 0) && (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      Nenhum servidor Docker cadastrado. Clique em "Adicionar Servidor" para adicionar um servidor.
                    </p>
                  )}
                </div>
              </div>

              {/* Terminal Services */}
              <div className="border-b border-zinc-700 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                    <Monitor className="w-5 h-5" /> Terminal Services ({currentConnection?.terminalServices.length || 0})
                  </h3>
                  <button
                    onClick={addTerminalService}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar Terminal Service
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {currentConnection?.terminalServices.map((ts, index) => (
                    <div key={ts.id} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">Terminal Service {index + 1}</span>
                        <button
                          onClick={() => removeTerminalService(ts.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome do Terminal Service *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={ts.name}
                          onChange={(e) => updateTerminalService(ts.id, "name", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Host *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={ts.host}
                          onChange={(e) => updateTerminalService(ts.id, "host", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Porta *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={ts.port}
                          onChange={(e) => updateTerminalService(ts.id, "port", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none sm:col-span-3"
                          value={ts.description || ""}
                          onChange={(e) => updateTerminalService(ts.id, "description", e.target.value)}
                        />
                      </div>
                      {renderServiceUsers("terminal", ts.id, ts.users)}
                    </div>
                  ))}
                  {(!currentConnection?.terminalServices || currentConnection.terminalServices.length === 0) && (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      Nenhum Terminal Service cadastrado. Clique em "Adicionar Terminal Service" para adicionar um.
                    </p>
                  )}
                </div>
              </div>

              {/* AnyDesk */}
              <div className="border-b border-zinc-700 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                    <Eye className="w-5 h-5" /> AnyDesk ({currentConnection?.anydesks.length || 0})
                  </h3>
                  <button
                    onClick={addAnyDesk}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar AnyDesk
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {currentConnection?.anydesks.map((anydesk, index) => (
                    <div key={anydesk.id} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">AnyDesk {index + 1}</span>
                        <button
                          onClick={() => removeAnyDesk(anydesk.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={anydesk.name}
                          onChange={(e) => updateAnyDesk(anydesk.id, "name", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="ID AnyDesk *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={anydesk.anydeskId}
                          onChange={(e) => updateAnyDesk(anydesk.id, "anydeskId", e.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="Senha"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={anydesk.password || ""}
                          onChange={(e) => updateAnyDesk(anydesk.id, "password", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none sm:col-span-3"
                          value={anydesk.description || ""}
                          onChange={(e) => updateAnyDesk(anydesk.id, "description", e.target.value)}
                        />
                      </div>
                      {renderServiceUsers("anydesk", anydesk.id, anydesk.users)}
                    </div>
                  ))}
                  {(!currentConnection?.anydesks || currentConnection.anydesks.length === 0) && (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      Nenhum AnyDesk cadastrado. Clique em "Adicionar AnyDesk" para adicionar um.
                    </p>
                  )}
                </div>
              </div>

              {/* TeamViewer */}
              <div className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                    <EyeOff className="w-5 h-5" /> TeamViewer ({currentConnection?.teamviewers.length || 0})
                  </h3>
                  <button
                    onClick={addTeamViewer}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white text-sm flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar TeamViewer
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {currentConnection?.teamviewers.map((teamviewer, index) => (
                    <div key={teamviewer.id} className="bg-zinc-800 p-3 rounded border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-300">TeamViewer {index + 1}</span>
                        <button
                          onClick={() => removeTeamViewer(teamviewer.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={teamviewer.name}
                          onChange={(e) => updateTeamViewer(teamviewer.id, "name", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="ID TeamViewer *"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={teamviewer.teamviewerId}
                          onChange={(e) => updateTeamViewer(teamviewer.id, "teamviewerId", e.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="Senha"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none"
                          value={teamviewer.password || ""}
                          onChange={(e) => updateTeamViewer(teamviewer.id, "password", e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="p-2 rounded bg-zinc-700 border border-zinc-600 text-zinc-50 text-sm focus:border-sky-500 focus:outline-none sm:col-span-3"
                          value={teamviewer.description || ""}
                          onChange={(e) => updateTeamViewer(teamviewer.id, "description", e.target.value)}
                        />
                      </div>
                      {renderServiceUsers("teamviewer", teamviewer.id, teamviewer.users)}
                    </div>
                  ))}
                  {(!currentConnection?.teamviewers || currentConnection.teamviewers.length === 0) && (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      Nenhum TeamViewer cadastrado. Clique em "Adicionar TeamViewer" para adicionar um.
                    </p>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-700 flex-shrink-0">
              <button
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-white"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white"
                onClick={handleSave}
              >
                Salvar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold text-sky-400 mb-4">
              Detalhes - {selectedConnection?.clientName}
            </Dialog.Title>

            {selectedConnection && (
              <div className="space-y-6">
                {/* Informações do Cliente */}
                {selectedConnection.description && (
                  <div className="bg-zinc-800 p-3 rounded border border-zinc-700">
                    <p className="text-sm text-zinc-300">{selectedConnection.description}</p>
                  </div>
                )}

                {/* VPNs */}
                {selectedConnection.vpns.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <Network className="w-5 h-5 text-sky-400" />
                      VPNs ({selectedConnection.vpns.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedConnection.vpns.map((vpn, index) => (
                        <div key={vpn.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-zinc-200">{vpn.name || `VPN ${index + 1}`}</h4>
                            {vpn.description && (
                              <span className="text-xs text-zinc-400">{vpn.description}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Host:</span>
                              <span className="text-sm text-zinc-200 flex-1">{vpn.host}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(vpn.host, `vpn_host_${vpn.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar host"
                              >
                                {copiedItems.has(`vpn_host_${vpn.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Porta:</span>
                              <span className="text-sm text-zinc-200 flex-1">{vpn.port}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(vpn.port, `vpn_port_${vpn.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar porta"
                              >
                                {copiedItems.has(`vpn_port_${vpn.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                          {vpn.users.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h5 className="text-sm font-semibold text-zinc-300 mb-2">Usuários:</h5>
                              <div className="space-y-2">
                                {vpn.users.map((user, userIndex) => (
                                  <div key={user.id} className="bg-zinc-700 p-2 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-zinc-400">Usuário:</span>
                                      <span className="text-xs text-zinc-200 flex-1">{user.username}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(user.username, `vpn_user_${vpn.id}_${user.id}`);
                                        }}
                                        className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                        title="Copiar usuário"
                                      >
                                        {copiedItems.has(`vpn_user_${vpn.id}_${user.id}`) ? (
                                          <Check size={12} className="text-green-400" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                    {user.password && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">Senha:</span>
                                        <span className="text-xs text-zinc-200 flex-1">••••••••</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(user.password || "", `vpn_pass_${vpn.id}_${user.id}`);
                                          }}
                                          className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                          title="Copiar senha"
                                        >
                                          {copiedItems.has(`vpn_pass_${vpn.id}_${user.id}`) ? (
                                            <Check size={12} className="text-green-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    {user.description && (
                                      <p className="text-xs text-zinc-400 mt-1">{user.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Docker Servers */}
                {selectedConnection.dockerServers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <Server className="w-5 h-5 text-sky-400" />
                      Servidores Docker ({selectedConnection.dockerServers.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedConnection.dockerServers.map((docker, index) => (
                        <div key={docker.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-zinc-200">{docker.name || `Servidor Docker ${index + 1}`}</h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                docker.environment === "producao" 
                                  ? "bg-red-900/30 text-red-300 border border-red-700" 
                                  : "bg-yellow-900/30 text-yellow-300 border border-yellow-700"
                              }`}>
                                {docker.environment === "producao" ? "Produção" : "Homologação"}
                              </span>
                              {docker.description && (
                                <span className="text-xs text-zinc-400">{docker.description}</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Host:</span>
                              <span className="text-sm text-zinc-200 flex-1">{docker.host}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(docker.host, `docker_host_${docker.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar host"
                              >
                                {copiedItems.has(`docker_host_${docker.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Porta:</span>
                              <span className="text-sm text-zinc-200 flex-1">{docker.port}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(docker.port, `docker_port_${docker.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar porta"
                              >
                                {copiedItems.has(`docker_port_${docker.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                          {docker.users.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h5 className="text-sm font-semibold text-zinc-300 mb-2">Usuários:</h5>
                              <div className="space-y-2">
                                {docker.users.map((user) => (
                                  <div key={user.id} className="bg-zinc-700 p-2 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-zinc-400">Usuário:</span>
                                      <span className="text-xs text-zinc-200 flex-1">{user.username}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(user.username, `docker_user_${docker.id}_${user.id}`);
                                        }}
                                        className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                        title="Copiar usuário"
                                      >
                                        {copiedItems.has(`docker_user_${docker.id}_${user.id}`) ? (
                                          <Check size={12} className="text-green-400" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                    {user.password && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">Senha:</span>
                                        <span className="text-xs text-zinc-200 flex-1">••••••••</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(user.password || "", `docker_pass_${docker.id}_${user.id}`);
                                          }}
                                          className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                          title="Copiar senha"
                                        >
                                          {copiedItems.has(`docker_pass_${docker.id}_${user.id}`) ? (
                                            <Check size={12} className="text-green-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    {user.description && (
                                      <p className="text-xs text-zinc-400 mt-1">{user.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terminal Services */}
                {selectedConnection.terminalServices.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-sky-400" />
                      Terminal Services ({selectedConnection.terminalServices.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedConnection.terminalServices.map((ts, index) => (
                        <div key={ts.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-zinc-200">{ts.name || `Terminal Service ${index + 1}`}</h4>
                            {ts.description && (
                              <span className="text-xs text-zinc-400">{ts.description}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Host:</span>
                              <span className="text-sm text-zinc-200 flex-1">{ts.host}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ts.host, `ts_host_${ts.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar host"
                              >
                                {copiedItems.has(`ts_host_${ts.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-16">Porta:</span>
                              <span className="text-sm text-zinc-200 flex-1">{ts.port}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ts.port, `ts_port_${ts.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar porta"
                              >
                                {copiedItems.has(`ts_port_${ts.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                          {ts.users.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h5 className="text-sm font-semibold text-zinc-300 mb-2">Usuários:</h5>
                              <div className="space-y-2">
                                {ts.users.map((user) => (
                                  <div key={user.id} className="bg-zinc-700 p-2 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-zinc-400">Usuário:</span>
                                      <span className="text-xs text-zinc-200 flex-1">{user.username}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(user.username, `ts_user_${ts.id}_${user.id}`);
                                        }}
                                        className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                        title="Copiar usuário"
                                      >
                                        {copiedItems.has(`ts_user_${ts.id}_${user.id}`) ? (
                                          <Check size={12} className="text-green-400" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                    {user.password && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">Senha:</span>
                                        <span className="text-xs text-zinc-200 flex-1">••••••••</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(user.password || "", `ts_pass_${ts.id}_${user.id}`);
                                          }}
                                          className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                          title="Copiar senha"
                                        >
                                          {copiedItems.has(`ts_pass_${ts.id}_${user.id}`) ? (
                                            <Check size={12} className="text-green-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    {user.description && (
                                      <p className="text-xs text-zinc-400 mt-1">{user.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AnyDesk */}
                {selectedConnection.anydesks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-sky-400" />
                      AnyDesk ({selectedConnection.anydesks.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedConnection.anydesks.map((anydesk, index) => (
                        <div key={anydesk.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-zinc-200">{anydesk.name || `AnyDesk ${index + 1}`}</h4>
                            {anydesk.description && (
                              <span className="text-xs text-zinc-400">{anydesk.description}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-20">ID:</span>
                              <span className="text-sm text-zinc-200 flex-1">{anydesk.anydeskId}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(anydesk.anydeskId, `anydesk_id_${anydesk.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar ID"
                              >
                                {copiedItems.has(`anydesk_id_${anydesk.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            {anydesk.password && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400 w-20">Senha:</span>
                                <span className="text-sm text-zinc-200 flex-1">••••••••</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(anydesk.password || "", `anydesk_pass_${anydesk.id}`);
                                  }}
                                  className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                  title="Copiar senha"
                                >
                                  {copiedItems.has(`anydesk_pass_${anydesk.id}`) ? (
                                    <Check size={14} className="text-green-400" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          {anydesk.users.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h5 className="text-sm font-semibold text-zinc-300 mb-2">Usuários:</h5>
                              <div className="space-y-2">
                                {anydesk.users.map((user) => (
                                  <div key={user.id} className="bg-zinc-700 p-2 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-zinc-400">Usuário:</span>
                                      <span className="text-xs text-zinc-200 flex-1">{user.username}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(user.username, `anydesk_user_${anydesk.id}_${user.id}`);
                                        }}
                                        className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                        title="Copiar usuário"
                                      >
                                        {copiedItems.has(`anydesk_user_${anydesk.id}_${user.id}`) ? (
                                          <Check size={12} className="text-green-400" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                    {user.password && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">Senha:</span>
                                        <span className="text-xs text-zinc-200 flex-1">••••••••</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(user.password || "", `anydesk_user_pass_${anydesk.id}_${user.id}`);
                                          }}
                                          className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                          title="Copiar senha"
                                        >
                                          {copiedItems.has(`anydesk_user_pass_${anydesk.id}_${user.id}`) ? (
                                            <Check size={12} className="text-green-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    {user.description && (
                                      <p className="text-xs text-zinc-400 mt-1">{user.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TeamViewer */}
                {selectedConnection.teamviewers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <EyeOff className="w-5 h-5 text-sky-400" />
                      TeamViewer ({selectedConnection.teamviewers.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedConnection.teamviewers.map((teamviewer, index) => (
                        <div key={teamviewer.id} className="bg-zinc-800 p-4 rounded border border-zinc-700">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-zinc-200">{teamviewer.name || `TeamViewer ${index + 1}`}</h4>
                            {teamviewer.description && (
                              <span className="text-xs text-zinc-400">{teamviewer.description}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-400 w-20">ID:</span>
                              <span className="text-sm text-zinc-200 flex-1">{teamviewer.teamviewerId}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(teamviewer.teamviewerId, `teamviewer_id_${teamviewer.id}`);
                                }}
                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                title="Copiar ID"
                              >
                                {copiedItems.has(`teamviewer_id_${teamviewer.id}`) ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            {teamviewer.password && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400 w-20">Senha:</span>
                                <span className="text-sm text-zinc-200 flex-1">••••••••</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(teamviewer.password || "", `teamviewer_pass_${teamviewer.id}`);
                                  }}
                                  className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                  title="Copiar senha"
                                >
                                  {copiedItems.has(`teamviewer_pass_${teamviewer.id}`) ? (
                                    <Check size={14} className="text-green-400" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          {teamviewer.users.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h5 className="text-sm font-semibold text-zinc-300 mb-2">Usuários:</h5>
                              <div className="space-y-2">
                                {teamviewer.users.map((user) => (
                                  <div key={user.id} className="bg-zinc-700 p-2 rounded">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-zinc-400">Usuário:</span>
                                      <span className="text-xs text-zinc-200 flex-1">{user.username}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(user.username, `teamviewer_user_${teamviewer.id}_${user.id}`);
                                        }}
                                        className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                        title="Copiar usuário"
                                      >
                                        {copiedItems.has(`teamviewer_user_${teamviewer.id}_${user.id}`) ? (
                                          <Check size={12} className="text-green-400" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                    {user.password && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">Senha:</span>
                                        <span className="text-xs text-zinc-200 flex-1">••••••••</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(user.password || "", `teamviewer_user_pass_${teamviewer.id}_${user.id}`);
                                          }}
                                          className="p-1 rounded bg-zinc-600 hover:bg-zinc-500"
                                          title="Copiar senha"
                                        >
                                          {copiedItems.has(`teamviewer_user_pass_${teamviewer.id}_${user.id}`) ? (
                                            <Check size={12} className="text-green-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}
                                    {user.description && (
                                      <p className="text-xs text-zinc-400 mt-1">{user.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedConnection.vpns.length === 0 &&
                  selectedConnection.dockerServers.length === 0 &&
                  selectedConnection.terminalServices.length === 0 &&
                  selectedConnection.anydesks.length === 0 &&
                  selectedConnection.teamviewers.length === 0 && (
                    <div className="text-center text-zinc-400 py-8">
                      Nenhum serviço cadastrado para este cliente.
                    </div>
                  )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-700">
              <button
                className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white"
                onClick={() => setDetailsModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-md">
            <Dialog.Title className="text-xl font-bold text-red-400 mb-4">
              Confirmar Exclusão
            </Dialog.Title>
            <p className="text-zinc-300 mb-6">
              Tem certeza que deseja excluir o cliente <strong>{connectionToDelete?.clientName}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-white"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-white"
                onClick={handleDelete}
              >
                Excluir
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de Ajuda / Manual */}
      <Dialog open={helpModalOpen} onClose={() => setHelpModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
              <HelpCircle className="w-6 h-6" />
              Manual / Ajuda - Conexões de Clientes
            </Dialog.Title>

            <div className="space-y-6 text-zinc-300">
              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">📋 Sobre o Sistema</h3>
                <p className="text-sm leading-relaxed">
                  Esta página permite gerenciar conexões e serviços de clientes. Os dados são armazenados 
                  localmente no navegador (localStorage) e não são salvos em banco de dados. Isso significa 
                  que os dados ficam apenas no navegador onde foram cadastrados.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">➕ Cadastrar Novo Cliente</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Clique no botão <strong>"Novo Cliente"</strong> para cadastrar um novo cliente. 
                  Você precisará informar:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Nome do Cliente (obrigatório)</li>
                  <li>Descrição (opcional)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">🔧 Tipos de Serviços</h3>
                <p className="text-sm leading-relaxed mb-3">
                  Para cada cliente, você pode cadastrar múltiplos serviços de cada tipo:
                </p>
                
                <div className="space-y-3 ml-4">
                  <div>
                    <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                      <Network className="w-4 h-4" /> VPNs
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Cadastre conexões VPN com host, porta e descrição. Cada VPN pode ter múltiplos usuários.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                      <Server className="w-4 h-4" /> Servidores Docker
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Cadastre servidores Docker com nome, host, porta, ambiente (Produção ou Homologação) 
                      e descrição. Cada servidor pode ter múltiplos usuários.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                      <Monitor className="w-4 h-4" /> Terminal Services
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Cadastre Terminal Services com nome, host, porta e descrição. 
                      Cada Terminal Service pode ter múltiplos usuários.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> AnyDesk
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Cadastre conexões AnyDesk com nome, ID do AnyDesk, senha e descrição. 
                      Cada AnyDesk pode ter múltiplos usuários.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" /> TeamViewer
                    </h4>
                    <p className="text-sm text-zinc-400">
                      Cadastre conexões TeamViewer com nome, ID do TeamViewer, senha e descrição. 
                      Cada TeamViewer pode ter múltiplos usuários.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">👥 Usuários por Serviço</h3>
                <p className="text-sm leading-relaxed">
                  Cada serviço (VPN, Docker, Terminal Service, AnyDesk, TeamViewer) pode ter múltiplos 
                  usuários cadastrados. Para adicionar usuários, clique em <strong>"Adicionar Usuário"</strong> 
                  dentro do serviço desejado. Cada usuário precisa de:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4 mt-2">
                  <li>Usuário (obrigatório)</li>
                  <li>Senha (opcional)</li>
                  <li>Descrição (opcional)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">💾 Importar / Exportar</h3>
                <p className="text-sm leading-relaxed mb-2">
                  Você pode exportar todos os dados para um arquivo JSON e importá-los em outro navegador 
                  ou dispositivo:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li><strong>Exportar JSON:</strong> Baixa um arquivo JSON com todos os clientes cadastrados</li>
                  <li><strong>Importar JSON:</strong> Carrega dados de um arquivo JSON previamente exportado</li>
                </ul>
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ Importante: Ao importar, os dados serão mesclados com os existentes (não substituem).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">🔍 Buscar Clientes</h3>
                <p className="text-sm leading-relaxed">
                  Use a barra de busca no topo da página para filtrar clientes pelo nome. 
                  A busca é feita em tempo real enquanto você digita.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-sky-400 mb-2">✏️ Editar / 🗑️ Excluir</h3>
                <p className="text-sm leading-relaxed">
                  Para editar um cliente, clique no ícone de <strong>lápis</strong> ao lado do cliente. 
                  Para excluir, clique no ícone de <strong>lixeira</strong>. A exclusão requer confirmação 
                  e não pode ser desfeita.
                </p>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">⚠️ Aviso Importante</h3>
                <p className="text-sm leading-relaxed text-yellow-200">
                  Os dados são armazenados apenas no navegador (localStorage). Se você limpar os dados 
                  do navegador ou usar outro navegador/dispositivo, os dados não estarão disponíveis. 
                  Sempre faça backup exportando os dados para JSON.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-700">
              <button
                className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white"
                onClick={() => setHelpModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
