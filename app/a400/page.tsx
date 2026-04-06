'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, FileText, ChevronDown, ChevronUp, Search, Filter, X, Download, Copy, CheckCircle, Info, Bed, Building2, Stethoscope, Pill, Activity, Heart, Brain, Bone, Baby, MapPin, Phone, Mail, Globe, Calendar, User, Users, Award, AlertCircle, ExternalLink, AlertTriangle, CheckSquare, Square, Printer, FileJson } from 'lucide-react';

// ==================== TIPOS COMPLETOS CONFORME MANUAL PTU ====================

interface CampoInfo {
  nome: string;
  valor?: string; // Tornado opcional para definições de campos
  posIni: number;
  posFim: number;
  descricao: string;
  tipo: string;
  obrigatorio?: boolean;
  formato?: string;
}

interface PTUHeader {
  nrSeq: string;
  tpReg: string;
  cdUniDes: string;
  cdUniOri: string;
  dtGeracao: string;
  nrVerTra: string;
  idOpePrest?: string;
  nrRegistroAns?: string;
}

interface LeitosInfo {
  nrLeitosTotais?: string;
  nrLeitosContrat?: string;
  nrLeitosPsiquiat?: string;
  nrUtiAdulto?: string;
  nrUtiNeonatal?: string;
  nrUtiPediatrica?: string;
  nrLeitosIntermed?: string;
  nrLeitosIntermedNeo?: string;
  nrLeitosHospDia?: string;
  nrLeitosTotClin?: string;
  nrLeitosTotCirur?: string;
  nrLeitosTotObstr?: string;
  nrLeitosTotPediat?: string;
  nrLeitosTotPsiqui?: string;
  nrLeitosBerçario?: string;
  nrLeitosIndividual?: string;
  nrLeitosColetivo?: string;
  nrLeitosIsolamento?: string;
  nrLeitosUcc?: string;
  nrLeitosSemi?: string;
  nrLeitosUciNeoConv?: string;
  nrLeitosUciNeoCang?: string;
  nrLeitosUciPediatrico?: string;
  nrLeitosUciAdulto?: string;
  nrLeitosCoronariana?: string;
  nrUtiAdultoTp1?: string;
  nrUtiAdultoTp2?: string;
  nrUtiAdultoTp3?: string;
  nrUtiPediatricaTp1?: string;
  nrUtiPediatricaTp2?: string;
  nrUtiPediatricaTp3?: string;
  nrUtiNeonatalTp1?: string;
  nrUtiNeonatalTp2?: string;
  nrUtiNeonatalTp3?: string;
  nrUtiQueimados?: string;
  nrUtiCoronarianaTp2?: string;
  nrObsPa?: string;
  nrEmergPa?: string;
}

interface Endereco {
  nrSeq: string;
  tpReg: string;
  tpEnd: string;
  dsEnd: string;
  nrEnd: string;
  dsComplemento?: string;
  dsBairro: string;
  cdMunic: string;
  nrCep: string;
  nrDdd: string;
  nrFone1: string;
  nrFone2?: string;
  nrFax?: string;
  cdCnes: string;
  dsEmail?: string;
  dsEmailSec?: string;
  dsEnderecoWeb?: string;
  nrLatitude?: string;
  nrLongitude?: string;
  referenciaEnd: string;
  prestAcred?: string;
  leitos: LeitosInfo;
  campos: CampoInfo[];
  validacoes: ValidacaoInfo[];
}

interface Servico {
  nrSeq: string;
  tpReg: string;
  cdGrServ: string;
  dsServico?: string;
}

interface RedeReferenciada {
  nrSeq: string;
  tpReg: string;
  cdRede: string;
  dsRede?: string;
}

interface ValidacaoInfo {
  campo: string;
  tipo: 'erro' | 'aviso' | 'info';
  mensagem: string;
  valor?: string;
}

interface RNInfo {
  rnNumber: string;
  rnName: string;
  rnDescription: string;
  camposRelevantes: string[];
  cor: string;
  aplicavel: boolean;
}

interface Prestador {
  nrSeq: string;
  tpReg: string;
  tpPrest: string;
  cdPrest: string;
  cdCnpjCpf: string;
  cdInscEst?: string;
  nmPrest: string;
  nmFantasia?: string;
  tpVinculo?: string;
  cdEspec1?: string;
  cdEspec2?: string;
  cdAtua1?: string;
  cdAtua2?: string;
  dtInclUni: string;
  dtExclUni?: string;
  dtAtualizacao?: string;
  dtIniServico?: string; // Adicionado
  dtIniContrato?: string; // Adicionado
  tpContratualizacao?: string;
  tpClassEstabelec?: string;
  idCatDif?: string;
  idAcidTrab?: string;
  idUrgEmer?: string;
  idRceEspec1?: string;
  idRceAtua1?: string;
  idRceEspec2?: string;
  idRceAtua2?: string;
  nrRceEspec1?: string;
  nrRceEspec2?: string;
  nrRceAtua1?: string;
  nrRceAtua2?: string;
  idIntercambio: string;
  idGuiaMedico: string;
  idGuiaMedicoEspec1?: string;
  idGuiaMedicoEspec2?: string;
  idGuiaMedicoAtua1?: string;
  idGuiaMedicoAtua2?: string;
  tpDisponibilidade?: string;
  tipoRedeMin?: string;
  idTabPropria?: string;
  idLoginWsdTiss?: string;
  idCadu?: string;
  idInativo?: string;
  cdPerfilAssist?: string;
  idTpProd?: string;
  participNotivisa?: string;
  participQualissAns?: string;
  indicPosGrad?: string;
  idTitEspec?: string;
  indicResid?: string;
  cdUniPrestadora?: string;
  tpSexo?: string;
  dtNasc?: string;
  cpfCnpjCob?: string;
  cdPrestCob?: string;
  idTelessaude?: string;
  sgConselho?: string;
  nrConselho?: string;
  nrCbo?: string;
  enderecos: Endereco[];
  servicos: Servico[];
  redes: RedeReferenciada[];
  observacoes?: string[];
  emails: string[];
  campos: CampoInfo[];
  rnsAplicaveis: RNInfo[];
  validacoes: ValidacaoInfo[];
}

interface ArquivoPTU {
  header: PTUHeader;
  prestadores: Prestador[];
  trailer: Trailer;
  hash?: string;
  validacoesArquivo: ValidacaoInfo[];
}

interface Trailer {
  nrSeq: string;
  tpReg: string;
  qtTotR402: string;
  qtTotR403: string;
  qtTotR404: string;
  qtTotR405: string;
}

// ==================== DEFINIÇÕES DAS RNs ====================

const rnDefinitions: Record<string, Omit<RNInfo, 'aplicavel'>> = {
  'RN42': {
    rnNumber: 'RN 42',
    rnName: 'Contratualização de Hospitais',
    rnDescription: 'Estabelece critérios para contratualização de hospitais, incluindo leitos, serviços e disponibilidade',
    camposRelevantes: ['TP_PREST', 'NR_LEITOS_TOTAIS', 'NR_LEITOS_CONTRAT', 'NR_UTI_ADULTO', 'NR_UTI_NEONATAL', 'NR_UTI_PEDIATRICA', 'NR_LEITOS_INTERMED', 'NR_LEITOS_HOSP_DIA'],
    cor: 'bg-blue-900/50 border-blue-700'
  },
  'RN54': {
    rnNumber: 'RN 54',
    rnName: 'Contratualização de Demais Estabelecimentos',
    rnDescription: 'Estabelece critérios para contratualização de clínicas, laboratórios e centros de diagnóstico',
    camposRelevantes: ['TP_PREST', 'CD_CNES', 'TP_CLASS_ESTABELEC'],
    cor: 'bg-green-900/50 border-green-700'
  },
  'RN365': {
    rnNumber: 'RN 365',
    rnName: 'Exclusão de Prestadores',
    rnDescription: 'Regras para exclusão de prestadores, substituição e redimensionamento da rede',
    camposRelevantes: ['DT_EXCL_UNI', 'TP_VINCULO', 'ID_INTERCAMBIO'],
    cor: 'bg-red-900/50 border-red-700'
  },
  'RN393': {
    rnNumber: 'RN 393',
    rnName: 'Cadastro de Prestadores',
    rnDescription: 'Informações cadastrais de prestadores, especialidades e áreas de atuação',
    camposRelevantes: ['NM_PREST', 'NM_FANTASIA', 'CD_ESPEC_1', 'CD_ESPEC_2', 'TP_VINCULO', 'CD_ATUA_1', 'CD_ATUA_2'],
    cor: 'bg-purple-900/50 border-purple-700'
  },
  'RN434': {
    rnNumber: 'RN 434',
    rnName: 'Disponibilidade de Serviços',
    rnDescription: 'Classificação de disponibilidade de serviços e tipo de rede',
    camposRelevantes: ['TP_DISPONIBILIDADE', 'TIPO_REDE_MIN', 'ID_TAB_PROPRIA', 'ID_CAT_DIF'],
    cor: 'bg-yellow-900/50 border-yellow-700'
  },
  'RN443': {
    rnNumber: 'RN 443',
    rnName: 'Leitos e Acomodações',
    rnDescription: 'Informações detalhadas sobre leitos hospitalares e acomodações',
    camposRelevantes: [
      'NR_LEITOS_TOTAIS', 'NR_LEITOS_CONTRAT', 'NR_LEITOS_PSIQUIAT', 'NR_UTI_ADULTO', 'NR_UTI_NEONATAL',
      'NR_UTI_PEDIATRICA', 'NR_LEITOS_INTERMED', 'NR_LEITOS_INTERMED_NEO', 'NR_LEITOS_HOSP_DIA',
      'NR_LEITOS_TOT_CLIN', 'NR_LEITOS_TOT_CIRUR', 'NR_LEITOS_TOT_OBSTR', 'NR_LEITOS_TOT_PEDIAT',
      'NR_LEITOS_TOT_PSIQUI', 'NR_LEITOS_BERCARIO', 'NR_LEITOS_INDIVIDUAL', 'NR_LEITOS_COLETIVO'
    ],
    cor: 'bg-indigo-900/50 border-indigo-700'
  }
};

// ==================== MAPEAMENTOS ====================

const tipoPrestadorMap: Record<string, { descricao: string; posIni: number; posFim: number; icon: React.ReactNode; tipo: string }> = {
  '01': { descricao: 'Médico', posIni: 12, posFim: 13, icon: <Stethoscope className="w-4 h-4" />, tipo: 'Pessoa Física' },
  '02': { descricao: 'Hospital', posIni: 12, posFim: 13, icon: <Building2 className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '03': { descricao: 'Laboratório', posIni: 12, posFim: 13, icon: <Pill className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '04': { descricao: 'Clínica', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '05': { descricao: 'Pessoa Física - Não médico', posIni: 12, posFim: 13, icon: <User className="w-4 h-4" />, tipo: 'Pessoa Física' },
  '06': { descricao: 'Centro de Diagnósticos', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '08': { descricao: 'Home Care', posIni: 12, posFim: 13, icon: <Heart className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '10': { descricao: 'Hospital Dia', posIni: 12, posFim: 13, icon: <Building2 className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '11': { descricao: 'Pronto Atendimento', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '12': { descricao: 'Pronto Socorro', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '13': { descricao: 'Clínica de Especialidade', posIni: 12, posFim: 13, icon: <Brain className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '14': { descricao: 'Centro de Oncologia', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '15': { descricao: 'Centro Multiprofissional', posIni: 12, posFim: 13, icon: <Users className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '16': { descricao: 'Centro de Hemodiálise', posIni: 12, posFim: 13, icon: <Activity className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
  '17': { descricao: 'Centro de Hemodinâmica', posIni: 12, posFim: 13, icon: <Heart className="w-4 h-4" />, tipo: 'Pessoa Jurídica' },
};

const tipoVinculoMap: Record<string, { descricao: string; posIni: number; posFim: number }> = {
  '1': { descricao: 'Cooperado', posIni: 147, posFim: 147 },
  '2': { descricao: 'Recurso Próprio', posIni: 147, posFim: 147 },
  '3': { descricao: 'Credenciado / Contratualizado', posIni: 147, posFim: 147 },
};

const tipoEnderecoMap: Record<string, { descricao: string; posIni: number; posFim: number }> = {
  '1': { descricao: 'Atendimento', posIni: 12, posFim: 12 },
  '2': { descricao: 'Comercial', posIni: 12, posFim: 12 },
  '3': { descricao: 'Atendimento e Comercial', posIni: 12, posFim: 12 },
  '4': { descricao: 'Correspondência', posIni: 12, posFim: 12 },
};

const disponibilidadeMap: Record<string, string> = {
  '1': 'Parcial',
  '2': 'Total',
};

const tipoRedeMinMap: Record<string, string> = {
  '1': 'Básica',
  '2': 'Especial (Tabela Própria)',
  '3': 'Master (Alto Custo)',
};

const redeNacionalMap: Record<string, string> = {
  'NA04': 'Rede Básica',
  'NA05': 'Rede Básica',
  'NA06': 'Rede Especial',
  'NA07': 'Rede Especial',
  'NA08': 'Rede Master',
  'NA09': 'Rede Básica',
  'NA10': 'Rede Especial',
  'NA11': 'Rede Master',
  'NA12': 'Rede Básica - Segmentação Hospitalar',
  'NA13': 'Rede Básica - Segmentação Hospitalar',
  'NA14': 'Rede Especial - Segmentação Hospitalar',
  'NA15': 'Rede Especial - Segmentação Hospitalar',
  'NA16': 'Rede Master - Segmentação Hospitalar',
};

// ==================== DEFINIÇÃO COMPLETA DOS CAMPOS ====================

// HEADER
const headerCampos: CampoInfo[] = [
  { nome: 'NR_SEQ', posIni: 1, posFim: 8, descricao: 'Número sequencial do registro', tipo: 'N', obrigatorio: true },
  { nome: 'TP_REG', posIni: 9, posFim: 11, descricao: 'Tipo de registro (401)', tipo: 'AN', obrigatorio: true },
  { nome: 'CD_UNI_DES', posIni: 12, posFim: 15, descricao: 'Código da Unimed destino', tipo: 'N', obrigatorio: true },
  { nome: 'CD_UNI_ORI', posIni: 16, posFim: 19, descricao: 'Código da Unimed origem', tipo: 'N', obrigatorio: true },
  { nome: 'DT_GERACAO', posIni: 20, posFim: 27, descricao: 'Data de geração do arquivo', tipo: 'Data2', obrigatorio: true },
  { nome: 'NR_VER_TRA', posIni: 28, posFim: 29, descricao: 'Número da versão da transação', tipo: 'N', obrigatorio: true },
  { nome: 'ID_OPE_PREST', posIni: 30, posFim: 30, descricao: 'Identifica se a Unimed é Operadora ou Prestadora', tipo: 'N', obrigatorio: true },
  { nome: 'NR_REGISTRO_ANS', posIni: 31, posFim: 36, descricao: 'Número de registro na ANS', tipo: 'N', obrigatorio: false },
];

// PRESTADOR - TODOS OS CAMPOS
const prestadorCampos: CampoInfo[] = [
  { nome: 'NR_SEQ', posIni: 1, posFim: 8, descricao: 'Número sequencial do registro', tipo: 'N', obrigatorio: true },
  { nome: 'TP_REG', posIni: 9, posFim: 11, descricao: 'Tipo de registro (402)', tipo: 'AN', obrigatorio: true },
  { nome: 'TP_PREST', posIni: 12, posFim: 13, descricao: 'Tipo de Prestador', tipo: 'N', obrigatorio: true },
  { nome: 'CD_PREST', posIni: 14, posFim: 21, descricao: 'Código do Prestador', tipo: 'N', obrigatorio: true },
  { nome: 'CD_CNPJ_CPF', posIni: 22, posFim: 36, descricao: 'CNPJ ou CPF do Prestador', tipo: 'N', obrigatorio: true },
  { nome: 'CD_INSC_EST', posIni: 37, posFim: 56, descricao: 'Código da inscrição estadual', tipo: 'N', obrigatorio: false },
  { nome: 'CD_UF_CONSELHO', posIni: 65, posFim: 66, descricao: 'UF do Conselho Profissional', tipo: 'UF', obrigatorio: false },
  { nome: 'TP_VINCULO', posIni: 147, posFim: 147, descricao: 'Tipo de vínculo do prestador', tipo: 'N', obrigatorio: true },
  { nome: 'CD_ESPEC_1', posIni: 148, posFim: 149, descricao: 'Código da especialidade principal', tipo: 'N', obrigatorio: false },
  { nome: 'CD_ATUA_1', posIni: 150, posFim: 151, descricao: 'Código da área de atuação', tipo: 'N', obrigatorio: false },
  { nome: 'CD_ESPEC_2', posIni: 152, posFim: 153, descricao: 'Código da outra especialidade', tipo: 'N', obrigatorio: false },
  { nome: 'CD_ATUA_2', posIni: 154, posFim: 155, descricao: 'Código da outra área de atuação', tipo: 'N', obrigatorio: false },
  { nome: 'DT_INCL_UNI', posIni: 168, posFim: 175, descricao: 'Data de inclusão do prestador', tipo: 'Data2', obrigatorio: true },
  { nome: 'DT_EXCL_UNI', posIni: 176, posFim: 183, descricao: 'Data de exclusão do prestador', tipo: 'Data2', obrigatorio: false },
  { nome: 'TP_CONTRATUALIZACAO', posIni: 184, posFim: 184, descricao: 'Tipo de Contratualização', tipo: 'AN', obrigatorio: false },
  { nome: 'TP_CLASS_ESTABELEC', posIni: 185, posFim: 185, descricao: 'Tipo de Classificação do Estabelecimento', tipo: 'AN', obrigatorio: true },
  { nome: 'ID_CAT_DIF', posIni: 186, posFim: 186, descricao: 'Identifica se prestador é de categoria diferenciada (Alto Custo)', tipo: 'A', obrigatorio: false },
  { nome: 'ID_ACID_TRAB', posIni: 187, posFim: 187, descricao: 'Identifica se prestador pertence a rede de acidente de trabalho', tipo: 'A', obrigatorio: false },
  { nome: 'ID_URG_EMER', posIni: 189, posFim: 189, descricao: 'Identifica se o prestador é contratado para atendimento de Urgência/Emergência', tipo: 'A', obrigatorio: true },
  { nome: 'ID_RCE_ESPEC_1', posIni: 190, posFim: 190, descricao: 'Registro de Certificação de Especialista na especialidade 1', tipo: 'A', obrigatorio: false },
  { nome: 'ID_RCE_ATUA_1', posIni: 191, posFim: 191, descricao: 'Registro de Certificação de Especialista na área de atuação 1', tipo: 'A', obrigatorio: false },
  { nome: 'ID_RCE_ESPEC_2', posIni: 192, posFim: 192, descricao: 'Registro de Certificação de Especialista na especialidade 2', tipo: 'A', obrigatorio: false },
  { nome: 'ID_RCE_ATUA_2', posIni: 193, posFim: 193, descricao: 'Registro de Certificação de Especialista na área de atuação 2', tipo: 'A', obrigatorio: false },
  { nome: 'DT_INI_SERVICO', posIni: 197, posFim: 204, descricao: 'Data de início do serviço', tipo: 'Data2', obrigatorio: true },
  { nome: 'DT_INI_CONTRATO', posIni: 205, posFim: 212, descricao: 'Data de início da contratualização', tipo: 'Data2', obrigatorio: false },
  { nome: 'NR_REGISTRO_ANS', posIni: 213, posFim: 218, descricao: 'Número de registro na ANS da Unimed Intermediária', tipo: 'N', obrigatorio: true },
  { nome: 'TP_DISPONIBILIDADE', posIni: 267, posFim: 267, descricao: 'Disponibilidade do serviço', tipo: 'N', obrigatorio: true },
  { nome: 'ID_TAB_PROPRIA', posIni: 268, posFim: 268, descricao: 'Identifica se prestador pratica tabela própria', tipo: 'A', obrigatorio: false },
  { nome: 'CD_PERFIL_ASSIST', posIni: 269, posFim: 270, descricao: 'Perfil assistencial do hospital', tipo: 'N', obrigatorio: false },
  { nome: 'ID_TP_PROD', posIni: 271, posFim: 271, descricao: 'Indica o tipo de produto que o prestador atende', tipo: 'N', obrigatorio: false },
  { nome: 'ID_GUIA_MEDICO', posIni: 272, posFim: 272, descricao: 'Indicador de publicação no Guia Médico', tipo: 'A', obrigatorio: true },
  { nome: 'ID_GUIA_MEDICO_ESPEC_1', posIni: 303, posFim: 303, descricao: 'Publicação no Guia Médico para especialidade 1', tipo: 'A', obrigatorio: false },
  { nome: 'ID_GUIA_MEDICO_ESPEC_2', posIni: 304, posFim: 304, descricao: 'Publicação no Guia Médico para especialidade 2', tipo: 'A', obrigatorio: false },
  { nome: 'ID_GUIA_MEDICO_ATUA_1', posIni: 305, posFim: 305, descricao: 'Publicação no Guia Médico para área de atuação 1', tipo: 'A', obrigatorio: false },
  { nome: 'ID_GUIA_MEDICO_ATUA_2', posIni: 306, posFim: 306, descricao: 'Publicação no Guia Médico para área de atuação 2', tipo: 'A', obrigatorio: false },
  { nome: 'PARTICIP_NOTIVISA', posIni: 308, posFim: 308, descricao: 'Participação no NOTIVISA', tipo: 'A', obrigatorio: false },
  { nome: 'PARTICIP_QUALISS_ANS', posIni: 309, posFim: 309, descricao: 'Participação no programa QUALISS ANS', tipo: 'A', obrigatorio: false },
  { nome: 'NR_RCE_ESPEC_1', posIni: 310, posFim: 319, descricao: 'Número do Registro de Especialista 1', tipo: 'N', obrigatorio: false },
  { nome: 'NR_RCE_ESPEC_2', posIni: 320, posFim: 329, descricao: 'Número do Registro de Especialista 2', tipo: 'N', obrigatorio: false },
  { nome: 'NR_RCE_ATUA_1', posIni: 350, posFim: 359, descricao: 'Número do Registro de Área de Atuação 1', tipo: 'N', obrigatorio: false },
  { nome: 'NR_RCE_ATUA_2', posIni: 360, posFim: 369, descricao: 'Número do Registro de Área de Atuação 2', tipo: 'N', obrigatorio: false },
  { nome: 'INDIC_POS_GRAD', posIni: 390, posFim: 390, descricao: 'Indicador de pós-graduação', tipo: 'A', obrigatorio: false },
  { nome: 'NM_PREST', posIni: 393, posFim: 452, descricao: 'Nome do Prestador', tipo: 'ANS+', obrigatorio: true },
  { nome: 'ID_INTERCAMBIO', posIni: 463, posFim: 463, descricao: 'Identifica se o prestador atende intercâmbio', tipo: 'A', obrigatorio: true },
  { nome: 'NR_CBO', posIni: 464, posFim: 469, descricao: 'Classificação Brasileira de Ocupações', tipo: 'N', obrigatorio: false },
  { nome: 'CD_UNI_PRESTADORA', posIni: 471, posFim: 474, descricao: 'Código da Unimed Prestadora', tipo: 'N', obrigatorio: false },
  { nome: 'ID_LOGIN_WSD_TISS', posIni: 475, posFim: 475, descricao: 'Identifica se o prestador deve ser enviado para manutenção de login do WSD-TISS', tipo: 'A', obrigatorio: true },
  { nome: 'ID_CADU', posIni: 476, posFim: 476, descricao: 'Identifica se o prestador deve ser enviado para o CADU', tipo: 'A', obrigatorio: true },
  { nome: 'ID_INATIVO', posIni: 477, posFim: 477, descricao: 'Identifica se o prestador está inativo', tipo: 'A', obrigatorio: true },
  { nome: 'SG_CONSELHO', posIni: 478, posFim: 489, descricao: 'Sigla do Conselho Profissional', tipo: 'AN', obrigatorio: false },
  { nome: 'IND_GINEC_OBST', posIni: 490, posFim: 490, descricao: 'Indica a especialidade que o profissional atende', tipo: 'N', obrigatorio: false },
  { nome: 'TP_SEXO', posIni: 491, posFim: 491, descricao: 'Sexo do Prestador', tipo: 'A', obrigatorio: false },
  { nome: 'DT_ATUALIZACAO', posIni: 492, posFim: 499, descricao: 'Data de atualização dos dados cadastrais', tipo: 'Data2', obrigatorio: true },
  { nome: 'INDIC_RESID_ESPEC_1', posIni: 506, posFim: 506, descricao: 'Residência em saúde reconhecida pelo MEC na especialidade 1', tipo: 'A', obrigatorio: false },
  { nome: 'INDIC_RESID_ESPEC_2', posIni: 507, posFim: 507, descricao: 'Residência em saúde reconhecida pelo MEC na especialidade 2', tipo: 'A', obrigatorio: false },
  { nome: 'INDIC_RESID_ATUA_1', posIni: 508, posFim: 508, descricao: 'Residência em saúde reconhecida pelo MEC na área de atuação 1', tipo: 'A', obrigatorio: false },
  { nome: 'INDIC_RESID_ATUA_2', posIni: 509, posFim: 509, descricao: 'Residência em saúde reconhecida pelo MEC na área de atuação 2', tipo: 'A', obrigatorio: false },
  { nome: 'NM_FANTASIA', posIni: 510, posFim: 569, descricao: 'Nome fantasia do prestador', tipo: 'ANS+', obrigatorio: false },
  { nome: 'INDIC_DR_POS_DR', posIni: 570, posFim: 570, descricao: 'Indicador de Doutorado ou Pós-doutorado', tipo: 'A', obrigatorio: false },
  { nome: 'NR_CONSELHO', posIni: 571, posFim: 585, descricao: 'Número do prestador no Conselho Profissional', tipo: 'AN', obrigatorio: false },
  { nome: 'ID_ISO9001', posIni: 586, posFim: 586, descricao: 'Indicador da ISO9001', tipo: 'A', obrigatorio: false },
  { nome: 'INDIC_MESTRADO', posIni: 657, posFim: 657, descricao: 'Indicador de Mestrado em Saúde', tipo: 'A', obrigatorio: false },
  { nome: 'ID_TIT_ESPEC', posIni: 658, posFim: 658, descricao: 'Identificador de Título de Especialista', tipo: 'A', obrigatorio: false },
  { nome: 'INDIC_RESID', posIni: 659, posFim: 659, descricao: 'Indicador de residência em saúde', tipo: 'A', obrigatorio: false },
  { nome: 'DT_NASC', posIni: 660, posFim: 667, descricao: 'Data de nascimento', tipo: 'Data2', obrigatorio: false },
  { nome: 'CPF_CNPJ_COB', posIni: 668, posFim: 682, descricao: 'CPF ou CNPJ para fins de cobrança', tipo: 'N', obrigatorio: true },
  { nome: 'ID_TELESSAUDE', posIni: 683, posFim: 683, descricao: 'Indica se o prestador atende por telessaúde', tipo: 'A', obrigatorio: true },
  { nome: 'CD_PREST_COB', posIni: 684, posFim: 691, descricao: 'Código do Prestador para fins de cobrança', tipo: 'N', obrigatorio: false },
  { nome: 'TIPO_REDE_MIN', posIni: 302, posFim: 302, descricao: 'Tipo de Rede conforme Manual do Intercâmbio Nacional', tipo: 'N', obrigatorio: true },
];

// ENDEREÇO - TODOS OS CAMPOS
const enderecoCampos: CampoInfo[] = [
  { nome: 'NR_SEQ', posIni: 1, posFim: 8, descricao: 'Número sequencial do registro', tipo: 'N', obrigatorio: true },
  { nome: 'TP_REG', posIni: 9, posFim: 11, descricao: 'Tipo de registro (403)', tipo: 'AN', obrigatorio: true },
  { nome: 'TP_END', posIni: 12, posFim: 12, descricao: 'Tipo de endereço', tipo: 'N', obrigatorio: true },
  { nome: 'DS_END', posIni: 13, posFim: 52, descricao: 'Nome da via pública', tipo: 'ANS+', obrigatorio: true },
  { nome: 'NR_END', posIni: 53, posFim: 58, descricao: 'Número na via pública', tipo: 'ANS', obrigatorio: true },
  { nome: 'DS_COMPL', posIni: 314, posFim: 343, descricao: 'Complemento do número', tipo: 'ANS+', obrigatorio: false },
  { nome: 'DS_BAIRRO', posIni: 74, posFim: 103, descricao: 'Descrição do bairro', tipo: 'ANS+', obrigatorio: true },
  { nome: 'CD_MUNIC', posIni: 104, posFim: 110, descricao: 'Código do Município (IBGE)', tipo: 'N', obrigatorio: true },
  { nome: 'NR_CEP', posIni: 111, posFim: 118, descricao: 'Número do CEP', tipo: 'N', obrigatorio: true },
  { nome: 'NR_DDD', posIni: 119, posFim: 122, descricao: 'Número do DDD', tipo: 'N', obrigatorio: true },
  { nome: 'NR_FONE_1', posIni: 123, posFim: 134, descricao: 'Número do telefone', tipo: 'N', obrigatorio: true },
  { nome: 'NR_FONE_2', posIni: 135, posFim: 146, descricao: 'Número do telefone secundário', tipo: 'N', obrigatorio: false },
  { nome: 'NR_FAX', posIni: 147, posFim: 158, descricao: 'Número do Fax', tipo: 'N', obrigatorio: false },
  { nome: 'CD_CNES', posIni: 249, posFim: 255, descricao: 'Código Nacional de Estabelecimento de Saúde', tipo: 'AN', obrigatorio: true },
  { nome: 'NR_LEITOS_TOTAIS', posIni: 256, posFim: 261, descricao: 'Número de leitos totais', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_CONTRAT', posIni: 262, posFim: 267, descricao: 'Número de leitos em contrato', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_PSIQUIAT', posIni: 268, posFim: 273, descricao: 'Número de leitos de psiquiatria', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_ADULTO', posIni: 274, posFim: 279, descricao: 'Número de leitos UTI Adulto', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_NEONATAL', posIni: 280, posFim: 285, descricao: 'Número de leitos UTI Neonatal', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_PEDIATRICA', posIni: 286, posFim: 291, descricao: 'Número de leitos UTI Pediátrica', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_INTERMED_NEO', posIni: 307, posFim: 312, descricao: 'Leitos de unidade intermediária neonatal', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_HOSP_DIA', posIni: 344, posFim: 349, descricao: 'Número de leitos de Hospital Dia', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_TOT_CLIN', posIni: 350, posFim: 355, descricao: 'Leitos totais clínicos', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_TOT_CIRUR', posIni: 356, posFim: 361, descricao: 'Leitos totais cirúrgicos', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_TOT_OBSTR', posIni: 362, posFim: 367, descricao: 'Leitos totais obstétricos', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_TOT_PEDIAT', posIni: 368, posFim: 373, descricao: 'Leitos totais pediátricos', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_TOT_PSIQUI', posIni: 374, posFim: 379, descricao: 'Leitos totais psiquiátricos', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_BERCARIO', posIni: 380, posFim: 385, descricao: 'Leitos de berçário alto risco', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_INDIVIDUAL', posIni: 386, posFim: 391, descricao: 'Leitos de internação individual', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_COLETIVO', posIni: 392, posFim: 397, descricao: 'Leitos de internação coletiva', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_ISOLAMENTO', posIni: 398, posFim: 403, descricao: 'Leitos de isolamento', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_UCC', posIni: 404, posFim: 409, descricao: 'Leitos UCC', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_SEMI', posIni: 410, posFim: 415, descricao: 'Leitos de terapia semi-intensiva', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_UCI_NEO_CONV', posIni: 416, posFim: 421, descricao: 'Leitos UCI neonatal convencional', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_UCI_NEO_CANG', posIni: 422, posFim: 427, descricao: 'Leitos UCI neonatal canguru', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_UCI_PEDIATRICO', posIni: 428, posFim: 433, descricao: 'Leitos UCI pediátrica', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_UCI_ADULTO', posIni: 434, posFim: 439, descricao: 'Leitos UCI adulto', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_CORONARIANA', posIni: 440, posFim: 445, descricao: 'Leitos de unidade coronariana', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_ADULTO_TP_1', posIni: 446, posFim: 451, descricao: 'UTI adulto tipo I', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_ADULTO_TP_2', posIni: 452, posFim: 457, descricao: 'UTI adulto tipo II', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_ADULTO_TP_3', posIni: 458, posFim: 463, descricao: 'UTI adulto tipo III', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_PEDIATRICA_TP_1', posIni: 464, posFim: 469, descricao: 'UTI pediátrica tipo I', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_PEDIATRICA_TP_2', posIni: 470, posFim: 475, descricao: 'UTI pediátrica tipo II', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_PEDIATRICA_TP_3', posIni: 476, posFim: 481, descricao: 'UTI pediátrica tipo III', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_NEONATAL_TP_1', posIni: 482, posFim: 487, descricao: 'UTI neonatal tipo I', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_NEONATAL_TP_2', posIni: 488, posFim: 493, descricao: 'UTI neonatal tipo II', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_NEONATAL_TP_3', posIni: 494, posFim: 499, descricao: 'UTI neonatal tipo III', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_QUEIMADOS', posIni: 500, posFim: 505, descricao: 'UTI de queimados', tipo: 'N', obrigatorio: false },
  { nome: 'NR_UTI_CORONARIANA_TP_2', posIni: 506, posFim: 511, descricao: 'UTI coronariana tipo II', tipo: 'N', obrigatorio: false },
  { nome: 'NR_OBS_PA', posIni: 512, posFim: 517, descricao: 'Leitos de observação PA', tipo: 'N', obrigatorio: false },
  { nome: 'NR_EMERG_PA', posIni: 518, posFim: 523, descricao: 'Leitos de sala de emergência PA', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LEITOS_INTERMED', posIni: 420, posFim: 425, descricao: 'Leitos de unidade intermediária', tipo: 'N', obrigatorio: false },
  { nome: 'PREST_ACRED', posIni: 426, posFim: 426, descricao: 'Prestador Acreditado', tipo: 'A', obrigatorio: false },
  { nome: 'REFERENCIA_END', posIni: 427, posFim: 428, descricao: 'Referência do endereço', tipo: 'N', obrigatorio: true },
  { nome: 'DS_EMAIL', posIni: 429, posFim: 508, descricao: 'E-mail principal', tipo: 'ANS', obrigatorio: false },
  { nome: 'DS_EMAIL_SEC', posIni: 509, posFim: 588, descricao: 'E-mail secundário', tipo: 'ANS', obrigatorio: false },
  { nome: 'DS_ENDERECO_WEB', posIni: 589, posFim: 668, descricao: 'Endereço de página na Internet', tipo: 'ANS', obrigatorio: false },
  { nome: 'NR_DDD_WHATS', posIni: 669, posFim: 672, descricao: 'DDD do WhatsApp', tipo: 'N', obrigatorio: false },
  { nome: 'NR_FONE_WHATS', posIni: 673, posFim: 684, descricao: 'Telefone WhatsApp', tipo: 'N', obrigatorio: false },
  { nome: 'NR_LATITUDE', posIni: 380, posFim: 399, descricao: 'Latitude', tipo: 'ANS', obrigatorio: false },
  { nome: 'NR_LONGITUDE', posIni: 400, posFim: 419, descricao: 'Longitude', tipo: 'ANS', obrigatorio: false },
];

// ==================== FUNÇÕES DE VALIDAÇÃO ====================

const validarData = (valor: string): boolean => {
  if (!valor || valor.length !== 8) return false;
  const ano = parseInt(valor.substring(0, 4));
  const mes = parseInt(valor.substring(4, 6));
  const dia = parseInt(valor.substring(6, 8));
  if (ano < 1900 || ano > 2999) return false;
  if (mes < 1 || mes > 12) return false;
  const diasNoMes = new Date(ano, mes, 0).getDate();
  return dia >= 1 && dia <= diasNoMes;
};

const validarCnpjCpf = (valor: string): boolean => {
  if (!valor) return false;
  if (valor.length === 11) {
    // CPF validation
    const cpf = valor.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(cpf.charAt(10));
  } else if (valor.length === 14) {
    // CNPJ validation
    const cnpj = valor.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    let size = 12;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size = 13;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(digits.charAt(1));
  }
  return false;
};

const validarCep = (valor: string): boolean => {
  if (!valor) return false;
  const cep = valor.replace(/[^\d]/g, '');
  return cep.length === 8;
};

const validarTelefone = (ddd: string, numero: string): boolean => {
  if (!ddd || !numero) return false;
  const numLimpo = numero.replace(/[^\d]/g, '');
  return numLimpo.length >= 8 && numLimpo.length <= 9;
};

// ==================== FUNÇÕES DE EXTRAÇÃO ====================

const extrairCampo = (linha: string, posIni: number, posFim: number): string => {
  if (posIni < 1 || posFim > linha.length) return '';
  return linha.substring(posIni - 1, posFim).trim();
};

const extrairHeaderCampos = (linha: string): CampoInfo[] => {
  return headerCampos.map(campo => ({
    ...campo,
    valor: extrairCampo(linha, campo.posIni, campo.posFim),
  }));
};

const extrairPrestadorCampos = (linha: string): CampoInfo[] => {
  return prestadorCampos.map(campo => ({
    ...campo,
    valor: extrairCampo(linha, campo.posIni, campo.posFim),
  }));
};

const extrairEnderecoCampos = (linha: string): CampoInfo[] => {
  return enderecoCampos.map(campo => ({
    ...campo,
    valor: extrairCampo(linha, campo.posIni, campo.posFim),
  }));
};

const extrairLeitosInfo = (campos: CampoInfo[]): LeitosInfo => {
  const getValor = (nome: string): string | undefined => {
    const campo = campos.find(c => c.nome === nome);
    const valor = campo?.valor || '';
    if (!valor || valor === '0' || valor === '000000' || valor === '0000000') return undefined;
    return valor;
  };

  return {
    nrLeitosTotais: getValor('NR_LEITOS_TOTAIS'),
    nrLeitosContrat: getValor('NR_LEITOS_CONTRAT'),
    nrLeitosPsiquiat: getValor('NR_LEITOS_PSIQUIAT'),
    nrUtiAdulto: getValor('NR_UTI_ADULTO'),
    nrUtiNeonatal: getValor('NR_UTI_NEONATAL'),
    nrUtiPediatrica: getValor('NR_UTI_PEDIATRICA'),
    nrLeitosIntermed: getValor('NR_LEITOS_INTERMED'),
    nrLeitosIntermedNeo: getValor('NR_LEITOS_INTERMED_NEO'),
    nrLeitosHospDia: getValor('NR_LEITOS_HOSP_DIA'),
    nrLeitosTotClin: getValor('NR_LEITOS_TOT_CLIN'),
    nrLeitosTotCirur: getValor('NR_LEITOS_TOT_CIRUR'),
    nrLeitosTotObstr: getValor('NR_LEITOS_TOT_OBSTR'),
    nrLeitosTotPediat: getValor('NR_LEITOS_TOT_PEDIAT'),
    nrLeitosTotPsiqui: getValor('NR_LEITOS_TOT_PSIQUI'),
    nrLeitosBerçario: getValor('NR_LEITOS_BERCARIO'),
    nrLeitosIndividual: getValor('NR_LEITOS_INDIVIDUAL'),
    nrLeitosColetivo: getValor('NR_LEITOS_COLETIVO'),
    nrLeitosIsolamento: getValor('NR_LEITOS_ISOLAMENTO'),
    nrLeitosUcc: getValor('NR_LEITOS_UCC'),
    nrLeitosSemi: getValor('NR_LEITOS_SEMI'),
    nrLeitosUciNeoConv: getValor('NR_LEITOS_UCI_NEO_CONV'),
    nrLeitosUciNeoCang: getValor('NR_LEITOS_UCI_NEO_CANG'),
    nrLeitosUciPediatrico: getValor('NR_LEITOS_UCI_PEDIATRICO'),
    nrLeitosUciAdulto: getValor('NR_LEITOS_UCI_ADULTO'),
    nrLeitosCoronariana: getValor('NR_LEITOS_CORONARIANA'),
    nrUtiAdultoTp1: getValor('NR_UTI_ADULTO_TP_1'),
    nrUtiAdultoTp2: getValor('NR_UTI_ADULTO_TP_2'),
    nrUtiAdultoTp3: getValor('NR_UTI_ADULTO_TP_3'),
    nrUtiPediatricaTp1: getValor('NR_UTI_PEDIATRICA_TP_1'),
    nrUtiPediatricaTp2: getValor('NR_UTI_PEDIATRICA_TP_2'),
    nrUtiPediatricaTp3: getValor('NR_UTI_PEDIATRICA_TP_3'),
    nrUtiNeonatalTp1: getValor('NR_UTI_NEONATAL_TP_1'),
    nrUtiNeonatalTp2: getValor('NR_UTI_NEONATAL_TP_2'),
    nrUtiNeonatalTp3: getValor('NR_UTI_NEONATAL_TP_3'),
    nrUtiQueimados: getValor('NR_UTI_QUEIMADOS'),
    nrUtiCoronarianaTp2: getValor('NR_UTI_CORONARIANA_TP_2'),
    nrObsPa: getValor('NR_OBS_PA'),
    nrEmergPa: getValor('NR_EMERG_PA'),
  };
};

const validarPrestador = (prest: Prestador): ValidacaoInfo[] => {
  const validacoes: ValidacaoInfo[] = [];

  // Validar CNPJ/CPF
  if (prest.cdCnpjCpf && !validarCnpjCpf(prest.cdCnpjCpf)) {
    validacoes.push({
      campo: 'CD_CNPJ_CPF',
      tipo: 'erro',
      mensagem: 'CNPJ/CPF inválido',
      valor: prest.cdCnpjCpf
    });
  }

  // Validar data de inclusão
  if (prest.dtInclUni && !validarData(prest.dtInclUni)) {
    validacoes.push({
      campo: 'DT_INCL_UNI',
      tipo: 'erro',
      mensagem: 'Data de inclusão inválida',
      valor: prest.dtInclUni
    });
  }

  // Validar data de exclusão se presente
  if (prest.dtExclUni && !validarData(prest.dtExclUni)) {
    validacoes.push({
      campo: 'DT_EXCL_UNI',
      tipo: 'erro',
      mensagem: 'Data de exclusão inválida',
      valor: prest.dtExclUni
    });
  }

  // Validar se é médico e tem especialidade
  if (prest.tpPrest === '01' && !prest.cdEspec1 && !prest.cdEspec2 && !prest.cdAtua1 && !prest.cdAtua2) {
    validacoes.push({
      campo: 'CD_ESPEC_1',
      tipo: 'aviso',
      mensagem: 'Médico sem especialidade ou área de atuação cadastrada',
      valor: ''
    });
  }

  // Validar se é médico e tem conselho
  if (prest.tpPrest === '01' && (!prest.sgConselho || !prest.nrConselho)) {
    validacoes.push({
      campo: 'SG_CONSELHO',
      tipo: 'aviso',
      mensagem: 'Médico sem conselho profissional cadastrado',
      valor: ''
    });
  }

  // Validar se é hospital e tem leitos
  if (prest.tpPrest === '02') {
    const temLeitos = prest.enderecos.some(e =>
      e.leitos.nrLeitosTotais || e.leitos.nrLeitosContrat
    );
    if (!temLeitos) {
      validacoes.push({
        campo: 'NR_LEITOS_TOTAIS',
        tipo: 'aviso',
        mensagem: 'Hospital sem leitos cadastrados',
        valor: ''
      });
    }
  }

  // Validar se tem data de início de serviço
  if (!prest.dtIniServico) {
    validacoes.push({
      campo: 'DT_INI_SERVICO',
      tipo: 'aviso',
      mensagem: 'Data de início de serviço não informada',
      valor: ''
    });
  }

  return validacoes;
};

const validarEndereco = (end: Endereco): ValidacaoInfo[] => {
  const validacoes: ValidacaoInfo[] = [];

  // Validar CEP
  if (end.nrCep && !validarCep(end.nrCep)) {
    validacoes.push({
      campo: 'NR_CEP',
      tipo: 'aviso',
      mensagem: 'CEP inválido',
      valor: end.nrCep
    });
  }

  // Validar telefone
  if (end.nrFone1 && !validarTelefone(end.nrDdd, end.nrFone1)) {
    validacoes.push({
      campo: 'NR_FONE_1',
      tipo: 'aviso',
      mensagem: 'Telefone pode estar incompleto',
      valor: `${end.nrDdd} ${end.nrFone1}`
    });
  }

  // Validar CNES
  if (end.cdCnes === '9999999') {
    validacoes.push({
      campo: 'CD_CNES',
      tipo: 'info',
      mensagem: 'CNES não cadastrado (valor placeholder 9999999)',
      valor: end.cdCnes
    });
  } else if (end.cdCnes && end.cdCnes !== '9999999' && end.cdCnes.length !== 7) {
    validacoes.push({
      campo: 'CD_CNES',
      tipo: 'aviso',
      mensagem: 'CNES deve ter 7 dígitos',
      valor: end.cdCnes
    });
  }

  // Validar e-mail
  if (end.dsEmail && !end.dsEmail.includes('@')) {
    validacoes.push({
      campo: 'DS_EMAIL',
      tipo: 'aviso',
      mensagem: 'E-mail parece inválido',
      valor: end.dsEmail
    });
  }

  return validacoes;
};

const determinarRNs = (prest: Prestador): RNInfo[] => {
  const rns: RNInfo[] = [];
  const tpPrest = prest.tpPrest;

  for (const [key, rn] of Object.entries(rnDefinitions)) {
    let aplicavel = false;

    if (key === 'RN42' && (tpPrest === '02' || tpPrest === '10')) aplicavel = true;
    else if (key === 'RN54' && ['03', '04', '06', '11', '12', '13', '14', '15', '16', '17'].includes(tpPrest)) aplicavel = true;
    else if (key === 'RN365' && prest.dtExclUni) aplicavel = true;
    else if (key === 'RN393') aplicavel = true;
    else if (key === 'RN434') aplicavel = true;
    else if (key === 'RN443' && (tpPrest === '02' || tpPrest === '10')) aplicavel = true;

    rns.push({
      ...rn,
      aplicavel
    });
  }

  return rns;
};

// ==================== FUNÇÃO PRINCIPAL DE PARSE ====================

const parseArquivoPTU = (conteudo: string): ArquivoPTU => {
  const linhas = conteudo.split('\n').filter(l => l.trim());
  let header: PTUHeader | null = null;
  const prestadoresMap = new Map<string, Prestador>();
  let prestadorAtual: Prestador | null = null;
  let hashRegistro: { hash: string } | null = null;
  const validacoesArquivo: ValidacaoInfo[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.length < 11) continue;

    const tipoRegistro = extrairCampo(linha, 9, 11);
    const nrSeq = extrairCampo(linha, 1, 8);

    if (tipoRegistro === '401') {
      const campos = extrairHeaderCampos(linha);
      const cdUniDes = campos.find(c => c.nome === 'CD_UNI_DES')?.valor || '';
      const cdUniOri = campos.find(c => c.nome === 'CD_UNI_ORI')?.valor || '';

      header = {
        nrSeq,
        tpReg: tipoRegistro,
        cdUniDes,
        cdUniOri,
        dtGeracao: campos.find(c => c.nome === 'DT_GERACAO')?.valor || '',
        nrVerTra: campos.find(c => c.nome === 'NR_VER_TRA')?.valor || '',
        idOpePrest: campos.find(c => c.nome === 'ID_OPE_PREST')?.valor,
        nrRegistroAns: campos.find(c => c.nome === 'NR_REGISTRO_ANS')?.valor,
      };
    }
    else if (tipoRegistro === '402') {
      const campos = extrairPrestadorCampos(linha);
      const cdPrest = campos.find(c => c.nome === 'CD_PREST')?.valor || '';

      prestadorAtual = {
        nrSeq,
        tpReg: tipoRegistro,
        tpPrest: campos.find(c => c.nome === 'TP_PREST')?.valor || '',
        cdPrest,
        cdCnpjCpf: campos.find(c => c.nome === 'CD_CNPJ_CPF')?.valor || '',
        cdInscEst: campos.find(c => c.nome === 'CD_INSC_EST')?.valor,
        nmPrest: campos.find(c => c.nome === 'NM_PREST')?.valor || '',
        nmFantasia: campos.find(c => c.nome === 'NM_FANTASIA')?.valor,
        tpVinculo: campos.find(c => c.nome === 'TP_VINCULO')?.valor,
        cdEspec1: campos.find(c => c.nome === 'CD_ESPEC_1')?.valor,
        cdEspec2: campos.find(c => c.nome === 'CD_ESPEC_2')?.valor,
        cdAtua1: campos.find(c => c.nome === 'CD_ATUA_1')?.valor,
        cdAtua2: campos.find(c => c.nome === 'CD_ATUA_2')?.valor,
        dtInclUni: campos.find(c => c.nome === 'DT_INCL_UNI')?.valor || '',
        dtExclUni: campos.find(c => c.nome === 'DT_EXCL_UNI')?.valor,
        dtAtualizacao: campos.find(c => c.nome === 'DT_ATUALIZACAO')?.valor,
        dtIniServico: campos.find(c => c.nome === 'DT_INI_SERVICO')?.valor,
        dtIniContrato: campos.find(c => c.nome === 'DT_INI_CONTRATO')?.valor,
        tpContratualizacao: campos.find(c => c.nome === 'TP_CONTRATUALIZACAO')?.valor,
        tpClassEstabelec: campos.find(c => c.nome === 'TP_CLASS_ESTABELEC')?.valor,
        idCatDif: campos.find(c => c.nome === 'ID_CAT_DIF')?.valor,
        idAcidTrab: campos.find(c => c.nome === 'ID_ACID_TRAB')?.valor,
        idUrgEmer: campos.find(c => c.nome === 'ID_URG_EMER')?.valor,
        idRceEspec1: campos.find(c => c.nome === 'ID_RCE_ESPEC_1')?.valor,
        idRceAtua1: campos.find(c => c.nome === 'ID_RCE_ATUA_1')?.valor,
        idRceEspec2: campos.find(c => c.nome === 'ID_RCE_ESPEC_2')?.valor,
        idRceAtua2: campos.find(c => c.nome === 'ID_RCE_ATUA_2')?.valor,
        nrRceEspec1: campos.find(c => c.nome === 'NR_RCE_ESPEC_1')?.valor,
        nrRceEspec2: campos.find(c => c.nome === 'NR_RCE_ESPEC_2')?.valor,
        nrRceAtua1: campos.find(c => c.nome === 'NR_RCE_ATUA_1')?.valor,
        nrRceAtua2: campos.find(c => c.nome === 'NR_RCE_ATUA_2')?.valor,
        idIntercambio: campos.find(c => c.nome === 'ID_INTERCAMBIO')?.valor || '',
        idGuiaMedico: campos.find(c => c.nome === 'ID_GUIA_MEDICO')?.valor || '',
        idGuiaMedicoEspec1: campos.find(c => c.nome === 'ID_GUIA_MEDICO_ESPEC_1')?.valor,
        idGuiaMedicoEspec2: campos.find(c => c.nome === 'ID_GUIA_MEDICO_ESPEC_2')?.valor,
        idGuiaMedicoAtua1: campos.find(c => c.nome === 'ID_GUIA_MEDICO_ATUA_1')?.valor,
        idGuiaMedicoAtua2: campos.find(c => c.nome === 'ID_GUIA_MEDICO_ATUA_2')?.valor,
        tpDisponibilidade: campos.find(c => c.nome === 'TP_DISPONIBILIDADE')?.valor,
        tipoRedeMin: campos.find(c => c.nome === 'TIPO_REDE_MIN')?.valor,
        idTabPropria: campos.find(c => c.nome === 'ID_TAB_PROPRIA')?.valor,
        idLoginWsdTiss: campos.find(c => c.nome === 'ID_LOGIN_WSD_TISS')?.valor,
        idCadu: campos.find(c => c.nome === 'ID_CADU')?.valor,
        idInativo: campos.find(c => c.nome === 'ID_INATIVO')?.valor,
        cdPerfilAssist: campos.find(c => c.nome === 'CD_PERFIL_ASSIST')?.valor,
        idTpProd: campos.find(c => c.nome === 'ID_TP_PROD')?.valor,
        participNotivisa: campos.find(c => c.nome === 'PARTICIP_NOTIVISA')?.valor,
        participQualissAns: campos.find(c => c.nome === 'PARTICIP_QUALISS_ANS')?.valor,
        indicPosGrad: campos.find(c => c.nome === 'INDIC_POS_GRAD')?.valor,
        idTitEspec: campos.find(c => c.nome === 'ID_TIT_ESPEC')?.valor,
        indicResid: campos.find(c => c.nome === 'INDIC_RESID')?.valor,
        cdUniPrestadora: campos.find(c => c.nome === 'CD_UNI_PRESTADORA')?.valor,
        tpSexo: campos.find(c => c.nome === 'TP_SEXO')?.valor,
        dtNasc: campos.find(c => c.nome === 'DT_NASC')?.valor,
        cpfCnpjCob: campos.find(c => c.nome === 'CPF_CNPJ_COB')?.valor,
        cdPrestCob: campos.find(c => c.nome === 'CD_PREST_COB')?.valor,
        idTelessaude: campos.find(c => c.nome === 'ID_TELESSAUDE')?.valor,
        sgConselho: campos.find(c => c.nome === 'SG_CONSELHO')?.valor,
        nrConselho: campos.find(c => c.nome === 'NR_CONSELHO')?.valor,
        nrCbo: campos.find(c => c.nome === 'NR_CBO')?.valor,
        enderecos: [],
        servicos: [],
        redes: [],
        observacoes: [],
        emails: [],
        campos,
        rnsAplicaveis: [],
        validacoes: [],
      };
      prestadoresMap.set(cdPrest, prestadorAtual);
    }
    else if (tipoRegistro === '403' && prestadorAtual) {
      const campos = extrairEnderecoCampos(linha);
      const leitos = extrairLeitosInfo(campos);

      const endereco: Endereco = {
        nrSeq,
        tpReg: tipoRegistro,
        tpEnd: campos.find(c => c.nome === 'TP_END')?.valor || '',
        dsEnd: campos.find(c => c.nome === 'DS_END')?.valor || '',
        nrEnd: campos.find(c => c.nome === 'NR_END')?.valor || '',
        dsComplemento: campos.find(c => c.nome === 'DS_COMPL')?.valor,
        dsBairro: campos.find(c => c.nome === 'DS_BAIRRO')?.valor || '',
        cdMunic: campos.find(c => c.nome === 'CD_MUNIC')?.valor || '',
        nrCep: campos.find(c => c.nome === 'NR_CEP')?.valor || '',
        nrDdd: campos.find(c => c.nome === 'NR_DDD')?.valor || '',
        nrFone1: campos.find(c => c.nome === 'NR_FONE_1')?.valor || '',
        nrFone2: campos.find(c => c.nome === 'NR_FONE_2')?.valor,
        nrFax: campos.find(c => c.nome === 'NR_FAX')?.valor,
        cdCnes: campos.find(c => c.nome === 'CD_CNES')?.valor || '',
        dsEmail: campos.find(c => c.nome === 'DS_EMAIL')?.valor,
        dsEmailSec: campos.find(c => c.nome === 'DS_EMAIL_SEC')?.valor,
        dsEnderecoWeb: campos.find(c => c.nome === 'DS_ENDERECO_WEB')?.valor,
        nrLatitude: campos.find(c => c.nome === 'NR_LATITUDE')?.valor,
        nrLongitude: campos.find(c => c.nome === 'NR_LONGITUDE')?.valor,
        referenciaEnd: campos.find(c => c.nome === 'REFERENCIA_END')?.valor || '',
        prestAcred: campos.find(c => c.nome === 'PREST_ACRED')?.valor,
        leitos,
        campos,
        validacoes: [],
      };

      const validacoesEnd = validarEndereco(endereco);
      endereco.validacoes = validacoesEnd;

      prestadorAtual.enderecos.push(endereco);
      if (endereco.dsEmail) prestadorAtual.emails.push(endereco.dsEmail);
      if (endereco.dsEmailSec) prestadorAtual.emails.push(endereco.dsEmailSec);
    }
    else if (tipoRegistro === '404' && prestadorAtual) {
      const cdGrServ = extrairCampo(linha, 12, 14);
      const dsServico = extrairCampo(linha, 15, 44);
      prestadorAtual.servicos.push({
        nrSeq,
        tpReg: tipoRegistro,
        cdGrServ,
        dsServico: dsServico || undefined,
      });
    }
    else if (tipoRegistro === '405' && prestadorAtual) {
      const cdRede = extrairCampo(linha, 12, 15);
      prestadorAtual.redes.push({
        nrSeq,
        tpReg: tipoRegistro,
        cdRede,
        dsRede: redeNacionalMap[cdRede] || `Rede ${cdRede}`,
      });
    }
    else if (tipoRegistro === '410' && prestadorAtual) {
      const observacao = extrairCampo(linha, 12, 261);
      if (observacao) {
        prestadorAtual.observacoes?.push(observacao);
      }
    }
    else if (tipoRegistro === '998') {
      hashRegistro = { hash: extrairCampo(linha, 12, 43) };
    }
  }

  // Processar prestadores
  const prestadores = Array.from(prestadoresMap.values()).map(prest => {
    const validacoes = validarPrestador(prest);
    prest.validacoes = validacoes;
    prest.rnsAplicaveis = determinarRNs(prest);
    return prest;
  });

  // Validar total de prestadores
  const expectedTotal = parseInt(extrairCampo(linhas[linhas.length - 1] || '', 12, 18) || '0');
  if (expectedTotal > 0 && prestadores.length !== expectedTotal) {
    validacoesArquivo.push({
      campo: 'QT_TOT_R402',
      tipo: 'erro',
      mensagem: `Total de prestadores no trailer (${expectedTotal}) difere do processado (${prestadores.length})`,
      valor: `${expectedTotal}`
    });
  }

  return {
    header: header!,
    prestadores,
    trailer: {} as Trailer,
    hash: hashRegistro?.hash,
    validacoesArquivo,
  };
};

// ==================== COMPONENTES MELHORADOS ====================

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-zinc-700 shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-xl font-bold text-white bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const CampoCopy = ({ label, value, posicao, tipo }: { label: string; value: string | undefined; posicao?: string; tipo?: 'erro' | 'aviso' | 'info' }) => {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const getTipoClasses = () => {
    if (tipo === 'erro') return 'text-red-400';
    if (tipo === 'aviso') return 'text-amber-400';
    if (tipo === 'info') return 'text-sky-400';
    return 'text-zinc-300';
  };

  const getBorderClasses = () => {
    if (tipo === 'erro') return 'border-red-500/30 bg-red-500/5';
    if (tipo === 'aviso') return 'border-amber-500/30 bg-amber-500/5';
    if (tipo === 'info') return 'border-sky-500/30 bg-sky-500/5';
    return 'border-transparent';
  };

  return (
    <div className={`group relative border rounded-lg p-2 ${getBorderClasses()} hover:border-zinc-600 transition-colors`}>
      <div className="text-xs font-medium text-zinc-400 mb-1">
        {label}
        {posicao && <span className="text-zinc-600 ml-1">({posicao})</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-mono font-medium break-all ${getTipoClasses()}`}>{value}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-zinc-800 rounded-lg"
          title="Copiar"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
      </div>
    </div>
  );
};

const Badge = ({ children, variant, icon }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'error' | 'info' | 'default'; icon?: React.ReactNode }) => {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    default: 'bg-zinc-800/50 text-zinc-400 border-zinc-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${variants[variant || 'default']}`}>
      {icon}
      {children}
    </span>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-4 border border-white/10`}>
    <div className="flex items-center justify-between">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-white/60">{icon}</div>
    </div>
    <div className="text-sm text-white/80 mt-2 font-medium">{label}</div>
  </div>
);

// ==================== COMPONENTE PRINCIPAL ====================

export default function PTUViewerPage() {
  const [arquivo, setArquivo] = useState<ArquivoPTU | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [prestadorExpandido, setPrestadorExpandido] = useState<Record<string, boolean>>({});
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean; title: string; content: React.ReactNode }>({ isOpen: false, title: '', content: null });
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroVinculo, setFiltroVinculo] = useState<string>('todos');
  const [filtroIntercambio, setFiltroIntercambio] = useState<string>('todos');
  const [filtroInativo, setFiltroInativo] = useState<string>('todos');
  const [visualizarJson, setVisualizarJson] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [abaSelecionada, setAbaSelecionada] = useState<'prestadores' | 'validacoes' | 'regras'>('prestadores');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setErro(null);
    setArquivo(null);

    try {
      const conteudo = await file.text();
      const parsed = parseArquivoPTU(conteudo);
      setArquivo(parsed);
    } catch (err) {
      setErro(`Erro ao processar arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setCarregando(false);
    }
  };

  const togglePrestadorExpandido = (cdPrest: string) => {
    setPrestadorExpandido(prev => ({ ...prev, [cdPrest]: !prev[cdPrest] }));
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr || dataStr.length !== 8) return dataStr;
    return `${dataStr.substring(0, 4)}-${dataStr.substring(4, 6)}-${dataStr.substring(6, 8)}`;
  };

  const formatarTelefone = (ddd: string, numero: string) => {
    if (!ddd || !numero) return '';
    const numLimpo = numero.replace(/\s/g, '');
    if (numLimpo.length === 8) {
      return `(${ddd}) ${numLimpo.substring(0, 4)}-${numLimpo.substring(4, 8)}`;
    }
    if (numLimpo.length === 9) {
      return `(${ddd}) ${numLimpo.substring(0, 5)}-${numLimpo.substring(5, 9)}`;
    }
    return `(${ddd}) ${numLimpo}`;
  };

  const openCampoModal = (campo: CampoInfo) => {
    setModalInfo({
      isOpen: true,
      title: `📋 Detalhes do Campo: ${campo.nome}`,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CampoCopy label="Nome do Campo" value={campo.nome} />
            <CampoCopy label="Valor" value={campo.valor} />
            <CampoCopy label="Posição Inicial" value={campo.posIni.toString()} />
            <CampoCopy label="Posição Final" value={campo.posFim.toString()} />
            <CampoCopy label="Tipo de Dado" value={campo.tipo} />
            <CampoCopy label="Obrigatório" value={campo.obrigatorio ? 'Sim' : 'Não'} />
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Descrição (conforme manual PTU)</div>
            <div className="text-sm text-zinc-300 leading-relaxed">{campo.descricao}</div>
          </div>
        </div>
      )
    });
  };

  const openValidacoesModal = (prest: Prestador) => {
    setModalInfo({
      isOpen: true,
      title: `🔍 Validações - ${prest.nmPrest}`,
      content: (
        <div className="space-y-4">
          {prest.validacoes.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <div className="text-emerald-400 font-medium">Nenhuma validação encontrada</div>
              <div className="text-sm text-zinc-500 mt-1">Este prestador está em conformidade com todas as regras</div>
            </div>
          ) : (
            prest.validacoes.map((v, i) => (
              <div key={i} className={`p-4 rounded-xl border ${v.tipo === 'erro' ? 'bg-red-500/10 border-red-500/20' :
                v.tipo === 'aviso' ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-sky-500/10 border-sky-500/20'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {v.tipo === 'erro' && <AlertCircle className="w-5 h-5 text-red-400" />}
                  {v.tipo === 'aviso' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {v.tipo === 'info' && <Info className="w-5 h-5 text-sky-400" />}
                  <span className="font-mono text-sm font-semibold text-white">{v.campo}</span>
                  <Badge variant={v.tipo === 'erro' ? 'error' : v.tipo === 'aviso' ? 'warning' : 'info'}>
                    {v.tipo === 'erro' ? 'Erro' : v.tipo === 'aviso' ? 'Aviso' : 'Informação'}
                  </Badge>
                </div>
                <div className="text-sm text-zinc-300 ml-7">{v.mensagem}</div>
                {v.valor && (
                  <div className="text-xs text-zinc-500 mt-2 ml-7">
                    Valor atual: <span className="font-mono text-zinc-400">{v.valor}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )
    });
  };

  const openLeitosModal = (endereco: Endereco, prestadorNome: string) => {
    const leitos = endereco.leitos;
    const leitosCategorias = [
      {
        title: '🏥 Leitos Gerais', icon: <Bed className="w-4 h-4" />, items: [
          { label: 'Leitos Totais', value: leitos.nrLeitosTotais, pos: '256-261' },
          { label: 'Leitos Contratados', value: leitos.nrLeitosContrat, pos: '262-267' },
          { label: 'Leitos Clínicos', value: leitos.nrLeitosTotClin, pos: '350-355' },
          { label: 'Leitos Cirúrgicos', value: leitos.nrLeitosTotCirur, pos: '356-361' },
          { label: 'Leitos Obstétricos', value: leitos.nrLeitosTotObstr, pos: '362-367' },
          { label: 'Leitos Pediátricos', value: leitos.nrLeitosTotPediat, pos: '368-373' },
          { label: 'Leitos Psiquiátricos', value: leitos.nrLeitosTotPsiqui, pos: '374-379' },
        ]
      },
      {
        title: '💓 UTI e Cuidados Intensivos', icon: <Heart className="w-4 h-4" />, items: [
          { label: 'UTI Adulto', value: leitos.nrUtiAdulto, pos: '274-279' },
          { label: 'UTI Neonatal', value: leitos.nrUtiNeonatal, pos: '280-285' },
          { label: 'UTI Pediátrica', value: leitos.nrUtiPediatrica, pos: '286-291' },
          { label: 'UTI Queimados', value: leitos.nrUtiQueimados, pos: '500-505' },
          { label: 'UTI Coronariana Tipo II', value: leitos.nrUtiCoronarianaTp2, pos: '506-511' },
        ]
      },
      {
        title: '🔄 Leitos Especiais', icon: <Activity className="w-4 h-4" />, items: [
          { label: 'Unidade Intermediária', value: leitos.nrLeitosIntermed, pos: '420-425' },
          { label: 'Unidade Intermediária Neonatal', value: leitos.nrLeitosIntermedNeo, pos: '307-312' },
          { label: 'Hospital Dia', value: leitos.nrLeitosHospDia, pos: '344-349' },
          { label: 'Terapia Semi-Intensiva', value: leitos.nrLeitosSemi, pos: '410-415' },
          { label: 'UCC - Cuidados Clínicos', value: leitos.nrLeitosUcc, pos: '404-409' },
        ]
      },
      {
        title: '📊 UTI por Tipo (Adulto)', icon: <Activity className="w-4 h-4" />, items: [
          { label: 'UTI Adulto Tipo I', value: leitos.nrUtiAdultoTp1, pos: '446-451' },
          { label: 'UTI Adulto Tipo II', value: leitos.nrUtiAdultoTp2, pos: '452-457' },
          { label: 'UTI Adulto Tipo III', value: leitos.nrUtiAdultoTp3, pos: '458-463' },
        ]
      },
      {
        title: '👶 UTI por Tipo (Pediátrica)', icon: <Baby className="w-4 h-4" />, items: [
          { label: 'UTI Pediátrica Tipo I', value: leitos.nrUtiPediatricaTp1, pos: '464-469' },
          { label: 'UTI Pediátrica Tipo II', value: leitos.nrUtiPediatricaTp2, pos: '470-475' },
          { label: 'UTI Pediátrica Tipo III', value: leitos.nrUtiPediatricaTp3, pos: '476-481' },
        ]
      },
      {
        title: '🍼 UTI por Tipo (Neonatal)', icon: <Baby className="w-4 h-4" />, items: [
          { label: 'UTI Neonatal Tipo I', value: leitos.nrUtiNeonatalTp1, pos: '482-487' },
          { label: 'UTI Neonatal Tipo II', value: leitos.nrUtiNeonatalTp2, pos: '488-493' },
          { label: 'UTI Neonatal Tipo III', value: leitos.nrUtiNeonatalTp3, pos: '494-499' },
        ]
      },
      {
        title: '🛏️ Leitos de Acomodação', icon: <Building2 className="w-4 h-4" />, items: [
          { label: 'Leitos Individuais', value: leitos.nrLeitosIndividual, pos: '386-391' },
          { label: 'Leitos Coletivos', value: leitos.nrLeitosColetivo, pos: '392-397' },
          { label: 'Leitos Isolamento', value: leitos.nrLeitosIsolamento, pos: '398-403' },
        ]
      },
      {
        title: '🧠 Leitos Especializados', icon: <Brain className="w-4 h-4" />, items: [
          { label: 'Leitos Psiquiatria', value: leitos.nrLeitosPsiquiat, pos: '268-273' },
          { label: 'Leitos Coronarianos', value: leitos.nrLeitosCoronariana, pos: '440-445' },
          { label: 'Berçário Alto Risco', value: leitos.nrLeitosBerçario, pos: '380-385' },
          { label: 'UCI Neonatal Convencional', value: leitos.nrLeitosUciNeoConv, pos: '416-421' },
          { label: 'UCI Neonatal Canguru', value: leitos.nrLeitosUciNeoCang, pos: '422-427' },
          { label: 'UCI Pediátrica', value: leitos.nrLeitosUciPediatrico, pos: '428-433' },
          { label: 'UCI Adulto', value: leitos.nrLeitosUciAdulto, pos: '434-439' },
        ]
      },
      {
        title: '🚑 Pronto Atendimento', icon: <Activity className="w-4 h-4" />, items: [
          { label: 'Observação PA', value: leitos.nrObsPa, pos: '512-517' },
          { label: 'Sala de Emergência PA', value: leitos.nrEmergPa, pos: '518-523' },
        ]
      },
    ];

    setModalInfo({
      isOpen: true,
      title: `🏨 Informações de Leitos - ${prestadorNome}`,
      content: (
        <div className="space-y-6">
          {leitosCategorias.map((categoria, idx) => {
            const itemsComValor = categoria.items.filter(item => item.value);
            if (itemsComValor.length === 0) return null;
            return (
              <div key={idx} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/30">
                <div className="flex items-center gap-2 text-sky-400 mb-4">
                  {categoria.icon}
                  <h4 className="font-semibold text-base">{categoria.title}</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {itemsComValor.map((item, i) => (
                    <div key={i} className="bg-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800 transition-colors">
                      <div className="text-xs text-zinc-500 mb-1">{item.label}</div>
                      <div className="text-lg font-bold text-white font-mono">{item.value}</div>
                      <div className="text-xs text-zinc-600 mt-1">pos. {item.pos}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )
    });
  };

  const prestadoresFiltrados = useMemo(() => {
    if (!arquivo) return [];
    return arquivo.prestadores.filter(prest => {
      if (filtroTexto && !prest.nmPrest.toLowerCase().includes(filtroTexto.toLowerCase()) &&
        !prest.cdCnpjCpf.includes(filtroTexto) && !prest.cdPrest.includes(filtroTexto)) {
        return false;
      }
      if (filtroTipo !== 'todos' && prest.tpPrest !== filtroTipo) return false;
      if (filtroVinculo !== 'todos' && prest.tpVinculo !== filtroVinculo) return false;
      if (filtroIntercambio !== 'todos' && prest.idIntercambio !== filtroIntercambio) return false;
      if (filtroInativo !== 'todos') {
        if (filtroInativo === 'ativos' && prest.idInativo === 'S') return false;
        if (filtroInativo === 'inativos' && prest.idInativo !== 'S') return false;
      }
      return true;
    });
  }, [arquivo, filtroTexto, filtroTipo, filtroVinculo, filtroIntercambio, filtroInativo]);

  const totalValidacoes = useMemo(() => {
    if (!arquivo) return { erros: 0, avisos: 0, infos: 0 };
    return arquivo.prestadores.reduce((acc, prest) => {
      prest.validacoes.forEach(v => {
        if (v.tipo === 'erro') acc.erros++;
        else if (v.tipo === 'aviso') acc.avisos++;
        else if (v.tipo === 'info') acc.infos++;
      });
      return acc;
    }, { erros: 0, avisos: 0, infos: 0 });
  }, [arquivo]);

  const copiarParaClipboard = async () => {
    if (!arquivo) return;

    const jsonStr = JSON.stringify(arquivo, null, 2);

    try {
      // Verificar se a API Clipboard está disponível
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonStr);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      } else {
        // Fallback para método antigo
        const textarea = document.createElement('textarea');
        textarea.value = jsonStr;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } else {
          console.error('Falha ao copiar texto');
          alert('Não foi possível copiar o texto. Por favor, selecione manualmente.');
        }
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert('Erro ao copiar para a área de transferência');
    }
  };

  const downloadJSON = () => {
    if (!arquivo) return;
    const jsonStr = JSON.stringify(arquivo, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ptu_${arquivo.header?.dtGeracao || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTipoPrestadorInfo = (tpPrest: string) => {
    return tipoPrestadorMap[tpPrest] || { descricao: `Tipo ${tpPrest}`, icon: <User className="w-4 h-4" />, tipo: 'Desconhecido' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-sky-500 to-blue-500 rounded-2xl shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Visualizador PTU
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Movimentação Cadastral de Prestadores - Manual PTU v4.2025
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            Importe arquivos no formato PTU A400 (.txt) para visualizar, validar e analisar os dados cadastrais
          </p>
        </div>

        {/* Área de upload */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 mb-8 shadow-xl">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-sky-500 hover:bg-zinc-800/50 transition-all duration-300">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="p-3 bg-zinc-800 rounded-full mb-3">
                <Upload className="w-8 h-8 text-sky-400" />
              </div>
              <p className="text-sm text-zinc-400">
                <span className="font-semibold text-sky-400">Clique para selecionar</span> ou arraste o arquivo PTU
              </p>
              <p className="text-xs text-zinc-500 mt-2">Arquivos .txt (formato PTU A400)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".txt,.ptu"
              onChange={handleFileUpload}
              disabled={carregando}
            />
          </label>
          {carregando && (
            <div className="text-center mt-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-sky-500 border-t-transparent"></div>
              <p className="text-zinc-400 mt-3 font-medium">Processando arquivo...</p>
            </div>
          )}
          {erro && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
        </div>

        {/* Informações do arquivo */}
        {arquivo?.header && (
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 mb-8 shadow-xl">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              Informações do Arquivo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <CampoCopy label="NR_SEQ" value={arquivo.header.nrSeq} posicao="pos. 1-8" />
              <CampoCopy label="CD_UNI_ORI" value={arquivo.header.cdUniOri} posicao="pos. 16-19" />
              <CampoCopy label="CD_UNI_DES" value={arquivo.header.cdUniDes} posicao="pos. 12-15" />
              <CampoCopy label="DT_GERACAO" value={formatarData(arquivo.header.dtGeracao)} posicao="pos. 20-27" />
              <CampoCopy label="Total de Prestadores" value={arquivo.prestadores.length.toString()} />
              <CampoCopy label="ID_OPE_PREST" value={arquivo.header.idOpePrest === '1' ? 'Prestadora' : arquivo.header.idOpePrest === '2' ? 'Operadora' : arquivo.header.idOpePrest} posicao="pos. 30" />
            </div>

            {arquivo.validacoesArquivo && arquivo.validacoesArquivo.length > 0 && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Validações do Arquivo</span>
                </div>
                {arquivo.validacoesArquivo.map((v, i) => (
                  <div key={i} className="text-sm text-amber-300 mt-1">{v.mensagem}</div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={downloadJSON} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-xl text-sm font-medium transition-all shadow-lg">
                <Download className="w-4 h-4" /> Exportar JSON
              </button>
              <button onClick={copiarParaClipboard} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-xl text-sm font-medium transition-all">
                {copiado ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado!' : 'Copiar JSON'}
              </button>
              <button onClick={() => setVisualizarJson(!visualizarJson)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-xl text-sm font-medium transition-all">
                {visualizarJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {visualizarJson ? 'Ocultar JSON' : 'Visualizar JSON'}
              </button>
            </div>

            {visualizarJson && (
              <pre className="mt-4 bg-black/50 p-4 rounded-xl overflow-auto max-h-96 text-xs font-mono text-zinc-300 border border-zinc-800">
                {JSON.stringify(arquivo, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Abas */}
        {arquivo && (
          <div className="mb-6 flex gap-1 border-b border-zinc-800">
            <button
              onClick={() => setAbaSelecionada('prestadores')}
              className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${abaSelecionada === 'prestadores'
                ? 'text-sky-400 border-b-2 border-sky-400 bg-zinc-900/50'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
              👥 Prestadores ({prestadoresFiltrados.length})
            </button>
            <button
              onClick={() => setAbaSelecionada('validacoes')}
              className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg flex items-center gap-2 ${abaSelecionada === 'validacoes'
                ? 'text-sky-400 border-b-2 border-sky-400 bg-zinc-900/50'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
              <AlertCircle className="w-4 h-4" />
              Validações ({totalValidacoes.erros + totalValidacoes.avisos + totalValidacoes.infos})
              {totalValidacoes.erros > 0 && <Badge variant="error">{totalValidacoes.erros}</Badge>}
              {totalValidacoes.avisos > 0 && <Badge variant="warning">{totalValidacoes.avisos}</Badge>}
            </button>
            <button
              onClick={() => setAbaSelecionada('regras')}
              className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${abaSelecionada === 'regras'
                ? 'text-sky-400 border-b-2 border-sky-400 bg-zinc-900/50'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
              📖 Regras do Manual
            </button>
          </div>
        )}

        {/* Aba de Validações */}
        {arquivo && abaSelecionada === 'validacoes' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-5">Resumo de Validações</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Erros" value={totalValidacoes.erros} icon={<AlertCircle className="w-6 h-6" />} color="from-red-500/20 to-red-600/20" />
                <StatCard label="Avisos" value={totalValidacoes.avisos} icon={<AlertTriangle className="w-6 h-6" />} color="from-amber-500/20 to-amber-600/20" />
                <StatCard label="Informações" value={totalValidacoes.infos} icon={<Info className="w-6 h-6" />} color="from-sky-500/20 to-sky-600/20" />
              </div>
            </div>

            {arquivo.prestadores.map(prest => (
              prest.validacoes.length > 0 && (
                <div key={prest.cdPrest} className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-white">{prest.nmPrest}</h4>
                      <div className="text-sm text-zinc-500 font-mono mt-1">{prest.cdCnpjCpf}</div>
                    </div>
                    <button
                      onClick={() => openValidacoesModal(prest)}
                      className="px-4 py-2 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-xl text-sm font-medium transition-all"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {prest.validacoes.some(v => v.tipo === 'erro') && <Badge variant="error">⚠️ {prest.validacoes.filter(v => v.tipo === 'erro').length} erros</Badge>}
                    {prest.validacoes.some(v => v.tipo === 'aviso') && <Badge variant="warning">⚠️ {prest.validacoes.filter(v => v.tipo === 'aviso').length} avisos</Badge>}
                    {prest.validacoes.some(v => v.tipo === 'info') && <Badge variant="info">ℹ️ {prest.validacoes.filter(v => v.tipo === 'info').length} informações</Badge>}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Aba de Regras do Manual */}
        {abaSelecionada === 'regras' && (
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              Regras do Manual PTU - Movimentação Cadastral de Prestadores
            </h3>

            <div className="space-y-5">
              <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <Stethoscope className="w-5 h-5" /> Tipos de Prestador (TP_PREST)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(tipoPrestadorMap).map(([code, { descricao }]) => (
                    <div key={code} className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="font-mono text-sky-400 font-bold w-8">{code}</span>
                      <span className="text-zinc-300">{descricao}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">Posição: 12-13</div>
              </div>

              <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" /> Tipo de Vínculo (TP_VINCULO)
                </h4>
                <div className="flex gap-4 text-sm flex-wrap">
                  {Object.entries(tipoVinculoMap).map(([code, { descricao }]) => (
                    <div key={code} className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="font-mono text-sky-400 font-bold">{code}</span>
                      <span className="text-zinc-300">{descricao}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">Posição: 147</div>
              </div>

              <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" /> Tipo de Endereço (TP_END)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(tipoEnderecoMap).map(([code, { descricao }]) => (
                    <div key={code} className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="font-mono text-sky-400 font-bold">{code}</span>
                      <span className="text-zinc-300">{descricao}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">Posição: 12</div>
              </div>

              <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5" /> Disponibilidade do Serviço (TP_DISPONIBILIDADE)
                </h4>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                    <span className="font-mono text-sky-400 font-bold">1</span>
                    <span className="text-zinc-300">Parcial</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                    <span className="font-mono text-sky-400 font-bold">2</span>
                    <span className="text-zinc-300">Total</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mt-3">Posição: 267</div>
              </div>

              <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5" /> Tipo de Rede (TIPO_REDE_MIN)
                </h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(tipoRedeMinMap).map(([code, desc]) => (
                    <div key={code} className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded-lg">
                      <span className="font-mono text-sky-400 font-bold">{code}</span>
                      <span className="text-zinc-300">{desc}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">Posição: 302</div>
              </div>

              <div className="border border-zinc-800 rounded-xl p-5 bg-gradient-to-r from-sky-500/5 to-blue-500/5">
                <h4 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5" /> Campos Obrigatórios por Tipo de Prestador
                </h4>
                <ul className="list-disc list-inside text-sm space-y-2 text-zinc-300">
                  <li><span className="font-mono text-sky-400 font-bold">Médico (01)</span>: CD_ESPEC_1 ou CD_ATUA_1, SG_CONSELHO, NR_CONSELHO</li>
                  <li><span className="font-mono text-sky-400 font-bold">Hospital (02)</span>: NR_LEITOS_TOTAIS ou NR_LEITOS_CONTRAT, CD_CNES</li>
                  <li><span className="font-mono text-sky-400 font-bold">Laboratório (03)</span>: CD_CNES</li>
                  <li><span className="font-mono text-sky-400 font-bold">Clínica (04)</span>: CD_CNES</li>
                  <li><span className="font-mono text-sky-400 font-bold">Todos</span>: DT_INCL_UNI, DT_ATUALIZACAO, ID_GUIA_MEDICO, ID_INTERCAMBIO, ID_LOGIN_WSD_TISS, ID_CADU, ID_INATIVO, CPF_CNPJ_COB, ID_TELESSAUDE</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        {arquivo && abaSelecionada === 'prestadores' && (
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-sky-400" />
              Filtros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CNPJ/CPF ou código..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="todos">Todos os tipos</option>
                {Object.entries(tipoPrestadorMap).map(([code, { descricao }]) => (
                  <option key={code} value={code}>{descricao}</option>
                ))}
              </select>
              <select
                value={filtroVinculo}
                onChange={(e) => setFiltroVinculo(e.target.value)}
                className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="todos">Todos vínculos</option>
                {Object.entries(tipoVinculoMap).map(([code, { descricao }]) => (
                  <option key={code} value={code}>{descricao}</option>
                ))}
              </select>
              <select
                value={filtroIntercambio}
                onChange={(e) => setFiltroIntercambio(e.target.value)}
                className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="todos">Todos intercâmbio</option>
                <option value="S">✅ Atende intercâmbio</option>
                <option value="N">❌ Não atende intercâmbio</option>
              </select>
              <select
                value={filtroInativo}
                onChange={(e) => setFiltroInativo(e.target.value)}
                className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="todos">Todos (ativos/inativos)</option>
                <option value="ativos">✅ Apenas ativos</option>
                <option value="inativos">❌ Apenas inativos</option>
              </select>
            </div>
            <div className="mt-4 text-sm text-zinc-500 flex items-center gap-2">
              <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
              Exibindo <span className="font-bold text-white">{prestadoresFiltrados.length}</span> de <span className="font-bold text-white">{arquivo.prestadores.length}</span> prestadores
            </div>
          </div>
        )}

        {/* Lista de Prestadores */}
        {arquivo && abaSelecionada === 'prestadores' && (
          <div className="space-y-4">
            {prestadoresFiltrados.map((prest) => {
              const tipoInfo = getTipoPrestadorInfo(prest.tpPrest);
              const temLeitos = prest.enderecos.some(e =>
                e.leitos.nrLeitosTotais || e.leitos.nrLeitosContrat || e.leitos.nrUtiAdulto
              );
              const temErro = prest.validacoes.some(v => v.tipo === 'erro');
              const temAviso = prest.validacoes.some(v => v.tipo === 'aviso');

              return (
                <div key={prest.cdPrest} className={`bg-gradient-to-br from-zinc-900 to-zinc-950 border rounded-2xl overflow-hidden transition-all hover:shadow-xl ${temErro ? 'border-red-500/30 shadow-red-500/10' :
                  temAviso ? 'border-amber-500/30 shadow-amber-500/10' :
                    'border-zinc-800 hover:border-zinc-700'
                  }`}>
                  {/* Cabeçalho do Prestador */}
                  <button
                    onClick={() => togglePrestadorExpandido(prest.cdPrest)}
                    className="w-full px-6 py-5 flex justify-between items-center hover:bg-white/5 transition-all text-left group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <div className="p-2 bg-gradient-to-r from-sky-500/20 to-blue-500/20 rounded-xl">
                          {tipoInfo.icon}
                        </div>
                        <h3 className="text-xl font-bold text-white">{prest.nmPrest}</h3>
                        {prest.nmFantasia && (
                          <span className="text-sm text-zinc-400">({prest.nmFantasia})</span>
                        )}
                        <Badge variant="default" icon={<FileText className="w-3 h-3" />}>
                          Cód: {prest.cdPrest}
                        </Badge>
                        {prest.idIntercambio === 'S' && (
                          <Badge variant="info" icon={<Globe className="w-3 h-3" />}>
                            Intercâmbio
                          </Badge>
                        )}
                        {prest.idInativo === 'S' && (
                          <Badge variant="error" icon={<AlertCircle className="w-3 h-3" />}>
                            Inativo
                          </Badge>
                        )}
                        {temErro && (
                          <Badge variant="error" icon={<AlertCircle className="w-3 h-3" />}>
                            {prest.validacoes.filter(v => v.tipo === 'erro').length} erro(s)
                          </Badge>
                        )}
                        {temAviso && !temErro && (
                          <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                            {prest.validacoes.filter(v => v.tipo === 'aviso').length} aviso(s)
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-zinc-500 flex-wrap">
                        <span className="flex items-center gap-1">{tipoInfo.icon} {tipoInfo.descricao}</span>
                        <span className="font-mono">• {prest.cdCnpjCpf}</span>
                        {prest.tpVinculo && (
                          <span>• {tipoVinculoMap[prest.tpVinculo]?.descricao}</span>
                        )}
                        {prest.dtInclUni && (
                          <span>• 📅 Incluído: {formatarData(prest.dtInclUni)}</span>
                        )}
                        {prest.dtExclUni && (
                          <span className="text-red-400">• ❌ Excluído: {formatarData(prest.dtExclUni)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {prestadorExpandido[prest.cdPrest] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </div>
                  </button>

                  {/* Conteúdo Expandido */}
                  {prestadorExpandido[prest.cdPrest] && (
                    <div className="px-6 pb-6 pt-4 border-t border-zinc-800 space-y-6">
                      {/* Seções por RN */}
                      <div className="space-y-4">
                        {prest.rnsAplicaveis.filter(rn => rn.aplicavel).map((rn) => (
                          <div key={rn.rnNumber} className={`border rounded-xl p-5 ${rn.cor} backdrop-blur-sm`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Award className="w-6 h-6 text-white" />
                                <h4 className="font-bold text-white text-lg">{rn.rnNumber} - {rn.rnName}</h4>
                              </div>
                              <button
                                onClick={() => openCampoModal({ nome: rn.rnNumber, valor: rn.rnName, posIni: 0, posFim: 0, descricao: rn.rnDescription, tipo: 'RN', obrigatorio: false })}
                                className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{rn.rnDescription}</p>

                            {/* Campos relevantes da RN */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {rn.camposRelevantes.map(campoNome => {
                                const campo = prest.campos.find(c => c.nome === campoNome);
                                if (campo && campo.valor && campo.valor !== '0' && campo.valor !== '000000') {
                                  let valorExibido = campo.valor;
                                  if (campo.nome === 'TP_PREST') valorExibido = tipoPrestadorMap[campo.valor]?.descricao || campo.valor;
                                  if (campo.nome === 'TP_VINCULO') valorExibido = tipoVinculoMap[campo.valor]?.descricao || campo.valor;
                                  if (campo.nome === 'TP_DISPONIBILIDADE') valorExibido = disponibilidadeMap[campo.valor] || campo.valor;
                                  if (campo.nome === 'TIPO_REDE_MIN') valorExibido = tipoRedeMinMap[campo.valor] || campo.valor;

                                  const isError = prest.validacoes.some(v => v.campo === campo.nome && v.tipo === 'erro');
                                  const isWarning = prest.validacoes.some(v => v.campo === campo.nome && v.tipo === 'aviso');

                                  return (
                                    <div key={campoNome} className={`bg-black/30 rounded-xl p-3 hover:bg-black/40 transition-all ${isError ? 'border-l-4 border-red-500' : isWarning ? 'border-l-4 border-amber-500' : 'border-l-4 border-transparent'}`}>
                                      <div className="text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                                        {campo.nome} <span className="text-zinc-600">(pos. {campo.posIni}-{campo.posFim})</span>
                                      </div>
                                      <div className="text-base font-bold text-white font-mono break-all">{valorExibido}</div>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Especialidades */}
                      {(prest.cdEspec1 || prest.cdEspec2 || prest.cdAtua1 || prest.cdAtua2) && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5" /> Especialidades e Áreas de Atuação
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {prest.cdEspec1 && <CampoCopy label="Especialidade 1" value={prest.cdEspec1} posicao="pos. 148-149" />}
                            {prest.cdEspec2 && <CampoCopy label="Especialidade 2" value={prest.cdEspec2} posicao="pos. 152-153" />}
                            {prest.cdAtua1 && <CampoCopy label="Área de Atuação 1" value={prest.cdAtua1} posicao="pos. 150-151" />}
                            {prest.cdAtua2 && <CampoCopy label="Área de Atuação 2" value={prest.cdAtua2} posicao="pos. 154-155" />}
                          </div>
                          {(prest.idRceEspec1 === 'S' || prest.idRceAtua1 === 'S') && (
                            <div className="mt-4 text-xs text-emerald-400 flex items-center gap-2 bg-emerald-500/10 p-2 rounded-lg">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Possui certificação de especialista
                            </div>
                          )}
                        </div>
                      )}

                      {/* Endereços */}
                      {prest.enderecos.length > 0 && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> Endereços
                          </h4>
                          <div className="space-y-3">
                            {prest.enderecos.map((end, endIdx) => (
                              <div key={endIdx} className="bg-zinc-800/30 rounded-xl p-4 hover:bg-zinc-800/50 transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white mb-1">
                                      {end.dsEnd}, {end.nrEnd}
                                      {end.dsComplemento && ` - ${end.dsComplemento}`}
                                    </div>
                                    <div className="text-sm text-zinc-400">{end.dsBairro}</div>
                                    <div className="text-xs text-zinc-500 mt-2 flex gap-3 flex-wrap">
                                      <span>📮 CEP: {end.nrCep}</span>
                                      <span>🏥 CNES: {end.cdCnes}</span>
                                      {end.tpEnd && <span>📍 Tipo: {tipoEnderecoMap[end.tpEnd]?.descricao}</span>}
                                    </div>
                                    {end.nrFone1 && (
                                      <div className="text-sm text-zinc-400 mt-2 flex items-center gap-1">
                                        📞 {formatarTelefone(end.nrDdd, end.nrFone1)}
                                      </div>
                                    )}
                                    {end.dsEmail && (
                                      <div className="text-sm text-sky-400 mt-1 flex items-center gap-1">
                                        📧 {end.dsEmail}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const campoEnd = end.campos.find(c => c.nome === 'DS_END');
                                        if (campoEnd) openCampoModal(campoEnd);
                                      }}
                                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-all"
                                    >
                                      Ver Campos
                                    </button>
                                    {temLeitos && (
                                      <button
                                        onClick={() => openLeitosModal(end, prest.nmPrest)}
                                        className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                      >
                                        <Bed className="w-3 h-3" /> Leitos
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Redes de Atendimento */}
                      {prest.redes.length > 0 && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5" /> Redes de Atendimento
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {prest.redes.map((rede, i) => (
                              <div key={i} className="bg-zinc-800/50 rounded-xl px-4 py-3 hover:bg-zinc-800 transition-all">
                                <div className="text-xs text-zinc-500 mb-1">CD_REDE (pos. 12-15)</div>
                                <div className="text-lg font-bold text-white font-mono">{rede.cdRede}</div>
                                {rede.dsRede && <div className="text-xs text-zinc-400 mt-1">{rede.dsRede}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Serviços */}
                      {prest.servicos.length > 0 && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5" /> Serviços
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {prest.servicos.map((serv, i) => (
                              <div key={i} className="bg-zinc-800/50 rounded-xl px-4 py-3 hover:bg-zinc-800 transition-all">
                                <div className="text-xs text-zinc-500 mb-1">CD_GR_SERV (pos. 12-14)</div>
                                <div className="text-lg font-bold text-white font-mono">{serv.cdGrServ}</div>
                                {serv.dsServico && <div className="text-xs text-zinc-400 mt-1">{serv.dsServico}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observações */}
                      {prest.observacoes && prest.observacoes.length > 0 && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Observações
                          </h4>
                          <div className="space-y-2">
                            {prest.observacoes.map((obs, i) => (
                              <div key={i} className="bg-zinc-800/30 rounded-xl p-4">
                                <div className="text-xs text-zinc-500 mb-2">DIVULGA_OBS (pos. 12-261)</div>
                                <div className="text-sm text-zinc-300 leading-relaxed">{obs}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Informações de Conselho */}
                      {(prest.sgConselho || prest.nrConselho) && (
                        <div className="border border-zinc-800 rounded-xl p-5">
                          <h4 className="text-base font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" /> Conselho Profissional
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <CampoCopy label="Sigla do Conselho" value={prest.sgConselho} posicao="pos. 478-489" />
                            <CampoCopy label="Número do Conselho" value={prest.nrConselho} posicao="pos. 571-585" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {prestadoresFiltrados.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-zinc-500 font-medium">Nenhum prestador encontrado</div>
                <div className="text-sm text-zinc-600 mt-1">Tente ajustar os filtros para ampliar a busca</div>
              </div>
            )}
          </div>
        )}

        {/* Mensagem inicial */}
        {!arquivo && !carregando && (
          <div className="text-center py-16 border border-zinc-800 rounded-2xl bg-zinc-900/30">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-zinc-500 font-medium">Nenhum arquivo carregado</p>
            <p className="text-sm text-zinc-600 mt-1">Selecione um arquivo PTU (formato TXT) para visualizar os dados cadastrais</p>
          </div>
        )}

        {/* Modal de Informações */}
        <Modal isOpen={modalInfo.isOpen} onClose={() => setModalInfo({ isOpen: false, title: '', content: null })} title={modalInfo.title}>
          {modalInfo.content}
        </Modal>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f1f1f;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f3f;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f4f4f;
        }
      `}</style>
    </div>
  );
}