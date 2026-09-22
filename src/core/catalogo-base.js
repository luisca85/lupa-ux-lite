/* ============ Datos base (biblioteca) ============ */
export const HEUR_NIELSEN = [
  {id:"nn1",num:1,nombre:"Visibilidad del estado del sistema",desc:"El sistema mantiene informado al usuario sobre lo que ocurre, con feedback apropiado y en un tiempo razonable.",revisar:["Indicadores de carga y progreso","Confirmación después de cada acción","Estado actual siempre visible (paso del flujo, ítems en el carrito)"]},
  {id:"nn2",num:2,nombre:"Correspondencia con el mundo real",desc:"Habla el lenguaje del usuario, con palabras y conceptos familiares, y sigue convenciones del mundo real en un orden lógico.",revisar:["Vocabulario sin jerga técnica","Íconos y metáforas reconocibles","Orden de la información acorde a la expectativa"]},
  {id:"nn3",num:3,nombre:"Control y libertad del usuario",desc:"Ofrece salidas de emergencia claras: deshacer, rehacer, cancelar y volver, para recuperarse de un paso en falso.",revisar:["Deshacer y cancelar disponibles","Salir de un flujo sin penalización","Volver atrás sin perder lo cargado"]},
  {id:"nn4",num:4,nombre:"Consistencia y estándares",desc:"Las mismas palabras, situaciones y acciones significan lo mismo en todo el producto, siguiendo las convenciones de la plataforma.",revisar:["Consistencia interna de botones, etiquetas y patrones","Consistencia con convenciones conocidas","Terminología uniforme"]},
  {id:"nn5",num:5,nombre:"Prevención de errores",desc:"Mejor que un buen mensaje de error es un diseño que evita que el problema ocurra.",revisar:["Validaciones y restricciones en tiempo real","Confirmación en acciones destructivas","Formatos sugeridos y valores por defecto sensatos"]},
  {id:"nn6",num:6,nombre:"Reconocer antes que recordar",desc:"Minimiza la carga de memoria haciendo visibles los objetos, acciones y opciones.",revisar:["Información necesaria visible en contexto","Ayudas y ejemplos a mano","No obligar a recordar datos entre pantallas"]},
  {id:"nn7",num:7,nombre:"Flexibilidad y eficiencia de uso",desc:"Aceleradores para el usuario experto que no estorban al novato, y posibilidad de personalizar las acciones frecuentes.",revisar:["Atajos y accesos rápidos","Acciones frecuentes al alcance","Posibilidad de personalizar"]},
  {id:"nn8",num:8,nombre:"Diseño estético y minimalista",desc:"Las interfaces no contienen información irrelevante o poco necesaria que compita con lo importante.",revisar:["Jerarquía visual clara","Solo contenido y controles esenciales","Ruido visual reducido"]},
  {id:"nn9",num:9,nombre:"Ayudar a recuperarse de errores",desc:"Los mensajes de error usan lenguaje claro, indican el problema con precisión y sugieren una solución.",revisar:["Mensajes sin códigos crípticos","Explicación concreta del problema","Un camino claro para resolverlo"]},
  {id:"nn10",num:10,nombre:"Ayuda y documentación",desc:"Aunque es mejor que el sistema se use sin documentación, puede hacer falta ofrecer ayuda buscable y orientada a la tarea.",revisar:["Ayuda accesible en contexto","Contenido buscable","Pasos concretos orientados a la tarea"]}
];
export const SESGOS_BASE = [
  {id:"s-hick",nombre:"Ley de Hick",categoria:"Ley de UX",desc:"El tiempo para tomar una decisión aumenta con la cantidad y la complejidad de las opciones.",aplicacion:"Reducir o agrupar opciones, escalonar las decisiones complejas y destacar la acción principal."},
  {id:"s-fitts",nombre:"Ley de Fitts",categoria:"Ley de UX",desc:"El tiempo para alcanzar un objetivo depende de su tamaño y de la distancia hasta él.",aplicacion:"Botones amplios para acciones importantes, targets táctiles generosos y acciones frecuentes cerca de la mano."},
  {id:"s-jakob",nombre:"Ley de Jakob",categoria:"Ley de UX",desc:"El usuario pasa la mayor parte del tiempo en otros sitios, por lo que espera que el tuyo funcione igual que los que ya conoce.",aplicacion:"Respetar patrones y convenciones establecidas, e innovar solo donde aporta un valor claro."},
  {id:"s-miller",nombre:"Ley de Miller",categoria:"Memoria",desc:"La memoria de trabajo retiene alrededor de 7 (±2) elementos a la vez. Suele malinterpretarse como un límite rígido de ítems por menú; lo útil es agrupar (chunking).",aplicacion:"Agrupar la información en bloques y dividir los procesos largos en pasos."},
  {id:"s-serial",nombre:"Efecto de posición serial",categoria:"Memoria",desc:"Se recuerdan mejor el primer (primacía) y el último (recencia) elemento de una serie.",aplicacion:"Ubicar acciones o datos clave al inicio y al final de listas y menús."},
  {id:"s-vonrestorff",nombre:"Efecto Von Restorff",categoria:"Memoria",desc:"Cuando hay varios elementos similares, el que se diferencia es el que más se recuerda.",aplicacion:"Destacar visualmente la acción o el plan que se quiere resaltar."},
  {id:"s-zeigarnik",nombre:"Efecto Zeigarnik",categoria:"Sesgo cognitivo",desc:"Las tareas incompletas o interrumpidas se recuerdan mejor que las terminadas.",aplicacion:"Barras de progreso e indicadores de perfil incompleto que motivan la finalización."},
  {id:"s-peakend",nombre:"Regla del pico y el final",categoria:"Sesgo cognitivo",desc:"Una experiencia se juzga sobre todo por su momento más intenso y por cómo termina, no por el promedio.",aplicacion:"Cuidar los momentos críticos y el cierre: confirmaciones y estados de éxito."},
  {id:"s-tesler",nombre:"Ley de Tesler",categoria:"Principio",desc:"Todo sistema tiene una complejidad irreducible: la pregunta es quién la asume, el sistema o el usuario.",aplicacion:"Absorber la complejidad en el diseño en lugar de trasladarla a la persona."},
  {id:"s-doherty",nombre:"Umbral de Doherty",categoria:"Principio",desc:"La interacción se vuelve fluida y la productividad se dispara cuando el sistema responde en menos de 400 ms.",aplicacion:"Respuestas rápidas, feedback inmediato y percepción de velocidad con estados de carga."},
  {id:"s-anclaje",nombre:"Anclaje",categoria:"Sesgo cognitivo",desc:"La primera información recibida, por ejemplo un precio, condiciona el juicio sobre lo que viene después.",aplicacion:"Mostrar primero una referencia para enmarcar la percepción de valor."},
  {id:"s-perdida",nombre:"Aversión a la pérdida",categoria:"Sesgo cognitivo",desc:"Una pérdida pesa psicológicamente más que una ganancia equivalente.",aplicacion:"Encuadrar beneficios como evitar una pérdida y cuidar los mensajes de baja o cancelación."},
  {id:"s-social",nombre:"Prueba social",categoria:"Sesgo cognitivo",desc:"Las personas se guían por las acciones y opiniones de otros para decidir, sobre todo ante la incertidumbre.",aplicacion:"Reseñas, cantidad de usuarios y testimonios reales en los momentos de duda."},
  {id:"s-dotacion",nombre:"Efecto de dotación",categoria:"Sesgo cognitivo",desc:"Se valora más algo por el solo hecho de sentirlo propio.",aplicacion:"Pruebas gratuitas, personalización temprana y sensación de progreso propio."},
  {id:"s-hiperbolico",nombre:"Descuento hiperbólico",categoria:"Sesgo cognitivo",desc:"Se tiende a preferir una recompensa menor inmediata antes que una mayor en el futuro.",aplicacion:"Mostrar beneficios inmediatos y recompensas tempranas en el onboarding."},
  {id:"s-eleccion",nombre:"Paradoja de la elección",categoria:"Sesgo cognitivo",desc:"Demasiadas opciones pueden aumentar la ansiedad y frenar la decisión.",aplicacion:"Opciones por defecto, comparativas guiadas y menos alternativas simultáneas."},
  {id:"s-ikea",nombre:"Efecto IKEA",categoria:"Sesgo cognitivo",desc:"Las personas valoran más lo que ayudaron a crear o configurar.",aplicacion:"Personalización y configuración guiada que generan involucramiento."},
  {id:"s-carga",nombre:"Carga cognitiva",categoria:"Principio",desc:"Esfuerzo mental total que exige una interfaz; si supera la capacidad disponible, el rendimiento cae.",aplicacion:"Reducir pasos y decisiones, mostrar información progresiva y usar lenguaje simple."}
];
export const SEVERIDAD = [
  {n:0,label:"No es problema",v:"--sev0",desc:"No es un problema de usabilidad."},
  {n:1,label:"Cosmético",v:"--sev1",desc:"No necesita arreglarse salvo que sobre tiempo."},
  {n:2,label:"Menor",v:"--sev2",desc:"Baja prioridad para arreglar."},
  {n:3,label:"Mayor",v:"--sev3",desc:"Importante, prioridad alta."},
  {n:4,label:"Catástrofe",v:"--sev4",desc:"Imperativo arreglarlo antes de lanzar."}
];
export const TIPOS = ["Problema","Oportunidad","Observación"];
export const PLATAFORMAS = ["Sitio web","App móvil","App web","Otro"];
export const ESTADOS = ["Planificado","En curso","Terminado"];
