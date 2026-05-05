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
    title: "Titulares",
    caption: "Tipos de titulares involucrados",
    help: "Seleccione las categorias de titulares impactadas por el tratamiento.",
  },
  {
    title: "Datos personales",
    caption: "Categorias y detalle de datos",
    help: "Registre categorias de datos y un detalle resumido de lo que efectivamente se trata.",
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
