export const RAT_FORM_STEPS = [
  {
    title: "Identificacion",
    caption: "Informacion general del tratamiento",
    help: "Defina el RAT, la unidad responsable y la unidad ejecutora desde estructura organica controlada.",
  },
  {
    title: "Finalidad y base de licitud",
    caption: "Finalidad especifica y base de licitud",
    help: "La finalidad debe ser concreta y la base de licitud debe venir de una opcion controlada.",
  },
  {
    title: "Titulares y datos personales",
    caption: "Titulares, categorias y campos",
    help: "Seleccione titulares y documente en la misma vista las categorias y campos tratados.",
  },
  {
    title: "Operacion del tratamiento",
    caption: "Origen, acciones y escala",
    help: "Describa procedencia, operaciones, volumen, frecuencia, permanencia y alcance geografico.",
  },
  {
    title: "Terceros y transferencias",
    caption: "Terceros, encargados y flujos externos",
    help: "Solo complete esta seccion si existe acceso, encargo, comunicacion o transferencia de datos.",
  },
  {
    title: "Conservacion",
    caption: "Plazo y fechas clave",
    help: "El plazo de retencion y sus fechas deben quedar expresados desde el inicio del registro.",
  },
  {
    title: "Medidas de seguridad",
    caption: "Controles tecnicos, administrativos y fisicos",
    help: "Documente las medidas generales y si existe perfilamiento de titulares.",
  },
  {
    title: "Activos asociados",
    caption: "Activos que soportan el tratamiento",
    help: "Relacione repositorios, aplicaciones y activos fisicos o digitales asociados.",
  },
  {
    title: "Riesgo y EIPD",
    caption: "Evaluacion preliminar",
    help: "Use las condiciones del tratamiento para anticipar si debe activar una EIPD.",
  },
] as const;

export const BASE_LEGAL_OPTIONS = [
  "Consentimiento expreso del titular",
  "Ejecucion de relaciones precontractuales y contractuales",
  "Interes vital del titular",
  "Cumplimiento de obligaciones legales",
  "Mision o interes publico",
];

export const TITULARES_OPTIONS = [
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
];

export const DATA_CATEGORY_OPTIONS = [
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
];

export const SPECIAL_DATA_CATEGORIES = [
  "Datos de salud",
  "Datos biometricos",
  "Datos relacionados con afiliacion sindical o gremial",
  "Datos de personas con discapacidad y sus sustitutos",
  "Datos de menores de edad",
];

export type PersonalDataDomain = {
  id: string;
  name: string;
  description: string;
  fields: string[];
  sensitive?: boolean;
  childRelated?: boolean;
};

export const PERSONAL_DATA_DOMAINS: PersonalDataDomain[] = [
  {
    id: "identificacion",
    name: "Datos de identificacion",
    description: "Identificadores civiles o institucionales del titular.",
    fields: [
      "Nombres y apellidos",
      "Numero de cedula",
      "Pasaporte",
      "RUC",
      "Fecha de nacimiento",
      "Nacionalidad",
      "Estado civil",
      "Genero o sexo",
    ],
  },
  {
    id: "contacto",
    name: "Datos de contacto",
    description: "Canales utilizados para atencion, notificacion o comunicacion.",
    fields: [
      "Direccion domiciliaria",
      "Correo electronico",
      "Numero telefonico",
      "Celular",
      "Contacto de emergencia",
    ],
  },
  {
    id: "academicos",
    name: "Datos academicos",
    description: "Formacion, certificaciones y registros de estudio.",
    fields: [
      "Nivel de instruccion",
      "Titulos obtenidos",
      "Institucion educativa",
      "Especialidad",
      "Certificaciones",
    ],
  },
  {
    id: "laborales",
    name: "Datos laborales",
    description: "Informacion relacionada con empleo, afiliacion o servicios.",
    fields: [
      "Cargo",
      "Relacion laboral",
      "Historial laboral",
      "Fecha de ingreso",
      "Remuneracion",
      "Aportes",
      "Empleador",
    ],
  },
  {
    id: "salud",
    name: "Datos de salud",
    description: "Informacion clinica o asistencial de especial proteccion.",
    sensitive: true,
    fields: [
      "Diagnostico",
      "Historia clinica",
      "Discapacidad",
      "Medicacion",
      "Resultados de examenes",
      "Incapacidad medica",
      "Atenciones de salud",
    ],
  },
  {
    id: "biometricos",
    name: "Datos biometricos",
    description: "Rasgos fisicos o tecnicos usados para identificacion.",
    sensitive: true,
    fields: [
      "Huella dactilar",
      "Reconocimiento facial",
      "Firma digitalizada",
      "Fotografia",
      "Plantilla biometrica",
    ],
  },
  {
    id: "financieros",
    name: "Datos financieros, bancarios o crediticios",
    description: "Datos economicos usados para pagos, aportes o obligaciones.",
    fields: [
      "Cuenta bancaria",
      "Ingresos",
      "Egresos",
      "Deudas",
      "Historial de aportes",
      "Forma de pago",
    ],
  },
  {
    id: "geolocalizacion",
    name: "Datos de geolocalizacion",
    description: "Ubicaciones declaradas, registradas o generadas por sistemas.",
    fields: [
      "Direccion georreferenciada",
      "Coordenadas",
      "Lugar de atencion",
      "Registro de ubicacion",
    ],
  },
  {
    id: "diversidad",
    name: "Datos de diversidad y autoidentificacion",
    description: "Informacion sensible de identidad, pertenencia o condicion.",
    sensitive: true,
    fields: [
      "Etnia",
      "Autoidentificacion cultural",
      "Idioma",
      "Genero",
      "Orientacion declarada",
    ],
  },
  {
    id: "familiares",
    name: "Datos de parentesco o vinculo",
    description: "Relaciones familiares, representantes y dependientes.",
    fields: [
      "Conyuge",
      "Hijos",
      "Dependientes",
      "Representante legal",
      "Derechohabientes",
      "Tutor",
    ],
  },
  {
    id: "menores",
    name: "Datos de menores de edad",
    description: "Datos de ninas, ninos y adolescentes.",
    sensitive: true,
    childRelated: true,
    fields: [
      "Nombres del menor",
      "Edad",
      "Representante legal",
      "Parentesco",
      "Condicion de dependencia",
      "Datos de salud del menor",
    ],
  },
  {
    id: "judiciales",
    name: "Datos legales y de cumplimiento normativo",
    description: "Soportes administrativos, judiciales o de control.",
    sensitive: true,
    fields: [
      "Providencias judiciales",
      "Procesos administrativos",
      "Sanciones",
      "Requerimientos de autoridad",
      "Documentos legales",
    ],
  },
  {
    id: "sindicales",
    name: "Datos relacionados con afiliacion sindical o gremial",
    description: "Afiliaciones o pertenencias de especial proteccion.",
    sensitive: true,
    fields: [
      "Afiliacion sindical",
      "Organizacion gremial",
      "Aportes sindicales",
      "Representacion laboral",
    ],
  },
  {
    id: "tecnologicos",
    name: "Datos tecnologicos",
    description: "Trazas tecnicas generadas por sistemas institucionales.",
    fields: [
      "Usuario de sistema",
      "Direccion IP",
      "Logs de acceso",
      "Identificador de dispositivo",
      "Correo institucional",
    ],
  },
  {
    id: "socioeconomicos",
    name: "Datos socioeconomicos",
    description: "Informacion de condicion social, familiar o economica.",
    fields: [
      "Nivel socioeconomico",
      "Grupo familiar",
      "Vivienda",
      "Ingresos declarados",
      "Condicion de vulnerabilidad",
    ],
  },
  {
    id: "migratorios",
    name: "Datos de condicion migratoria",
    description: "Informacion de residencia, nacionalidad o movilidad.",
    fields: [
      "Tipo de visa",
      "Residencia",
      "Fecha de ingreso al pais",
      "Permiso migratorio",
      "Pais de origen",
    ],
  },
];

export const PERSONAL_DATA_TITULAR_RELATIONSHIPS: Record<string, string[]> = {
  afiliados: [
    "identificacion",
    "contacto",
    "laborales",
    "salud",
    "biometricos",
    "financieros",
    "socioeconomicos",
    "familiares",
    "sindicales",
    "tecnologicos",
  ],
  pensionistas: [
    "identificacion",
    "contacto",
    "laborales",
    "salud",
    "financieros",
    "familiares",
    "tecnologicos",
  ],
  beneficiarios: [
    "identificacion",
    "contacto",
    "salud",
    "familiares",
    "menores",
    "socioeconomicos",
  ],
  jubilados: [
    "identificacion",
    "contacto",
    "laborales",
    "salud",
    "financieros",
    "familiares",
  ],
  derechohabientes: [
    "identificacion",
    "contacto",
    "salud",
    "familiares",
    "menores",
  ],
  colaboradores: [
    "identificacion",
    "contacto",
    "academicos",
    "laborales",
    "salud",
    "biometricos",
    "financieros",
    "judiciales",
    "sindicales",
    "tecnologicos",
  ],
  exservidores: [
    "identificacion",
    "contacto",
    "laborales",
    "financieros",
    "judiciales",
  ],
  pasantes: ["identificacion", "contacto", "academicos", "laborales", "tecnologicos"],
  practicantes: ["identificacion", "contacto", "academicos", "laborales", "menores"],
  internos: ["identificacion", "contacto", "academicos", "salud", "tecnologicos"],
  postulantes: ["identificacion", "contacto", "academicos", "laborales", "judiciales"],
  empleador: ["identificacion", "contacto", "financieros", "laborales", "tecnologicos"],
  apoderados: ["identificacion", "contacto", "familiares", "judiciales"],
  contratistas: ["identificacion", "contacto", "laborales", "judiciales", "tecnologicos"],
  tutores: ["identificacion", "contacto", "familiares", "menores", "judiciales"],
};

export const DATA_ORIGIN_OPTIONS = [
  "Entrega directa por parte del titular",
  "Generacion y registro automatico a partir de sistemas institucionales",
  "Interoperabilidad e intercambio interinstitucional",
  "Fuentes publicas",
  "Obligaciones legales, regulatorias o judiciales",
];

export const ACTION_OPTIONS = [
  "Creacion / Recoleccion",
  "Uso / Procesamiento",
  "Almacenamiento / Conservacion",
  "Encargo / Transferencia o comunicacion",
  "Archivado",
  "Eliminacion / Supresion",
];

export const VOLUME_OPTIONS = [
  "0 a 1000",
  "1001 a 10000",
  "10001 a 100000",
  "100001 en adelante",
];

export const FREQUENCY_OPTIONS = [
  "Puntual",
  "Periodica o recurrente",
  "Continua o en tiempo real",
];

export const RETENTION_PATTERN_OPTIONS = [
  "Ocasional",
  "Temporal",
  "Prolongada",
];

export const SCOPE_OPTIONS = [
  "Local",
  "Nacional",
  "Global o transfronterizo",
];

export const YES_NO_OPTIONS = ["SI", "NO"];

export const THIRD_PARTY_CATEGORY_OPTIONS = [
  "Encargado - Instituciones publicas",
  "Encargado - Instituciones privadas",
  "Encargado internacional",
  "Destinatario - Instituciones publicas",
  "Destinatario - Instituciones privadas",
  "Destinatario - Autoridades administrativas y judiciales",
  "Destinatario internacional",
];

export const COUNTRY_OPTIONS = [
  "Ecuador",
  "Colombia",
  "Estados Unidos",
  "Espana",
  "Canada",
  "Alemania",
  "Brasil",
  "Chile",
];

export const ASSET_CATEGORY_OPTIONS = [
  "Aplicacion (Web)",
  "Software (Cliente / Servidor)",
  "Componente (Webservices)",
  "Base de datos",
  "Equipo hardware",
  "Repositorio (Documentacion fisica / digital)",
];
