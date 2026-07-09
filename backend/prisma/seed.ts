import { PrismaClient, RoleCode } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type OrgSeedNode = {
  codigo: string;
  nombre: string;
  tipo: string;
  orden: number;
  esContenedorRat: boolean;
  children?: OrgSeedNode[];
};

type DependenciaSeed = {
  nombre: string;
  sigla: string | null;
  descripcion: string | null;
  subdirecciones: SubdireccionSeed[];
};

type SubdireccionSeed = {
  nombre: string;
  sigla: string | null;
  descripcion: string | null;
};

type CatalogSeedItem = {
  dominio: string;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
};

const DEPENDENCIA_SIGLAS: Record<string, string> = {
  "Direccion Actuarial, de Investigacion y Estadistica": "DAIE",
  "Direccion Nacional de Afiliacion y Cobertura": "DNAC",
  "Direccion Nacional de Comunicacion Social": "DNCS",
  "Direccion Nacional de Cooperacion y Relaciones Internacionales": "DNCRI",
  "Direccion Nacional de Fondos de Terceros y Seguro de Desempleo": "DNFTSD",
  "Direccion Nacional de Gestion Financiera": "DNGF",
  "Direccion Nacional de Planificacion": "DNPL",
  "Direccion Nacional de Procesos": "DNPR",
  "Direccion Nacional de Recaudacion y Gestion de Cartera": "DNRGC",
  "Direccion Nacional de Servicios Corporativos": "DNSC",
  "Direccion Nacional de Servicios de Atencion al Ciudadano": "DNSAC",
  "Direccion Nacional de Tecnologias de la Informacion": "DNTI",
  "Direccion del Seguro General de Riesgos del Trabajo": "DSGRT",
  "Direccion del Seguro General de Salud Individual y Familiar": "DSGSIF",
  "Direccion del Seguro Social Campesino": "DSSC",
  "Direccion del Sistema de Pensiones": "DSP",
  "Procuraduria General": "PG",
};

const TIPO_PROCESO_ALIASES: Record<string, string[]> = {
  "Procesos sustantivos dependientes de la Direccion General": ["Procesos sustantivos"],
};

const CATALOG_TYPE_LABELS: Record<string, string> = {
  BASE_LICITUD: "base de licitud",
  TIPO_TITULAR: "tipo de titular",
  CATEGORIA_DATO: "categoria de dato",
  ORIGEN_DATO: "origen de dato",
  ACCION_TRATAMIENTO: "accion de tratamiento",
  VOLUMEN_TRATAMIENTO: "volumen del tratamiento",
  FRECUENCIA_TRATAMIENTO: "frecuencia del tratamiento",
  PATRON_CONSERVACION: "patron de conservacion",
  ALCANCE_GEOGRAFICO: "alcance geografico",
  RESPUESTA_BINARIA: "respuesta binaria",
  CATEGORIA_TERCERO: "categoria de tercero",
  PAIS: "pais",
  TIPO_ACTIVO: "tipo de activo",
  CLASIFICACION_INFORMACION: "clasificacion de informacion",
  NIVEL_ACTIVO: "nivel del activo",
  AMBIENTE_ACTIVO: "ambiente del activo",
  CLASIFICACION_INFO_ACTIVO: "clasificacion de informacion del activo",
  VISIBILIDAD_INTERNET: "visibilidad desde internet",
  FUENTE_ACTIVO: "fuente del activo",
  IMPACTO_ACTIVO: "impacto del activo",
  DATOS_PERSONALES_ACTIVO: "datos personales en el activo",
  BAJA_PROGRAMADA_ACTIVO: "motivo de baja programada",
  PROPIEDAD_INTELECTUAL_ACTIVO: "propiedad intelectual del activo",
  CRITERIO_EIPD: "criterio de activacion EIPD",
  MEDIDA_TIPO_EIPD: "tipo de medida EIPD",
  TIPO_SALVAGUARDA_INTERNACIONAL: "salvaguarda de transferencia internacional",
  PERIODICIDAD_REVISION: "periodicidad de revision",
  NIVEL_RIESGO: "nivel de riesgo",
  DIMENSION_RIESGO: "dimension del riesgo",
  PROBABILIDAD_RIESGO: "probabilidad del riesgo",
  TIPO_CONTROL_RIESGO: "tipo de control del riesgo",
  CATEGORIA_AMENAZA: "categoria de amenaza",
};

const CATALOG_DOMAIN_BY_TYPE: Record<string, string> = {
  BASE_LICITUD: "TRATAMIENTOS",
  TIPO_TITULAR: "TRATAMIENTOS",
  CATEGORIA_DATO: "TRATAMIENTOS",
  ORIGEN_DATO: "TRATAMIENTOS",
  ACCION_TRATAMIENTO: "TRATAMIENTOS",
  VOLUMEN_TRATAMIENTO: "TRATAMIENTOS",
  FRECUENCIA_TRATAMIENTO: "TRATAMIENTOS",
  PATRON_CONSERVACION: "TRATAMIENTOS",
  ALCANCE_GEOGRAFICO: "TRATAMIENTOS",
  RESPUESTA_BINARIA: "GENERAL",
  CATEGORIA_TERCERO: "TRATAMIENTOS",
  TIPO_SALVAGUARDA_INTERNACIONAL: "TRATAMIENTOS",
  PERIODICIDAD_REVISION: "GENERAL",
  PAIS: "GENERAL",
  TIPO_ACTIVO: "ACTIVOS",
  CLASIFICACION_INFORMACION: "TRATAMIENTOS",
  NIVEL_ACTIVO: "ACTIVOS",
  AMBIENTE_ACTIVO: "ACTIVOS",
  CLASIFICACION_INFO_ACTIVO: "ACTIVOS",
  VISIBILIDAD_INTERNET: "ACTIVOS",
  FUENTE_ACTIVO: "ACTIVOS",
  IMPACTO_ACTIVO: "ACTIVOS",
  DATOS_PERSONALES_ACTIVO: "ACTIVOS",
  BAJA_PROGRAMADA_ACTIVO: "ACTIVOS",
  PROPIEDAD_INTELECTUAL_ACTIVO: "ACTIVOS",
  CRITERIO_EIPD: "EIPD",
  MEDIDA_TIPO_EIPD: "EIPD",
  NIVEL_RIESGO: "RIESGOS",
  DIMENSION_RIESGO: "RIESGOS",
  PROBABILIDAD_RIESGO: "RIESGOS",
  TIPO_CONTROL_RIESGO: "RIESGOS",
  CATEGORIA_AMENAZA: "RIESGOS",
};

const CATALOG_CODE_OVERRIDES: Record<string, string> = {
  "BASE_LICITUD:Cumplimiento de obligaciones legales": "OBLIGACION_LEGAL",
  "BASE_LICITUD:Mision o interes publico": "MISION_PUBLICA",
  "TIPO_ACTIVO:Aplicacion (Web)": "APLICACION_WEB",
  "TIPO_ACTIVO:Aplicacion": "APLICACION",
  "TIPO_ACTIVO:Software (Cliente / Servidor)": "SOFTWARE_CLIENTE_SERVIDOR",
  "TIPO_ACTIVO:Componente (Webservices)": "COMPONENTE_WEBSERVICES",
  "TIPO_ACTIVO:Base de datos": "BASE_DATOS",
  "TIPO_ACTIVO:Equipo servidor (fisico / virtual)": "EQUIPO_SERVIDOR",
  "TIPO_ACTIVO:Equipo hardware": "EQUIPO_HARDWARE",
  "TIPO_ACTIVO:Repositorio digital": "REPOSITORIO_DIGITAL",
  "TIPO_ACTIVO:Repositorio (Documentacion fisica / digital)": "REPOSITORIO_DOCUMENTAL",
  "TIPO_ACTIVO:Repositorio fisico": "REPOSITORIO_FISICO",
  "TIPO_ACTIVO:Servicio / Proveedor": "SERVICIO_PROVEEDOR",
  "CLASIFICACION_INFORMACION:Alta": "ALTA",
  "CLASIFICACION_INFORMACION:Media": "MEDIA",
  "CLASIFICACION_INFORMACION:Baja": "BAJA",
  "CLASIFICACION_INFO_ACTIVO:Reservado": "RESERVADO",
  "CLASIFICACION_INFO_ACTIVO:Interno": "INTERNO",
  "CLASIFICACION_INFO_ACTIVO:Confidencial": "CONFIDENCIAL",
  "CLASIFICACION_INFO_ACTIVO:Publico": "PUBLICO",
  "CLASIFICACION_INFO_ACTIVO:Sensible": "SENSIBLE",
  "CLASIFICACION_INFO_ACTIVO:No aplica": "NO_APLICA",
  "NIVEL_ACTIVO:Nivel A": "NIVEL_A",
  "NIVEL_ACTIVO:Nivel B": "NIVEL_B",
  "NIVEL_ACTIVO:Nivel C": "NIVEL_C",
  "NIVEL_ACTIVO:Nivel B1": "NIVEL_B1",
  "NIVEL_ACTIVO:Nivel B2": "NIVEL_B2",
  "NIVEL_ACTIVO:Nivel B 2.1": "NIVEL_B_2_1",
  "NIVEL_ACTIVO:Nivel B 2.2": "NIVEL_B_2_2",
  "NIVEL_ACTIVO:Nivel B 2.3": "NIVEL_B_2_3",
  "AMBIENTE_ACTIVO:Produccion": "PRODUCCION",
  "AMBIENTE_ACTIVO:No aplica": "NO_APLICA",
  "VISIBILIDAD_INTERNET:Si": "SI",
  "VISIBILIDAD_INTERNET:No": "NO",
  "VISIBILIDAD_INTERNET:No (VPN)": "NO_VPN",
  "VISIBILIDAD_INTERNET:Mixto": "MIXTO",
  "VISIBILIDAD_INTERNET:No aplica": "NO_APLICA",
  "FUENTE_ACTIVO:Usuario final": "USUARIO_FINAL",
  "FUENTE_ACTIVO:Usuario fuente": "USUARIO_FUENTE",
  "IMPACTO_ACTIVO:Menor": "MENOR",
  "IMPACTO_ACTIVO:Moderado": "MODERADO",
  "IMPACTO_ACTIVO:Mayor": "MAYOR",
  "IMPACTO_ACTIVO:Catastrofico": "CATASTROFICO",
  // Datos personales activo
  "DATOS_PERSONALES_ACTIVO:Si": "SI",
  "DATOS_PERSONALES_ACTIVO:No": "NO",
  "DATOS_PERSONALES_ACTIVO:Parcialmente": "PARCIALMENTE",
  // Baja programada
  "BAJA_PROGRAMADA_ACTIVO:No aplica": "NO_APLICA",
  "BAJA_PROGRAMADA_ACTIVO:Obsolescencia tecnologica": "OBSOLESCENCIA",
  "BAJA_PROGRAMADA_ACTIVO:Fin de vida util": "FIN_VIDA_UTIL",
  "BAJA_PROGRAMADA_ACTIVO:Reemplazo por nuevo sistema": "REEMPLAZO",
  "BAJA_PROGRAMADA_ACTIVO:Baja por incidente de seguridad": "INCIDENTE_SEGURIDAD",
  "BAJA_PROGRAMADA_ACTIVO:Consolidacion de activos": "CONSOLIDACION",
  "BAJA_PROGRAMADA_ACTIVO:Cambio de proveedor": "CAMBIO_PROVEEDOR",
  // Propiedad intelectual
  "PROPIEDAD_INTELECTUAL_ACTIVO:Institucional": "INSTITUCIONAL",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Licenciado": "LICENCIADO",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Open Source": "OPEN_SOURCE",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Mixto": "MIXTO",
  "PROPIEDAD_INTELECTUAL_ACTIVO:No aplica": "NO_APLICA",
  // Criterios EIPD
  "CRITERIO_EIPD:Evaluacion sistematica o perfilamiento de titulares": "PERFILAMIENTO",
  "CRITERIO_EIPD:Tratamiento a gran escala de datos sensibles": "GRAN_ESCALA_SENSIBLES",
  "CRITERIO_EIPD:Vigilancia sistematica de zonas de acceso publico": "VIGILANCIA_PUBLICA",
  "CRITERIO_EIPD:Tratamiento de datos de personas vulnerables": "PERSONAS_VULNERABLES",
  "CRITERIO_EIPD:Uso de tecnologias innovadoras o nuevas tecnologias": "TECNOLOGIA_INNOVADORA",
  "CRITERIO_EIPD:Transferencia internacional sin nivel de proteccion adecuado": "TRANSFERENCIA_INTERNACIONAL",
  "CRITERIO_EIPD:Decisiones automatizadas con efectos significativos": "DECISION_AUTOMATIZADA",
  "CRITERIO_EIPD:Cruce o combinacion de multiples conjuntos de datos": "CRUCE_DATOS",
  // Medidas EIPD
  "MEDIDA_TIPO_EIPD:Tecnica": "TECNICA",
  "MEDIDA_TIPO_EIPD:Organizativa": "ORGANIZATIVA",
  "MEDIDA_TIPO_EIPD:Legal": "LEGAL",
  "MEDIDA_TIPO_EIPD:Fisica": "FISICA",
  "MEDIDA_TIPO_EIPD:Preventiva": "PREVENTIVA",
  "MEDIDA_TIPO_EIPD:Correctiva": "CORRECTIVA",
  // Salvaguardas internacionales
  "TIPO_SALVAGUARDA_INTERNACIONAL:Clausulas contractuales tipo": "CLAUSULAS_TIPO",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Normas corporativas vinculantes (BCR)": "BCR",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Consentimiento explicito del titular": "CONSENTIMIENTO",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Necesidad contractual": "NECESIDAD_CONTRACTUAL",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Interes vital del titular": "INTERES_VITAL",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Interes publico importante": "INTERES_PUBLICO",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Decision de adecuacion de la SDP": "ADECUACION_SDP",
  // Periodicidad
  "PERIODICIDAD_REVISION:Anual": "ANUAL",
  "PERIODICIDAD_REVISION:Semestral": "SEMESTRAL",
  "PERIODICIDAD_REVISION:Trimestral": "TRIMESTRAL",
  "PERIODICIDAD_REVISION:Mensual": "MENSUAL",
  "PERIODICIDAD_REVISION:Bienal": "BIENAL",
  // Nivel riesgo
  "NIVEL_RIESGO:Bajo": "BAJO",
  "NIVEL_RIESGO:Medio": "MEDIO",
  "NIVEL_RIESGO:Alto": "ALTO",
  "NIVEL_RIESGO:Critico": "CRITICO",
  // Dimension riesgo
  "DIMENSION_RIESGO:Confidencialidad": "CONFIDENCIALIDAD",
  "DIMENSION_RIESGO:Integridad": "INTEGRIDAD",
  "DIMENSION_RIESGO:Disponibilidad": "DISPONIBILIDAD",
  "DIMENSION_RIESGO:Privacidad": "PRIVACIDAD",
  // Probabilidad riesgo
  "PROBABILIDAD_RIESGO:1 - Muy Baja": "MUY_BAJA",
  "PROBABILIDAD_RIESGO:2 - Baja": "BAJA",
  "PROBABILIDAD_RIESGO:3 - Media": "MEDIA",
  "PROBABILIDAD_RIESGO:4 - Alta": "ALTA",
  "PROBABILIDAD_RIESGO:5 - Muy Alta": "MUY_ALTA",
  // Tipo control riesgo
  "TIPO_CONTROL_RIESGO:Preventivo": "PREVENTIVO",
  "TIPO_CONTROL_RIESGO:Detectivo": "DETECTIVO",
  "TIPO_CONTROL_RIESGO:Correctivo": "CORRECTIVO",
  "TIPO_CONTROL_RIESGO:Transferencia": "TRANSFERENCIA",
  "TIPO_CONTROL_RIESGO:Aceptacion": "ACEPTACION",
  "TIPO_CONTROL_RIESGO:Eliminacion": "ELIMINACION",
  // Categoria amenaza
  "CATEGORIA_AMENAZA:Acceso no autorizado": "ACCESO_NO_AUTORIZADO",
  "CATEGORIA_AMENAZA:Perdida o robo de informacion": "PERDIDA_ROBO",
  "CATEGORIA_AMENAZA:Modificacion no autorizada": "MODIFICACION_NO_AUTORIZADA",
  "CATEGORIA_AMENAZA:Denegacion de servicio": "DENEGACION_SERVICIO",
  "CATEGORIA_AMENAZA:Divulgacion no intencionada": "DIVULGACION",
  "CATEGORIA_AMENAZA:Error humano": "ERROR_HUMANO",
  "CATEGORIA_AMENAZA:Falla tecnologica": "FALLA_TECNOLOGICA",
  "CATEGORIA_AMENAZA:Desastre natural o fisico": "DESASTRE_NATURAL",
  "CATEGORIA_AMENAZA:Ataque externo (malware, phishing)": "ATAQUE_EXTERNO",
  "CATEGORIA_AMENAZA:Incumplimiento normativo": "INCUMPLIMIENTO_NORMATIVO",
};

const CATALOG_DESCRIPTION_OVERRIDES: Record<string, string> = {
  "BASE_LICITUD:Cumplimiento de obligaciones legales":
    "Tratamientos sustentados por deberes legales o reglamentarios institucionales.",
  "BASE_LICITUD:Mision o interes publico":
    "Base utilizada cuando la actividad responde a competencias institucionales de interes general.",
  "TIPO_ACTIVO:Aplicacion (Web)":
    "Solucion de software que soporta una actividad de tratamiento o un control operativo.",
  "TIPO_ACTIVO:Aplicacion":
    "Aplicacion institucional o funcional que soporta operaciones de negocio y tratamiento de informacion.",
  "TIPO_ACTIVO:Software (Cliente / Servidor)":
    "Software de escritorio o de servidor que procesa, expone o administra informacion institucional.",
  "TIPO_ACTIVO:Componente (Webservices)":
    "Componente de integracion o servicio web utilizado por aplicaciones y procesos institucionales.",
  "TIPO_ACTIVO:Base de datos":
    "Repositorio estructurado que aloja registros personales, transaccionales o historicos.",
  "TIPO_ACTIVO:Equipo servidor (fisico / virtual)":
    "Infraestructura de procesamiento o almacenamiento que aloja aplicaciones, servicios o repositorios.",
  "TIPO_ACTIVO:Equipo hardware":
    "Equipo fisico o tecnologico que soporta procesos institucionales o custodia informacion.",
  "TIPO_ACTIVO:Repositorio digital":
    "Repositorio logico o carpeta compartida que consolida documentos, evidencias o archivos digitales.",
  "TIPO_ACTIVO:Repositorio (Documentacion fisica / digital)":
    "Repositorio documental fisico o digital utilizado para custodiar expedientes y soportes operativos.",
  "TIPO_ACTIVO:Repositorio fisico":
    "Repositorio material o archivo fisico para custodia documental institucional.",
  "TIPO_ACTIVO:Servicio / Proveedor":
    "Servicio externo o provedor tecnologico que participa en la operacion del activo.",
  "CLASIFICACION_INFORMACION:Alta":
    "Informacion sensible o critica que exige controles reforzados y seguimiento priorizado.",
  "CLASIFICACION_INFORMACION:Media":
    "Informacion operativa que requiere salvaguardas estandar y monitoreo regular.",
  "CLASIFICACION_INFORMACION:Baja":
    "Informacion con afectacion acotada, sujeta a controles basicos y uso institucional controlado.",
  "NIVEL_ACTIVO:Nivel A":
    "Nivel de exposicion acotada o bajo impacto tecnologico sobre la operacion del activo.",
  "NIVEL_ACTIVO:Nivel B":
    "Nivel de soporte intermedio con dependencia operativa recurrente.",
  "NIVEL_ACTIVO:Nivel C":
    "Nivel de soporte elevado o sensible para la continuidad del activo.",
  "AMBIENTE_ACTIVO:Produccion":
    "Ambiente operativo vigente donde el activo soporta procesamiento o disponibilidad institucional.",
  "CLASIFICACION_INFO_ACTIVO:Reservado":
    "Informacion de acceso restringido que requiere controles reforzados por su sensibilidad institucional.",
  "CLASIFICACION_INFO_ACTIVO:Interno":
    "Informacion para uso institucional, no destinada a difusion publica.",
  "CLASIFICACION_INFO_ACTIVO:Confidencial":
    "Informacion de alta reserva cuyo acceso debe limitarse estrictamente por necesidad operativa.",
  "CLASIFICACION_INFO_ACTIVO:Publico":
    "Informacion de libre conocimiento o difusion institucional controlada.",
  "CLASIFICACION_INFO_ACTIVO:Sensible":
    "Informacion con impacto elevado sobre privacidad, seguridad o continuidad institucional.",
  "VISIBILIDAD_INTERNET:Si":
    "El activo es visible o accesible desde internet.",
  "VISIBILIDAD_INTERNET:No":
    "El activo permanece restringido a redes internas o perimetros institucionales.",
  "VISIBILIDAD_INTERNET:No (VPN)":
    "El activo no es publico y requiere canales controlados como VPN para su acceso.",
  "VISIBILIDAD_INTERNET:Mixto":
    "El activo combina componentes visibles y no visibles desde internet.",
  "FUENTE_ACTIVO:Usuario final":
    "Activo identificado o reportado por el usuario final del proceso institucional.",
  "IMPACTO_ACTIVO:Menor":
    "Afectacion acotada sobre confidencialidad, integridad o disponibilidad.",
  "IMPACTO_ACTIVO:Moderado":
    "Afectacion relevante que demanda seguimiento operativo y controles compensatorios.",
  "IMPACTO_ACTIVO:Mayor":
    "Afectacion alta sobre la operacion, la privacidad o la disponibilidad institucional.",
  "IMPACTO_ACTIVO:Catastrofico":
    "Afectacion critica con alto potencial de interrupcion o dano severo.",
  // Datos personales en el activo
  "DATOS_PERSONALES_ACTIVO:Si":
    "El activo almacena, procesa o transmite datos personales de forma directa.",
  "DATOS_PERSONALES_ACTIVO:No":
    "El activo no tiene relacion con datos personales.",
  "DATOS_PERSONALES_ACTIVO:Parcialmente":
    "El activo procesa datos personales de forma indirecta o en componentes especificos.",
  // Baja programada
  "BAJA_PROGRAMADA_ACTIVO:No aplica":
    "El activo no tiene fecha de baja programada.",
  "BAJA_PROGRAMADA_ACTIVO:Obsolescencia tecnologica":
    "El activo sera dado de baja por quedar tecnologicamente obsoleto.",
  "BAJA_PROGRAMADA_ACTIVO:Fin de vida util":
    "El activo alcanza el termino de su ciclo de vida operativa.",
  "BAJA_PROGRAMADA_ACTIVO:Reemplazo por nuevo sistema":
    "El activo sera sustituido por una nueva solucion tecnologica.",
  "BAJA_PROGRAMADA_ACTIVO:Baja por incidente de seguridad":
    "El activo sera dado de baja como consecuencia de un incidente de seguridad.",
  "BAJA_PROGRAMADA_ACTIVO:Consolidacion de activos":
    "El activo se fusiona con otro para reducir la superficie de riesgo.",
  "BAJA_PROGRAMADA_ACTIVO:Cambio de proveedor":
    "El activo sera reemplazado por la migracion a otro proveedor de servicio.",
  // Propiedad intelectual
  "PROPIEDAD_INTELECTUAL_ACTIVO:Institucional":
    "Activo desarrollado o creado por la propia institucion.",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Licenciado":
    "Activo cubierto por licencia comercial de un tercero.",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Open Source":
    "Activo basado en codigo abierto bajo licencia publica reconocida.",
  "PROPIEDAD_INTELECTUAL_ACTIVO:Mixto":
    "Activo que combina componentes propietarios y de codigo abierto.",
  "PROPIEDAD_INTELECTUAL_ACTIVO:No aplica":
    "No aplica propiedad intelectual formal al activo.",
  // Criterios EIPD (LOPDP Art. 60 + WP29)
  "CRITERIO_EIPD:Evaluacion sistematica o perfilamiento de titulares":
    "Tratamiento que evalua, clasifica o predice aspectos personales de forma automatizada.",
  "CRITERIO_EIPD:Tratamiento a gran escala de datos sensibles":
    "Procesamiento masivo de categorias especiales de datos (salud, biometricos, sindicales, menores, etc.).",
  "CRITERIO_EIPD:Vigilancia sistematica de zonas de acceso publico":
    "Monitoreo de espacios publicos mediante video, sensores u otros medios continuos.",
  "CRITERIO_EIPD:Tratamiento de datos de personas vulnerables":
    "Tratamiento que involucra menores de edad, pacientes, personas con discapacidad u otras poblaciones vulnerables.",
  "CRITERIO_EIPD:Uso de tecnologias innovadoras o nuevas tecnologias":
    "Tratamiento que emplea inteligencia artificial, biometria, IoT u otras tecnologias emergentes.",
  "CRITERIO_EIPD:Transferencia internacional sin nivel de proteccion adecuado":
    "Flujo de datos personales hacia paises o entidades sin reconocimiento de nivel adecuado de proteccion.",
  "CRITERIO_EIPD:Decisiones automatizadas con efectos significativos":
    "Tratamiento que produce decisiones automaticas con efecto juridico o significativo sobre el titular.",
  "CRITERIO_EIPD:Cruce o combinacion de multiples conjuntos de datos":
    "Vinculacion de bases de datos de distintos origenes que supera la expectativa original del titular.",
  // Medidas EIPD
  "MEDIDA_TIPO_EIPD:Tecnica":
    "Controles tecnologicos: cifrado, seudonimizacion, control de acceso, anonimizacion, etc.",
  "MEDIDA_TIPO_EIPD:Organizativa":
    "Politicas, procedimientos, capacitacion y gestion de acceso basados en roles.",
  "MEDIDA_TIPO_EIPD:Legal":
    "Clausulas contractuales, acuerdos de confidencialidad, normativa interna y compromisos legales.",
  "MEDIDA_TIPO_EIPD:Fisica":
    "Controles de seguridad fisica: acceso a instalaciones, custodia de equipos, destruccion segura.",
  "MEDIDA_TIPO_EIPD:Preventiva":
    "Medidas orientadas a evitar que el riesgo se materialice antes del tratamiento.",
  "MEDIDA_TIPO_EIPD:Correctiva":
    "Medidas de respuesta y remediacion una vez detectado un incidente o riesgo materializado.",
  // Salvaguardas internacionales
  "TIPO_SALVAGUARDA_INTERNACIONAL:Clausulas contractuales tipo":
    "Contratos que incluyen clausulas estandar aprobadas por la autoridad de proteccion de datos.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Normas corporativas vinculantes (BCR)":
    "Politicas internas vinculantes aprobadas para grupos empresariales multinacionales.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Consentimiento explicito del titular":
    "El titular ha autorizado expresamente la transferencia internacional de sus datos.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Necesidad contractual":
    "La transferencia es necesaria para la ejecucion o cumplimiento de un contrato con el titular.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Interes vital del titular":
    "La transferencia protege intereses vitales del titular cuando no puede prestar consentimiento.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Interes publico importante":
    "La transferencia responde a un interes publico reconocido legalmente.",
  "TIPO_SALVAGUARDA_INTERNACIONAL:Decision de adecuacion de la SDP":
    "El pais de destino cuenta con decision de nivel adecuado emitida por la Superintendencia de Datos Personales.",
  // Periodicidad
  "PERIODICIDAD_REVISION:Anual":
    "Revision programada con frecuencia anual.",
  "PERIODICIDAD_REVISION:Semestral":
    "Revision programada con frecuencia semestral (cada 6 meses).",
  "PERIODICIDAD_REVISION:Trimestral":
    "Revision programada con frecuencia trimestral (cada 3 meses).",
  "PERIODICIDAD_REVISION:Mensual":
    "Revision programada con frecuencia mensual.",
  "PERIODICIDAD_REVISION:Bienal":
    "Revision programada con frecuencia bienal (cada 2 anos).",
  // Nivel riesgo
  "NIVEL_RIESGO:Bajo":
    "Riesgo bajo o aceptable. No requiere tratamiento inmediato; seguimiento periodico.",
  "NIVEL_RIESGO:Medio":
    "Riesgo moderado. Requiere plan de tratamiento y seguimiento activo.",
  "NIVEL_RIESGO:Alto":
    "Riesgo elevado. Requiere tratamiento prioritario y controles reforzados.",
  "NIVEL_RIESGO:Critico":
    "Riesgo critico. Requiere accion inmediata; puede implicar suspension del tratamiento.",
  // Dimension riesgo
  "DIMENSION_RIESGO:Confidencialidad":
    "Riesgo de exposicion no autorizada de informacion o datos personales.",
  "DIMENSION_RIESGO:Integridad":
    "Riesgo de alteracion, corrupcion o modificacion no autorizada de datos.",
  "DIMENSION_RIESGO:Disponibilidad":
    "Riesgo de interrupcion del acceso a sistemas, servicios o datos.",
  "DIMENSION_RIESGO:Privacidad":
    "Riesgo de afectacion a los derechos de proteccion de datos personales de los titulares.",
  // Probabilidad riesgo
  "PROBABILIDAD_RIESGO:1 - Muy Baja":
    "Evento altamente improbable. Ocurrencia historica nula o muy remota.",
  "PROBABILIDAD_RIESGO:2 - Baja":
    "Evento poco probable. Ha ocurrido en casos excepcionales.",
  "PROBABILIDAD_RIESGO:3 - Media":
    "Evento posible. Ha ocurrido en la institucion o en el sector.",
  "PROBABILIDAD_RIESGO:4 - Alta":
    "Evento probable. Existe evidencia frecuente de ocurrencia.",
  "PROBABILIDAD_RIESGO:5 - Muy Alta":
    "Evento casi certero. Se espera que ocurra en condiciones normales.",
  // Tipo control riesgo
  "TIPO_CONTROL_RIESGO:Preventivo":
    "Control orientado a impedir que el riesgo se materialice.",
  "TIPO_CONTROL_RIESGO:Detectivo":
    "Control orientado a identificar la materializacion del riesgo a tiempo.",
  "TIPO_CONTROL_RIESGO:Correctivo":
    "Control orientado a reducir el impacto tras la materializacion del riesgo.",
  "TIPO_CONTROL_RIESGO:Transferencia":
    "Estrategia que traslada el riesgo a un tercero (seguro, contrato, externalización).",
  "TIPO_CONTROL_RIESGO:Aceptacion":
    "Decision de asumir el riesgo como tolerable dentro del apetito institucional.",
  "TIPO_CONTROL_RIESGO:Eliminacion":
    "Estrategia que elimina la fuente del riesgo suprimiendo la actividad que lo genera.",
  // Categoria amenaza
  "CATEGORIA_AMENAZA:Acceso no autorizado":
    "Ingreso o uso ilegitimo de sistemas, redes o repositorios de datos.",
  "CATEGORIA_AMENAZA:Perdida o robo de informacion":
    "Perdida fisica o logica de activos de informacion o datos personales.",
  "CATEGORIA_AMENAZA:Modificacion no autorizada":
    "Alteracion indebida de datos, registros o configuraciones del sistema.",
  "CATEGORIA_AMENAZA:Denegacion de servicio":
    "Interrupcion intencional o accidental de la disponibilidad de servicios.",
  "CATEGORIA_AMENAZA:Divulgacion no intencionada":
    "Exposicion accidental de informacion sensible o datos personales.",
  "CATEGORIA_AMENAZA:Error humano":
    "Falla derivada de actuaciones involuntarias de usuarios internos.",
  "CATEGORIA_AMENAZA:Falla tecnologica":
    "Averia de hardware, software o infraestructura tecnologica.",
  "CATEGORIA_AMENAZA:Desastre natural o fisico":
    "Evento fisico externo que afecta instalaciones o equipos (inundacion, sismo, incendio).",
  "CATEGORIA_AMENAZA:Ataque externo (malware, phishing)":
    "Amenaza proveniente de actores externos mediante tecnicas de ataque cibernetico.",
  "CATEGORIA_AMENAZA:Incumplimiento normativo":
    "Riesgo derivado del incumplimiento de la LOPDP u otras normas aplicables.",
};

const MASTER_CATALOGS: CatalogSeedItem[] = [
  ...buildCatalogSeed("BASE_LICITUD", [
    "Consentimiento expreso del titular",
    "Ejecucion de relaciones precontractuales y contractuales",
    "Interes vital del titular",
    "Cumplimiento de obligaciones legales",
    "Mision o interes publico",
  ]),
  ...buildCatalogSeed("TIPO_TITULAR", [
    "Colaboradores (Servidores, Funcionarios)",
    "Colaboradores (Trabajadores)",
    "Exservidores",
    "Pasantes",
    "Practicantes estudiantiles",
    "Internos rotativos",
    "Postulantes a procesos de seleccion",
    "Afiliados",
    "Pensionistas",
    "Beneficiarios",
    "Jubilados",
    "Derechohabientes",
    "Empleador persona natural",
    "Apoderados o mandatarios",
    "Personal de contratistas o consultores",
    "Tutores o representantes legales",
  ]),
  ...buildCatalogSeed("CATEGORIA_DATO", [
    "Datos de identificacion",
    "Datos de contacto",
    "Datos laborales",
    "Datos academicos",
    "Datos financieros, bancarios o crediticios",
    "Datos de parentesco o vinculo",
    "Datos legales y de cumplimiento normativo",
    "Datos socioeconomicos",
    "Datos de filiacion",
    "Datos de salud",
    "Datos biometricos",
    "Datos de diversidad y autoidentificacion",
    "Datos de condicion migratoria",
    "Datos relacionados con afiliacion sindical o gremial",
    "Datos de personas con discapacidad y sus sustitutos",
    "Datos de menores de edad",
  ]),
  ...buildCatalogSeed("ORIGEN_DATO", [
    "Entrega directa por parte del titular",
    "Generacion y registro automatico a partir de sistemas institucionales",
    "Interoperabilidad e intercambio interinstitucional",
    "Fuentes publicas",
    "Obligaciones legales, regulatorias o judiciales",
  ]),
  ...buildCatalogSeed("ACCION_TRATAMIENTO", [
    "Creacion / Recoleccion",
    "Uso / Procesamiento",
    "Almacenamiento / Conservacion",
    "Encargo / Transferencia o comunicacion",
    "Archivado",
    "Eliminacion / Supresion",
  ]),
  ...buildCatalogSeed("VOLUMEN_TRATAMIENTO", [
    "0 a 1000",
    "1001 a 10000",
    "10001 a 100000",
    "100001 en adelante",
  ]),
  ...buildCatalogSeed("FRECUENCIA_TRATAMIENTO", [
    "Puntual",
    "Periodica o recurrente",
    "Continua o en tiempo real",
  ]),
  ...buildCatalogSeed("PATRON_CONSERVACION", [
    "Ocasional",
    "Temporal",
    "Prolongada",
  ]),
  ...buildCatalogSeed("ALCANCE_GEOGRAFICO", [
    "Local",
    "Nacional",
    "Global o transfronterizo",
  ]),
  ...buildCatalogSeed("RESPUESTA_BINARIA", ["SI", "NO"]),
  ...buildCatalogSeed("CATEGORIA_TERCERO", [
    "Encargado - Instituciones publicas",
    "Encargado - Instituciones privadas",
    "Encargado internacional",
    "Destinatario - Instituciones publicas",
    "Destinatario - Instituciones privadas",
    "Destinatario - Autoridades administrativas y judiciales",
    "Destinatario internacional",
  ]),
  ...buildCatalogSeed("PAIS", [
    // América del Sur
    "Ecuador",
    "Colombia",
    "Brasil",
    "Chile",
    "Argentina",
    "Peru",
    "Bolivia",
    "Venezuela",
    "Uruguay",
    "Paraguay",
    "Guyana",
    "Surinam",
    // América Central y Caribe
    "Mexico",
    "Panama",
    "Costa Rica",
    "Guatemala",
    "Honduras",
    "El Salvador",
    "Nicaragua",
    "Cuba",
    "Republica Dominicana",
    "Haiti",
    // América del Norte
    "Estados Unidos",
    "Canada",
    // Europa — con decisión de adecuación o principales destinos
    "Espana",
    "Alemania",
    "Francia",
    "Italia",
    "Reino Unido",
    "Portugal",
    "Paises Bajos",
    "Belgica",
    "Suiza",
    "Austria",
    "Suecia",
    "Noruega",
    "Dinamarca",
    "Finlandia",
    "Polonia",
    "Irlanda",
    "Luxemburgo",
    // Asia-Pacifico
    "Japon",
    "Australia",
    "Nueva Zelanda",
    "Corea del Sur",
    "India",
    "China",
    "Singapur",
    // Medio Oriente y Africa
    "Israel",
    "Emiratos Arabes Unidos",
    "Sudafrica",
  ]),
  ...buildCatalogSeed("TIPO_ACTIVO", [
    "Aplicacion (Web)",
    "Aplicacion",
    "Software (Cliente / Servidor)",
    "Componente (Webservices)",
    "Base de datos",
    "Equipo servidor (fisico / virtual)",
    "Equipo hardware",
    "Repositorio digital",
    "Repositorio (Documentacion fisica / digital)",
    "Repositorio fisico",
    "Servicio / Proveedor",
  ]),
  ...buildCatalogSeed("CLASIFICACION_INFORMACION", ["Alta", "Media", "Baja"]),
  ...buildCatalogSeed("NIVEL_ACTIVO", [
    "Nivel A",
    "Nivel B",
    "Nivel C",
    "Nivel B1",
    "Nivel B2",
    "Nivel B 2.1",
    "Nivel B 2.2",
    "Nivel B 2.3",
  ]),
  ...buildCatalogSeed("AMBIENTE_ACTIVO", ["Produccion", "No aplica"]),
  ...buildCatalogSeed("CLASIFICACION_INFO_ACTIVO", [
    "Reservado",
    "Interno",
    "Confidencial",
    "Publico",
    "Sensible",
    "No aplica",
  ]),
  ...buildCatalogSeed("VISIBILIDAD_INTERNET", [
    "Si",
    "No",
    "No (VPN)",
    "Mixto",
    "No aplica",
  ]),
  ...buildCatalogSeed("FUENTE_ACTIVO", ["Usuario final", "Usuario fuente"]),
  ...buildCatalogSeed("IMPACTO_ACTIVO", [
    "Menor",
    "Moderado",
    "Mayor",
    "Catastrofico",
  ]),

  // ── Activos de Información — tipos faltantes ──────────────────────────────
  ...buildCatalogSeed("DATOS_PERSONALES_ACTIVO", [
    "Si",
    "No",
    "Parcialmente",
  ]),
  ...buildCatalogSeed("BAJA_PROGRAMADA_ACTIVO", [
    "No aplica",
    "Obsolescencia tecnologica",
    "Fin de vida util",
    "Reemplazo por nuevo sistema",
    "Baja por incidente de seguridad",
    "Consolidacion de activos",
    "Cambio de proveedor",
  ]),
  ...buildCatalogSeed("PROPIEDAD_INTELECTUAL_ACTIVO", [
    "Institucional",
    "Licenciado",
    "Open Source",
    "Mixto",
    "No aplica",
  ]),

  // ── EIPD ─────────────────────────────────────────────────────────────────
  ...buildCatalogSeed("CRITERIO_EIPD", [
    "Evaluacion sistematica o perfilamiento de titulares",
    "Tratamiento a gran escala de datos sensibles",
    "Vigilancia sistematica de zonas de acceso publico",
    "Tratamiento de datos de personas vulnerables",
    "Uso de tecnologias innovadoras o nuevas tecnologias",
    "Transferencia internacional sin nivel de proteccion adecuado",
    "Decisiones automatizadas con efectos significativos",
    "Cruce o combinacion de multiples conjuntos de datos",
  ]),
  ...buildCatalogSeed("MEDIDA_TIPO_EIPD", [
    "Tecnica",
    "Organizativa",
    "Legal",
    "Fisica",
    "Preventiva",
    "Correctiva",
  ]),

  // ── Transferencias internacionales (Actividades) ──────────────────────────
  ...buildCatalogSeed("TIPO_SALVAGUARDA_INTERNACIONAL", [
    "Clausulas contractuales tipo",
    "Normas corporativas vinculantes (BCR)",
    "Consentimiento explicito del titular",
    "Necesidad contractual",
    "Interes vital del titular",
    "Interes publico importante",
    "Decision de adecuacion de la SDP",
  ]),

  // ── General / Actividades ─────────────────────────────────────────────────
  ...buildCatalogSeed("PERIODICIDAD_REVISION", [
    "Anual",
    "Semestral",
    "Trimestral",
    "Mensual",
    "Bienal",
  ]),

  // ── Riesgos (catálogos listos, módulo pendiente) ─────────────────────────
  ...buildCatalogSeed("NIVEL_RIESGO", [
    "Bajo",
    "Medio",
    "Alto",
    "Critico",
  ]),
  ...buildCatalogSeed("DIMENSION_RIESGO", [
    "Confidencialidad",
    "Integridad",
    "Disponibilidad",
    "Privacidad",
  ]),
  ...buildCatalogSeed("PROBABILIDAD_RIESGO", [
    "1 - Muy Baja",
    "2 - Baja",
    "3 - Media",
    "4 - Alta",
    "5 - Muy Alta",
  ]),
  ...buildCatalogSeed("TIPO_CONTROL_RIESGO", [
    "Preventivo",
    "Detectivo",
    "Correctivo",
    "Transferencia",
    "Aceptacion",
    "Eliminacion",
  ]),
  ...buildCatalogSeed("CATEGORIA_AMENAZA", [
    "Acceso no autorizado",
    "Perdida o robo de informacion",
    "Modificacion no autorizada",
    "Denegacion de servicio",
    "Divulgacion no intencionada",
    "Error humano",
    "Falla tecnologica",
    "Desastre natural o fisico",
    "Ataque externo (malware, phishing)",
    "Incumplimiento normativo",
  ]),
];

const PARAMETER_SEEDS = [
  {
    modulo: "ACTIVOS",
    clave: "VALOR_ACTIVO_CONFIG",
    nombre: "Formula de valoracion C-I-D",
    descripcion:
      "Define ponderaciones y divisor para calcular el valor del activo a partir de confidencialidad, integridad y disponibilidad.",
    valor: {
      tipo: "PROMEDIO_PONDERADO",
      precision: 2,
      divisor: 3,
      ponderaciones: {
        confidencialidad: 1,
        integridad: 1,
        disponibilidad: 1,
      },
    },
  },
  {
    modulo: "ACTIVOS",
    clave: "IMPACTO_RANGOS",
    nombre: "Rangos de impacto para activos",
    descripcion:
      "Clasifica el valor calculado del activo en categorias de impacto consumidas por el backend y la importacion.",
    valor: [
      { codigo: "MENOR", nombre: "Menor", limiteSuperior: 1 },
      { codigo: "MODERADO", nombre: "Moderado", limiteSuperior: 2 },
      { codigo: "MAYOR", nombre: "Mayor", limiteSuperior: 3 },
      { codigo: "CATASTROFICO", nombre: "Catastrófico", limiteSuperior: 4 },
    ],
  },
];

async function main() {
  const estructura = loadStructure();
  const dependenciasBySigla = new Map<string, number>();

  for (const bloque of estructura.children ?? []) {
    const tipoProceso = await upsertTipoProceso(bloque.nombre);
    const dependencias = mapDependenciasFromBlock(bloque);

    for (const dependenciaSeed of dependencias) {
      const dependencia = await upsertDependencia(tipoProceso.id, dependenciaSeed);

      if (dependencia.sigla) {
        dependenciasBySigla.set(dependencia.sigla, dependencia.id);
      }

      for (const subdireccionSeed of dependenciaSeed.subdirecciones) {
        await upsertSubdireccion(dependencia.id, subdireccionSeed);
      }
    }
  }

  await seedCatalogos();
  await seedParametrosSistema();
  await seedUsers(dependenciasBySigla);
}

function loadStructure() {
  const filePath = join(__dirname, "iess-estructura-organica.base.json");
  const raw = readFileSync(filePath, "utf-8");

  return JSON.parse(raw) as OrgSeedNode;
}

function mapDependenciasFromBlock(block: OrgSeedNode) {
  return (block.children ?? []).map<DependenciaSeed>((node) => ({
    nombre: node.nombre,
    sigla: DEPENDENCIA_SIGLAS[node.nombre] ?? null,
    descripcion: block.nombre,
    subdirecciones: (node.children ?? []).map((child) => ({
      nombre: child.nombre,
      sigla: null,
      descripcion: `Unidad ejecutora de ${node.nombre}`,
    })),
  }));
}

async function upsertTipoProceso(nombre: string) {
  const aliases = TIPO_PROCESO_ALIASES[nombre] ?? [];
  const candidates = await prisma.orgTipoProceso.findMany({
    where: {
      OR: [{ nombre }, ...aliases.map((alias) => ({ nombre: alias }))],
    },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    for (const duplicate of candidates.slice(1)) {
      await prisma.orgDependencia.updateMany({
        where: { tipoProcesoId: duplicate.id },
        data: { tipoProcesoId: canonical.id },
      });

      await prisma.orgTipoProceso.delete({
        where: { id: duplicate.id },
      });
    }

    return prisma.orgTipoProceso.update({
      where: { id: canonical.id },
      data: {
        nombre,
        descripcion: `Bloque organico IESS: ${nombre}`,
        activo: true,
      },
    });
  }

  return prisma.orgTipoProceso.create({
    data: {
      nombre,
      descripcion: `Bloque organico IESS: ${nombre}`,
      activo: true,
    },
  });
}

async function upsertDependencia(tipoProcesoId: number, seed: DependenciaSeed) {
  const candidates = await prisma.orgDependencia.findMany({
    where: { nombre: seed.nombre },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    await mergeDependenciaDuplicates(canonical.id, candidates.slice(1));

    return prisma.orgDependencia.update({
      where: { id: canonical.id },
      data: {
        tipoProcesoId,
        sigla: seed.sigla ?? canonical.sigla,
        descripcion: seed.descripcion,
        activo: true,
      },
    });
  }

  return prisma.orgDependencia.create({
    data: {
      tipoProcesoId,
      nombre: seed.nombre,
      sigla: seed.sigla,
      descripcion: seed.descripcion,
      activo: true,
    },
  });
}

async function upsertSubdireccion(dependenciaId: number, seed: SubdireccionSeed) {
  const candidates = await prisma.orgSubdireccion.findMany({
    where: {
      dependenciaId,
      nombre: seed.nombre,
    },
    orderBy: { id: "asc" },
  });
  const canonical = candidates[0];

  if (canonical) {
    await mergeSubdireccionDuplicates(canonical.id, candidates.slice(1));

    return prisma.orgSubdireccion.update({
      where: { id: canonical.id },
      data: {
        sigla: seed.sigla ?? canonical.sigla,
        descripcion: seed.descripcion,
        activo: true,
      },
    });
  }

  return prisma.orgSubdireccion.create({
    data: {
      dependenciaId,
      nombre: seed.nombre,
      sigla: seed.sigla,
      descripcion: seed.descripcion,
      activo: true,
    },
  });
}

async function mergeDependenciaDuplicates(canonicalId: number, duplicates: Array<{ id: number }>) {
  for (const duplicate of duplicates) {
    await prisma.orgSubdireccion.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.rat.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.user.updateMany({
      where: { dependenciaId: duplicate.id },
      data: { dependenciaId: canonicalId },
    });

    await prisma.orgDependencia.delete({
      where: { id: duplicate.id },
    });
  }
}

async function mergeSubdireccionDuplicates(canonicalId: number, duplicates: Array<{ id: number }>) {
  for (const duplicate of duplicates) {
    await prisma.rat.updateMany({
      where: { subdireccionId: duplicate.id },
      data: { subdireccionId: canonicalId },
    });

    await prisma.user.updateMany({
      where: { subdireccionId: duplicate.id },
      data: { subdireccionId: canonicalId },
    });

    await prisma.orgSubdireccion.delete({
      where: { id: duplicate.id },
    });
  }
}

async function seedCatalogos() {
  for (const item of MASTER_CATALOGS) {
    await prisma.catalogo.upsert({
      where: {
        tipo_codigo: {
          tipo: item.tipo,
          codigo: item.codigo,
        },
      },
      update: {
        dominio: item.dominio,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: true,
      },
      create: item,
    });
  }
}

async function seedParametrosSistema() {
  for (const item of PARAMETER_SEEDS) {
    await prisma.parametroSistema.upsert({
      where: {
        modulo_clave: {
          modulo: item.modulo,
          clave: item.clave,
        },
      },
      update: {
        nombre: item.nombre,
        descripcion: item.descripcion,
        valor: item.valor,
        activo: true,
      },
      create: {
        ...item,
        activo: true,
      },
    });
  }
}

type UserSeed = {
  username: string;
  password: string;
  nombre: string;
  email: string;
  role: RoleCode;
  dependenciaSigla: string | null;
};

const USER_SEEDS: UserSeed[] = [
  {
    username: "admin",
    password: "Admin1234*",
    nombre: "Administrador tecnico",
    email: "admin.tecnico@sistema.local",
    role: RoleCode.ADMIN_TECNICO,
    dependenciaSigla: null,
  },
  {
    username: "operador.dsgsif",
    password: "Operador1234*",
    nombre: "Operador DSGSIF",
    email: "operador.dsgsif@sistema.local",
    role: RoleCode.OPERADOR,
    dependenciaSigla: "DSGSIF",
  },
  {
    username: "operador.dnac",
    password: "Operador1234*",
    nombre: "Operador DNAC",
    email: "operador.dnac@sistema.local",
    role: RoleCode.OPERADOR,
    dependenciaSigla: "DNAC",
  },
  {
    username: "operador.dnti",
    password: "Operador1234*",
    nombre: "Operador DNTI",
    email: "operador.dnti@sistema.local",
    role: RoleCode.OPERADOR,
    dependenciaSigla: "DNTI",
  },
  {
    username: "revisor",
    password: "Revisor1234*",
    nombre: "Revisor transversal",
    email: "revisor@sistema.local",
    role: RoleCode.REVISOR,
    dependenciaSigla: null,
  },
  {
    username: "aprobador.funcional",
    password: "Aprobador1234*",
    nombre: "Aprobador funcional",
    email: "aprobador.funcional@sistema.local",
    role: RoleCode.APROBADOR_FUNCIONAL,
    dependenciaSigla: null,
  },
  {
    username: "revisor.seguridad",
    password: "Seguridad1234*",
    nombre: "Revisor de seguridad",
    email: "revisor.seguridad@sistema.local",
    role: RoleCode.REVISOR_SEGURIDAD,
    dependenciaSigla: null,
  },
  {
    username: "admin.funcional",
    password: "Funcional1234*",
    nombre: "Administrador funcional",
    email: "admin.funcional@sistema.local",
    role: RoleCode.ADMIN_FUNCIONAL,
    dependenciaSigla: null,
  },
];

async function seedUsers(dependenciasBySigla: Map<string, number>) {
  for (const seed of USER_SEEDS) {
    const dependenciaId = resolveDependenciaId(
      dependenciasBySigla,
      seed.dependenciaSigla,
      seed.username,
    );
    const subdireccion = dependenciaId
      ? await prisma.orgSubdireccion.findFirst({
          where: { dependenciaId },
          orderBy: { nombre: "asc" },
        })
      : null;
    const passwordHash = await bcrypt.hash(seed.password, 10);

    await prisma.user.upsert({
      where: { username: seed.username },
      update: {
        nombre: seed.nombre,
        email: seed.email,
        passwordHash,
        role: seed.role,
        dependenciaId,
        subdireccionId: subdireccion?.id ?? null,
        activo: true,
      },
      create: {
        nombre: seed.nombre,
        email: seed.email,
        username: seed.username,
        passwordHash,
        role: seed.role,
        dependenciaId,
        subdireccionId: subdireccion?.id ?? null,
        activo: true,
      },
    });
  }
}

function resolveDependenciaId(
  dependenciasBySigla: Map<string, number>,
  sigla: string | null,
  username: string,
) {
  if (!sigla) {
    return null;
  }

  const dependenciaId = dependenciasBySigla.get(sigla);

  if (!dependenciaId) {
    throw new Error(
      `No se encontro la dependencia con sigla ${sigla} para el usuario semilla ${username}.`,
    );
  }

  return dependenciaId;
}

function buildCatalogSeed(tipo: string, nombres: string[]): CatalogSeedItem[] {
  return nombres.map((nombre) => {
    const key = `${tipo}:${nombre}`;

    return {
      dominio: CATALOG_DOMAIN_BY_TYPE[tipo] ?? "GENERAL",
      tipo,
      codigo: CATALOG_CODE_OVERRIDES[key] ?? buildCatalogCode(nombre),
      nombre,
      descripcion:
        CATALOG_DESCRIPTION_OVERRIDES[key] ??
        `Item maestro de ${CATALOG_TYPE_LABELS[tipo] ?? "catalogo"}: ${nombre}.`,
      activo: true,
    };
  });
}

function buildCatalogCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
