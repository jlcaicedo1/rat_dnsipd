export type Scenario = {
  id: string;
  norm: string;
  title: string;
  qs?: string[];
  extra?: boolean;
  cat?: "confidencialidad" | "integridad" | "disponibilidad";
};

export const S2_SCENARIOS: Scenario[] = [
  { id: "2.1", norm: "Art. 10(d) LOPDP", title: "Riesgo de que las finalidades del tratamiento no sean determinadas, explícitas, legítimas y comunicadas al titular", qs: ["¿Son los propósitos del tratamiento especificados, explícitos y legítimos?"] },
  { id: "2.2", norm: "Art. 7 LOPDP", title: "Riesgo de no cumplir con el tratamiento legítimo de datos personales", qs: ["¿Cuáles son las causales que hacen que el tratamiento sea legal?"] },
  { id: "2.3", norm: "Art. 8 LOPDP", title: "Riesgo de no cumplir con las condiciones del consentimiento", qs: ["¿Cómo se obtiene el consentimiento de los interesados?", "¿Es el consentimiento legítimo y lícito?"] },
  { id: "2.4", norm: "Art. 10(i) LOPDP", title: "Riesgo de guardar los datos personales de manera excesiva", qs: ["¿Cuál es la duración de almacenamiento de los datos?", "¿Qué método se utiliza para borrar los datos de manera segura?"] },
  { id: "2.5", norm: "Art. 10(e) LOPDP", title: "Riesgo de no cumplir con el principio de pertinencia y minimización de datos", qs: ["¿Los datos recopilados son adecuados, relevantes y limitados a lo necesario en relación con los fines para los que se procesan?"] },
  { id: "2.6", norm: "Arts. 13 y 17 LOPDP", title: "Riesgo de no cumplir con los derechos de acceso y portabilidad de datos", qs: ["¿Qué métodos se utilizan para garantizar el acceso de los titulares a sus datos personales?", "¿Qué métodos se utilizan para garantizar el derecho a la portabilidad de datos?"] },
  { id: "2.7", norm: "Art. 14 LOPDP", title: "Riesgo de no cumplir con el derecho de rectificación y actualización", qs: ["¿Cómo pueden los interesados ejercer sus derechos de rectificación y actualización?"] },
  { id: "2.8", norm: "Art. 15 LOPDP", title: "Riesgo de no cumplir con el derecho de eliminación", qs: ["¿Cómo pueden los interesados ejercer su derecho de eliminación de datos?", "¿Qué método de borrado seguro es utilizado?"] },
  { id: "2.9", norm: "Arts. 16 y 19 LOPDP", title: "Riesgo de no cumplir con los derechos de oposición y suspensión del tratamiento", qs: ["¿Cómo pueden los interesados ejercer sus derechos de oposición y de suspensión?"] },
  { id: "2.10", norm: "Arts. 34 y 47 LOPDP", title: "Riesgo de que los encargados del tratamiento no cumplan con sus obligaciones", qs: ["¿Las obligaciones de los encargados del tratamiento están claramente identificadas y regidas por un contrato?"] },
  { id: "2.11", norm: "[Art. LOPDP aplicable]", title: "Escenario jurídico adicional", qs: ["¿Cuál es la obligación o derecho afectado?", "¿Qué evidencia demuestra la existencia o inexistencia del riesgo?"], extra: true },
];

export const S3_SCENARIOS: Scenario[] = [
  { id: "3.1.1", cat: "confidencialidad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la seguridad de datos personales / Malware (troyanos, spyware)" },
  { id: "3.1.2", cat: "confidencialidad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la seguridad de datos personales / Vulnerabilidades web / SQL injection" },
  { id: "3.1.3", cat: "confidencialidad", norm: "[Artículo(s) aplicables]", title: "Escenario adicional de confidencialidad", extra: true },
  { id: "3.2.1", cat: "integridad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la integridad de datos personales / Ataques internos" },
  { id: "3.2.2", cat: "integridad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la seguridad de datos personales / Ingeniería social – phishing" },
  { id: "3.2.3", cat: "integridad", norm: "[Artículo(s) aplicables]", title: "Escenario adicional de integridad", extra: true },
  { id: "3.3.1", cat: "disponibilidad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la seguridad de datos personales / Ataques de denegación distribuida de servicio (DDoS)" },
  { id: "3.3.2", cat: "disponibilidad", norm: "Arts. 10(e) y 37 LOPDP", title: "Vulneración de la seguridad de datos personales / Malware (ransomware)" },
  { id: "3.3.3", cat: "disponibilidad", norm: "[Artículo(s) aplicables]", title: "Escenario adicional de disponibilidad", extra: true },
];

export const PANELS = ["portada", "s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;
export type PanelId = typeof PANELS[number];

export const PANEL_TITLES: Record<PanelId, string> = {
  portada: "Portada y Control Documental",
  s1: "1. Establecimiento del Contexto",
  s2: "2. Escenarios de Riesgos Jurídicos",
  s3: "3. Escenarios de Riesgos de Seguridad",
  s4: "4. Registro General de Evaluación",
  s5: "5. Plan de Tratamiento y Seguimiento",
  s6: "6. Anexos y Evidencias",
  s7: "7. Declaración de Revisión y Aprobación",
};

export const RISK_COLORS: Record<string, string> = {
  "muy alto": "#c0392b", "alto": "#e67e22", "medio": "#f39c12", "bajo": "#27ae60", "muy bajo": "#2980b9",
  "alta": "#c0392b", "media": "#f39c12", "baja": "#27ae60",
  "inminente": "#c0392b", "muy probable": "#e67e22", "probable": "#f39c12", "poco probable": "#27ae60", "insignificante": "#2980b9",
  "muy alta": "#c0392b", "muy baja": "#2980b9",
};
