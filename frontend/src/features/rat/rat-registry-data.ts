export type RecordStatus = "Borrador" | "En revision" | "Vigente" | "Archivado";
export type RiskLevel = "Bajo" | "Medio" | "Alto";
export type AssetCriticality = "Baja" | "Media" | "Alta";

export type ActivityTraceabilityAsset = {
  id: string;
  nombre: string;
  tipo: string;
  criticidad: AssetCriticality;
  custodio: string;
  plataforma: string;
};

export type ActivityTraceabilityRisk = {
  id: string;
  nombre: string;
  severidad: RiskLevel;
  impacto: string;
};

export type ActivityTraceabilityModel = {
  owner: {
    nombre: string;
    cargo: string;
    unidad: string;
  };
  activos: ActivityTraceabilityAsset[];
  categoriasDatos: string[];
  titularesImpactados: string[];
  tercerosRelacionados: string[];
  controlesClave: string[];
  riesgosRelacionados: ActivityTraceabilityRisk[];
  artefactosRelacionados: string[];
  flujosRelacionados: string[];
  puntosExposicion: string[];
  accionesContencion: string[];
};

export type SignatureFieldState = {
  elaboradoPorNombre: string;
  elaboradoPorCargo: string;
  responsableNombre: string;
  responsableCargo: string;
};

export type TreatmentReport = {
  codigoRat: string;
  nombreTratamiento: string;
  dependenciaResponsable: string;
  procesoRelacionado: string;
  subproceso: string;
  estado: RecordStatus;
  nivelRiesgo: RiskLevel;
  requiereEipd: boolean;
  fechaCreacion: string;
  ultimaActualizacion: string;
  finalidadEspecifica: string;
  baseLicitud: string;
  normaAplicable: string;
  titulares: string;
  categoriasDatos: string;
  datosSensibles: string;
  datosNna: string;
  origenDatos: string;
  mediosRecoleccion: string;
  accionesTratamiento: string;
  plazoConservacion: string;
  criteriosConservacion: string;
  supresionAnonimizacion: string;
  destinatariosInternos: string;
  destinatariosExternos: string;
  transferenciasInternacionales: string;
  paisDestino: string;
  mecanismoTransferencia: string;
  medidasSeguridad: string;
};

export type ActivityRegistryRecord = {
  id: number;
  ratId: number;
  codigo: string;
  nombre: string;
  ratCodigo: string;
  ratNombre: string;
  dependencia: string;
  unidadEjecutora: string;
  estado: RecordStatus;
  riesgo: RiskLevel;
  requiereEipd: boolean;
  version: string;
  fechaActualizacion: string;
  responsables: string[];
  observaciones: string[];
  pendientes: string[];
  report: TreatmentReport;
};

export type RatRegistryRecord = {
  id: number;
  codigo: string;
  nombre: string;
  dependencia: string;
  unidadResponsable: string;
  estado: RecordStatus;
  riesgo: RiskLevel;
  requiereEipd: boolean;
  totalActividades: number;
  fechaActualizacion: string;
  responsableLevantamiento: string;
  responsableTratamiento: string;
  resumen: string;
  activities: ActivityRegistryRecord[];
};

const ratRecords: RatRegistryRecord[] = [
  {
    id: 1,
    codigo: "RAT-2026-DNAC-001",
    nombre: "Afiliacion y cobertura institucional",
    dependencia: "Direccion Nacional de Afiliacion y Cobertura",
    unidadResponsable: "DNAC",
    estado: "Vigente",
    riesgo: "Medio",
    requiereEipd: false,
    totalActividades: 2,
    fechaActualizacion: "2026-04-22",
    responsableLevantamiento: "Analista de proteccion de datos DNAC",
    responsableTratamiento: "Director Nacional de Afiliacion y Cobertura",
    resumen:
      "Consolida las actividades de afiliacion, validacion y actualizacion de datos de asegurados y empleadores.",
    activities: [
      {
        id: 101,
        ratId: 1,
        codigo: "ACT-DNAC-001",
        nombre: "Gestion de afiliacion de empleadores",
        ratCodigo: "RAT-2026-DNAC-001",
        ratNombre: "Afiliacion y cobertura institucional",
        dependencia: "Direccion Nacional de Afiliacion y Cobertura",
        unidadEjecutora: "Subdireccion de Afiliacion, Cobertura y Gestion de la Informacion",
        estado: "Vigente",
        riesgo: "Medio",
        requiereEipd: false,
        version: "1.1",
        fechaActualizacion: "2026-04-22",
        responsables: ["DNAC", "Subdireccion de Afiliacion"],
        observaciones: [
          "Base legal consolidada con normativa de afiliacion.",
          "Sin transferencias internacionales registradas.",
        ],
        pendientes: ["Validar proxima fecha de revision anual."],
        report: {
          codigoRat: "RAT-2026-DNAC-001",
          nombreTratamiento: "Gestion de afiliacion de empleadores",
          dependenciaResponsable: "Direccion Nacional de Afiliacion y Cobertura",
          procesoRelacionado: "Afiliacion y cobertura",
          subproceso: "Registro y validacion de empleadores",
          estado: "Vigente",
          nivelRiesgo: "Medio",
          requiereEipd: false,
          fechaCreacion: "2026-04-15",
          ultimaActualizacion: "2026-04-22",
          finalidadEspecifica:
            "Registrar, validar y mantener actualizada la informacion necesaria para la afiliacion de empleadores y el relacionamiento con el sistema institucional.",
          baseLicitud: "Cumplimiento de obligacion legal",
          normaAplicable:
            "Ley de Seguridad Social, normativa institucional de afiliacion y gestion de cobertura.",
          titulares: "Empleadores, representantes legales y usuarios administrativos autorizados.",
          categoriasDatos:
            "Datos identificativos, de contacto, laborales, tributarios y datos de representacion.",
          datosSensibles: "No se identifican categorias especiales en el flujo principal.",
          datosNna: "No aplica.",
          origenDatos: "Del titular y de sistemas institucionales relacionados.",
          mediosRecoleccion:
            "Formularios web institucionales, carga documental y ventanilla de atencion.",
          accionesTratamiento:
            "Recoleccion, registro, validacion, consulta, actualizacion y conservacion.",
          plazoConservacion: "10 anos o mientras exista obligacion de trazabilidad institucional.",
          criteriosConservacion:
            "Cumplimiento de obligaciones legales, auditoria y defensa institucional.",
          supresionAnonimizacion:
            "Se bloquea la informacion al finalizar el plazo y se anonimiza cuando proceda.",
          destinatariosInternos: "Afiliacion, cobertura, control tecnico y auditoria.",
          destinatariosExternos:
            "Organismos de control y entidades publicas cuando exista requerimiento legal.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Control de accesos por perfil, bitacoras, segregacion de funciones y respaldo institucional.",
        },
      },
      {
        id: 102,
        ratId: 1,
        codigo: "ACT-DNAC-002",
        nombre: "Validacion de novedades de afiliacion",
        ratCodigo: "RAT-2026-DNAC-001",
        ratNombre: "Afiliacion y cobertura institucional",
        dependencia: "Direccion Nacional de Afiliacion y Cobertura",
        unidadEjecutora: "Subdireccion de Control Tecnico",
        estado: "En revision",
        riesgo: "Medio",
        requiereEipd: false,
        version: "1.0",
        fechaActualizacion: "2026-04-20",
        responsables: ["DNAC", "Subdireccion de Control Tecnico"],
        observaciones: ["Pendiente ajuste de criterios de conservacion."],
        pendientes: [
          "Completar validacion de titulares.",
          "Confirmar tiempo de retencion documental.",
        ],
        report: {
          codigoRat: "RAT-2026-DNAC-001",
          nombreTratamiento: "Validacion de novedades de afiliacion",
          dependenciaResponsable: "Direccion Nacional de Afiliacion y Cobertura",
          procesoRelacionado: "Afiliacion y cobertura",
          subproceso: "Control tecnico de novedades",
          estado: "En revision",
          nivelRiesgo: "Medio",
          requiereEipd: false,
          fechaCreacion: "2026-04-18",
          ultimaActualizacion: "2026-04-20",
          finalidadEspecifica:
            "Revisar y validar novedades de afiliacion para mantener la consistencia de la informacion institucional.",
          baseLicitud: "Cumplimiento de obligacion legal",
          normaAplicable:
            "Normativa institucional de afiliacion y control tecnico del IESS.",
          titulares: "Empleadores, asegurados y operadores institucionales.",
          categoriasDatos:
            "Datos identificativos, de contacto, laborales e historicos de afiliacion.",
          datosSensibles: "No se identifican categorias especiales en esta version.",
          datosNna: "No aplica.",
          origenDatos: "Sistemas institucionales y reportes del titular.",
          mediosRecoleccion: "Sistemas transaccionales, formularios y validaciones internas.",
          accionesTratamiento:
            "Consulta, cotejo, actualizacion, registro y comunicacion interna.",
          plazoConservacion: "10 anos conforme al ciclo de auditoria y control.",
          criteriosConservacion:
            "Soporte a fiscalizacion, trazabilidad y responsabilidades institucionales.",
          supresionAnonimizacion:
            "Supresion o anonimización conforme a tabla de retencion y cierre de expediente.",
          destinatariosInternos: "Control tecnico, cobertura, auditoria.",
          destinatariosExternos: "No se contemplan destinatarios externos de rutina.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Bitacoras, acceso por roles, revision de consistencia y monitoreo de cambios.",
        },
      },
    ],
  },
  {
    id: 2,
    codigo: "RAT-2026-DSGSIF-002",
    nombre: "Atencion y aseguramiento del seguro de salud",
    dependencia: "Direccion del Seguro General de Salud Individual y Familiar",
    unidadResponsable: "DSGSIF",
    estado: "Vigente",
    riesgo: "Alto",
    requiereEipd: true,
    totalActividades: 2,
    fechaActualizacion: "2026-04-23",
    responsableLevantamiento: "Equipo de privacidad DSGSIF",
    responsableTratamiento: "Director del Seguro General de Salud Individual y Familiar",
    resumen:
      "Agrupa la atencion ciudadana, el aseguramiento y la gestion de informacion del seguro de salud.",
    activities: [
      {
        id: 201,
        ratId: 2,
        codigo: "ACT-DSGSIF-001",
        nombre: "Atencion ciudadana del seguro de salud",
        ratCodigo: "RAT-2026-DSGSIF-002",
        ratNombre: "Atencion y aseguramiento del seguro de salud",
        dependencia: "Direccion del Seguro General de Salud Individual y Familiar",
        unidadEjecutora: "Subdireccion de Aseguramiento del Seguro de Salud",
        estado: "Vigente",
        riesgo: "Alto",
        requiereEipd: true,
        version: "1.0",
        fechaActualizacion: "2026-04-23",
        responsables: ["DSGSIF", "Subdireccion de Aseguramiento del Seguro de Salud"],
        observaciones: [
          "Se tratan datos de salud y reclamos de usuarios.",
          "La actividad requiere seguimiento reforzado.",
        ],
        pendientes: [
          "Formalizar cronograma de EIPD.",
          "Completar inventario de medidas de seguridad especificas.",
        ],
        report: {
          codigoRat: "RAT-2026-DSGSIF-002",
          nombreTratamiento: "Atencion ciudadana del seguro de salud",
          dependenciaResponsable:
            "Direccion del Seguro General de Salud Individual y Familiar",
          procesoRelacionado: "Aseguramiento del seguro de salud",
          subproceso: "Gestion de solicitudes, reclamos y orientacion al afiliado",
          estado: "Vigente",
          nivelRiesgo: "Alto",
          requiereEipd: true,
          fechaCreacion: "2026-04-16",
          ultimaActualizacion: "2026-04-23",
          finalidadEspecifica:
            "Brindar atencion, orientacion y respuesta a solicitudes, peticiones, quejas y reclamos del afiliado del seguro de salud.",
          baseLicitud: "Cumplimiento de obligacion legal e interes publico",
          normaAplicable:
            "Ley de Seguridad Social, LOPDP, normativa del seguro de salud y procedimientos institucionales de atencion al ciudadano.",
          titulares: "Afiliados, beneficiarios, representantes legales y ciudadanos atendidos.",
          categoriasDatos:
            "Datos identificativos, de contacto, socioeconomicos, de salud y trazabilidad de solicitudes.",
          datosSensibles:
            "Si. Datos de salud, condicion medica y antecedentes relacionados con la atencion.",
          datosNna:
            "Puede aplicar cuando existan beneficiarios menores de edad dentro del seguro de salud.",
          origenDatos: "Del titular, de sistemas institucionales y de interacciones de atencion.",
          mediosRecoleccion:
            "Canales presenciales, formularios web, call center y correo institucional.",
          accionesTratamiento:
            "Recoleccion, registro, consulta, analisis, seguimiento, comunicacion y conservacion.",
          plazoConservacion: "5 anos o el plazo definido por la normativa sanitaria y de seguridad social.",
          criteriosConservacion:
            "Trazabilidad de atencion, defensa institucional y cumplimiento regulatorio.",
          supresionAnonimizacion:
            "La informacion se bloquea al cierre del ciclo y se anonimiza cuando ya no sea necesaria.",
          destinatariosInternos:
            "Aseguramiento, provision de servicios, calidad, gestion de informacion y auditoria.",
          destinatariosExternos:
            "Prestadores de salud y organismos de control cuando exista fundamento legal.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Roles diferenciados, trazabilidad de atenciones, controles de acceso, cifrado y segregacion de expedientes.",
        },
      },
      {
        id: 202,
        ratId: 2,
        codigo: "ACT-DSGSIF-002",
        nombre: "Vigilancia y gestion de informacion del seguro de salud",
        ratCodigo: "RAT-2026-DSGSIF-002",
        ratNombre: "Atencion y aseguramiento del seguro de salud",
        dependencia: "Direccion del Seguro General de Salud Individual y Familiar",
        unidadEjecutora:
          "Subdireccion de Vigilancia y Gestion de la Informacion del Seguro de Salud",
        estado: "En revision",
        riesgo: "Alto",
        requiereEipd: true,
        version: "1.0",
        fechaActualizacion: "2026-04-21",
        responsables: ["DSGSIF", "Subdireccion de Vigilancia y Gestion de la Informacion"],
        observaciones: ["Pendiente documentar flujos completos de datos secundarios."],
        pendientes: [
          "Ampliar base legitimadora para reutilizacion analitica.",
          "Definir responsables de calidad de dato.",
        ],
        report: {
          codigoRat: "RAT-2026-DSGSIF-002",
          nombreTratamiento: "Vigilancia y gestion de informacion del seguro de salud",
          dependenciaResponsable:
            "Direccion del Seguro General de Salud Individual y Familiar",
          procesoRelacionado: "Gestion de informacion del seguro de salud",
          subproceso: "Consolidacion y analitica institucional",
          estado: "En revision",
          nivelRiesgo: "Alto",
          requiereEipd: true,
          fechaCreacion: "2026-04-14",
          ultimaActualizacion: "2026-04-21",
          finalidadEspecifica:
            "Consolidar, analizar y monitorear informacion operacional del seguro de salud para gestion, vigilancia y mejora del servicio.",
          baseLicitud: "Interes publico y cumplimiento de obligacion legal",
          normaAplicable:
            "Normativa de gestion sanitaria, seguridad social y gobierno del dato institucional.",
          titulares: "Afiliados, beneficiarios y usuarios del sistema de salud.",
          categoriasDatos:
            "Datos identificativos, de contacto, salud, uso de servicios y variables de seguimiento.",
          datosSensibles: "Si. Datos de salud y categorias especiales relacionadas.",
          datosNna: "Puede aplicar para beneficiarios menores de edad.",
          origenDatos: "Sistemas institucionales, prestadores y registros de atencion.",
          mediosRecoleccion: "Integraciones, repositorios institucionales y cargas operativas.",
          accionesTratamiento:
            "Consolidacion, depuracion, analitica, consulta, conservacion y reporte.",
          plazoConservacion: "5 anos segun fines de seguimiento y control.",
          criteriosConservacion:
            "Analitica institucional, auditoria, mejora continua y soporte regulatorio.",
          supresionAnonimizacion:
            "Anonimizacion progresiva para usos secundarios cuando corresponda.",
          destinatariosInternos:
            "Gestion de informacion, aseguramiento, calidad y alta direccion.",
          destinatariosExternos:
            "Entidades de control o salud publica cuando exista competencia legal.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Seudonimizacion parcial, control de acceso reforzado, registros de auditoria y segmentacion por dominios.",
        },
      },
    ],
  },
  {
    id: 3,
    codigo: "RAT-2026-DNTI-003",
    nombre: "Control de accesos y soporte institucional",
    dependencia: "Direccion Nacional de Tecnologias de la Informacion",
    unidadResponsable: "DNTI",
    estado: "En revision",
    riesgo: "Alto",
    requiereEipd: false,
    totalActividades: 2,
    fechaActualizacion: "2026-04-24",
    responsableLevantamiento: "Arquitectura y seguridad TI",
    responsableTratamiento: "Director Nacional de Tecnologias de la Informacion",
    resumen:
      "Cubre la administracion de accesos, perfiles y soporte sobre cuentas institucionales.",
    activities: [
      {
        id: 301,
        ratId: 3,
        codigo: "ACT-DNTI-001",
        nombre: "Administracion de accesos y perfiles",
        ratCodigo: "RAT-2026-DNTI-003",
        ratNombre: "Control de accesos y soporte institucional",
        dependencia: "Direccion Nacional de Tecnologias de la Informacion",
        unidadEjecutora: "Subdireccion de Seguridad Informatica",
        estado: "En revision",
        riesgo: "Alto",
        requiereEipd: false,
        version: "1.0",
        fechaActualizacion: "2026-04-24",
        responsables: ["DNTI", "Subdireccion de Seguridad Informatica"],
        observaciones: ["Riesgo alto por concentracion de privilegios y trazabilidad."],
        pendientes: [
          "Completar descripcion de logs y retencion de eventos.",
          "Formalizar matriz de segregacion de funciones.",
        ],
        report: {
          codigoRat: "RAT-2026-DNTI-003",
          nombreTratamiento: "Administracion de accesos y perfiles",
          dependenciaResponsable: "Direccion Nacional de Tecnologias de la Informacion",
          procesoRelacionado: "Seguridad informatica",
          subproceso: "Control de identidades y accesos",
          estado: "En revision",
          nivelRiesgo: "Alto",
          requiereEipd: false,
          fechaCreacion: "2026-04-19",
          ultimaActualizacion: "2026-04-24",
          finalidadEspecifica:
            "Gestionar cuentas, roles, perfiles y privilegios de acceso a plataformas y sistemas institucionales.",
          baseLicitud: "Cumplimiento de obligacion legal e interes legitimo institucional",
          normaAplicable:
            "Normativa institucional de seguridad, ENS interno y lineamientos de control de acceso.",
          titulares: "Servidores institucionales, proveedores autorizados y usuarios internos.",
          categoriasDatos:
            "Datos identificativos, de contacto, cargo, perfil, credenciales asociadas y trazas de acceso.",
          datosSensibles: "No se tratan categorias especiales, pero existe alta criticidad operacional.",
          datosNna: "No aplica.",
          origenDatos: "Del titular, del area de talento humano y de sistemas corporativos.",
          mediosRecoleccion:
            "Formularios internos, tickets de soporte, integraciones y plataformas IAM.",
          accionesTratamiento:
            "Registro, modificacion, consulta, habilitacion, revocacion y monitoreo.",
          plazoConservacion: "Mientras exista relacion funcional y segun politica de logs.",
          criteriosConservacion:
            "Continuidad operativa, seguridad, auditoria y respuesta ante incidentes.",
          supresionAnonimizacion:
            "Deshabilitacion de cuenta y conservacion controlada de bitacoras durante su plazo util.",
          destinatariosInternos: "Seguridad informatica, infraestructura, mesa de ayuda y auditoria.",
          destinatariosExternos: "No aplica salvo soporte contractual autorizado.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "MFA, segregacion de funciones, monitoreo de privilegios, logging y revisiones periodicas.",
        },
      },
      {
        id: 302,
        ratId: 3,
        codigo: "ACT-DNTI-002",
        nombre: "Mesa de ayuda y soporte de cuentas",
        ratCodigo: "RAT-2026-DNTI-003",
        ratNombre: "Control de accesos y soporte institucional",
        dependencia: "Direccion Nacional de Tecnologias de la Informacion",
        unidadEjecutora: "Subdireccion de Desarrollo Informatico",
        estado: "Vigente",
        riesgo: "Medio",
        requiereEipd: false,
        version: "1.0",
        fechaActualizacion: "2026-04-18",
        responsables: ["DNTI", "Subdireccion de Desarrollo Informatico"],
        observaciones: ["Flujo estable, sin alertas mayores."],
        pendientes: ["Homologar texto de consentimiento en canales de soporte."],
        report: {
          codigoRat: "RAT-2026-DNTI-003",
          nombreTratamiento: "Mesa de ayuda y soporte de cuentas",
          dependenciaResponsable: "Direccion Nacional de Tecnologias de la Informacion",
          procesoRelacionado: "Soporte informatico",
          subproceso: "Atencion de incidencias y solicitudes de cuentas",
          estado: "Vigente",
          nivelRiesgo: "Medio",
          requiereEipd: false,
          fechaCreacion: "2026-04-10",
          ultimaActualizacion: "2026-04-18",
          finalidadEspecifica:
            "Atender requerimientos de soporte vinculados con cuentas institucionales, accesos y recuperacion de credenciales.",
          baseLicitud: "Interes legitimo institucional y ejecucion de la relacion laboral o contractual",
          normaAplicable: "Politica de soporte TI y lineamientos institucionales de servicio.",
          titulares: "Usuarios internos y soporte autorizado.",
          categoriasDatos:
            "Datos identificativos, de contacto, cargo, tickets y trazabilidad de soporte.",
          datosSensibles: "No.",
          datosNna: "No aplica.",
          origenDatos: "Del titular y del sistema de mesa de ayuda.",
          mediosRecoleccion: "Portal de tickets, correo institucional y atencion interna.",
          accionesTratamiento: "Registro, consulta, seguimiento, actualizacion y cierre.",
          plazoConservacion: "3 anos o segun politica de soporte.",
          criteriosConservacion: "Trazabilidad de incidentes, mejora del servicio y auditoria.",
          supresionAnonimizacion: "Depuracion controlada al cierre del plazo de retencion.",
          destinatariosInternos: "Mesa de ayuda, seguridad y jefaturas TI.",
          destinatariosExternos: "No aplica.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Acceso por rol, ticketing institucional, respaldo de evidencias y bitacora de cambios.",
        },
      },
    ],
  },
  {
    id: 4,
    codigo: "RAT-2026-DNSC-004",
    nombre: "Gestion documental institucional",
    dependencia: "Direccion Nacional de Servicios Corporativos",
    unidadResponsable: "DNSC",
    estado: "Vigente",
    riesgo: "Bajo",
    requiereEipd: false,
    totalActividades: 1,
    fechaActualizacion: "2026-04-17",
    responsableLevantamiento: "Equipo de gestion documental",
    responsableTratamiento: "Director Nacional de Servicios Corporativos",
    resumen:
      "Agrupa la gestion y conservacion de expedientes y documentos administrativos institucionales.",
    activities: [
      {
        id: 401,
        ratId: 4,
        codigo: "ACT-DNSC-001",
        nombre: "Administracion de expedientes documentales",
        ratCodigo: "RAT-2026-DNSC-004",
        ratNombre: "Gestion documental institucional",
        dependencia: "Direccion Nacional de Servicios Corporativos",
        unidadEjecutora: "Subdireccion de Gestion Documental",
        estado: "Vigente",
        riesgo: "Bajo",
        requiereEipd: false,
        version: "1.0",
        fechaActualizacion: "2026-04-17",
        responsables: ["DNSC", "Subdireccion de Gestion Documental"],
        observaciones: ["Actividad estable y bien documentada."],
        pendientes: ["Actualizar mapa de repositorios fisicos secundarios."],
        report: {
          codigoRat: "RAT-2026-DNSC-004",
          nombreTratamiento: "Administracion de expedientes documentales",
          dependenciaResponsable: "Direccion Nacional de Servicios Corporativos",
          procesoRelacionado: "Gestion documental",
          subproceso: "Custodia y administracion de expedientes",
          estado: "Vigente",
          nivelRiesgo: "Bajo",
          requiereEipd: false,
          fechaCreacion: "2026-04-08",
          ultimaActualizacion: "2026-04-17",
          finalidadEspecifica:
            "Organizar, custodiar y administrar la documentacion institucional durante su ciclo de vida.",
          baseLicitud: "Cumplimiento de obligacion legal",
          normaAplicable: "Normativa archivistica, gestion documental y transparencia institucional.",
          titulares: "Servidores, ciudadanos y terceros vinculados a expedientes institucionales.",
          categoriasDatos:
            "Datos identificativos, de contacto, administrativos y documentales.",
          datosSensibles: "No de forma estructural.",
          datosNna: "No aplica.",
          origenDatos: "Del titular y de areas generadoras de expedientes.",
          mediosRecoleccion: "Recepcion documental, repositorios y ventanillas institucionales.",
          accionesTratamiento: "Recepcion, organizacion, consulta, conservacion y baja documental.",
          plazoConservacion: "Segun tabla de retencion documental institucional.",
          criteriosConservacion: "Ciclo archivistico, valor legal e historico.",
          supresionAnonimizacion:
            "Eliminacion documental o transferencia a archivo historico segun corresponda.",
          destinatariosInternos: "Areas administrativas, juridicas y auditoria.",
          destinatariosExternos: "Organismos de control o solicitantes habilitados por ley.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Control de acceso a archivos, inventario documental, custodia fisica y respaldo digital.",
        },
      },
    ],
  },
  {
    id: 5,
    codigo: "RAT-2026-PG-005",
    nombre: "Gestion de expedientes juridicos institucionales",
    dependencia: "Procuraduria General",
    unidadResponsable: "PG",
    estado: "Vigente",
    riesgo: "Alto",
    requiereEipd: true,
    totalActividades: 1,
    fechaActualizacion: "2026-04-25",
    responsableLevantamiento: "Equipo de asesoria legal",
    responsableTratamiento: "Procurador General",
    resumen:
      "Controla el tratamiento de expedientes juridicos, patrocinio y documentacion sensible de defensa institucional.",
    activities: [
      {
        id: 501,
        ratId: 5,
        codigo: "ACT-PG-001",
        nombre: "Gestion de expedientes juridicos y patrocinio",
        ratCodigo: "RAT-2026-PG-005",
        ratNombre: "Gestion de expedientes juridicos institucionales",
        dependencia: "Procuraduria General",
        unidadEjecutora: "Subdireccion Nacional de Patrocinio",
        estado: "Vigente",
        riesgo: "Alto",
        requiereEipd: true,
        version: "1.2",
        fechaActualizacion: "2026-04-25",
        responsables: ["Procuraduria General", "Subdireccion Nacional de Patrocinio"],
        observaciones: ["Trata informacion judicial, laboral y eventualmente medica."],
        pendientes: ["Reforzar politica de minimizacion para anexos de terceros."],
        report: {
          codigoRat: "RAT-2026-PG-005",
          nombreTratamiento: "Gestion de expedientes juridicos y patrocinio",
          dependenciaResponsable: "Procuraduria General",
          procesoRelacionado: "Patrocinio y asesoria legal",
          subproceso: "Gestion de expedientes y defensa institucional",
          estado: "Vigente",
          nivelRiesgo: "Alto",
          requiereEipd: true,
          fechaCreacion: "2026-04-12",
          ultimaActualizacion: "2026-04-25",
          finalidadEspecifica:
            "Gestionar expedientes juridicos, sustanciar defensa institucional y soportar actuaciones de patrocinio y asesoria legal.",
          baseLicitud: "Cumplimiento de obligacion legal, interes publico y defensa institucional",
          normaAplicable:
            "Normativa procesal, LOPDP, ley de seguridad social y procedimientos juridicos institucionales.",
          titulares:
            "Servidores, ciudadanos, afiliados, terceros procesales y representantes legales.",
          categoriasDatos:
            "Datos identificativos, laborales, economicos, judiciales y de salud cuando consten en anexos.",
          datosSensibles:
            "Si. Pueden constar datos de salud, biometria documental o informacion judicial sensible.",
          datosNna: "Puede aplicar en casos puntuales segun el expediente.",
          origenDatos: "Del titular, de autoridades y de expedientes judiciales o administrativos.",
          mediosRecoleccion:
            "Escritos procesales, sistemas institucionales, correo oficial y anexos documentales.",
          accionesTratamiento:
            "Recepcion, registro, analisis, consulta, conservacion, remision y defensa institucional.",
          plazoConservacion: "Conforme al ciclo legal del expediente y obligaciones de archivo.",
          criteriosConservacion:
            "Defensa institucional, auditoria, obligaciones legales y preservacion probatoria.",
          supresionAnonimizacion:
            "Bloqueo y baja al cierre del plazo legal o anonimización cuando proceda para fines secundarios.",
          destinatariosInternos: "Patrocinio, asesoria legal, auditoria y autoridades competentes.",
          destinatariosExternos:
            "Juzgados, fiscalias, organismos de control y terceros procesales habilitados.",
          transferenciasInternacionales: "No",
          paisDestino: "N/A",
          mecanismoTransferencia: "N/A",
          medidasSeguridad:
            "Expediente restringido, control de accesos, registro de consulta, cifrado y custodia reforzada.",
        },
      },
    ],
  },
];

export const defaultSignatureFields: SignatureFieldState = {
  elaboradoPorNombre: "Analista responsable del levantamiento",
  elaboradoPorCargo: "Equipo de proteccion de datos",
  responsableNombre: "Responsable del tratamiento",
  responsableCargo: "Director o autoridad de la dependencia",
};

export function getRatRegistryRecords() {
  return ratRecords;
}

export function getActivityRegistryRecords() {
  return ratRecords.flatMap((rat) => rat.activities);
}

const activityTraceabilityById: Record<number, ActivityTraceabilityModel> = {
  101: {
    owner: {
      nombre: "Andrea Molina",
      cargo: "Lider funcional de afiliacion de empleadores",
      unidad: "Subdireccion de Afiliacion, Cobertura y Gestion de la Informacion",
    },
    activos: [
      {
        id: "DNAC-ERP-AFI",
        nombre: "Modulo de afiliacion patronal",
        tipo: "Aplicacion",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Core institucional",
      },
      {
        id: "DNAC-DB-REG",
        nombre: "Base registral de empleadores",
        tipo: "Base de datos",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "PostgreSQL institucional",
      },
      {
        id: "DNAC-ECM-01",
        nombre: "Repositorio documental de soporte",
        tipo: "Repositorio",
        criticidad: "Media",
        custodio: "DNSC",
        plataforma: "ECM institucional",
      },
    ],
    categoriasDatos: ["Identificativos", "Contacto", "Laborales", "Tributarios"],
    titularesImpactados: ["Empleadores", "Representantes legales"],
    tercerosRelacionados: ["Organismos de control", "Entidades publicas por requerimiento legal"],
    controlesClave: [
      "Control de acceso por perfil",
      "Bitacora de consultas",
      "Validacion documental",
      "Respaldos institucionales",
    ],
    riesgosRelacionados: [
      {
        id: "R-101",
        nombre: "Consulta no autorizada de expedientes patronales",
        severidad: "Medio",
        impacto: "Exposicion de datos registrales y de contacto.",
      },
      {
        id: "R-102",
        nombre: "Carga documental incompleta o inconsistente",
        severidad: "Medio",
        impacto: "Decisiones erradas y reprocesos institucionales.",
      },
    ],
    artefactosRelacionados: [
      "RAT vigente v1.1",
      "Matriz MTGE de afiliacion",
      "Bitacora de auditoria del modulo patronal",
      "Politica de retencion documental",
    ],
    flujosRelacionados: [
      "Titular -> portal de afiliacion",
      "Portal -> base registral",
      "Base registral -> control tecnico",
      "Control tecnico -> repositorio documental",
    ],
    puntosExposicion: [
      "Carga documental web",
      "Consulta manual de expedientes",
      "Exportacion de reportes operativos",
    ],
    accionesContencion: [
      "Bloquear exportaciones del usuario comprometido",
      "Revisar bitacoras de consulta y descarga",
      "Notificar a control tecnico y privacidad",
    ],
  },
  102: {
    owner: {
      nombre: "Carlos Paredes",
      cargo: "Responsable de control tecnico de afiliacion",
      unidad: "Subdireccion de Control Tecnico",
    },
    activos: [
      {
        id: "DNAC-VAL-01",
        nombre: "Motor de validacion de novedades",
        tipo: "Aplicacion",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Servicio transaccional",
      },
      {
        id: "DNAC-HIS-01",
        nombre: "Historico de novedades",
        tipo: "Base de datos",
        criticidad: "Media",
        custodio: "DNTI",
        plataforma: "Data mart operativo",
      },
    ],
    categoriasDatos: ["Identificativos", "Contacto", "Laborales", "Historico de afiliacion"],
    titularesImpactados: ["Asegurados", "Empleadores"],
    tercerosRelacionados: ["Ninguno de rutina"],
    controlesClave: [
      "Revisiones de consistencia",
      "Trazabilidad de cambios",
      "Segregacion funcional",
    ],
    riesgosRelacionados: [
      {
        id: "R-103",
        nombre: "Alteracion no trazada de novedades",
        severidad: "Medio",
        impacto: "Afectacion de integridad y decisiones de cobertura.",
      },
    ],
    artefactosRelacionados: [
      "RAT en revision v1.0",
      "Reglas de control tecnico",
      "Reporte de novedades inconsistentes",
    ],
    flujosRelacionados: [
      "Sistemas institucionales -> motor de validacion",
      "Motor de validacion -> historico",
      "Historico -> analistas de control tecnico",
    ],
    puntosExposicion: ["Edicion de novedades", "Consolidacion manual de resultados"],
    accionesContencion: [
      "Congelar cambios sobre lote afectado",
      "Comparar historico vs ultimo estado aprobado",
      "Reforzar seguimiento de usuarios con privilegios",
    ],
  },
  201: {
    owner: {
      nombre: "Maria Fernanda Torres",
      cargo: "Jefa de atencion y aseguramiento",
      unidad: "Subdireccion de Aseguramiento del Seguro de Salud",
    },
    activos: [
      {
        id: "DSGSIF-CRM-01",
        nombre: "CRM de atencion al afiliado",
        tipo: "Aplicacion",
        criticidad: "Alta",
        custodio: "DSGSIF",
        plataforma: "Plataforma de servicio",
      },
      {
        id: "DSGSIF-HIS-01",
        nombre: "Historia de solicitudes y reclamos",
        tipo: "Base de datos",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Repositorio institucional",
      },
      {
        id: "DSGSIF-CALL-01",
        nombre: "Canal call center",
        tipo: "Canal",
        criticidad: "Media",
        custodio: "DSGSIF",
        plataforma: "Telefonia y grabacion",
      },
    ],
    categoriasDatos: ["Identificativos", "Contacto", "Socioeconomicos", "Salud"],
    titularesImpactados: ["Afiliados", "Beneficiarios", "Representantes legales"],
    tercerosRelacionados: ["Prestadores de salud", "Organismos de control"],
    controlesClave: [
      "Trazabilidad de atenciones",
      "Cifrado de expedientes",
      "Control de acceso reforzado",
      "Revision de permisos por rol",
    ],
    riesgosRelacionados: [
      {
        id: "R-201",
        nombre: "Exposicion de datos de salud en atencion",
        severidad: "Alto",
        impacto: "Compromiso de derechos y libertades del afiliado.",
      },
      {
        id: "R-202",
        nombre: "Uso secundario no autorizado de reclamos",
        severidad: "Alto",
        impacto: "Desviacion de finalidad y afectacion reputacional.",
      },
    ],
    artefactosRelacionados: [
      "RAT vigente v1.0",
      "EIPD prioritaria",
      "Matriz de riesgos del seguro de salud",
      "Bitacora de trazabilidad de atenciones",
      "Procedimiento de gestion de reclamos",
    ],
    flujosRelacionados: [
      "Afiliado -> canales de atencion",
      "Canales -> CRM",
      "CRM -> historia de solicitudes",
      "Historia de solicitudes -> prestadores o areas internas",
    ],
    puntosExposicion: [
      "Grabaciones de call center",
      "Adjuntos de reclamos",
      "Consulta transversal de expedientes",
    ],
    accionesContencion: [
      "Aislar expediente y usuario comprometido",
      "Activar evaluacion de brecha en datos de salud",
      "Escalar a privacidad, seguridad y aseguramiento",
    ],
  },
  202: {
    owner: {
      nombre: "Javier Salgado",
      cargo: "Coordinador de vigilancia y gestion de la informacion",
      unidad: "Subdireccion de Vigilancia y Gestion de la Informacion del Seguro de Salud",
    },
    activos: [
      {
        id: "DSGSIF-DWH-01",
        nombre: "Repositorio analitico de salud",
        tipo: "Base de datos",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Data warehouse",
      },
      {
        id: "DSGSIF-ETL-01",
        nombre: "Pipeline de integracion sanitaria",
        tipo: "Integracion",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "ETL institucional",
      },
      {
        id: "DSGSIF-BI-01",
        nombre: "Cuadros de mando de vigilancia",
        tipo: "Analitica",
        criticidad: "Media",
        custodio: "DSGSIF",
        plataforma: "BI institucional",
      },
    ],
    categoriasDatos: ["Identificativos", "Salud", "Uso de servicios", "Seguimiento operativo"],
    titularesImpactados: ["Afiliados", "Beneficiarios"],
    tercerosRelacionados: ["Prestadores", "Entidades de salud publica"],
    controlesClave: [
      "Seudonimizacion parcial",
      "Segmentacion por dominios",
      "Registro de acceso analitico",
    ],
    riesgosRelacionados: [
      {
        id: "R-203",
        nombre: "Reidentificacion en analitica secundaria",
        severidad: "Alto",
        impacto: "Exposicion masiva de datos de salud.",
      },
      {
        id: "R-204",
        nombre: "Integracion excesiva de fuentes",
        severidad: "Alto",
        impacto: "Concentracion de datos y ampliacion del impacto potencial.",
      },
    ],
    artefactosRelacionados: [
      "RAT en revision",
      "EIPD en curso",
      "Catalogo de datasets del seguro de salud",
      "Politica de uso secundario",
    ],
    flujosRelacionados: [
      "Prestadores -> ETL",
      "ETL -> data warehouse",
      "Data warehouse -> BI institucional",
      "BI -> alta direccion y vigilancia",
    ],
    puntosExposicion: [
      "Integraciones automatizadas",
      "Extracciones analiticas",
      "Cruce con fuentes secundarias",
    ],
    accionesContencion: [
      "Suspender cargas no esenciales",
      "Auditar consultas recientes al repositorio analitico",
      "Revisar reglas de seudonimizacion",
    ],
  },
  301: {
    owner: {
      nombre: "Paulina Rosero",
      cargo: "Responsable de seguridad informatica",
      unidad: "Subdireccion de Seguridad Informatica",
    },
    activos: [
      {
        id: "DNTI-IAM-01",
        nombre: "Plataforma IAM institucional",
        tipo: "Aplicacion",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Identity platform",
      },
      {
        id: "DNTI-LOG-01",
        nombre: "Repositorio de logs de autenticacion",
        tipo: "Base de datos",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "SIEM",
      },
      {
        id: "DNTI-AD-01",
        nombre: "Directorio corporativo",
        tipo: "Infraestructura",
        criticidad: "Alta",
        custodio: "DNTI",
        plataforma: "Active Directory",
      },
    ],
    categoriasDatos: ["Identificativos", "Cargo", "Perfil", "Credenciales asociadas"],
    titularesImpactados: ["Servidores institucionales", "Proveedores autorizados"],
    tercerosRelacionados: ["Proveedor IAM autorizado"],
    controlesClave: [
      "MFA",
      "Segregacion de funciones",
      "Monitoreo de privilegios",
      "Revision periodica de accesos",
    ],
    riesgosRelacionados: [
      {
        id: "R-301",
        nombre: "Escalamiento indebido de privilegios",
        severidad: "Alto",
        impacto: "Acceso transversal a multiples tratamientos y activos.",
      },
      {
        id: "R-302",
        nombre: "Compromiso de credenciales administrativas",
        severidad: "Alto",
        impacto: "Incidente critico de seguridad y privacidad.",
      },
    ],
    artefactosRelacionados: [
      "RAT en revision",
      "Matriz de segregacion",
      "Bitacora IAM",
      "Procedimiento de gestion de accesos",
      "Plan de respuesta a incidentes de identidad",
    ],
    flujosRelacionados: [
      "Talento humano -> IAM",
      "IAM -> directorio corporativo",
      "Directorio -> aplicaciones institucionales",
      "Logs -> SIEM",
    ],
    puntosExposicion: [
      "Privilegios de administrador",
      "Reseteo manual de credenciales",
      "Integraciones con sistemas legados",
    ],
    accionesContencion: [
      "Revocar sesiones activas",
      "Rotar credenciales privilegiadas",
      "Correlacionar eventos en SIEM y privacidad",
    ],
  },
  302: {
    owner: {
      nombre: "Diego Erazo",
      cargo: "Coordinador de mesa de ayuda",
      unidad: "Subdireccion de Desarrollo Informatico",
    },
    activos: [
      {
        id: "DNTI-TKT-01",
        nombre: "Sistema de tickets institucional",
        tipo: "Aplicacion",
        criticidad: "Media",
        custodio: "DNTI",
        plataforma: "Mesa de ayuda",
      },
      {
        id: "DNTI-MAIL-01",
        nombre: "Correo institucional",
        tipo: "Canal",
        criticidad: "Media",
        custodio: "DNTI",
        plataforma: "Correo corporativo",
      },
    ],
    categoriasDatos: ["Identificativos", "Contacto", "Cargo", "Trazabilidad de soporte"],
    titularesImpactados: ["Usuarios internos"],
    tercerosRelacionados: ["Ninguno de rutina"],
    controlesClave: ["Ticketing con trazabilidad", "Validacion de identidad", "Bitacora de cambios"],
    riesgosRelacionados: [
      {
        id: "R-303",
        nombre: "Suplantacion en solicitudes de soporte",
        severidad: "Medio",
        impacto: "Reset de cuenta sin validacion suficiente.",
      },
    ],
    artefactosRelacionados: [
      "RAT vigente",
      "Procedimiento de soporte",
      "Plantillas de validacion",
    ],
    flujosRelacionados: [
      "Usuario interno -> portal de tickets",
      "Portal -> analista de soporte",
      "Analista -> sistema de cuentas",
    ],
    puntosExposicion: ["Tickets por correo", "Recuperacion remota de credenciales"],
    accionesContencion: [
      "Congelar solicitud sospechosa",
      "Validar identidad por canal alterno",
      "Escalar a seguridad si hay acceso indebido",
    ],
  },
  401: {
    owner: {
      nombre: "Lucia Cevallos",
      cargo: "Jefa de gestion documental",
      unidad: "Subdireccion de Gestion Documental",
    },
    activos: [
      {
        id: "DNSC-ECM-01",
        nombre: "ECM documental institucional",
        tipo: "Repositorio",
        criticidad: "Media",
        custodio: "DNSC",
        plataforma: "Gestor documental",
      },
      {
        id: "DNSC-ARC-01",
        nombre: "Archivo fisico central",
        tipo: "Archivo fisico",
        criticidad: "Media",
        custodio: "DNSC",
        plataforma: "Custodia institucional",
      },
    ],
    categoriasDatos: ["Identificativos", "Administrativos", "Documentales"],
    titularesImpactados: ["Servidores", "Ciudadanos", "Terceros vinculados"],
    tercerosRelacionados: ["Organismos de control", "Solicitantes habilitados por ley"],
    controlesClave: ["Inventario documental", "Custodia fisica", "Acceso restringido"],
    riesgosRelacionados: [
      {
        id: "R-401",
        nombre: "Extravio o consulta no autorizada de expediente",
        severidad: "Bajo",
        impacto: "Afectacion acotada de confidencialidad y trazabilidad.",
      },
    ],
    artefactosRelacionados: [
      "RAT vigente",
      "Tabla de retencion",
      "Inventario de repositorios fisicos",
    ],
    flujosRelacionados: [
      "Areas generadoras -> ECM",
      "ECM -> archivo central",
      "Archivo -> consultas internas autorizadas",
    ],
    puntosExposicion: ["Prestamo de expediente", "Traslado fisico entre repositorios"],
    accionesContencion: [
      "Rastrear cadena de custodia",
      "Bloquear consulta adicional del expediente",
      "Notificar a gestion documental y auditoria",
    ],
  },
  501: {
    owner: {
      nombre: "Veronica Cardenas",
      cargo: "Responsable de patrocinio institucional",
      unidad: "Subdireccion Nacional de Patrocinio",
    },
    activos: [
      {
        id: "PG-EXP-01",
        nombre: "Expediente juridico digital",
        tipo: "Repositorio",
        criticidad: "Alta",
        custodio: "PG",
        plataforma: "Gestor de expedientes",
      },
      {
        id: "PG-MAIL-01",
        nombre: "Casilla juridica oficial",
        tipo: "Canal",
        criticidad: "Alta",
        custodio: "PG",
        plataforma: "Correo institucional",
      },
      {
        id: "PG-DOC-01",
        nombre: "Archivo probatorio anexo",
        tipo: "Documento",
        criticidad: "Alta",
        custodio: "PG",
        plataforma: "Repositorio seguro",
      },
    ],
    categoriasDatos: ["Judiciales", "Laborales", "Economicos", "Salud"],
    titularesImpactados: [
      "Servidores",
      "Afiliados",
      "Terceros procesales",
      "Representantes legales",
    ],
    tercerosRelacionados: ["Juzgados", "Fiscalias", "Organismos de control", "Terceros procesales"],
    controlesClave: [
      "Expediente restringido",
      "Cifrado",
      "Registro de consulta",
      "Custodia reforzada",
    ],
    riesgosRelacionados: [
      {
        id: "R-501",
        nombre: "Exposicion de anexos sensibles en expediente",
        severidad: "Alto",
        impacto: "Afectacion grave a derechos y estrategia juridica institucional.",
      },
      {
        id: "R-502",
        nombre: "Divulgacion indebida a terceros procesales",
        severidad: "Alto",
        impacto: "Riesgo legal, reputacional y probatorio.",
      },
    ],
    artefactosRelacionados: [
      "RAT vigente v1.2",
      "EIPD prioritaria",
      "Matriz de minimizacion",
      "Bitacora de consulta del expediente",
      "Protocolo de custodia probatoria",
    ],
    flujosRelacionados: [
      "Autoridad o titular -> expediente juridico",
      "Expediente -> patrocinio",
      "Patrocinio -> juzgados o fiscalias",
      "Anexos -> repositorio seguro",
    ],
    puntosExposicion: [
      "Anexos con datos sensibles",
      "Remision a terceros procesales",
      "Consulta interna de expedientes de alta sensibilidad",
    ],
    accionesContencion: [
      "Bloquear acceso a expediente comprometido",
      "Preservar evidencia de consulta y remision",
      "Escalar a privacidad, juridico y seguridad",
    ],
  },
};

export function getActivityTraceability(activityId: number) {
  return activityTraceabilityById[activityId] ?? null;
}

export function getDependenciaOptions() {
  return Array.from(new Set(ratRecords.map((item) => item.dependencia))).sort();
}

export function getRatStatusOptions() {
  return ["Borrador", "En revision", "Vigente", "Archivado"] as RecordStatus[];
}

export function getRiskOptions() {
  return ["Bajo", "Medio", "Alto"] as RiskLevel[];
}
