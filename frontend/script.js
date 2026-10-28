// biblioteca central - script.js

// URL base de la API de Laravel. Se define en config.js (APP_CONFIG.API_URL);
// si está vacío, se usa el mismo host de esta página en el puerto 8000.
var API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_URL) ||
  window.location.protocol + "//" + window.location.hostname + ":8000/api";

var TOKEN_KEY = "biblioteca-token";
var STORAGE_KEY_HISTORIAL = "biblioteca-historial";
var STORAGE_KEY_SESION = "biblioteca-sesion";

var libros = [];
var reservas = [];
var prestamos = [];
var socios = [];
var multas = [];
var categoriasApi = []; // [{id, nombre}], viene de GET /categorias
var ejemplaresPorLibro = {}; // libroId(string) -> [{id, estado}, ...] (una entrada por copia física)

// Categorías del historial. "facturas" agrupa los cobros (multas).
var CATEGORIAS_HISTORIAL = {
  reservas:  { etiqueta: "Reservas",  icono: "fa-bookmark",            clase: "hist-reservas" },
  facturas:  { etiqueta: "Facturas",  icono: "fa-file-invoice-dollar", clase: "hist-facturas" },
  prestamos: { etiqueta: "Préstamos", icono: "fa-hand-holding",        clase: "hist-prestamos" },
  socios:    { etiqueta: "Socios",    icono: "fa-users",               clase: "hist-socios" },
  libros:    { etiqueta: "Libros",    icono: "fa-book",                clase: "hist-libros" },
  cuentas:   { etiqueta: "Cuentas",   icono: "fa-user-gear",           clase: "hist-cuentas" }
};
var filtroHistorial = "todas";
var busquedaHistorial = "";

var historial = cargarHistorial();
var sesionActual = cargarSesion();
var carrito = cargarCarritoGuardado(); // ids (string) de libros agregados al carrito
var portadaEncontrada = null;
var portadaEditando = null;
var tituloOriginalEditando = "";
var tiempoEspera = null;
var tiempoEsperaEditar = null;
// si el usuario sube una imagen local a mano, dejamos de pisarla con la búsqueda automática
var portadaEsManual = false;
var portadaEditandoEsManual = false;

var lista = document.getElementById("lista-libros");
var estadoVacio = document.getElementById("estado-vacio");
var contador = document.getElementById("contador-libros");
var contadorLibrosHeader = document.getElementById("contador-libros-header");
var contadorLibrosHeaderSesion = document.getElementById("contador-libros-header-sesion");
var form = document.getElementById("form-libro");
var inputBuscar = document.getElementById("buscar");
var filtroCategoria = document.getElementById("filtro-categoria");
var inputTitulo = document.getElementById("titulo");
var previewImg = document.getElementById("preview-portada-img");
var previewPlaceholder = document.getElementById("preview-portada-placeholder");
var previewLoading = document.getElementById("preview-portada-loading");

var inputCategoria = document.getElementById("categoria");
var grupoNuevaCategoria = document.getElementById("grupo-nueva-categoria");
var inputNuevaCategoria = document.getElementById("nueva-categoria");

var inputCodigoBarras = document.getElementById("codigo-barras");
var btnBuscarIsbn = document.getElementById("btn-buscar-isbn");
var inputImagenLocal = document.getElementById("imagen-local");

var modalEditar = new bootstrap.Modal(document.getElementById("modal-editar"));
var formEditar = document.getElementById("form-editar");
var editarId = document.getElementById("editar-id");
var editarTitulo = document.getElementById("editar-titulo");
var editarAutor = document.getElementById("editar-autor");
var editarCategoria = document.getElementById("editar-categoria");
var grupoEditarNuevaCategoria = document.getElementById("grupo-editar-nueva-categoria");
var inputEditarNuevaCategoria = document.getElementById("editar-nueva-categoria");
var editarCodigoBarras = document.getElementById("editar-codigo-barras");
var editarCopias = document.getElementById("editar-copias");
var editarImagenLocal = document.getElementById("editar-imagen-local");
var editarPreviewImg = document.getElementById("editar-preview-img");
var editarPreviewPlaceholder = document.getElementById("editar-preview-placeholder");
var editarPreviewLoading = document.getElementById("editar-preview-loading");

// reservas y préstamos
var modalReservar = new bootstrap.Modal(document.getElementById("modal-reservar"));
var formReservar = document.getElementById("form-reservar");
var reservarLibroId = document.getElementById("reservar-libro-id");
var reservarLibroTitulo = document.getElementById("reservar-libro-titulo");
var reservarNombre = document.getElementById("reservar-nombre");
var reservarTipo = document.getElementById("reservar-tipo");
var reservarFecha = document.getElementById("reservar-fecha");
var grupoReservarNombre = document.getElementById("grupo-reservar-nombre");
var grupoReservarTipo = document.getElementById("grupo-reservar-tipo");
var reservarComoSocioInfo = document.getElementById("reservar-como-socio-info");

var modalPrestar = new bootstrap.Modal(document.getElementById("modal-prestar"));
var formPrestar = document.getElementById("form-prestar");
var prestarLibroId = document.getElementById("prestar-libro-id");
var prestarLibroTitulo = document.getElementById("prestar-libro-titulo");
var prestarSocioId = document.getElementById("prestar-socio-id");
var prestarEjemplarId = document.getElementById("prestar-ejemplar-id");
var prestarNombre = document.getElementById("prestar-nombre");
var prestarFechaHoy = document.getElementById("prestar-fecha-hoy");

var listaReservas = document.getElementById("lista-reservas");
var estadoVacioReservas = document.getElementById("estado-vacio-reservas");
// Grupos (por socio) renderizados en el último renderizarReservas(); se usa
// para resolver el botón "Aceptar todas" sin tener que re-derivar el
// agrupado a partir de data-attributes.
var ultimosGruposReservas = [];
var menuMisReservas = document.getElementById("menu-mis-reservas");
var contadorMisReservas = document.getElementById("contador-mis-reservas");
var listaMisReservasDropdown = document.getElementById("lista-mis-reservas-dropdown");
var misReservasVacio = document.getElementById("mis-reservas-vacio");
var listaPrestamos = document.getElementById("lista-prestamos");
var estadoVacioPrestamos = document.getElementById("estado-vacio-prestamos");
var filtroPrestamos = document.getElementById("filtro-prestamos");

var modalMisPrestamos = new bootstrap.Modal(document.getElementById("modal-mis-prestamos"));
var listaModalPrestamos = document.getElementById("lista-modal-prestamos");
var estadoVacioModalPrestamos = document.getElementById("estado-vacio-modal-prestamos");

// socios
var formSocio = document.getElementById("form-socio");
var socioNombreInput = document.getElementById("socio-nombre");
var socioIdInput = document.getElementById("socio-id");
var socioApellidoInput = document.getElementById("socio-apellido");
var socioCedulaInput = document.getElementById("socio-cedula");
var socioTelefonoInput = document.getElementById("socio-telefono");
var socioEmailInput = document.getElementById("socio-email");
var socioDireccionInput = document.getElementById("socio-direccion");
var socioValidoHastaInput = document.getElementById("socio-valido-hasta");
var socioGuardarBtn = document.getElementById("socio-guardar");
var socioCancelarEdicionBtn = document.getElementById("socio-cancelar-edicion");
var socioTipoInput = document.getElementById("socio-tipo");
var listaSocios = document.getElementById("lista-socios");
var estadoVacioSocios = document.getElementById("estado-vacio-socios");
var datalistSocios = document.getElementById("datalist-socios");

// multas
var formMulta = document.getElementById("form-multa");
var multaSocioInput = document.getElementById("multa-socio");
var multaMotivoInput = document.getElementById("multa-motivo");
var multaMontoInput = document.getElementById("multa-monto");
var listaMultas = document.getElementById("lista-multas");
var estadoVacioMultas = document.getElementById("estado-vacio-multas");

// autenticación
var modalLogin = new bootstrap.Modal(document.getElementById("modal-login"));
var formLogin = document.getElementById("form-login");
var loginEmail = document.getElementById("login-email");
var loginPassword = document.getElementById("login-password");

var modalRegistro = new bootstrap.Modal(document.getElementById("modal-registro"));
var formRegistro = document.getElementById("form-registro");
var registroNombre = document.getElementById("registro-nombre");
var registroApellido = document.getElementById("registro-apellido");
var registroCedula = document.getElementById("registro-cedula");
var registroTelefono = document.getElementById("registro-telefono");
var registroEmail = document.getElementById("registro-email");
var registroPassword = document.getElementById("registro-password");
var registroPasswordConfirmar = document.getElementById("registro-password-confirmar");

var headerBtnLogin = document.getElementById("header-btn-login");
var headerBtnRegistro = document.getElementById("header-btn-registro");
var headerBtnLogout = document.getElementById("header-btn-logout");
var headerAuthInvitado = document.getElementById("header-auth-invitado");
var headerAuthSesion = document.getElementById("header-auth-sesion");
var headerUsuarioNombre = document.getElementById("header-usuario-nombre");
var menuAvatar = document.getElementById("menu-avatar");
var menuAuthInvitado = document.getElementById("menu-auth-invitado");
var menuAuthSesion = document.getElementById("menu-auth-sesion");
var headerBtnCatalogoInvitado = document.getElementById("header-btn-catalogo-invitado");
var headerBtnCatalogoSesion = document.getElementById("header-btn-catalogo-sesion");

var linkIrARegistro = document.getElementById("link-ir-a-registro");
var linkIrALogin = document.getElementById("link-ir-a-login");

// reportes
var reportesStats = document.getElementById("reportes-stats");
var listaTopLibros = document.getElementById("lista-top-libros");
var estadoVacioTop = document.getElementById("estado-vacio-top");
var listaNotificaciones = document.getElementById("lista-notificaciones");
var estadoVacioNotificaciones = document.getElementById("estado-vacio-notificaciones");
var listaHistorial = document.getElementById("lista-historial");
var estadoVacioHistorial = document.getElementById("estado-vacio-historial");

function crearId() {
  return Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

// ------------------------------
// Avisos: los errores aparecen abajo a la derecha, en un recuadro rojo
// (antes eran ventanas emergentes del navegador, que frenan toda la página)
// ------------------------------
var zonaAvisos = document.getElementById("zona-avisos");

function avisar(mensaje, tipo) {
  tipo = tipo || "error";
  if (!zonaAvisos || !mensaje) return;
  var aviso = document.createElement("div");
  aviso.className = "aviso aviso-" + tipo;
  aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
  aviso.innerHTML =
    '<i class="fa-solid ' + (tipo === "error" ? "fa-circle-exclamation" : "fa-circle-check") + ' aviso-icono" aria-hidden="true"></i>' +
    '<div class="aviso-cuerpo"><p class="aviso-titulo"></p><p class="aviso-texto"></p></div>' +
    '<button type="button" class="aviso-cerrar" aria-label="Cerrar aviso"><i class="fa-solid fa-xmark"></i></button>';
  aviso.querySelector(".aviso-titulo").textContent = tipo === "error" ? "No se pudo completar" : "Listo";
  aviso.querySelector(".aviso-texto").textContent = mensaje;
  zonaAvisos.appendChild(aviso);
  // como máximo 4 avisos a la vez: se va el más viejo
  while (zonaAvisos.children.length > 4) zonaAvisos.removeChild(zonaAvisos.firstChild);

  var temporizador = null;
  function programarCierre() { temporizador = setTimeout(cerrar, tipo === "error" ? 8000 : 4000); }
  function cerrar() {
    clearTimeout(temporizador);
    aviso.classList.add("saliendo");
    setTimeout(function () { if (aviso.parentNode) aviso.parentNode.removeChild(aviso); }, 220);
  }
  aviso.querySelector(".aviso-cerrar").addEventListener("click", cerrar);
  // mientras el mouse está encima, el aviso no se va (da tiempo a leerlo)
  aviso.addEventListener("mouseenter", function () { clearTimeout(temporizador); });
  aviso.addEventListener("mouseleave", programarCierre);
  programarCierre();
}

function avisarError(mensaje) { avisar(mensaje, "error"); }
function avisarOk(mensaje) { avisar(mensaje, "ok"); }

// ------------------------------
// Confirmaciones con un modal propio (en lugar de confirm())
// ------------------------------
var modalConfirmarEl = document.getElementById("modal-confirmar");
var modalConfirmar = new bootstrap.Modal(modalConfirmarEl);
var resolverConfirmacion = null;

function confirmar(texto, textoBoton, esPeligroso) {
  document.getElementById("confirmar-texto").textContent = texto;
  var botonSi = document.getElementById("confirmar-si");
  botonSi.textContent = textoBoton || "Confirmar";
  botonSi.classList.toggle("btn-peligro", !!esPeligroso);
  if (resolverConfirmacion) resolverConfirmacion(false);
  return new Promise(function (resolve) {
    resolverConfirmacion = resolve;
    modalConfirmar.show();
  });
}

function responderConfirmacion(valor) {
  var resolver = resolverConfirmacion;
  resolverConfirmacion = null;
  modalConfirmar.hide();
  if (resolver) resolver(valor);
}

document.getElementById("confirmar-si").addEventListener("click", function () { responderConfirmacion(true); });
document.getElementById("confirmar-no").addEventListener("click", function () { responderConfirmacion(false); });
modalConfirmarEl.addEventListener("hidden.bs.modal", function () { if (resolverConfirmacion) responderConfirmacion(false); });
modalConfirmarEl.addEventListener("shown.bs.modal", function () { document.getElementById("confirmar-si").focus(); });

// ------------------------------
// Botones: mientras la acción está en curso, el botón queda deshabilitado
// (con un indicador de carga) para que no se mande dos veces
// ------------------------------
function conCarga(boton, promesa) {
  if (!boton) return Promise.resolve(promesa);
  boton.disabled = true;
  boton.classList.add("cargando");
  boton.setAttribute("aria-busy", "true");
  function liberar() {
    boton.disabled = false;
    boton.classList.remove("cargando");
    boton.removeAttribute("aria-busy");
  }
  return Promise.resolve(promesa).then(
    function (valor) { liberar(); return valor; },
    function (error) { liberar(); throw error; }
  );
}

function botonEnviar(formulario) {
  return formulario.querySelector('[type="submit"]');
}

// ------------------------------
// Contraseñas: botón para verlas y verificador de seguridad
// (las mismas reglas valida el backend en AuthController)
// ------------------------------
var REGLAS_PASSWORD = [
  { texto: "8 caracteres o más", cumple: function (v) { return v.length >= 8; } },
  { texto: "Una mayúscula", cumple: function (v) { return /[A-Z]/.test(v); } },
  { texto: "Una minúscula", cumple: function (v) { return /[a-z]/.test(v); } },
  { texto: "Un número", cumple: function (v) { return /\d/.test(v); } }
];

function passwordValida(valor) {
  return REGLAS_PASSWORD.every(function (r) { return r.cumple(valor); });
}

function requisitosFaltantes(valor) {
  return REGLAS_PASSWORD.filter(function (r) { return !r.cumple(valor); })
    .map(function (r) { return r.texto.toLowerCase(); });
}

// 0 = vacía, 1 = débil, 2 = aceptable, 3 = fuerte
function nivelPassword(valor) {
  if (!valor) return 0;
  var cumplidas = REGLAS_PASSWORD.filter(function (r) { return r.cumple(valor); }).length;
  if (cumplidas < REGLAS_PASSWORD.length) return 1;
  var extra = /[^A-Za-z0-9]/.test(valor) || valor.length >= 12;
  return extra ? 3 : 2;
}

var TEXTO_NIVEL = ["", "Débil", "Aceptable", "Fuerte"];

function instalarCamposPassword() {
  var campos = document.querySelectorAll('input[type="password"]');
  Array.prototype.forEach.call(campos, function (input) {
    var envoltura = document.createElement("div");
    envoltura.className = "campo-password";
    input.parentNode.insertBefore(envoltura, input);
    envoltura.appendChild(input);

    var ver = document.createElement("button");
    ver.type = "button";
    ver.className = "btn-ver-password";
    ver.setAttribute("aria-label", "Mostrar contraseña");
    ver.setAttribute("aria-pressed", "false");
    ver.setAttribute("aria-controls", input.id);
    ver.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
    envoltura.appendChild(ver);

    ver.addEventListener("click", function () {
      var mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      ver.setAttribute("aria-pressed", String(mostrar));
      ver.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
      ver.innerHTML = '<i class="fa-solid ' + (mostrar ? "fa-eye-slash" : "fa-eye") + '" aria-hidden="true"></i>';
      input.focus();
    });

    var modo = input.dataset.verificar || "";
    if (modo === "fuerza") {
      var medidor = document.createElement("div");
      medidor.className = "medidor-password";
      medidor.innerHTML =
        '<div class="medidor-barra" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<p class="medidor-nivel" aria-live="polite"></p>' +
        '<ul class="medidor-reglas">' + REGLAS_PASSWORD.map(function (r) {
          return '<li><i class="fa-solid fa-circle" aria-hidden="true"></i>' + r.texto + "</li>";
        }).join("") + "</ul>";
      envoltura.parentNode.insertBefore(medidor, envoltura.nextSibling);

      var actualizar = function () {
        var valor = input.value;
        var nivel = nivelPassword(valor);
        medidor.dataset.nivel = nivel;
        medidor.querySelector(".medidor-nivel").textContent = nivel ? "Seguridad: " + TEXTO_NIVEL[nivel] : "";
        var items = medidor.querySelectorAll(".medidor-reglas li");
        REGLAS_PASSWORD.forEach(function (r, i) {
          var ok = r.cumple(valor);
          items[i].classList.toggle("ok", ok);
          items[i].querySelector("i").className = "fa-solid " + (ok ? "fa-check" : "fa-circle");
        });
      };
      input.addEventListener("input", actualizar);
      actualizar();
    } else if (modo.indexOf("igual:") === 0) {
      var original = document.getElementById(modo.slice(6));
      var estado = document.createElement("p");
      estado.className = "coincidencia-password";
      estado.setAttribute("aria-live", "polite");
      envoltura.parentNode.insertBefore(estado, envoltura.nextSibling);
      var comparar = function () {
        if (!input.value) { estado.textContent = ""; estado.className = "coincidencia-password"; return; }
        var iguales = input.value === original.value;
        estado.textContent = iguales ? "Las contraseñas coinciden" : "Las contraseñas no coinciden";
        estado.className = "coincidencia-password " + (iguales ? "ok" : "mal");
      };
      input.addEventListener("input", comparar);
      if (original) original.addEventListener("input", comparar);
    }
  });
}

// después de un form.reset(): vuelve a ocultar las contraseñas y refresca los verificadores
function reiniciarCamposPassword(formulario) {
  var campos = formulario.querySelectorAll(".campo-password input");
  Array.prototype.forEach.call(campos, function (input) {
    var ver = input.parentNode.querySelector(".btn-ver-password");
    if (input.type !== "password" && ver) ver.click();
    input.dispatchEvent(new Event("input"));
  });
}

function correoValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ------------------------------
// Calendario web (flatpickr, en español). Mismo aspecto en todos los
// navegadores y en el celular; el valor sigue siendo AAAA-MM-DD.
// ------------------------------
var calendarios = {};

// español con los meses en minúscula ("27 de octubre de 2026")
function localeCalendario() {
  var es = flatpickr.l10ns.es;
  return Object.assign({}, es, {
    months: {
      shorthand: es.months.shorthand.map(function (m) { return m.toLowerCase(); }),
      longhand: es.months.longhand.map(function (m) { return m.toLowerCase(); })
    }
  });
}

function instalarCalendarios() {
  var campos = document.querySelectorAll("[data-calendario]");
  Array.prototype.forEach.call(campos, function (input) {
    if (typeof flatpickr === "undefined") {
      input.type = "date"; // si no cargó el CDN, queda el calendario del navegador
      return;
    }
    calendarios[input.id] = flatpickr(input, {
      locale: localeCalendario(),
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "j \\d\\e F \\d\\e Y",
      disableMobile: true,
      static: true,
      monthSelectorType: "static"
    });
  });
}

function fijarFecha(id, valor, minimo) {
  var fp = calendarios[id];
  var input = document.getElementById(id);
  if (fp) {
    if (minimo !== undefined) fp.set("minDate", minimo || null);
    if (valor) fp.setDate(valor, false); else fp.clear();
  } else if (input) {
    if (minimo !== undefined) input.min = minimo || "";
    input.value = valor || "";
  }
}

// fecha de hoy en hora local (toISOString usa UTC y después de las 21 h en
// Uruguay ya devolvía el día siguiente)
function hoyIso() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// ------------------------------
// Cliente HTTP hacia la API de Laravel
// ------------------------------

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function guardarToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

var TIMEOUT_API_MS = 20000; // 20 s máximo por petición

// wrapper de fetch: agrega el token, arma el body en JSON y normaliza errores
function apiFetch(path, opciones) {
  opciones = opciones || {};
  var headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  var token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  // timeout: si el servidor no responde a tiempo cortamos la petición en vez
  // de dejar la pantalla cargando para siempre
  var controlador = typeof AbortController !== "undefined" ? new AbortController() : null;
  var limiteMs = opciones.timeout || TIMEOUT_API_MS;
  var temporizador = controlador ? setTimeout(function () { controlador.abort(); }, limiteMs) : null;

  return fetch(API_BASE + path, {
    method: opciones.method || "GET",
    headers: headers,
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    signal: controlador ? controlador.signal : undefined
  }).then(function (r) {
    if (temporizador) clearTimeout(temporizador);
    if (r.status === 204) return null;

    return r.json().catch(function () { return null; }).then(function (datos) {
      if (!r.ok) {
        // 401 con sesión abierta = el token venció: se cierra la sesión pero el
        // catálogo público se vuelve a cargar. Un 401 al iniciar sesión (clave
        // incorrecta) no debe tocar nada.
        if (r.status === 401 && token && path.indexOf("/auth/") !== 0) {
          cerrarSesionLocal();
          cargarCatalogoPublico();
        }
        var mensaje = (datos && datos.message) ? datos.message : ("Error " + r.status + " al comunicarse con la API.");
        if (datos && datos.errors) {
          var primerCampo = Object.keys(datos.errors)[0];
          if (primerCampo) mensaje = datos.errors[primerCampo][0];
        }
        var error = new Error(mensaje);
        error.status = r.status;
        error.datos = datos;
        throw error;
      }
      return datos;
    });
  }).catch(function (error) {
    if (temporizador) clearTimeout(temporizador);
    if (error && error.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder (más de " + Math.round(limiteMs / 1000) + " s). Probá de nuevo.");
    }
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con la API (" + API_BASE + "). ¿El backend Laravel está corriendo?");
    }
    throw error;
  });
}

function mostrarErrorApi(err) {
  console.error(err);
  avisarError(err && err.message ? err.message : "Ocurrió un error al comunicarse con el servidor.");
}

// las listas paginadas de Laravel vienen como {data: [...], ...}; las que no
// están paginadas (categorías) vienen como array plano
function extraerDatos(respuesta) {
  if (!respuesta) return [];
  return Array.isArray(respuesta) ? respuesta : (respuesta.data || []);
}

var ESTADO_EJEMPLAR_LABEL = {
  disponible: "Disponible",
  prestado: "Prestado",
  reservado: "Reservado",
  extraviado: "Extraviado",
  fuera_de_circulacion: "Fuera de circulación"
};

var MOTIVO_MULTA_LABEL = { atraso: "Atraso en devolución", perdida: "Libro perdido", deterioro: "Libro deteriorado" };
var MOTIVO_MULTA_VALOR = { "Atraso en devolución": "atraso", "Libro perdido": "perdida", "Libro deteriorado": "deterioro" };
var METODO_PAGO_LABEL = {
  efectivo: "Efectivo",
  debito: "Tarjeta de débito",
  credito: "Tarjeta de crédito",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago"
};

function formatearMonto(valor) {
  var n = Number(valor) || 0;
  return "$ " + n.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function nombreCompletoSocio(s) {
  if (!s) return "";
  return s.nombre + (s.apellido && s.apellido !== "-" ? " " + s.apellido : "");
}

function fechaDesdeApi(valor) {
  if (!valor) return null;
  // fechas "solas" (AAAA-MM-DD o medianoche UTC): se leen como fecha local;
  // new Date("2026-10-27") las toma en UTC y en Uruguay mostraba el día anterior
  var texto = String(valor);
  var soloFecha = /^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.0+)?Z)?$/.exec(texto);
  if (soloFecha) return soloFecha[3] + "/" + soloFecha[2] + "/" + soloFecha[1];
  return formatearFecha(new Date(texto));
}

// mapea un Libro de la API + su ejemplar (copia física) al objeto que ya
// esperan las funciones de renderizado existentes ({id, titulo, autor, categoria, estado...})
// Copias "en la biblioteca" (las extraviadas o fuera de circulación no cuentan)
var ESTADOS_EN_CIRCULACION = { disponible: true, prestado: true, reservado: true };

function resumenCopias(libroId) {
  var copias = (ejemplaresPorLibro[String(libroId)] || []).filter(function (ej) { return ESTADOS_EN_CIRCULACION[ej.estado]; });
  var r = { total: copias.length, disponibles: 0, prestadas: 0, reservadas: 0, ejemplarDisponibleId: null };
  copias.forEach(function (ej) {
    if (ej.estado === "disponible") {
      r.disponibles++;
      if (!r.ejemplarDisponibleId) r.ejemplarDisponibleId = String(ej.id);
    } else if (ej.estado === "prestado") r.prestadas++;
    else if (ej.estado === "reservado") r.reservadas++;
  });
  return r;
}

// estado general del libro a partir de sus copias: "Disponible" mientras
// quede al menos una copia libre
function aplicarCopias(libro) {
  var r = resumenCopias(libro.id);
  libro.copias = r.total;
  libro.disponibles = r.disponibles;
  libro.prestadas = r.prestadas;
  libro.reservadas = r.reservadas;
  libro.ejemplarId = r.ejemplarDisponibleId; // copia libre para prestar directo
  if (r.disponibles > 0) libro.estado = "Disponible";
  else if (r.reservadas > 0) libro.estado = "Reservado";
  else if (r.prestadas > 0) libro.estado = "Prestado";
  else libro.estado = "Sin copias";
  return libro;
}

// mapea un Libro de la API al objeto que usan las funciones de renderizado
// ({id, titulo, autor, categoria, estado, copias, disponibles...})
function mapLibro(l) {
  return aplicarCopias({
    id: String(l.id),
    titulo: l.titulo,
    autor: l.autor,
    categoria: l.categoria ? l.categoria.nombre : "Sin categoría",
    categoriaId: l.categoria_id || (l.categoria ? l.categoria.id : null),
    portada: l.foto_portada || null,
    codigoBarras: l.isbn || null
  });
}

function mapSocio(s) {
  var pendiente = s.cedula_pendiente === true || String(s.cedula || "").indexOf("PENDIENTE-") === 0;
  var validoHasta = s.valido_hasta ? String(s.valido_hasta).substring(0, 10) : "";
  return {
    id: String(s.id),
    nombres: s.nombre || "",
    apellidos: s.apellido && s.apellido !== "-" ? s.apellido : "",
    cedula: pendiente ? "" : (s.cedula || ""),
    cedulaPendiente: pendiente,
    numeroSocio: s.numero_socio || "",
    telefono: s.telefono || "",
    email: s.email || "",
    direccion: s.direccion || "",
    validoHasta: validoHasta,
    validoHastaTexto: validoHasta ? validoHasta.split("-").reverse().join("/") : "",
    vencido: validoHasta ? validoHasta < new Date().toISOString().substring(0, 10) : false,
    nombre: nombreCompletoSocio(s),
    tipo: s.tipo === "centro_educativo" ? "Centro educativo" : "Particular",
    verificado: s.verificado_centro_educativo === true,
    estado: s.estado === "suspendido" ? "Suspendido" : (s.estado === "inactivo" ? "Inactivo" : "Activo")
  };
}

function mapReserva(r) {
  return {
    id: String(r.id),
    libroId: String(r.libro_id),
    socioId: r.socio_id ? String(r.socio_id) : (r.socio ? String(r.socio.id) : null),
    nombre: r.socio ? nombreCompletoSocio(r.socio) : "",
    tipo: r.socio && r.socio.tipo === "centro_educativo" ? "Centro educativo" : "Particular",
    fecha: fechaDesdeApi(r.fecha_reserva) || "",
    // "pendiente_retiro": ya tiene una copia apartada; "pendiente": en espera
    estado: r.estado || "",
    ejemplarId: r.ejemplar_id ? String(r.ejemplar_id) : null
  };
}

function mapPrestamo(p) {
  var libroId = "";
  if (p.ejemplar) libroId = String(p.ejemplar.libro ? p.ejemplar.libro.id : p.ejemplar.libro_id);
  return {
    id: String(p.id),
    libroId: libroId,
    socioId: p.socio_id ? String(p.socio_id) : (p.socio ? String(p.socio.id) : null),
    nombre: p.socio ? nombreCompletoSocio(p.socio) : "",
    estado: p.estado || "",
    fechaPrestamo: fechaDesdeApi(p.fecha_prestamo) || "",
    fechaDevolucion: fechaDesdeApi(p.fecha_devolucion),
    fechaVencimiento: fechaDesdeApi(p.fecha_vencimiento)
  };
}

function mapMulta(m) {
  return {
    id: String(m.id),
    socio: m.socio ? nombreCompletoSocio(m.socio) : "",
    socioId: m.socio_id ? String(m.socio_id) : null,
    motivo: MOTIVO_MULTA_LABEL[m.motivo] || m.motivo,
    socioCedula: m.socio && String(m.socio.cedula || "").indexOf("PENDIENTE-") !== 0 ? (m.socio.cedula || "") : "",
    socioNumero: m.socio ? (m.socio.numero_socio || "") : "",
    motivoValor: m.motivo,
    monto: m.monto,
    fecha: fechaDesdeApi(m.fecha) || "",
    pagada: m.estado === "pagada",
    metodoPago: m.metodo_pago || "",
    metodoPagoTexto: METODO_PAGO_LABEL[m.metodo_pago] || "",
    fechaPago: fechaDesdeApi(m.fecha_pago) || ""
  };
}

// ------------------------------
// Carga de datos desde la API
// ------------------------------

function cargarEjemplaresApi() {
  return apiFetch("/ejemplares?per_page=5000").then(function (resp) {
    ejemplaresPorLibro = {};
    extraerDatos(resp).forEach(function (ej) {
      var clave = String(ej.libro_id);
      (ejemplaresPorLibro[clave] = ejemplaresPorLibro[clave] || []).push({ id: ej.id, estado: ej.estado });
    });
  }).catch(function (err) {
    // GET /ejemplares ya es accesible para cualquier usuario autenticado
    // (ver routes/api.php); este catch queda como red de seguridad por si
    // la sesión venciera justo acá, para no romper la carga del catálogo.
    if (err.status === 403 || err.status === 401) { ejemplaresPorLibro = {}; return; }
    throw err;
  });
}

function cargarLibrosApi() {
  return cargarEjemplaresApi().then(function () {
    return apiFetch("/libros?per_page=500").then(function (resp) {
      libros = extraerDatos(resp).map(mapLibro);
    });
  });
}

function cargarCategoriasApi() {
  return apiFetch("/categorias").then(function (resp) {
    categoriasApi = extraerDatos(resp);
  });
}

function cargarReservasApi() {
  return apiFetch("/reservas?per_page=500").then(function (resp) {
    reservas = extraerDatos(resp)
      .filter(function (r) { return r.estado === "pendiente" || r.estado === "pendiente_retiro"; })
      .map(mapReserva);
  });
}

function cargarPrestamosApi() {
  return apiFetch("/prestamos?per_page=500").then(function (resp) {
    prestamos = extraerDatos(resp).map(mapPrestamo);
  }).catch(function (err) {
    if (err.status === 403) { prestamos = []; return; }
    throw err;
  });
}

// listar/crear socios requiere rol administrador o bibliotecario; si el
// usuario logueado es un simple socio, no rompemos la carga por un 403
function cargarSociosApi() {
  return apiFetch("/socios?per_page=500").then(function (resp) {
    socios = extraerDatos(resp).map(mapSocio);
  }).catch(function (err) {
    if (err.status === 403) { socios = []; return; }
    throw err;
  });
}

function cargarMultasApi() {
  return apiFetch("/multas?per_page=500").then(function (resp) {
    multas = extraerDatos(resp).map(mapMulta);
  }).catch(function (err) {
    if (err.status === 403) { multas = []; return; }
    throw err;
  });
}

function cargarTodoDesdeApi() {
  // antes se pedían uno atrás del otro (libros, categorías, reservas,
  // préstamos, socios, multas), aunque ninguno depende del resultado de
  // otro; en paralelo la carga inicial (y cada recarga tras reservar,
  // prestar, devolver, etc.) tarda lo que tarda el más lento, no la suma
  // de los 6
  return Promise.all([
    cargarLibrosApi(),
    cargarCategoriasApi(),
    cargarReservasApi(),
    cargarPrestamosApi(),
    cargarSociosApi(),
    cargarMultasApi()
  ])
    .then(function () {
      actualizarSelectsCategoria();
      renderizarLibros();
      renderizarReservas();
      renderizarPrestamos();
      renderizarSocios();
      renderizarMultas();
      var tabReportes = document.getElementById("tab-reportes");
      if (tabReportes && tabReportes.classList.contains("active") && typeof renderizarReportes === "function") {
        renderizarReportes();
      }
    })
    .catch(mostrarErrorApi);
}

// ------------------------------
// Actualización en segundo plano (polling)
// ------------------------------
// No hay websockets/broadcasting armado en el backend, así que "en vivo"
// lo resolvemos pidiéndole a la API los datos frescos cada cierto tiempo
// mientras haya una sesión abierta. Así, si un socio reserva un libro o
// otro bibliotecario presta/devuelve uno, quien esté mirando la pantalla
// lo ve reflejado solo, sin tener que recargar la página a mano.
var INTERVALO_POLLING_MS = 30000; // 30s: antes 8s, saturaba al servidor y volvía lenta la web
var idIntervaloPolling = null;
var pollingEnCurso = false; // evita que se apilen pedidos si el servidor está lento

// Foto de los datos actuales (lo que está pintado en pantalla). Se compara
// antes/después de cada actualización en segundo plano: si no cambió nada,
// no se toca el DOM y la persona no nota que hubo una actualización.
function firmaDatosActuales() {
  return {
    ejemplares: JSON.stringify(ejemplaresPorLibro),
    reservas: JSON.stringify(reservas),
    prestamos: JSON.stringify(prestamos),
    socios: JSON.stringify(socios),
    multas: JSON.stringify(multas)
  };
}

function pollActualizacionesApi() {
  // pestaña en segundo plano: no tiene sentido gastar pedidos
  if (document.hidden) return;
  // si hay un modal abierto (editando, prestando, etc.) no lo pisamos a
  // mitad de uso; se actualiza solo en el próximo tick, cuando se cierre
  if (document.querySelector(".modal.show")) return;
  // si el pedido anterior todavía no terminó, no mandamos otro encima
  if (pollingEnCurso) return;
  pollingEnCurso = true;

  var antes = firmaDatosActuales();

  // los libros (con portadas en base64, muy pesados) no se vuelven a bajar:
  // solo refrescamos el estado de los ejemplares y lo aplicamos a los ya cargados
  Promise.all([
    cargarEjemplaresApi().then(function () {
      libros.forEach(aplicarCopias);
    }),
    cargarReservasApi(),
    cargarPrestamosApi(),
    cargarSociosApi(),
    cargarMultasApi()
  ]).then(function () {
    var despues = firmaDatosActuales();
    var cambioReservas = antes.reservas !== despues.reservas;
    var cambioPrestamos = antes.prestamos !== despues.prestamos;
    var cambioLibros = antes.ejemplares !== despues.ejemplares || cambioReservas || cambioPrestamos;
    var cambioSocios = antes.socios !== despues.socios;
    var cambioMultas = antes.multas !== despues.multas;

    // sin cambios: no se repinta nada
    if (!cambioLibros && !cambioSocios && !cambioMultas) return;

    if (cambioLibros) renderizarLibros();
    if (cambioReservas || cambioPrestamos) renderizarReservas();
    if (cambioPrestamos) renderizarPrestamos();
    if (cambioSocios) renderizarSocios();
    if (cambioMultas) renderizarMultas();
    var tabReportes = document.getElementById("tab-reportes");
    if (tabReportes && tabReportes.classList.contains("active") && typeof renderizarReportes === "function") {
      renderizarReportes();
    }
  }).catch(function (err) {
    // fallo silencioso: un error de red pasajero durante el polling no
    // debería interrumpir a quien esté trabajando con un aviso
    console.error("Error actualizando datos en segundo plano:", err);
  }).then(function () {
    pollingEnCurso = false;
  });
}

function iniciarPollingActualizaciones() {
  detenerPollingActualizaciones();
  idIntervaloPolling = setInterval(pollActualizacionesApi, INTERVALO_POLLING_MS);
}

function detenerPollingActualizaciones() {
  if (idIntervaloPolling) {
    clearInterval(idIntervaloPolling);
    idIntervaloPolling = null;
  }
}

// si volvés a la pestaña (después de tenerla en otra ventana/minimizada),
// actualizamos al toque en vez de esperar hasta el próximo tick
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && sesionActual && getToken()) {
    pollActualizacionesApi();
  }
});

function formatearFecha(fecha) {
  var dd = String(fecha.getDate()).padStart(2, "0");
  var mm = String(fecha.getMonth() + 1).padStart(2, "0");
  return dd + "/" + mm + "/" + fecha.getFullYear();
}

function fechaHoy() {
  return formatearFecha(new Date());
}

// convierte "dd/mm/yyyy" a un objeto Date
function parsearFecha(texto) {
  var partes = texto.split("/");
  return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
}

// devuelve "dd/mm/yyyy" sumándole X días a una fecha en el mismo formato
function sumarDias(textoFecha, dias) {
  var fecha = parsearFecha(textoFecha);
  fecha.setDate(fecha.getDate() + dias);
  return formatearFecha(fecha);
}

function fechaVencida(textoFecha) {
  return parsearFecha(textoFecha).getTime() < parsearFecha(fechaHoy()).getTime();
}

// diferencia en días entre una fecha "dd/mm/yyyy" y hoy (positivo = futuro)
function diasDesdeHoy(textoFecha) {
  var msPorDia = 24 * 60 * 60 * 1000;
  var diferencia = parsearFecha(textoFecha).getTime() - parsearFecha(fechaHoy()).getTime();
  return Math.round(diferencia / msPorDia);
}

// texto legible de cuánto tiempo le queda (o hace cuánto venció) a un préstamo
function textoTiempoRestante(fechaVencimiento) {
  if (!fechaVencimiento) return "";
  var dias = diasDesdeHoy(fechaVencimiento);
  if (dias > 0) return "Te quedan " + dias + " día" + (dias === 1 ? "" : "s") + " (vence el " + fechaVencimiento + ")";
  if (dias === 0) return "Vence hoy";
  var diasVencido = Math.abs(dias);
  return "Venció hace " + diasVencido + " día" + (diasVencido === 1 ? "" : "s") + " (" + fechaVencimiento + ")";
}

// ------------------------------
// Socios (RF09): alta, consulta y estado activo/suspendido
// ------------------------------

function buscarSocioLocalPorId(id) {
  for (var i = 0; i < socios.length; i++) {
    if (socios[i].id === id) return socios[i];
  }
  return null;
}

function buscarSocioApiPorNombre(nombre) {
  return apiFetch("/socios?buscar=" + encodeURIComponent(nombre) + "&per_page=5").then(function (resp) {
    var lista = extraerDatos(resp);
    var normalizado = nombre.trim().toLowerCase();
    for (var i = 0; i < lista.length; i++) {
      if (nombreCompletoSocio(lista[i]).trim().toLowerCase() === normalizado) return lista[i];
    }
    return null;
  });
}

// busca un socio registrado por nombre (al reservar, prestar o multar a
// nombre de alguien). Antes, si no existía, se creaba solo con el nombre;
// ahora el correo es obligatorio, así que hay que registrarlo en "Socios".
// Requiere estar logueado como administrador o bibliotecario.
function buscarSocioRegistrado(nombre) {
  nombre = nombre.trim();
  var local = buscarSocioPorNombre(nombre);
  if (local) return Promise.resolve({ id: local.id });
  return buscarSocioApiPorNombre(nombre).then(function (existente) {
    if (existente) return existente;
    throw new Error("No hay ningún socio registrado como \"" + nombre + "\". Registralo primero en la pestaña Socios (el correo es obligatorio).");
  });
}

function actualizarDatalistSocios() {
  datalistSocios.innerHTML = socios.map(function (s) {
    return '<option value="' + escapeHtml(s.nombre) + '"></option>';
  }).join("");
}

// Datos del carnet de socio (cédula, vigencia, código de barras y contacto)
function datosSocioHtml(socio) {
  var partes = [];
  partes.push(socio.cedulaPendiente
    ? '<span class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i>Cédula pendiente de cargar</span>'
    : '<i class="fa-regular fa-id-card me-1"></i>C.I. ' + escapeHtml(socio.cedula));
  if (socio.numeroSocio && !socio.cedulaPendiente) partes.push('<i class="fa-solid fa-barcode me-1"></i>' + escapeHtml(socio.numeroSocio));
  if (socio.validoHastaTexto) {
    partes.push((socio.vencido ? '<span class="text-danger">' : "<span>") + '<i class="fa-regular fa-calendar me-1"></i>Válido hasta ' + escapeHtml(socio.validoHastaTexto) + (socio.vencido ? " (vencido)" : "") + "</span>");
  }
  if (socio.telefono) partes.push('<i class="fa-solid fa-phone me-1"></i>' + escapeHtml(socio.telefono));
  if (socio.email) partes.push('<i class="fa-solid fa-envelope me-1"></i>' + escapeHtml(socio.email));
  if (socio.direccion) partes.push('<i class="fa-solid fa-location-dot me-1"></i>' + escapeHtml(socio.direccion));
  return '<span class="datos-socio">' + partes.map(function (p) { return "<span>" + p + "</span>"; }).join("") + "</span>";
}

function renderizarSocios() {
  actualizarDatalistSocios();
  listaSocios.innerHTML = "";
  estadoVacioSocios.classList.toggle("d-none", socios.length > 0);

  for (var i = 0; i < socios.length; i++) {
    var socio = socios[i];
    var claseEstado = socio.estado === "Suspendido" ? "estado-prestado" : "estado-disponible";
    var esCentroEducativo = socio.tipo === "Centro educativo";
    var etiquetaVerificacionHtml = "";
    var botonVerificarHtml = "";
    if (esCentroEducativo) {
      etiquetaVerificacionHtml = socio.verificado
        ? '<span class="etiqueta-estado estado-disponible me-2">Verificado</span>'
        : '<span class="etiqueta-estado estado-prestado me-2">Sin verificar</span>';
      botonVerificarHtml = '<button class="btn-accion-libro" title="' + (socio.verificado ? "Quitar verificación" : "Verificar como centro educativo") + '" data-accion="verificar-educativo" data-id="' + socio.id + '"><i class="fa-solid fa-' + (socio.verificado ? "rotate-left" : "check") + '"></i></button>';
    }
    // Cambiar el tipo de socio (Particular <-> Centro educativo) queda
    // reservado al administrador; un bibliotecario no ve este botón.
    var botonCambiarTipoHtml = permisos.esAdmin
      ? '<button class="btn-accion-libro" title="' + (esCentroEducativo ? "Cambiar a particular" : "Cambiar a centro educativo") + '" data-accion="cambiar-tipo-socio" data-id="' + socio.id + '"><i class="fa-solid fa-' + (esCentroEducativo ? "user" : "school") + '"></i></button>'
      : "";
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(socio.apellidos ? socio.apellidos.toUpperCase() + ", " + socio.nombres : socio.nombres) + "</h3>" +
      '<div class="mb-2 small text-muted">' + datosSocioHtml(socio) + "</div>" +
      '<span class="etiqueta etiqueta-tipo me-2">' + escapeHtml(socio.tipo) + "</span>" +
      etiquetaVerificacionHtml +
      '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(socio.estado) + "</span></div>" +
      '<button class="btn-accion-libro" title="Editar datos" data-accion="editar-socio" data-id="' + socio.id + '"><i class="fa-solid fa-pen"></i></button>' +
      botonCambiarTipoHtml +
      botonVerificarHtml +
      '<button class="btn-accion-libro" title="Cambiar estado" data-accion="toggle-estado-socio" data-id="' + socio.id + '"><i class="fa-solid fa-rotate"></i></button>' +
      '<button class="btn-accion-libro" title="Eliminar socio" data-accion="eliminar-socio" data-id="' + socio.id + '"><i class="fa-solid fa-trash"></i></button>';
    listaSocios.appendChild(li);
  }
}

function limpiarFormSocio() {
  formSocio.reset();
  fijarFecha("socio-valido-hasta", "");
  socioIdInput.value = "";
  socioGuardarBtn.innerHTML = '<i class="fa-solid fa-user-plus me-2"></i>Registrar socio';
  socioCancelarEdicionBtn.classList.add("d-none");
}

function editarSocioEnFormulario(socio) {
  socioIdInput.value = socio.id;
  socioNombreInput.value = socio.nombres;
  socioApellidoInput.value = socio.apellidos;
  socioCedulaInput.value = socio.cedula;
  socioTelefonoInput.value = socio.telefono;
  socioEmailInput.value = socio.email;
  socioDireccionInput.value = socio.direccion;
  fijarFecha("socio-valido-hasta", socio.validoHasta);
  socioTipoInput.value = socio.tipo;
  socioGuardarBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Guardar cambios';
  socioCancelarEdicionBtn.classList.remove("d-none");
  formSocio.scrollIntoView({ behavior: "smooth", block: "start" });
  socioNombreInput.focus();
}

socioCancelarEdicionBtn.addEventListener("click", limpiarFormSocio);

formSocio.addEventListener("submit", function (e) {
  e.preventDefault();
  var editandoId = socioIdInput.value;
  var nombre = socioNombreInput.value.trim();
  var apellido = socioApellidoInput.value.trim();
  var cedula = socioCedulaInput.value.trim();
  var emailSocio = socioEmailInput.value.trim();
  if (!nombre || !apellido || !cedula || !emailSocio) {
    avisarError("Completá nombres, apellidos, cédula y correo electrónico.");
    return;
  }
  if (!correoValido(emailSocio)) {
    avisarError("El correo electrónico no es válido.");
    socioEmailInput.focus();
    return;
  }
  var nombreCompleto = nombre + " " + apellido;
  var existente = buscarSocioPorNombre(nombreCompleto);
  if (existente && existente.id !== editandoId) {
    avisarError("Ya existe un socio registrado con ese nombre.");
    return;
  }

  var body = {
    nombre: nombre,
    apellido: apellido,
    cedula: cedula,
    telefono: socioTelefonoInput.value.trim() || null,
    email: emailSocio,
    direccion: socioDireccionInput.value.trim() || null,
    tipo: socioTipoInput.value === "Centro educativo" ? "centro_educativo" : "particular"
  };
  if (socioValidoHastaInput.value) body.valido_hasta = socioValidoHastaInput.value;

  var peticion = editandoId
    ? apiFetch("/socios/" + editandoId, { method: "PUT", body: body })
    : apiFetch("/socios", { method: "POST", body: body });

  conCarga(socioGuardarBtn, peticion
    .then(function () {
      registrarHistorial((editandoId ? "Se actualizaron los datos del socio " : "Se registró al socio ") + nombreCompleto + ".", "socios", nombreCompleto);
      return cargarSociosApi();
    })
    .then(function () {
      renderizarSocios();
      limpiarFormSocio();
      socioNombreInput.focus();
    }))
    .catch(mostrarErrorApi);
});

function buscarSocioPorNombre(nombre) {
  var normalizado = (nombre || "").trim().toLowerCase();
  for (var i = 0; i < socios.length; i++) {
    if (socios[i].nombre.trim().toLowerCase() === normalizado) return socios[i];
  }
  return null;
}

listaSocios.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  var socio = buscarSocioLocalPorId(boton.dataset.id);
  if (!socio) return;

  if (boton.dataset.accion === "editar-socio") {
    editarSocioEnFormulario(socio);
  } else if (boton.dataset.accion === "toggle-estado-socio") {
    var nuevoEstado = socio.estado === "Suspendido" ? "activo" : "suspendido";
    conCarga(boton, apiFetch("/socios/" + socio.id + "/estado", { method: "PATCH", body: { estado: nuevoEstado } })
      .then(function () {
        registrarHistorial("El socio " + socio.nombre + " cambió de estado.", "socios", socio.nombre);
        return cargarSociosApi();
      }))
      .then(renderizarSocios)
      .catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "eliminar-socio") {
    confirmar("¿Eliminar a " + socio.nombre + " de la lista de socios?", "Eliminar", true).then(function (ok) {
      if (!ok) return;
      return conCarga(boton, apiFetch("/socios/" + socio.id, { method: "DELETE" })
        .then(function () { return cargarSociosApi(); }))
        .then(renderizarSocios);
    }).catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "cambiar-tipo-socio") {
    if (!permisos.esAdmin) return; // el backend igual lo rechazaría (403), esto es solo defensa en el cliente
    var esCentroEducativoActual = socio.tipo === "Centro educativo";
    var nuevoTipoApi = esCentroEducativoActual ? "particular" : "centro_educativo";
    var mensajeConfirmacion = esCentroEducativoActual
      ? "¿Cambiar a " + socio.nombre + " de centro educativo a particular?"
      : "¿Cambiar a " + socio.nombre + " a centro educativo?";
    confirmar(mensajeConfirmacion, "Cambiar tipo").then(function (ok) {
      if (!ok) return;
      return conCarga(boton, apiFetch("/socios/" + socio.id, { method: "PUT", body: { tipo: nuevoTipoApi } })
        .then(function () {
          registrarHistorial(
            "Se cambió el tipo de socio de " + socio.nombre + " a " +
            (nuevoTipoApi === "centro_educativo" ? "centro educativo" : "particular") + ".",
            "socios", socio.nombre
          );
          return cargarSociosApi();
        }))
        .then(renderizarSocios);
    }).catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "verificar-educativo") {
    var nuevoValorVerificado = !socio.verificado;
    conCarga(boton, apiFetch("/socios/" + socio.id + "/verificar-educativo", { method: "PATCH", body: { verificado: nuevoValorVerificado } })
      .then(function () {
        registrarHistorial(
          (nuevoValorVerificado ? "Se verificó" : "Se quitó la verificación de") + " a " + socio.nombre + " como centro educativo.",
          "socios", socio.nombre
        );
        return cargarSociosApi();
      }))
      .then(renderizarSocios)
      .catch(mostrarErrorApi);
  }
});

// ------------------------------
// Multas (RNF13): atrasos, pérdidas o deterioros
// ------------------------------

function buscarMultaLocalPorId(id) {
  for (var i = 0; i < multas.length; i++) {
    if (multas[i].id === id) return multas[i];
  }
  return null;
}

var busquedaMultas = "";
var filtroCategoriaMultas = "";
var filtroEstadoMultas = "";
var filtroMetodoMultas = "";
var resumenMultasEl = document.getElementById("resumen-multas");
var modalPagarMulta = new bootstrap.Modal(document.getElementById("modal-pagar-multa"));
var formPagarMulta = document.getElementById("form-pagar-multa");

// Buscador de multas por usuario: busca por nombre, apellido, cédula o
// n.º de socio; se combina con los filtros de estado, método de pago y motivo
function multasFiltradas() {
  var palabras = normalizarBusqueda(busquedaMultas).split(/\s+/).filter(Boolean);
  return multas.filter(function (m) {
    if (filtroCategoriaMultas && m.motivo !== filtroCategoriaMultas) return false;
    if (filtroEstadoMultas === "pagada" && !m.pagada) return false;
    if (filtroEstadoMultas === "pendiente" && m.pagada) return false;
    if (filtroMetodoMultas && m.metodoPago !== filtroMetodoMultas) return false;
    if (!palabras.length) return true;
    var texto = normalizarBusqueda([m.socio, m.socioCedula, m.socioNumero].join(" "));
    return palabras.every(function (p) { return texto.indexOf(p) !== -1; });
  });
}

function hayFiltrosMultas() {
  return !!(busquedaMultas.trim() || filtroCategoriaMultas || filtroEstadoMultas || filtroMetodoMultas);
}

function renderizarResumenMultas(visibles) {
  if (!resumenMultasEl) return;
  if (!hayFiltrosMultas() || !visibles.length) {
    resumenMultasEl.classList.add("d-none");
    resumenMultasEl.innerHTML = "";
    return;
  }
  var pendiente = 0;
  var pagado = 0;
  var personas = {};
  visibles.forEach(function (m) {
    if (m.pagada) pagado += Number(m.monto) || 0; else pendiente += Number(m.monto) || 0;
    personas[m.socioId || m.socio] = m.socio;
  });
  var nombres = Object.keys(personas).map(function (k) { return personas[k]; });
  var titulo = nombres.length === 1
    ? "Multas de " + nombres[0]
    : visibles.length + " multas de " + nombres.length + " socios";
  resumenMultasEl.innerHTML =
    '<p class="resumen-multas-titulo">' + escapeHtml(titulo) + "</p>" +
    '<div class="resumen-multas-cifras">' +
      '<div><span class="resumen-cifra pendiente">' + formatearMonto(pendiente) + '</span><span class="resumen-etiqueta">a cobrar</span></div>' +
      '<div><span class="resumen-cifra pagado">' + formatearMonto(pagado) + '</span><span class="resumen-etiqueta">ya pagado</span></div>' +
    "</div>";
  resumenMultasEl.classList.remove("d-none");
}

function renderizarMultas() {
  listaMultas.innerHTML = "";
  var visibles = multasFiltradas();
  estadoVacioMultas.classList.toggle("d-none", visibles.length > 0);
  var textoVacio = estadoVacioMultas.querySelector("p");
  if (textoVacio) textoVacio.textContent = multas.length && !visibles.length ? "Ninguna multa coincide con la búsqueda. Probá con otro nombre o quitá algún filtro." : "No hay multas registradas.";
  renderizarResumenMultas(visibles);

  for (var i = 0; i < visibles.length; i++) {
    var multa = visibles[i];
    var claseEstado = multa.pagada ? "estado-disponible" : "estado-prestado";
    var textoEstado = multa.pagada ? "Pagada" : "Pendiente";
    var detallePago = "";
    if (multa.pagada) {
      detallePago = '<p class="mb-0 small detalle-pago"><i class="fa-solid fa-receipt me-1" aria-hidden="true"></i>' +
        (multa.fechaPago ? "Pagada el " + multa.fechaPago : "Pagada") +
        (multa.metodoPagoTexto ? ". Método: " + escapeHtml(multa.metodoPagoTexto) : " (sin método registrado)") + "</p>";
    }
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(multa.socio) +
      (multa.socioCedula ? ' <span class="cedula-multa">C.I. ' + escapeHtml(multa.socioCedula) + "</span>" : "") + "</h3>" +
      '<p class="mb-1">' + escapeHtml(multa.motivo) + ' <strong class="monto-multa">' + formatearMonto(multa.monto) + '</strong><span class="etiqueta-estado ' + claseEstado + ' ms-2">' + textoEstado + "</span></p>" +
      '<p class="mb-0 text-muted small">Registrada el ' + multa.fecha + "</p>" + detallePago + "</div>" +
      (multa.pagada ? "" : '<button class="btn-accion-libro" title="Registrar pago" data-accion="pagar-multa" data-id="' + multa.id + '"><i class="fa-solid fa-cash-register"></i></button>') +
      '<button class="btn-accion-libro" title="Eliminar multa" data-accion="eliminar-multa" data-id="' + multa.id + '"><i class="fa-solid fa-trash"></i></button>';
    listaMultas.appendChild(li);
  }
}

formMulta.addEventListener("submit", function (e) {
  e.preventDefault();
  var nombreSocio = multaSocioInput.value.trim();
  var monto = Number(multaMontoInput.value);
  var motivoDisplay = multaMotivoInput.value;
  var motivoApi = MOTIVO_MULTA_VALOR[motivoDisplay] || "atraso";
  if (!nombreSocio || !monto) {
    avisarError("Indicá el socio y un monto mayor a 0.");
    return;
  }

  conCarga(botonEnviar(formMulta), buscarSocioRegistrado(nombreSocio)
    .then(function (socio) {
      return apiFetch("/multas", { method: "POST", body: { socio_id: socio.id, motivo: motivoApi, monto: monto } });
    })
    .then(function () {
      registrarHistorial("Se registró una multa de " + formatearMonto(monto) + " a " + nombreSocio + " (" + motivoDisplay + ").", "facturas", nombreSocio);
      return cargarMultasApi();
    }))
    .then(function () {
      renderizarMultas();
      formMulta.reset();
      avisarOk("Multa registrada.");
    })
    .catch(mostrarErrorApi);
});

function abrirModalPagarMulta(multa) {
  document.getElementById("pagar-multa-id").value = multa.id;
  document.getElementById("pagar-multa-metodo").value = "";
  document.getElementById("pagar-multa-detalle").innerHTML =
    "<div><dt>Socio</dt><dd>" + escapeHtml(multa.socio) + "</dd></div>" +
    "<div><dt>Motivo</dt><dd>" + escapeHtml(multa.motivo) + "</dd></div>" +
    "<div><dt>Monto</dt><dd>" + formatearMonto(multa.monto) + "</dd></div>";
  modalPagarMulta.show();
}

formPagarMulta.addEventListener("submit", function (e) {
  e.preventDefault();
  var multa = buscarMultaLocalPorId(document.getElementById("pagar-multa-id").value);
  var metodo = document.getElementById("pagar-multa-metodo").value;
  if (!multa) return;
  if (!metodo) {
    avisarError("Elegí el método de pago.");
    document.getElementById("pagar-multa-metodo").focus();
    return;
  }
  conCarga(botonEnviar(formPagarMulta), apiFetch("/multas/" + multa.id, { method: "PUT", body: { estado: "pagada", metodo_pago: metodo } })
    .then(function () {
      registrarHistorial("Se registró el pago de la multa de " + multa.socio + " (" + METODO_PAGO_LABEL[metodo] + ").", "facturas", multa.socio);
      return cargarMultasApi();
    }))
    .then(function () {
      renderizarMultas();
      modalPagarMulta.hide();
      avisarOk("Pago registrado.");
    })
    .catch(mostrarErrorApi);
});

listaMultas.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  var multa = buscarMultaLocalPorId(boton.dataset.id);
  if (!multa) return;

  if (boton.dataset.accion === "pagar-multa") {
    abrirModalPagarMulta(multa);
  } else if (boton.dataset.accion === "eliminar-multa") {
    confirmar("¿Eliminar la multa de " + multa.socio + " por " + formatearMonto(multa.monto) + "?", "Eliminar", true).then(function (ok) {
      if (!ok) return;
      return conCarga(boton, apiFetch("/multas/" + multa.id, { method: "DELETE" })
        .then(function () {
          registrarHistorial("Se eliminó la multa de " + multa.socio + ".", "facturas", multa.socio);
          return cargarMultasApi();
        }))
        .then(renderizarMultas);
    }).catch(mostrarErrorApi);
  }
});

// ------------------------------
// Historial de actividad (RF16) y reportes (RF14) / notificaciones (RF13)
// ------------------------------

// Entradas viejas (sin categoría) se clasifican según su texto.
function inferirCategoriaHistorial(texto) {
  var t = (texto || "").toLowerCase();
  if (t.indexOf("multa") !== -1) return "facturas";
  if (t.indexOf("reserva") !== -1) return "reservas";
  if (t.indexOf("préstamo") !== -1 || t.indexOf("devolu") !== -1) return "prestamos";
  if (t.indexOf("cuenta") !== -1) return "cuentas";
  if (t.indexOf("libro") !== -1) return "libros";
  return "socios";
}

function cargarHistorial() {
  var guardado = localStorage.getItem(STORAGE_KEY_HISTORIAL);
  var lista = guardado ? JSON.parse(guardado) : [];
  lista.forEach(function (e) {
    if (!e.categoria || !CATEGORIAS_HISTORIAL[e.categoria]) e.categoria = inferirCategoriaHistorial(e.texto);
  });
  return lista;
}

function guardarHistorial() {
  // se conservan solo las últimas 200 entradas para no llenar el localStorage
  if (historial.length > 200) historial = historial.slice(historial.length - 200);
  localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
}

function registrarHistorial(texto, categoria, persona) {
  if (!CATEGORIAS_HISTORIAL[categoria]) categoria = inferirCategoriaHistorial(texto);
  historial.push({ id: crearId(), texto: texto, categoria: categoria, persona: persona || "", fecha: fechaHoy() });
  guardarHistorial();
  renderizarHistorial();
}

function normalizarBusqueda(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function renderizarFiltrosHistorial() {
  var cont = document.getElementById("filtros-historial");
  if (!cont) return;
  var conteo = { todas: historial.length };
  historial.forEach(function (e) { conteo[e.categoria] = (conteo[e.categoria] || 0) + 1; });
  var html = "";
  var claves = ["todas"].concat(Object.keys(CATEGORIAS_HISTORIAL));
  claves.forEach(function (clave) {
    var cat = CATEGORIAS_HISTORIAL[clave];
    html += '<button type="button" class="hist-filtro' + (filtroHistorial === clave ? " activo" : "") +
      '" data-categoria="' + clave + '">' +
      (cat ? '<i class="fa-solid ' + cat.icono + ' me-1"></i>' : "") +
      (cat ? cat.etiqueta : "Todas") +
      ' <span class="hist-conteo">' + (conteo[clave] || 0) + "</span></button>";
  });
  cont.innerHTML = html;
}

function renderizarHistorial() {
  if (!listaHistorial) return;
  renderizarFiltrosHistorial();
  var consulta = normalizarBusqueda(busquedaHistorial);
  var coincidentes = historial.slice().reverse().filter(function (e) {
    if (filtroHistorial !== "todas" && e.categoria !== filtroHistorial) return false;
    if (!consulta) return true;
    // busca por persona; en entradas viejas (sin persona) busca dentro del texto
    return normalizarBusqueda(e.persona || e.texto).indexOf(consulta) !== -1;
  });
  var recientes = consulta ? coincidentes.slice(0, 50) : coincidentes.slice(0, 15);
  listaHistorial.innerHTML = "";
  estadoVacioHistorial.classList.toggle("d-none", recientes.length > 0);

  for (var i = 0; i < recientes.length; i++) {
    var entrada = recientes[i];
    var cat = CATEGORIAS_HISTORIAL[entrada.categoria];
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><p class="mb-1"><span class="hist-badge ' + cat.clase + '"><i class="fa-solid ' +
      cat.icono + ' me-1"></i>' + cat.etiqueta + "</span></p>" +
      '<p class="mb-0">' + escapeHtml(entrada.texto) + '</p>' +
      (entrada.persona ? '<p class="mb-0 small hist-persona"><i class="fa-solid fa-user me-1"></i>' + escapeHtml(entrada.persona) + '</p>' : "") +
      '<p class="mb-0 text-muted small">' + entrada.fecha + "</p></div>";
    listaHistorial.appendChild(li);
  }
}

var buscadorHistorialEl = document.getElementById("buscador-historial");
if (buscadorHistorialEl) {
  buscadorHistorialEl.addEventListener("input", function () {
    busquedaHistorial = buscadorHistorialEl.value;
    renderizarHistorial();
  });
}

var filtrosHistorialEl = document.getElementById("filtros-historial");
if (filtrosHistorialEl) {
  filtrosHistorialEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".hist-filtro");
    if (!btn) return;
    filtroHistorial = btn.dataset.categoria;
    renderizarHistorial();
  });
}

function prestamosVencidos() {
  return prestamos.filter(function (p) {
    return !p.fechaDevolucion && p.fechaVencimiento && fechaVencida(p.fechaVencimiento);
  });
}

function renderizarNotificaciones() {
  var vencidos = prestamosVencidos();
  listaNotificaciones.innerHTML = "";
  estadoVacioNotificaciones.classList.toggle("d-none", vencidos.length > 0);

  for (var i = 0; i < vencidos.length; i++) {
    var prestamo = vencidos[i];
    var libro = buscarLibroPorId(prestamo.libroId);
    var tituloLibro = libro ? libro.titulo : "(libro eliminado)";
    var li = document.createElement("li");
    li.className = "reserva-item notificacion-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(tituloLibro) + "</h3>" +
      "<p class=\"mb-0 text-muted small\">Prestado a " + escapeHtml(prestamo.nombre) + " · venció el " + prestamo.fechaVencimiento + "</p></div>";
    listaNotificaciones.appendChild(li);
  }
}

function renderizarTopLibros() {
  var conteos = {};
  for (var i = 0; i < prestamos.length; i++) {
    var id = prestamos[i].libroId;
    conteos[id] = (conteos[id] || 0) + 1;
  }
  var ids = Object.keys(conteos).sort(function (a, b) { return conteos[b] - conteos[a]; }).slice(0, 5);

  listaTopLibros.innerHTML = "";
  estadoVacioTop.classList.toggle("d-none", ids.length > 0);

  for (var j = 0; j < ids.length; j++) {
    var libro = buscarLibroPorId(ids[j]);
    var titulo = libro ? libro.titulo : "(libro eliminado)";
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(titulo) + "</h3></div>" +
      '<span class="etiqueta">' + conteos[ids[j]] + (conteos[ids[j]] === 1 ? " préstamo" : " préstamos") + "</span>";
    listaTopLibros.appendChild(li);
  }
}

function renderizarReportes() {
  function sumar(campo) { return libros.reduce(function (t, l) { return t + (l[campo] || 0); }, 0); }
  var atrasados = prestamosVencidos().length;

  var stats = [
    { numero: libros.length, etiqueta: "Títulos en catálogo (" + sumar("copias") + " copias)" },
    { numero: sumar("disponibles"), etiqueta: "Copias disponibles" },
    { numero: sumar("prestadas"), etiqueta: "Copias prestadas" },
    { numero: sumar("reservadas"), etiqueta: "Copias reservadas" },
    { numero: atrasados, etiqueta: "Préstamos atrasados" }
  ];

  reportesStats.innerHTML = stats.map(function (s) {
    return '<div class="col-6 col-md-4 col-lg"><div class="stat-card"><div class="stat-numero">' + s.numero + '</div><div class="stat-etiqueta">' + s.etiqueta + "</div></div></div>";
  }).join("");

  renderizarTopLibros();
  renderizarNotificaciones();
  renderizarHistorial();
}

// elegir una sección del menú lateral lo cierra (los botones tienen
// data-bs-toggle="pill" y data-bs-dismiss juntos, y Bootstrap solo atiende
// uno de los dos: el menú quedaba abierto tapando la sección elegida)
Array.prototype.forEach.call(document.querySelectorAll('#menu-nav-tabs [data-bs-toggle="pill"]'), function (boton) {
  boton.addEventListener("click", function () {
    var menu = bootstrap.Offcanvas.getInstance(document.getElementById("menu-offcanvas"));
    if (menu) menu.hide();
  });
});

var tabBtnReportes = document.getElementById("menu-tab-btn-reportes");
if (tabBtnReportes) tabBtnReportes.addEventListener("shown.bs.tab", renderizarReportes);

// ------------------------------
// Categorías (fijas + las que el usuario va creando con "Otro")
// ------------------------------

function todasLasCategorias() {
  return categoriasApi.map(function (c) { return c.nombre; });
}

// devuelve el id de categoría a usar en /libros. Si el combo está en "Otro",
// crea la categoría en la API (requiere rol administrador) y la agrega a los combos.
function resolverCategoriaId(select, inputNueva) {
  if (select.value === "Otro") {
    var nombre = (inputNueva.value || "").trim();
    if (!nombre) return Promise.resolve(null);

    var existente = categoriasApi.filter(function (c) { return c.nombre.toLowerCase() === nombre.toLowerCase(); })[0];
    if (existente) return Promise.resolve(existente.id);

    return apiFetch("/categorias", { method: "POST", body: { nombre: nombre } }).then(function (nueva) {
      return cargarCategoriasApi().then(function () {
        actualizarSelectsCategoria();
        return nueva.id;
      });
    });
  }

  var seleccionada = categoriasApi.filter(function (c) { return c.nombre === select.value; })[0];
  return Promise.resolve(seleccionada ? seleccionada.id : null);
}

function construirOpcionesCategoria(incluirTodas, incluirOtro) {
  var html = "";
  if (incluirTodas) html += '<option value="Todas">Todas las categorías</option>';

  var todas = todasLasCategorias();
  for (var i = 0; i < todas.length; i++) {
    html += '<option value="' + escapeHtml(todas[i]) + '">' + escapeHtml(todas[i]) + "</option>";
  }

  if (incluirOtro) html += '<option value="Otro">Otro (nueva categoría)</option>';
  return html;
}

// reconstruye los 3 combos de categoría manteniendo, si es posible, el valor elegido
function actualizarSelectsCategoria() {
  [
    { select: inputCategoria, incluirTodas: false, incluirOtro: true },
    { select: editarCategoria, incluirTodas: false, incluirOtro: true },
    { select: filtroCategoria, incluirTodas: true, incluirOtro: false }
  ].forEach(function (conf) {
    var valorActual = conf.select.value;
    // si antes no había categorías cargadas, "Otro" quedaba elegido por
    // descarte: en ese caso no lo mantenemos y se elige la primera real
    var habiaCategorias = conf.select.options.length > (conf.incluirOtro ? 1 : 0) + (conf.incluirTodas ? 1 : 0);
    conf.select.innerHTML = construirOpcionesCategoria(conf.incluirTodas, conf.incluirOtro);
    var existeValor = Array.prototype.some.call(conf.select.options, function (o) { return o.value === valorActual; });
    if (existeValor && (valorActual !== "Otro" || habiaCategorias)) conf.select.value = valorActual;
  });

  // si "Otro" quedó seleccionado (por ejemplo, porque todavía no hay ninguna
  // categoría cargada) nunca se dispara un "change", así que sincronizamos
  // la visibilidad del campo de texto a mano acá.
  actualizarVisibilidadNuevaCategoria(inputCategoria, grupoNuevaCategoria, inputNuevaCategoria);
  actualizarVisibilidadNuevaCategoria(editarCategoria, grupoEditarNuevaCategoria, inputEditarNuevaCategoria);
}

// muestra u oculta el campo de texto para escribir la categoría nueva
function actualizarVisibilidadNuevaCategoria(select, grupo, input) {
  var esOtro = select.value === "Otro";
  grupo.classList.toggle("d-none", !esOtro);
  if (!esOtro) input.value = "";
}

inputCategoria.addEventListener("change", function () {
  actualizarVisibilidadNuevaCategoria(inputCategoria, grupoNuevaCategoria, inputNuevaCategoria);
});

editarCategoria.addEventListener("change", function () {
  actualizarVisibilidadNuevaCategoria(editarCategoria, grupoEditarNuevaCategoria, inputEditarNuevaCategoria);
});

// busca la portada del libro en Open Library y avisa el resultado con un callback
function buscarPortada(titulo, autor, callback) {
  if (!titulo) return callback(null);

  var url = "https://openlibrary.org/search.json?title=" + encodeURIComponent(titulo) + "&limit=1";
  if (autor) url += "&author=" + encodeURIComponent(autor);

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (datos) {
      var libro = datos.docs && datos.docs[0];
      if (libro && libro.cover_i) {
        callback("https://covers.openlibrary.org/b/id/" + libro.cover_i + "-M.jpg");
      } else {
        callback(null);
      }
    })
    .catch(function () { callback(null); });
}

function mostrarPreview(img, placeholder, loading, url, cargando) {
  loading.classList.toggle("d-none", !cargando);
  img.classList.toggle("d-none", cargando || !url);
  placeholder.classList.toggle("d-none", cargando || !!url);
  if (url) img.src = url;
}

// convierte la imagen elegida por el usuario a base64 para guardarla de forma local
function leerImagenLocal(archivo, callback) {
  if (!archivo) return callback(null);
  var lector = new FileReader();
  lector.onload = function (e) { callback(e.target.result); };
  lector.onerror = function () { callback(null); };
  lector.readAsDataURL(archivo);
}

inputImagenLocal.addEventListener("change", function () {
  var archivo = inputImagenLocal.files && inputImagenLocal.files[0];
  if (!archivo) return;
  leerImagenLocal(archivo, function (dataUrl) {
    if (!dataUrl) return;
    portadaEsManual = true;
    portadaEncontrada = dataUrl;
    mostrarPreview(previewImg, previewPlaceholder, previewLoading, dataUrl, false);
  });
});

editarImagenLocal.addEventListener("change", function () {
  var archivo = editarImagenLocal.files && editarImagenLocal.files[0];
  if (!archivo) return;
  leerImagenLocal(archivo, function (dataUrl) {
    if (!dataUrl) return;
    portadaEditandoEsManual = true;
    portadaEditando = dataUrl;
    mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, dataUrl, false);
  });
});

// ------------------------------
// Buscar libro por código de barras / ISBN
// ------------------------------

// un lector físico de código de barras funciona como un teclado: escribe
// los números muy rápido y al final manda un Enter, así que con eso alcanza
inputCodigoBarras.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    dispararBusquedaIsbn();
  }
});

btnBuscarIsbn.addEventListener("click", function () {
  dispararBusquedaIsbn();
});

function dispararBusquedaIsbn() {
  var isbn = inputCodigoBarras.value.trim();
  if (!isbn || btnBuscarIsbn.disabled) return;
  conCarga(btnBuscarIsbn, buscarLibroPorIsbn(isbn));
}
function buscarLibroPorIsbn(isbn) {
  var url = "https://www.googleapis.com/books/v1/volumes?q=isbn:" + encodeURIComponent(isbn);

  return fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (datos) {
      if (!datos.items || datos.items.length === 0) {
        avisarError("No se encontró ningún libro con ese código de barras.");
        return;
      }

      var info = datos.items[0].volumeInfo;

      inputTitulo.value = info.title || "";
      document.getElementById("autor").value = info.authors ? info.authors.join(", ") : "";
      inputCategoria.value = mapearCategoria(info.categories);
      actualizarVisibilidadNuevaCategoria(inputCategoria, grupoNuevaCategoria, inputNuevaCategoria);

      if (!portadaEsManual) {
        var urlPortada = info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : null;
        if (urlPortada) {
          urlPortada = urlPortada.replace("http://", "https://");
          portadaEncontrada = urlPortada;
          mostrarPreview(previewImg, previewPlaceholder, previewLoading, urlPortada, false);
        } else {
          // si Google Books no trae portada, probamos con Open Library
          buscarPortada(info.title, info.authors ? info.authors[0] : null, function (urlOpenLibrary) {
            if (portadaEsManual) return;
            portadaEncontrada = urlOpenLibrary;
            mostrarPreview(previewImg, previewPlaceholder, previewLoading, urlOpenLibrary, false);
          });
        }
      }
    })
    .catch(function () {
      avisarError("No se pudo consultar el código de barras. Revisá la conexión y probá de nuevo.");
    });
}

// traduce las categorías de Google Books a las categorías de nuestro catálogo
function mapearCategoria(categorias) {
  if (!categorias) return "Otro";
  var texto = categorias.join(" ").toLowerCase();

  if (texto.indexOf("science fiction") !== -1 || texto.indexOf("sci-fi") !== -1) return "Ciencia ficción";
  if (texto.indexOf("juvenile") !== -1 || texto.indexOf("children") !== -1) return "Infantil";
  if (texto.indexOf("poetry") !== -1) return "Poesía";
  if (texto.indexOf("fiction") !== -1) return "Novela";
  return "Otro";
}

inputTitulo.addEventListener("input", function () {
  if (portadaEsManual) return; // el usuario ya eligió una imagen a mano, no la pisamos

  clearTimeout(tiempoEspera);
  var titulo = inputTitulo.value.trim();

  if (!titulo) {
    portadaEncontrada = null;
    mostrarPreview(previewImg, previewPlaceholder, previewLoading, null, false);
    return;
  }

  mostrarPreview(previewImg, previewPlaceholder, previewLoading, null, true);

  tiempoEspera = setTimeout(function () {
    var autor = document.getElementById("autor").value.trim();
    buscarPortada(titulo, autor, function (url) {
      if (portadaEsManual) return;
      if (inputTitulo.value.trim() !== titulo) return;
      portadaEncontrada = url;
      mostrarPreview(previewImg, previewPlaceholder, previewLoading, url, false);
    });
  }, 500);
});

function librosFiltrados() {
  var categoria = filtroCategoria.value;
  var texto = inputBuscar.value.trim().toLowerCase();

  var resultado = [];
  for (var i = 0; i < libros.length; i++) {
    var libro = libros[i];
    var coincideCategoria = categoria === "Todas" || libro.categoria === categoria;
    var coincideTexto = libro.titulo.toLowerCase().indexOf(texto) !== -1 || libro.autor.toLowerCase().indexOf(texto) !== -1;
    if (coincideCategoria && coincideTexto) resultado.push(libro);
  }
  return resultado;
}

function renderizarLibros() {
  var filtrados = librosFiltrados();
  estadoVacio.classList.toggle("d-none", filtrados.length > 0);
  var textoContador = libros.length + " " + (libros.length === 1 ? "libro" : "libros");
  if (contador.textContent !== textoContador) contador.textContent = textoContador;
  // el ícono de libro del header (invitado y con sesión) mostraba siempre
  // "0" porque nunca se actualizaba; lo sincronizamos con el catálogo real
  if (contadorLibrosHeader) contadorLibrosHeader.textContent = libros.length;
  actualizarContadorLibrosHeaderSesion();

  // armamos el HTML de todas las tarjetas en un array y lo pintamos de una
  // sola vez al final (una sola escritura al DOM) en vez de ir agregando
  // tarjeta por tarjeta con appendChild, que fuerza un reflow por cada una
  var tarjetas = [];

  for (var i = 0; i < filtrados.length; i++) {
    var libro = filtrados[i];
    // el src de la portada (puede ser un base64 enorme) NO va dentro del
    // string de la tarjeta: se asigna por DOM solo cuando la tarjeta se crea
    var portadaContenidoHtml = libro.portada
      ? '<img class="libro-portada" alt="Portada de ' + escapeHtml(libro.titulo) + '" loading="lazy" decoding="async" width="200" height="300">'
      : '<div class="libro-portada libro-portada-vacia tono-' + ((parseInt(libro.id, 10) || 0) % 5) + '"><span>' + escapeHtml(libro.titulo) + "</span></div>";

    // menú de "Editar"/"Eliminar" para administrador: antes eran dos
    // botones sueltos al pie de la tarjeta, compitiendo por espacio con
    // Reservar/Prestar; ahora quedan agrupados en un menú flotante sobre
    // la portada, dejando la fila de abajo solo para las acciones
    // principales (que además ahora son más grandes)
    var menuAdminHtml = "";
    if (permisos.esAdmin) {
      var menuId = "menu-libro-" + libro.id;
      menuAdminHtml =
        '<div class="dropdown menu-libro-admin">' +
        '<button type="button" class="btn-menu-libro" id="' + menuId + '" data-bs-toggle="dropdown" aria-expanded="false" title="Más opciones"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
        '<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="' + menuId + '">' +
        '<li><button type="button" class="dropdown-item btn-editar" data-id="' + libro.id + '"><i class="fa-solid fa-pen me-2"></i>Editar</button></li>' +
        '<li><button type="button" class="dropdown-item btn-eliminar text-danger" data-id="' + libro.id + '"><i class="fa-solid fa-trash me-2"></i>Eliminar</button></li>' +
        "</ul></div>";
    }
    var portadaHtml = '<div class="libro-portada-wrap">' + portadaContenidoHtml + menuAdminHtml + "</div>";

    var claseEstado = libro.estado === "Disponible" ? "estado-disponible" : (libro.estado === "Reservado" ? "estado-reservado" : "estado-prestado");
    var estadoHtml = '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(libro.estado) + "</span>";
    var codigoBarrasHtml = libro.codigoBarras
      ? '<p class="mb-1 texto-codigo-barras"><i class="fa-solid fa-barcode me-1"></i>' + escapeHtml(libro.codigoBarras) + "</p>"
      : "";

    // con más de una copia se muestra cuántas quedan libres
    var copiasHtml = libro.copias > 1
      ? '<p class="texto-copias">' + libro.disponibles + " de " + libro.copias + " copias libres</p>"
      : "";

    var reservasLibro = reservasDeLibro(libro.id);
    var prestamosLibro = prestamosActivosDeLibro(libro.id);
    var socioPropio = miSocioId();
    var miReserva = socioPropio ? reservasLibro.filter(function (r) { return r.socioId === socioPropio; })[0] : null;

    var extraInfoHtml = "";
    var accionesEstadoHtml = "";

    if (miReserva) {
      // el socio ya tiene este libro reservado: lo único que puede hacer es cancelar
      extraInfoHtml = '<p class="mb-0 texto-reserva">' +
        (miReserva.estado === "pendiente" ? "Estás en espera de una copia (reservaste el " + escapeHtml(miReserva.fecha) + ")" : "Lo reservaste el " + escapeHtml(miReserva.fecha)) + "</p>";
      accionesEstadoHtml = '<button class="btn-accion-libro btn-accion-libro-full" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + libro.id + '" data-reserva-id="' + miReserva.id + '"><i class="fa-solid fa-ban"></i> Cancelar reserva</button>';
    } else {
      if (permisos.esGestion) {
        if (libro.copias === 1 && reservasLibro.length === 1) {
          extraInfoHtml = '<p class="mb-0 texto-reserva">Reservado por: ' + escapeHtml(reservasLibro[0].nombre) + "</p>";
        } else if (libro.copias === 1 && prestamosLibro.length === 1) {
          extraInfoHtml = '<p class="mb-0 texto-reserva">Prestado a: ' + escapeHtml(prestamosLibro[0].nombre) + ", vence el " + prestamosLibro[0].fechaVencimiento + "</p>";
        } else if (libro.copias > 1 && (libro.prestadas || libro.reservadas)) {
          var partes = [];
          if (libro.prestadas) partes.push(libro.prestadas + (libro.prestadas === 1 ? " prestada" : " prestadas"));
          if (libro.reservadas) partes.push(libro.reservadas + (libro.reservadas === 1 ? " reservada" : " reservadas"));
          extraInfoHtml = '<p class="mb-0 texto-reserva">' + partes.join(" y ") + "</p>";
        }
      }

      if (libro.disponibles > 0) {
        // quedan copias libres: se puede sumar al carrito; la gestión además
        // puede prestar una directamente
        accionesEstadoHtml =
          htmlBotonAgregar(libro) +
          (permisos.esGestion ? '<button class="btn-accion-libro btn-accion-libro-grande btn-prestar-rapido" title="Prestar una copia" data-accion="prestar" data-id="' + libro.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' : "");
      } else if (permisos.esGestion && libro.copias === 1 && reservasLibro.length === 1 && !prestamosLibro.length) {
        // única copia reservada: entregarla o cancelar la reserva
        accionesEstadoHtml =
          '<button class="btn-accion-libro btn-accion-libro-grande" title="Prestar a quien lo reservó" data-accion="prestar" data-id="' + libro.id + '" data-reserva-id="' + reservasLibro[0].id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' +
          '<button class="btn-accion-libro btn-accion-libro-grande" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + libro.id + '" data-reserva-id="' + reservasLibro[0].id + '"><i class="fa-solid fa-ban"></i></button>';
      }

      // devolver: si hay copias prestadas (con varias, se elige cuál)
      if (permisos.esGestion && prestamosLibro.length) {
        accionesEstadoHtml += accionesEstadoHtml
          ? '<button class="btn-accion-libro" title="Registrar devolución" data-accion="devolver" data-id="' + libro.id + '"><i class="fa-solid fa-rotate-left"></i></button>'
          : '<button class="btn-accion-libro btn-accion-libro-full" title="Registrar devolución" data-accion="devolver" data-id="' + libro.id + '"><i class="fa-solid fa-rotate-left"></i> Devolver</button>';
      }
    }

    // si el libro está prestado (o cualquier otro estado) y la persona no
    // tiene ningún botón disponible, no mostramos la barra de acciones:
    // así evitamos la línea/separador vacío al pie de la tarjeta
    // (Editar/Eliminar ya no van acá, se movieron al menú sobre la portada)
    // con 3 botones (agregar, prestar y devolver) no entra el texto: quedan solo íconos
    var compactas = (accionesEstadoHtml.match(/<button/g) || []).length >= 3;
    var accionesLibroHtml = accionesEstadoHtml ? '<div class="acciones-libro' + (compactas ? " acciones-compactas" : "") + '">' + accionesEstadoHtml + "</div>" : "";

    tarjetas.push({
      libro: libro,
      // firma corta de la portada: así comparamos tarjetas sin tener que
      // comparar cientos de KB de base64 en cada actualización
      firmaPortada: firmaPortada(libro),
      html:
      portadaHtml +
      '<div class="libro-info flex-grow-1"><h3>' + escapeHtml(libro.titulo) + "</h3>" +
      '<p class="libro-autor">' + escapeHtml(libro.autor) + "</p>" +
      codigoBarrasHtml +
      '<span class="etiqueta">' + escapeHtml(libro.categoria) + "</span> " + estadoHtml +
      copiasHtml + extraInfoHtml + "</div>" +
      accionesLibroHtml
    });
  }

  reconciliarTarjetas(lista, tarjetas, "libro-item");
  renderizarNovedades();
  renderizarCarrito();
}

// Actualiza la grilla tocando solo lo que cambió: las tarjetas iguales se
// reutilizan tal cual (sin repintar ni volver a decodificar la portada), las
// nuevas se crean y las que ya no están se quitan. Antes se reescribía todo
// el catálogo con innerHTML, y por eso se notaba cada actualización.
function reconciliarTarjetas(contenedor, tarjetas, clase) {
  var existentes = {};
  var hijos = contenedor.children;
  for (var i = 0; i < hijos.length; i++) existentes[hijos[i].dataset.id] = hijos[i];

  var usadas = {};
  var anterior = null;

  tarjetas.forEach(function (t) {
    var id = t.libro.id;
    var firma = t.firmaPortada + "|" + t.html;
    var li = existentes[id];

    if (!li || li._firma !== firma) {
      var nuevo = document.createElement("li");
      nuevo.className = clase;
      nuevo.dataset.id = id;
      nuevo._firma = firma;
      nuevo.innerHTML = t.html;
      var img = nuevo.querySelector("img.libro-portada");
      if (img) img.src = t.libro.portada;
      if (li) contenedor.replaceChild(nuevo, li);
      li = nuevo;
    }

    usadas[id] = true;
    // solo se mueve en el DOM si no está ya en su lugar
    var esperado = anterior ? anterior.nextSibling : contenedor.firstChild;
    if (li !== esperado) contenedor.insertBefore(li, esperado);
    anterior = li;
  });

  for (var k in existentes) {
    if (!usadas[k] && existentes[k].parentNode === contenedor) contenedor.removeChild(existentes[k]);
  }
}

function firmaPortada(libro) {
  return libro.portada ? libro.portada.length + ":" + libro.portada.slice(-32) : "";
}

function htmlPortadaLibro(libro) {
  return libro.portada
    ? '<img class="libro-portada" alt="Portada de ' + escapeHtml(libro.titulo) + '" loading="lazy" decoding="async" width="200" height="300">'
    : '<div class="libro-portada libro-portada-vacia tono-' + ((parseInt(libro.id, 10) || 0) % 5) + '"><span>' + escapeHtml(libro.titulo) + "</span></div>";
}

// ------------------------------
// Carrito (reservar varios libros en un solo paso)
// ------------------------------

var STORAGE_KEY_CARRITO = "biblioteca-carrito";

function cargarCarritoGuardado() {
  try {
    var guardado = JSON.parse(localStorage.getItem(STORAGE_KEY_CARRITO) || "[]");
    return Array.isArray(guardado) ? guardado.map(String) : [];
  } catch (e) {
    return [];
  }
}

function guardarCarrito() {
  try { localStorage.setItem(STORAGE_KEY_CARRITO, JSON.stringify(carrito)); } catch (e) { /* sin storage: el carrito dura mientras la página */ }
}

function enCarrito(id) {
  return carrito.indexOf(String(id)) !== -1;
}

function alternarCarrito(id) {
  id = String(id);
  var pos = carrito.indexOf(id);
  if (pos === -1) carrito.push(id); else carrito.splice(pos, 1);
  guardarCarrito();
  limpiarMensajeCarrito();
  renderizarLibros(); // también actualiza novedades, contadores y el panel del carrito
}

function htmlBotonAgregar(libro) {
  if (enCarrito(libro.id)) {
    return '<button type="button" class="btn-agregar-carrito en-carrito" data-id="' + libro.id + '" title="Quitar del carrito"><i class="fa-solid fa-check"></i> <span class="texto-boton">En el carrito</span></button>';
  }
  return '<button type="button" class="btn-agregar-carrito" data-id="' + libro.id + '" title="Agregar al carrito"><i class="fa-solid fa-bag-shopping"></i> <span class="texto-boton">Agregar</span></button>';
}

function mostrarMensajeCarrito(html, tipo) {
  // los errores y advertencias van al aviso rojo de abajo a la derecha
  if (tipo !== "success") {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    avisarError(tmp.textContent);
    return;
  }
  var el = document.getElementById("carrito-mensaje");
  if (!el) return;
  el.className = "alert py-2 small alert-" + tipo;
  el.innerHTML = html;
}

function limpiarMensajeCarrito() {
  var el = document.getElementById("carrito-mensaje");
  if (el) el.className = "alert py-2 small d-none";
}

function renderizarCarrito() {
  var listaEl = document.getElementById("carrito-lista");
  if (!listaEl) return;

  // contador del header (queda oculto cuando está vacío)
  var badges = document.querySelectorAll(".contador-carrito");
  for (var b = 0; b < badges.length; b++) {
    if (badges[b].textContent !== String(carrito.length)) badges[b].textContent = carrito.length;
    badges[b].classList.toggle("d-none", carrito.length === 0);
  }

  var items = [];
  var disponibles = 0;
  carrito.forEach(function (id) {
    var libro = buscarLibroPorId(id);
    if (!libro) return;
    var ok = libro.estado === "Disponible";
    if (ok) disponibles++;
    items.push(
      '<li class="carrito-item" data-id="' + libro.id + '">' +
      (libro.portada
        ? '<img class="carrito-miniatura" src="' + escapeHtml(libro.portada) + '" alt="" width="48" height="72">'
        : '<div class="carrito-miniatura tono-' + ((parseInt(libro.id, 10) || 0) % 5) + '"></div>') +
      '<div class="carrito-datos"><p class="carrito-item-titulo">' + escapeHtml(libro.titulo) + "</p>" +
      '<p class="carrito-item-autor">' + escapeHtml(libro.autor) + "</p>" +
      (ok ? "" : '<p class="carrito-item-aviso">Ya no está disponible</p>') + "</div>" +
      '<button type="button" class="btn-quitar-carrito" data-id="' + libro.id + '" aria-label="Quitar ' + escapeHtml(libro.titulo) + ' del carrito"><i class="fa-solid fa-xmark"></i></button>' +
      "</li>"
    );
  });

  var html = items.join("");
  if (listaEl._html !== html) {
    listaEl._html = html;
    listaEl.innerHTML = html;
  }

  var hayItems = items.length > 0;
  document.getElementById("carrito-vacio").classList.toggle("d-none", hayItems);
  document.getElementById("carrito-form").classList.toggle("d-none", !hayItems);

  // administrador/bibliotecario reservan a nombre de un socio
  var soloGestion = document.querySelectorAll(".carrito-solo-gestion");
  for (var g = 0; g < soloGestion.length; g++) soloGestion[g].classList.toggle("d-none", !permisos.esGestion);

  var boton = document.getElementById("carrito-confirmar");
  var textoBoton = disponibles === 1 ? "Reservar 1 libro" : "Reservar " + disponibles + " libros";
  if (boton.textContent !== textoBoton) boton.textContent = textoBoton;
  // si está reservando (indicador de carga), no lo habilitamos a mitad de camino
  boton.disabled = disponibles === 0 || boton.classList.contains("cargando");
}

function confirmarCarrito() {
  var ids = carrito.filter(function (id) {
    var l = buscarLibroPorId(id);
    return l && l.estado === "Disponible";
  });
  if (!ids.length) return;

  if (!sesionActual) {
    mostrarMensajeCarrito("Iniciá sesión para reservar los libros del carrito.", "warning");
    var panel = bootstrap.Offcanvas.getInstance(document.getElementById("carrito-offcanvas"));
    if (panel) panel.hide();
    abrirModalLogin();
    return;
  }

  var fecha = document.getElementById("carrito-fecha").value;
  if (!fecha) {
    mostrarMensajeCarrito("Elegí para cuándo querés retirar los libros.", "warning");
    return;
  }

  var obtenerSocio;
  var nombrePersona;
  if (permisos.esGestion) {
    nombrePersona = document.getElementById("carrito-nombre").value.trim();
    if (!nombrePersona) {
      mostrarMensajeCarrito("Escribí el nombre de quien reserva.", "warning");
      return;
    }
    obtenerSocio = buscarSocioRegistrado(nombrePersona);
  } else {
    if (!sesionActual.socioId) {
      mostrarMensajeCarrito("Tu cuenta no tiene un socio asociado; no podés reservar. Contactá a un bibliotecario.", "danger");
      return;
    }
    nombrePersona = sesionActual.nombre || "un socio";
    obtenerSocio = Promise.resolve({ id: String(sesionActual.socioId) });
  }

  var boton = document.getElementById("carrito-confirmar");
  var reservados = [];
  var fallidos = [];

  conCarga(boton, obtenerSocio.then(function (socio) {
    // de a uno: el servidor valida el límite de reservas en cada pedido
    return ids.reduce(function (cadena, id) {
      return cadena.then(function () {
        return apiFetch("/reservas", { method: "POST", body: { socio_id: socio.id, libro_id: id, fecha_deseada: fecha } })
          .then(function () { reservados.push(id); })
          .catch(function (err) { fallidos.push({ id: id, mensaje: err && err.message ? err.message : "Error desconocido." }); });
      });
    }, Promise.resolve());
  }).then(function () {
    reservados.forEach(function (id) {
      var l = buscarLibroPorId(id);
      registrarHistorial("Se reservó \"" + (l ? l.titulo : "un libro") + "\" a nombre de " + nombrePersona + ".", "reservas", nombrePersona);
      var pos = carrito.indexOf(id);
      if (pos !== -1) carrito.splice(pos, 1);
    });
    guardarCarrito();
    return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
  }).then(function () {
    renderizarLibros();
    renderizarReservas();

    if (reservados.length) {
      mostrarMensajeCarrito("Reservaste " + reservados.length + (reservados.length === 1 ? " libro." : " libros."), "success");
    }
    fallidos.forEach(function (f) {
      var l = buscarLibroPorId(f.id);
      avisarError("No se pudo reservar «" + (l ? l.titulo : "un libro") + "»: " + f.mensaje);
    });
  })).catch(mostrarErrorApi).then(function () {
    renderizarCarrito();
  });
}

document.addEventListener("click", function (e) {
  var agregar = e.target.closest(".btn-agregar-carrito");
  if (agregar) { alternarCarrito(agregar.dataset.id); return; }
  var quitar = e.target.closest(".btn-quitar-carrito");
  if (quitar) { alternarCarrito(quitar.dataset.id); }
});

document.getElementById("carrito-form").addEventListener("submit", function (e) {
  e.preventDefault();
  confirmarCarrito();
});

document.getElementById("carrito-vaciar").addEventListener("click", function () {
  carrito = [];
  guardarCarrito();
  limpiarMensajeCarrito();
  renderizarLibros();
});

document.getElementById("carrito-offcanvas").addEventListener("show.bs.offcanvas", function () {
  var hoy = hoyIso();
  var actual = document.getElementById("carrito-fecha").value;
  fijarFecha("carrito-fecha", actual && actual >= hoy ? actual : hoy, hoy);
  renderizarCarrito();
});

// ------------------------------
// Novedades (carrusel de los últimos libros cargados)
// ------------------------------

function renderizarNovedades() {
  var contenedor = document.getElementById("lista-novedades");
  var seccion = document.getElementById("seccion-novedades");
  if (!contenedor || !seccion) return;

  var recientes = libros.slice().sort(function (a, b) {
    return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
  }).slice(0, 12);

  seccion.classList.toggle("d-none", recientes.length === 0);

  var tarjetas = recientes.map(function (libro) {
    var claseEstado = libro.estado === "Prestado" ? "estado-prestado" : "estado-reservado";
    var pie = libro.estado === "Disponible"
      ? htmlBotonAgregar(libro)
      : '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(libro.estado) + "</span>";
    return {
      libro: libro,
      firmaPortada: firmaPortada(libro),
      html:
        '<div class="libro-portada-wrap">' + htmlPortadaLibro(libro) + "</div>" +
        '<p class="novedad-titulo" title="' + escapeHtml(libro.titulo) + '">' + escapeHtml(libro.titulo) + "</p>" +
        '<p class="libro-autor">' + escapeHtml(libro.autor) + "</p>" + pie
    };
  });

  reconciliarTarjetas(contenedor, tarjetas, "novedad-item");
}

(function () {
  var pista = document.getElementById("lista-novedades");
  function mover(sentido) {
    pista.scrollBy({ left: sentido * pista.clientWidth * 0.85, behavior: "smooth" });
  }
  document.getElementById("novedades-prev").addEventListener("click", function () { mover(-1); });
  document.getElementById("novedades-next").addEventListener("click", function () { mover(1); });
})();

// ------------------------------
// Banner con avisos
// ------------------------------

(function () {
  var pistas = document.getElementById("banner-pistas");
  var puntosEl = document.getElementById("banner-puntos");
  var slides = pistas.children;
  var actual = 0;
  var temporizador = null;
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (var i = 0; i < slides.length; i++) {
    var punto = document.createElement("button");
    punto.type = "button";
    punto.className = "banner-punto";
    punto.setAttribute("aria-label", "Aviso " + (i + 1));
    punto.dataset.indice = i;
    puntosEl.appendChild(punto);
  }

  function mostrar(indice) {
    actual = (indice + slides.length) % slides.length;
    pistas.style.transform = "translateX(-" + actual * 100 + "%)";
    for (var j = 0; j < puntosEl.children.length; j++) {
      puntosEl.children[j].classList.toggle("activo", j === actual);
      if (j === actual) puntosEl.children[j].setAttribute("aria-current", "true");
      else puntosEl.children[j].removeAttribute("aria-current");
    }
  }

  function arrancar() {
    detener();
    if (reducido) return;
    temporizador = setInterval(function () {
      if (!document.hidden) mostrar(actual + 1);
    }, 7000);
  }

  function detener() {
    if (temporizador) { clearInterval(temporizador); temporizador = null; }
  }

  document.getElementById("banner-prev").addEventListener("click", function () { mostrar(actual - 1); arrancar(); });
  document.getElementById("banner-next").addEventListener("click", function () { mostrar(actual + 1); arrancar(); });
  puntosEl.addEventListener("click", function (e) {
    var p = e.target.closest(".banner-punto");
    if (p) { mostrar(parseInt(p.dataset.indice, 10)); arrancar(); }
  });
  var banner = document.getElementById("banner");
  banner.addEventListener("mouseenter", detener);
  banner.addEventListener("mouseleave", arrancar);
  banner.addEventListener("focusin", detener);
  banner.addEventListener("focusout", arrancar);

  mostrar(0);
  arrancar();
})();

function reservasDeLibro(libroId) {
  return reservas.filter(function (r) { return r.libroId === libroId; });
}

function buscarReservaPorId(id) {
  for (var i = 0; i < reservas.length; i++) {
    if (reservas[i].id === String(id)) return reservas[i];
  }
  return null;
}

function prestamoEstaActivo(p) {
  return !p.fechaDevolucion && (p.estado === "activo" || p.estado === "vencido" || !p.estado);
}

function prestamosActivosDeLibro(libroId) {
  return prestamos.filter(function (p) { return p.libroId === libroId && prestamoEstaActivo(p); });
}

function buscarPrestamoPorId(id) {
  for (var i = 0; i < prestamos.length; i++) {
    if (prestamos[i].id === String(id)) return prestamos[i];
  }
  return null;
}

function miSocioId() {
  return !permisos.esGestion && sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;
}

function escapeHtml(texto) {
  var div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  var titulo = document.getElementById("titulo").value.trim();
  var autor = document.getElementById("autor").value.trim();
  var codigoBarras = inputCodigoBarras.value.trim() || null;
  if (!titulo || !autor) {
    avisarError("Completá título y autor.");
    return;
  }

  if (inputCategoria.value === "Otro" && !inputNuevaCategoria.value.trim()) {
    avisarError("Escribí el nombre de la nueva categoría.");
    inputNuevaCategoria.focus();
    return;
  }

  var cantidadCopias = parseInt(document.getElementById("cantidad-copias").value, 10);
  if (!(cantidadCopias >= 1 && cantidadCopias <= 200)) {
    avisarError("La cantidad de copias tiene que ser un número entre 1 y 200.");
    document.getElementById("cantidad-copias").focus();
    return;
  }

  // el backend crea un ejemplar (copia física) por cada copia indicada
  conCarga(botonEnviar(form), resolverCategoriaId(inputCategoria, inputNuevaCategoria).then(function (categoriaId) {
    return apiFetch("/libros", {
      method: "POST",
      body: { titulo: titulo, autor: autor, isbn: codigoBarras, categoria_id: categoriaId, foto_portada: portadaEncontrada, cantidad: cantidadCopias }
    });
  }).then(function () {
    registrarHistorial("Se agregó el libro \"" + titulo + "\" (" + cantidadCopias + (cantidadCopias === 1 ? " copia" : " copias") + ").", "libros");
    return cargarLibrosApi();
  })).then(function () {
    avisarOk("Libro agregado al catálogo.");
    form.reset();
    var modalAgregarEl = document.getElementById("modal-agregar-libro");
    var modalAgregar = modalAgregarEl && bootstrap.Modal.getInstance(modalAgregarEl);
    if (modalAgregar) modalAgregar.hide();
    portadaEncontrada = null;
    portadaEsManual = false;
    inputImagenLocal.value = "";
    actualizarVisibilidadNuevaCategoria(inputCategoria, grupoNuevaCategoria, inputNuevaCategoria);
    mostrarPreview(previewImg, previewPlaceholder, previewLoading, null, false);
    document.getElementById("titulo").focus();
    renderizarLibros();
  }).catch(mostrarErrorApi);
});

function buscarLibroPorId(id) {
  for (var i = 0; i < libros.length; i++) {
    if (libros[i].id === id) return libros[i];
  }
  return null;
}

lista.addEventListener("click", function (e) {
  var botonEliminar = e.target.closest(".btn-eliminar");
  if (botonEliminar) {
    var id = botonEliminar.dataset.id;
    var libroAEliminar = buscarLibroPorId(id);
    confirmar("¿Eliminar \"" + (libroAEliminar ? libroAEliminar.titulo : "este libro") + "\" del catálogo?", "Eliminar", true).then(function (ok) {
      if (!ok) return;
      return apiFetch("/libros/" + id, { method: "DELETE" })
        .then(function () { return Promise.all([cargarLibrosApi(), cargarReservasApi()]); })
        .then(function () {
          renderizarLibros();
          renderizarReservas();
        });
    }).catch(mostrarErrorApi);
    return;
  }

  var botonEditar = e.target.closest(".btn-editar");
  if (botonEditar) {
    abrirModalEditar(botonEditar.dataset.id);
    return;
  }

  var botonAccion = e.target.closest(".btn-accion-libro");
  if (!botonAccion) return;

  var accion = botonAccion.dataset.accion;
  var libroId = botonAccion.dataset.id;

  if (accion === "reservar") abrirModalReservar(libroId);
  else if (accion === "prestar") abrirModalPrestar(libroId, botonAccion.dataset.reservaId);
  else if (accion === "devolver") devolverLibro(libroId, botonAccion);
  else if (accion === "cancelar-reserva") cancelarReserva(botonAccion.dataset.reservaId, botonAccion);
});

filtroCategoria.addEventListener("change", renderizarLibros);

// pequeño debounce: si el catálogo crece, evita re-renderizar toda la
// lista en cada tecla mientras la persona todavía está escribiendo
var timeoutBusqueda = null;
inputBuscar.addEventListener("input", function () {
  clearTimeout(timeoutBusqueda);
  timeoutBusqueda = setTimeout(renderizarLibros, 180);
});

function abrirModalEditar(id) {
  var libro = buscarLibroPorId(id);
  if (!libro) return;

  editarId.value = libro.id;
  editarTitulo.value = libro.titulo;
  editarAutor.value = libro.autor;
  editarCategoria.value = libro.categoria;
  actualizarVisibilidadNuevaCategoria(editarCategoria, grupoEditarNuevaCategoria, inputEditarNuevaCategoria);
  editarCodigoBarras.value = libro.codigoBarras || "";
  editarCopias.value = libro.copias || 1;
  editarCopias.dataset.original = String(libro.copias || 0);
  document.getElementById("editar-copias-ayuda").textContent = libro.copias
    ? "Ahora: " + libro.disponibles + " en la biblioteca, " + (libro.prestadas + libro.reservadas) + " prestadas o reservadas. Solo se pueden quitar copias que estén en la biblioteca."
    : "Este libro no tiene copias cargadas.";
  editarImagenLocal.value = "";
  portadaEditando = libro.portada;
  portadaEditandoEsManual = false;
  tituloOriginalEditando = libro.titulo;
  mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, portadaEditando, false);
  modalEditar.show();
}

editarTitulo.addEventListener("input", function () {
  if (portadaEditandoEsManual) return; // el usuario ya eligió una imagen a mano, no la pisamos

  clearTimeout(tiempoEsperaEditar);
  var titulo = editarTitulo.value.trim();

  if (!titulo) {
    portadaEditando = null;
    mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, null, false);
    return;
  }

  if (titulo === tituloOriginalEditando) {
    var libroActual = buscarLibroPorId(editarId.value);
    portadaEditando = libroActual ? libroActual.portada : null;
    mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, portadaEditando, false);
    return;
  }

  mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, null, true);

  tiempoEsperaEditar = setTimeout(function () {
    var autor = editarAutor.value.trim();
    buscarPortada(titulo, autor, function (url) {
      if (portadaEditandoEsManual) return;
      if (editarTitulo.value.trim() !== titulo) return;
      portadaEditando = url;
      mostrarPreview(editarPreviewImg, editarPreviewPlaceholder, editarPreviewLoading, url, false);
    });
  }, 500);
});

formEditar.addEventListener("submit", function (e) {
  e.preventDefault();
  var titulo = editarTitulo.value.trim();
  var autor = editarAutor.value.trim();
  if (!titulo || !autor) {
    avisarError("Completá título y autor.");
    return;
  }

  var id = editarId.value;
  var copiasNuevas = parseInt(editarCopias.value, 10);
  if (!(copiasNuevas >= 1 && copiasNuevas <= 200)) {
    avisarError("La cantidad de copias tiene que ser un número entre 1 y 200.");
    editarCopias.focus();
    return;
  }
  var cambiaCantidad = String(copiasNuevas) !== editarCopias.dataset.original;
  if (editarCategoria.value === "Otro" && !inputEditarNuevaCategoria.value.trim()) {
    avisarError("Escribí el nombre de la nueva categoría.");
    inputEditarNuevaCategoria.focus();
    return;
  }

  conCarga(botonEnviar(formEditar), resolverCategoriaId(editarCategoria, inputEditarNuevaCategoria).then(function (categoriaId) {
    return apiFetch("/libros/" + id, {
      method: "PUT",
      body: {
        titulo: titulo,
        autor: autor,
        categoria_id: categoriaId,
        isbn: editarCodigoBarras.value.trim() || null,
        foto_portada: portadaEditando
      }
    });
  }).then(function () {
    if (!cambiaCantidad) return null;
    return apiFetch("/libros/" + id + "/cantidad", { method: "PUT", body: { cantidad: copiasNuevas } }).then(function () {
      registrarHistorial("Se cambió la cantidad de copias de \"" + titulo + "\" a " + copiasNuevas + ".", "libros");
    });
  }).then(function () {
    return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
  })).then(function () {
    renderizarLibros();
    renderizarReservas();
    modalEditar.hide();
  }).catch(function (err) {
    // si falló solo el cambio de copias, igual refrescamos lo demás
    mostrarErrorApi(err);
    cargarLibrosApi().then(renderizarLibros).catch(function () {});
  });
});

// ------------------------------
// Reservas
// ------------------------------

function abrirModalReservar(libroId) {
  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  reservarLibroId.value = libro.id;
  reservarLibroTitulo.textContent = libro.titulo;
  reservarNombre.value = "";
  reservarTipo.value = "Particular";

  var hoy = hoyIso();
  fijarFecha("reservar-fecha", hoy, hoy);

  // un socio autenticado (autoservicio) reserva con su propia cuenta:
  // no puede buscar/crear socios (GET/POST /socios requiere rol
  // administrador o bibliotecario), así que en ese caso no le pedimos
  // nombre/tipo y usamos directamente su socioId
  var esAutoservicio = !permisos.esGestion;
  grupoReservarNombre.classList.toggle("d-none", esAutoservicio);
  // el tipo de usuario ya viene del socio registrado: no se pide
  grupoReservarTipo.classList.add("d-none");
  reservarComoSocioInfo.classList.toggle("d-none", !esAutoservicio);

  modalReservar.show();
}

// un "particular" (o un centro educativo todavía sin verificar) solo puede
// tener 1 reserva activa en total; esto es solo una ayuda de UX para no
// dejar tipear en vano -el límite real, correcto, lo aplica el backend
// (ver ReservaController::store) mirando socio_id y la verificación real
function socioTieneReservaActivaBloqueante(socio) {
  if (!socio) return false;
  if (socio.tipo === "Centro educativo" && socio.verificado) return false;
  for (var i = 0; i < reservas.length; i++) {
    if (reservas[i].socioId === socio.id) return true;
  }
  return false;
}

formReservar.addEventListener("submit", function (e) {
  e.preventDefault();
  var libroId = reservarLibroId.value;
  var fechaDeseada = reservarFecha.value;
  if (!fechaDeseada) {
    avisarError("Elegí para cuándo lo querés retirar.");
    return;
  }
  var botonReservar = botonEnviar(formReservar);

  // autoservicio: el propio socio reserva con su cuenta, sin pasar por /socios
  if (!permisos.esGestion) {
    var socioIdPropio = sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;
    if (!socioIdPropio) {
      avisarError("Tu cuenta no tiene un socio asociado; no podés reservar. Contactá a un bibliotecario.");
      return;
    }
    var libroReservadoAuto = buscarLibroPorId(libroId);
    conCarga(botonReservar, apiFetch("/reservas", { method: "POST", body: { socio_id: socioIdPropio, libro_id: libroId, fecha_deseada: fechaDeseada } })
      .then(function () {
        registrarHistorial("Se reservó \"" + (libroReservadoAuto ? libroReservadoAuto.titulo : "un libro") + "\" a nombre de " + (sesionActual.nombre || "un socio") + ".", "reservas", sesionActual.nombre);
        return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
      })).then(function () {
        renderizarLibros();
        renderizarReservas();
        modalReservar.hide();
      }).catch(mostrarErrorApi);
    return;
  }

  // administrador/bibliotecario: reservan a nombre de un socio, buscándolo
  // o creándolo por nombre (ver buscarOCrearSocio)
  var nombre = reservarNombre.value.trim();
  if (!nombre) {
    avisarError("Escribí el nombre del socio que reserva.");
    return;
  }

  var socioExistente = buscarSocioPorNombre(nombre);
  if (socioExistente && socioTieneReservaActivaBloqueante(socioExistente)) {
    avisarError("Este socio ya tiene una reserva activa. Solo puede tener más de una si está verificado como centro educativo (ver pestaña Socios).");
    return;
  }

  var libroReservado = buscarLibroPorId(libroId);
  conCarga(botonReservar, buscarSocioRegistrado(nombre).then(function (socio) {
    return apiFetch("/reservas", { method: "POST", body: { socio_id: socio.id, libro_id: libroId, fecha_deseada: fechaDeseada } });
  }).then(function () {
    registrarHistorial("Se reservó \"" + (libroReservado ? libroReservado.titulo : "un libro") + "\" a nombre de " + nombre + ".", "reservas", nombre);
    return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
  })).then(function () {
    renderizarLibros();
    renderizarReservas();
    modalReservar.hide();
  }).catch(mostrarErrorApi);
});

function cancelarReserva(reservaId, boton) {
  var reserva = buscarReservaPorId(reservaId);
  if (!reserva) return;
  var libroCancelado = buscarLibroPorId(reserva.libroId);

  confirmar("¿Cancelar la reserva de \"" + (libroCancelado ? libroCancelado.titulo : "este libro") + "\"?", "Cancelar reserva", true).then(function (ok) {
    if (!ok) return;
    return conCarga(boton, apiFetch("/reservas/" + reserva.id + "/cancelar", { method: "PATCH" })
      .then(function () {
        registrarHistorial("Se canceló la reserva de \"" + (libroCancelado ? libroCancelado.titulo : "un libro") + "\" de " + (reserva.nombre || "un socio") + ".", "reservas", reserva.nombre);
        return Promise.all([cargarLibrosApi(), cargarReservasApi()]); }))
      .then(function () {
        renderizarLibros();
        renderizarReservas();
      });
  }).catch(mostrarErrorApi);
}

// Agrupa las reservas activas por socio: si la misma persona reservó
// varios libros, se muestran juntas bajo una sola tarjeta en lugar de
// repetir el nombre/etiqueta en un ítem por cada libro.
function agruparReservasPorSocio(listaDeReservas) {
  var grupos = [];
  var indicePorClave = {};

  for (var i = 0; i < listaDeReservas.length; i++) {
    var reserva = listaDeReservas[i];
    var libro = buscarLibroPorId(reserva.libroId);
    if (!libro) continue;

    // socioId identifica al mismo socio de forma confiable; si no viene
    // (dato viejo/roto), se cae al nombre para no romper el agrupado.
    var clave = reserva.socioId || ("nombre:" + reserva.nombre);

    if (!(clave in indicePorClave)) {
      indicePorClave[clave] = grupos.length;
      grupos.push({ socioId: reserva.socioId, nombre: reserva.nombre, tipo: reserva.tipo, items: [] });
    }
    grupos[indicePorClave[clave]].items.push({ reserva: reserva, libro: libro });
  }

  return grupos;
}

function renderizarReservas() {
  listaReservas.innerHTML = "";
  estadoVacioReservas.classList.toggle("d-none", reservas.length > 0);

  var grupos = agruparReservasPorSocio(reservas);

  for (var g = 0; g < grupos.length; g++) {
    var grupo = grupos[g];

    var librosHtml = "";
    for (var j = 0; j < grupo.items.length; j++) {
      var item = grupo.items[j];
      librosHtml +=
        '<li class="reserva-grupo-libro">' +
          '<div class="flex-grow-1">' +
            '<p class="reserva-grupo-libro-titulo">' + escapeHtml(item.libro.titulo) + "</p>" +
            '<p class="mb-0 text-muted small">Reservado el ' + item.reserva.fecha +
              (item.reserva.estado === "pendiente" ? ' <span class="texto-en-espera">En espera de una copia</span>' : "") + "</p>" +
          "</div>" +
          (item.reserva.estado === "pendiente" ? "" : '<button class="btn-accion-libro" title="Prestar" data-accion="prestar" data-id="' + item.libro.id + '" data-reserva-id="' + item.reserva.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>') +
          '<button class="btn-accion-libro" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + item.libro.id + '" data-reserva-id="' + item.reserva.id + '"><i class="fa-solid fa-ban"></i></button>' +
        "</li>";
    }

    var etiquetaCantidad = grupo.items.length > 1 ? '<span class="etiqueta-cantidad-reservas">' + grupo.items.length + " libros</span>" : "";
    var botonAceptarTodasHtml = grupo.items.length > 1
      ? '<button class="btn-accion-libro btn-aceptar-todas" title="Prestar todos los libros reservados por esta persona" data-accion="prestar-todas" data-grupo-index="' + g + '"><i class="fa-solid fa-check-double"></i> Aceptar todas</button>'
      : "";

    var li = document.createElement("li");
    li.className = "reserva-grupo";
    li.innerHTML =
      '<div class="reserva-grupo-header">' +
        "<h3>" + escapeHtml(grupo.nombre) + "</h3>" +
        '<span class="etiqueta etiqueta-tipo">' + escapeHtml(grupo.tipo) + "</span>" +
        etiquetaCantidad +
        botonAceptarTodasHtml +
      "</div>" +
      '<ul class="list-unstyled reserva-grupo-libros">' + librosHtml + "</ul>";
    listaReservas.appendChild(li);
  }

  ultimosGruposReservas = grupos;

  renderizarMisReservas();
}

// libros que el socio logueado tiene prestados ahora mismo (activo o
// vencido, no devuelto ni anulado); la usan tanto el dropdown "Mis
// reservas y préstamos" como el popup del ícono de libro del header
function misPrestamosActivosSocio() {
  var socioIdPropio = sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;
  if (!socioIdPropio) return [];
  return prestamos.filter(function (p) {
    return p.socioId === socioIdPropio && (p.estado === "activo" || p.estado === "vencido");
  });
}

// el ícono de libro del header, con sesión iniciada, muestra números
// distintos según quién mira: a un socio le interesa cuántos libros tiene
// prestados ÉL (para eso ese ícono abre el popup "Mis libros prestados");
// a administrador/bibliotecario, que no tienen préstamos propios y a
// quienes ese ícono lleva al catálogo general, le mostramos el total de
// libros (antes se usaba siempre el total del catálogo, por lo que a un
// socio le quedaba marcando "1" aunque ya hubiera devuelto su único
// préstamo, porque esa es la cantidad de libros que hay en toda la
// biblioteca, no la de sus préstamos activos)
function actualizarContadorLibrosHeaderSesion() {
  if (!contadorLibrosHeaderSesion) return;
  var valor = permisos.esGestion ? libros.length : misPrestamosActivosSocio().length;
  contadorLibrosHeaderSesion.textContent = valor;
}

// ------------------------------
// "Mis reservas y préstamos" (header): un socio ve, desde el mismo lugar,
// tanto sus reservas activas (y puede cancelarlas) como los libros que ya
// tiene en préstamo (con la fecha de vencimiento), sin depender de la
// pestaña Contabilidad (que es solo para administrador/bibliotecario).
// No tiene sentido para administrador/bibliotecario, que no tienen un
// socio propio asociado (ver aplicarPermisosUI, que oculta el botón
// para ellos, ya que cuentan con Contabilidad para ver todo eso).
// ------------------------------
function renderizarMisReservas() {
  if (!listaMisReservasDropdown) return;

  var socioIdPropio = sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;

  var misPrestamos = misPrestamosActivosSocio();
  var misReservas = [];
  if (socioIdPropio) {
    misReservas = reservas.filter(function (r) { return r.socioId === socioIdPropio; });
  }

  var total = misPrestamos.length + misReservas.length;

  if (contadorMisReservas) {
    contadorMisReservas.textContent = total;
    contadorMisReservas.classList.toggle("d-none", total === 0);
  }

  // el ícono de libro del header (préstamos del socio) depende de esta
  // misma lista de préstamos, así que lo refrescamos acá también
  actualizarContadorLibrosHeaderSesion();

  // limpiamos todo salvo el encabezado y el mensaje de "vacío"
  var items = listaMisReservasDropdown.querySelectorAll(".mis-reservas-item");
  for (var k = 0; k < items.length; k++) items[k].remove();

  if (misReservasVacio) misReservasVacio.classList.toggle("d-none", total > 0);

  // primero lo que ya tiene prestado (con vencimiento), después lo que
  // todavía está reservado/en espera de retirar
  for (var i = 0; i < misPrestamos.length; i++) {
    var prestamo = misPrestamos[i];
    var libroPrestado = buscarLibroPorId(prestamo.libroId);
    var tituloPrestado = libroPrestado ? libroPrestado.titulo : "Libro";
    var vencido = !!prestamo.fechaVencimiento && fechaVencida(prestamo.fechaVencimiento);

    var liPrestamo = document.createElement("li");
    liPrestamo.className = "mis-reservas-item";
    liPrestamo.innerHTML =
      '<div class="mis-reservas-info">' +
      "<h4>" + escapeHtml(tituloPrestado) + "</h4>" +
      '<p><span class="etiqueta-estado mis-reservas-badge ' + (vencido ? "estado-prestado" : "estado-reservado") + '">Prestado</span>' + escapeHtml(textoTiempoRestante(prestamo.fechaVencimiento)) + "</p></div>";
    listaMisReservasDropdown.appendChild(liPrestamo);
  }

  for (var j = 0; j < misReservas.length; j++) {
    var reserva = misReservas[j];
    var libro = buscarLibroPorId(reserva.libroId);
    var tituloLibro = libro ? libro.titulo : "Libro";
    var estadoTexto = reserva.estado === "pendiente" ? "En espera de una copia" : "Listo para retirar";

    var li = document.createElement("li");
    li.className = "mis-reservas-item";
    li.innerHTML =
      '<div class="mis-reservas-info">' +
      "<h4>" + escapeHtml(tituloLibro) + "</h4>" +
      "<p>" + estadoTexto + ". Reservado el " + reserva.fecha + "</p></div>" +
      '<button type="button" class="btn-cancelar-mi-reserva" title="Cancelar reserva" data-reserva-id="' + reserva.id + '"><i class="fa-solid fa-ban"></i></button>';
    listaMisReservasDropdown.appendChild(li);
  }
}

// ------------------------------
// Popup "Mis libros prestados": se abre al presionar el ícono de libro
// del header (antes no hacía nada útil). En vez de mostrar la info de
// "ya lo tenés vos" dentro de cada tarjeta del catálogo, se muestra acá,
// junta, con el título y el tiempo restante de cada préstamo activo.
// ------------------------------
function renderizarModalMisPrestamos() {
  if (!listaModalPrestamos) return;

  var misPrestamos = misPrestamosActivosSocio();

  listaModalPrestamos.innerHTML = "";
  if (estadoVacioModalPrestamos) estadoVacioModalPrestamos.classList.toggle("d-none", misPrestamos.length > 0);

  for (var i = 0; i < misPrestamos.length; i++) {
    var prestamo = misPrestamos[i];
    var libro = buscarLibroPorId(prestamo.libroId);
    var titulo = libro ? libro.titulo : "Libro";
    var vencido = !!prestamo.fechaVencimiento && fechaVencida(prestamo.fechaVencimiento);

    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(titulo) + "</h3>" +
      '<p class="mb-0 text-muted small">' + escapeHtml(textoTiempoRestante(prestamo.fechaVencimiento)) + "</p></div>" +
      '<span class="etiqueta-estado ' + (vencido ? "estado-prestado" : "estado-reservado") + '">Prestado</span>';
    listaModalPrestamos.appendChild(li);
  }
}

function abrirModalMisPrestamos() {
  renderizarModalMisPrestamos();
  if (modalMisPrestamos) modalMisPrestamos.show();
}


if (listaMisReservasDropdown) {
  listaMisReservasDropdown.addEventListener("click", function (e) {
    var boton = e.target.closest(".btn-cancelar-mi-reserva");
    if (!boton) return;
    e.stopPropagation(); // no cerrar el dropdown antes de confirmar
    cancelarReserva(boton.dataset.reservaId, boton);
  });
}

listaReservas.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  var accion = boton.dataset.accion;
  var libroId = boton.dataset.id;
  if (accion === "prestar") abrirModalPrestar(libroId, boton.dataset.reservaId);
  else if (accion === "cancelar-reserva") cancelarReserva(boton.dataset.reservaId, boton);
  else if (accion === "prestar-todas") prestarTodasReservasDelGrupo(boton.dataset.grupoIndex, boton);
});

// Presta de una sola vez todos los libros que un mismo socio tiene
// reservados (botón "Aceptar todas" de la tarjeta agrupada). Cada libro
// ya tiene ejemplar propio asignado por la reserva, así que no hace
// falta abrir el modal por cada uno: se manda un POST /prestamos por
// libro y se refresca todo al final.
function prestarTodasReservasDelGrupo(indiceGrupo, boton) {
  var grupo = ultimosGruposReservas[indiceGrupo];
  if (!grupo || !grupo.items.length) return;

  // solo las reservas que ya tienen una copia apartada (las "en espera" no)
  var itemsPrestables = grupo.items.filter(function (item) { return !!item.reserva.ejemplarId; });

  if (!itemsPrestables.length) {
    avisarError("Ninguna de estas reservas tiene una copia apartada todavía (están en espera).");
    return;
  }

  confirmar("¿Prestar los " + itemsPrestables.length + " libros reservados por " + grupo.nombre + "?", "Prestar todos").then(function (ok) {
    if (ok) conCarga(boton, prestarItemsDelGrupo(grupo, itemsPrestables));
  });
}

function prestarItemsDelGrupo(grupo, itemsPrestables) {
  var socioId = grupo.socioId;

  var cadenaDePromesas = itemsPrestables.reduce(function (promesaPrevia, item) {
    return promesaPrevia.then(function () {
      return apiFetch("/prestamos", { method: "POST", body: { socio_id: socioId, ejemplar_id: item.reserva.ejemplarId } })
        .then(function () {
          registrarHistorial("Se prestó \"" + item.libro.titulo + "\" a " + grupo.nombre + ".", "prestamos", grupo.nombre);
        });
    });
  }, Promise.resolve());

  return cadenaDePromesas
    .catch(function (err) {
      // Si un préstamo falla a mitad de camino (p. ej. otro bibliotecario
      // ya prestó ese ejemplar), igual refrescamos las listas para reflejar
      // lo que sí se llegó a prestar, y recién ahí mostramos el error.
      mostrarErrorApi(err);
    })
    .then(function () { return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]); })
    .then(function () {
      renderizarLibros();
      renderizarReservas();
      renderizarPrestamos();
    })
    .catch(mostrarErrorApi);
}

// ------------------------------
// Préstamos y devoluciones
// ------------------------------

// sin reservaId: se presta una copia libre a quien se escriba en el modal;
// con reservaId: se entrega la copia apartada para esa reserva
function abrirModalPrestar(libroId, reservaId) {
  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  var reserva = reservaId ? buscarReservaPorId(reservaId) : null;
  if (reserva && !reserva.ejemplarId) {
    avisarError("Esta reserva está en espera: todavía no hay una copia libre para entregar.");
    return;
  }
  if (!reserva && !libro.ejemplarId) {
    avisarError("No quedan copias libres de este libro.");
    return;
  }
  prestarLibroId.value = libro.id;
  prestarLibroTitulo.textContent = libro.titulo;
  prestarEjemplarId.value = reserva ? reserva.ejemplarId : libro.ejemplarId;
  prestarSocioId.value = reserva && reserva.socioId ? String(reserva.socioId) : "";
  prestarNombre.value = reserva ? reserva.nombre : "";
  prestarNombre.readOnly = !!reserva;
  prestarFechaHoy.textContent = fechaHoy();
  modalPrestar.show();
}

formPrestar.addEventListener("submit", function (e) {
  e.preventDefault();
  var libroId = prestarLibroId.value;
  var nombre = prestarNombre.value.trim();
  if (!nombre) {
    avisarError("Escribí el nombre de quien retira el libro.");
    return;
  }

  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  var ejemplarId = prestarEjemplarId.value;
  if (!ejemplarId) {
    avisarError("No quedan copias libres de este libro.");
    return;
  }

  var socioPromise;
  if (prestarSocioId.value) {
    // Si el libro estaba reservado, la reserva ya identifica al socio.
    // No volvemos a buscar/crear otro socio por nombre.
    socioPromise = Promise.resolve({ id: prestarSocioId.value });
  } else {
    socioPromise = buscarSocioRegistrado(nombre);
  }

  conCarga(botonEnviar(formPrestar), socioPromise.then(function (socio) {
    return apiFetch("/prestamos", { method: "POST", body: { socio_id: socio.id, ejemplar_id: ejemplarId } });
  }).then(function () {
    registrarHistorial("Se prestó \"" + libro.titulo + "\" a " + nombre + ".", "prestamos", nombre);
    return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]);
  })).then(function () {
    renderizarLibros();
    renderizarReservas();
    renderizarPrestamos();
    modalPrestar.hide();
  }).catch(mostrarErrorApi);
});

// con una sola copia prestada se pide confirmación; con varias se abre un
// listado para elegir de quién es la copia que vuelve
var modalDevolver = new bootstrap.Modal(document.getElementById("modal-devolver"));
var listaDevolver = document.getElementById("lista-devolver");

function devolverLibro(libroId, boton) {
  var activos = prestamosActivosDeLibro(libroId);
  if (!activos.length) return;
  if (activos.length === 1) {
    devolverPrestamo(activos[0], boton, true);
    return;
  }
  var libro = buscarLibroPorId(libroId);
  document.getElementById("devolver-libro-titulo").textContent = libro ? libro.titulo : "";
  listaDevolver.innerHTML = activos.map(function (p) {
    var vencido = p.fechaVencimiento && fechaVencida(p.fechaVencimiento);
    return '<li class="reserva-item">' +
      '<div class="flex-grow-1"><h3>' + escapeHtml(p.nombre) + "</h3>" +
      '<p class="mb-0 small ' + (vencido ? "text-danger" : "text-muted") + '">Prestado el ' + p.fechaPrestamo + (p.fechaVencimiento ? ", vence el " + p.fechaVencimiento : "") + "</p></div>" +
      '<button type="button" class="btn btn-brand btn-sm" data-prestamo-id="' + p.id + '">Devolver</button></li>';
  }).join("");
  modalDevolver.show();
}

listaDevolver.addEventListener("click", function (e) {
  var boton = e.target.closest("[data-prestamo-id]");
  if (!boton) return;
  var prestamo = buscarPrestamoPorId(boton.dataset.prestamoId);
  if (prestamo) devolverPrestamo(prestamo, boton, false).then(function (ok) { if (ok) modalDevolver.hide(); });
});

function devolverPrestamo(prestamo, boton, pedirConfirmacion) {
  var libroDevuelto = buscarLibroPorId(prestamo.libroId);
  var titulo = libroDevuelto ? libroDevuelto.titulo : "un libro";
  var confirmacion = pedirConfirmacion
    ? confirmar("¿Registrar la devolución de \"" + titulo + "\" de " + (prestamo.nombre || "un socio") + "?", "Registrar devolución")
    : Promise.resolve(true);

  return confirmacion.then(function (ok) {
    if (!ok) return false;
    return conCarga(boton, apiFetch("/prestamos/" + prestamo.id + "/devolver", { method: "PATCH" })
      .then(function () {
        registrarHistorial("Se registró la devolución de \"" + titulo + "\" de " + (prestamo.nombre || "un socio") + ".", "prestamos", prestamo.nombre);
        return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]); }))
      .then(function () {
        renderizarLibros();
        renderizarReservas();
        renderizarPrestamos();
        avisarOk("Devolución registrada.");
        return true;
      });
  }).catch(function (err) { mostrarErrorApi(err); return false; });
}

function prestamosFiltrados() {
  var filtro = filtroPrestamos.value;
  var resultado = [];
  for (var i = 0; i < prestamos.length; i++) {
    var p = prestamos[i];
    if (filtro === "En curso" && p.fechaDevolucion) continue;
    if (filtro === "Devueltos" && !p.fechaDevolucion) continue;
    resultado.push(p);
  }
  // más recientes primero
  return resultado.slice().reverse();
}

function renderizarPrestamos() {
  var filtrados = prestamosFiltrados();
  listaPrestamos.innerHTML = "";
  estadoVacioPrestamos.classList.toggle("d-none", filtrados.length > 0);

  for (var i = 0; i < filtrados.length; i++) {
    var prestamo = filtrados[i];
    var libro = buscarLibroPorId(prestamo.libroId);
    var tituloLibro = libro ? libro.titulo : "(libro eliminado)";
    var estadoTexto = prestamo.fechaDevolucion ? "Devuelto el " + prestamo.fechaDevolucion : "En curso";
    var claseEstado = prestamo.fechaDevolucion ? "estado-disponible" : "estado-prestado";

    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(tituloLibro) + "</h3>" +
      "<p class=\"mb-1\">Prestatario: " + escapeHtml(prestamo.nombre) + "</p>" +
      '<p class="mb-0 text-muted small">Prestado el ' + prestamo.fechaPrestamo + "</p></div>" +
      '<span class="etiqueta-estado ' + claseEstado + '">' + estadoTexto + "</span>" +
      (prestamoEstaActivo(prestamo) ? '<button class="btn-accion-libro" title="Registrar devolución" data-accion="devolver-prestamo" data-prestamo-id="' + prestamo.id + '"><i class="fa-solid fa-rotate-left"></i></button>' : "");
    listaPrestamos.appendChild(li);
  }

  // el dropdown "Mis reservas y préstamos" y el popup "Mis libros prestados"
  // dependen de esta misma lista de préstamos, así que los refrescamos acá
  // también (renderizarReservas ya llama al dropdown, pero corre antes de
  // que lleguen los préstamos actualizados)
  renderizarMisReservas();
  renderizarModalMisPrestamos();
}

filtroPrestamos.addEventListener("change", renderizarPrestamos);

listaPrestamos.addEventListener("click", function (e) {
  var boton = e.target.closest('[data-accion="devolver-prestamo"]');
  if (!boton) return;
  var prestamo = buscarPrestamoPorId(boton.dataset.prestamoId);
  if (prestamo) devolverPrestamo(prestamo, boton, true);
});

// ------------------------------
// Autenticación: registro, inicio de sesión y sesión activa
// ------------------------------

function cargarSesion() {
  var guardada = localStorage.getItem(STORAGE_KEY_SESION);
  return guardada ? JSON.parse(guardada) : null;
}

function guardarSesion() {
  if (sesionActual) {
    localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesionActual));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESION);
  }
}

function mostrarErrorLogin(mensaje) {
  avisarError(mensaje);
}

function mostrarErrorRegistro(mensaje) {
  avisarError(mensaje);
}

function abrirModalLogin() {
  formLogin.reset();
  reiniciarCamposPassword(formLogin);
  modalRegistro.hide();
  modalLogin.show();
}

function abrirModalRegistro() {
  formRegistro.reset();
  reiniciarCamposPassword(formRegistro);
  modalLogin.hide();
  modalRegistro.show();
}

// refleja el estado de la sesión (invitado o con usuario) en el header y el menú
function actualizarUIAuth() {
  var haySesion = !!sesionActual;

  headerAuthInvitado.classList.toggle("d-none", haySesion);
  headerAuthSesion.classList.toggle("d-none", !haySesion);
  menuAuthInvitado.classList.toggle("d-none", haySesion);
  menuAuthSesion.classList.toggle("d-none", !haySesion);

  if (haySesion) {
    headerUsuarioNombre.textContent = sesionActual.nombre + (sesionActual.rol ? " (" + sesionActual.rol + ")" : "");
    pintarAvatar(menuAvatar);
  }

  aplicarPermisosUI();
}

// ------------------------------
// Permisos de UI según el rol (espejo de routes/api.php + CheckRole)
//   - "administrador": única con acceso a agregar/editar/eliminar libros
//   - "administrador" o "bibliotecario" ("gestion"): socios, multas,
//     reportes, contabilidad (préstamos), prestar/devolver libros
//   - cualquier usuario logueado: catálogo, reservar/cancelar su reserva
// Importante: esto es solo para no mostrar opciones que el servidor de
// todas formas rechazaría (403). El control real de seguridad sigue
// estando en el backend (middleware CheckRole).
// ------------------------------
var permisos = { esAdmin: false, esGestion: false };

function calcularPermisos() {
  var rol = sesionActual ? sesionActual.rol : null;
  permisos.esAdmin = rol === "administrador";
  permisos.esGestion = permisos.esAdmin || rol === "bibliotecario";
}

function aplicarPermisosUI() {
  calcularPermisos();

  var nodosAdmin = document.querySelectorAll('[data-requiere-rol="administrador"]');
  for (var i = 0; i < nodosAdmin.length; i++) {
    nodosAdmin[i].classList.toggle("d-none", !permisos.esAdmin);
  }

  var nodosGestion = document.querySelectorAll('[data-requiere-rol="gestion"]');
  for (var j = 0; j < nodosGestion.length; j++) {
    nodosGestion[j].classList.toggle("d-none", !permisos.esGestion);
  }

  // "Mis reservas y préstamos" (header): solo tiene sentido para un socio
  // (autoservicio), no para administrador/bibliotecario, que no tienen un socio propio
  var nodosSocio = document.querySelectorAll('[data-requiere-rol="socio"]');
  for (var s = 0; s < nodosSocio.length; s++) {
    nodosSocio[s].classList.toggle("d-none", permisos.esGestion);
  }

  // si la pestaña activa quedó oculta (por ejemplo, cambió el rol al
  // volver a loguearse), volvemos a mostrar el Catálogo
  var panelActivo = document.querySelector(".tab-pane.active");
  if (panelActivo && panelActivo.hasAttribute("data-requiere-rol") && panelActivo.classList.contains("d-none")) {
    var pillCatalogo = document.querySelector('[data-bs-target="#tab-catalogo"]');
    if (pillCatalogo && typeof bootstrap !== "undefined") {
      bootstrap.Tab.getOrCreateInstance(pillCatalogo).show();
    }
  }

  // los botones de acción de cada libro (editar/eliminar/prestar/devolver)
  // dependen del rol, así que hay que volver a dibujarlos
  if (typeof renderizarLibros === "function") {
    renderizarLibros();
  }
}

function mapearUsuarioSesion(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    socioId: usuario.socio_id
  };
}

// ------------------------------
// Mi cuenta: editar datos y foto de perfil (la foto queda solo en este
// navegador, en localStorage, y se reduce a 256px para que pese poco)
// ------------------------------
var modalMiCuenta = new bootstrap.Modal(document.getElementById("modal-mi-cuenta"));
var formMiCuenta = document.getElementById("form-mi-cuenta");
var miCuentaAvatar = document.getElementById("mi-cuenta-avatar");
var miCuentaFotoInput = document.getElementById("mi-cuenta-foto");
var miCuentaQuitarFoto = document.getElementById("mi-cuenta-quitar-foto");
var miCuentaCampos = {
  nombre: document.getElementById("mi-cuenta-nombre"),
  apellido: document.getElementById("mi-cuenta-apellido"),
  cedula: document.getElementById("mi-cuenta-cedula"),
  telefono: document.getElementById("mi-cuenta-telefono"),
  direccion: document.getElementById("mi-cuenta-direccion"),
  email: document.getElementById("mi-cuenta-email"),
  passwordActual: document.getElementById("mi-cuenta-password-actual"),
  password: document.getElementById("mi-cuenta-password")
};
// foto elegida pero aún no guardada: undefined = sin cambios, null = quitar
var miCuentaFotoPendiente;

function claveFoto() {
  return sesionActual ? "bibliotech_foto_" + sesionActual.id : null;
}

function obtenerFotoLocal() {
  try {
    var clave = claveFoto();
    return clave ? localStorage.getItem(clave) : null;
  } catch (e) { return null; }
}

// dibuja la foto (o la inicial del nombre) dentro de un .avatar-usuario
function pintarAvatar(nodo, fotoForzada) {
  if (!nodo || !sesionActual) return;
  var foto = fotoForzada === undefined ? obtenerFotoLocal() : fotoForzada;
  if (foto) {
    nodo.style.backgroundImage = 'url("' + foto + '")';
    nodo.textContent = "";
  } else {
    nodo.style.backgroundImage = "";
    nodo.textContent = (sesionActual.nombre || "?").trim().charAt(0).toUpperCase();
  }
}

function redimensionarImagen(archivo, lado) {
  return new Promise(function (resolve, reject) {
    var lector = new FileReader();
    lector.onerror = function () { reject(new Error("No se pudo leer la imagen.")); };
    lector.onload = function () {
      var img = new Image();
      img.onerror = function () { reject(new Error("El archivo no es una imagen válida.")); };
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = lado;
        var ctx = canvas.getContext("2d");
        // recorte cuadrado centrado
        var min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, lado, lado);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function mostrarMensajeMiCuenta(mensaje, esError) {
  if (!mensaje) return;
  if (esError) avisarError(mensaje); else avisarOk(mensaje);
}

function abrirMiCuenta() {
  miCuentaFotoPendiente = undefined;
  formMiCuenta.reset();
  reiniciarCamposPassword(formMiCuenta);
  pintarAvatar(miCuentaAvatar);
  miCuentaQuitarFoto.classList.toggle("d-none", !obtenerFotoLocal());

  var esSocio = !!sesionActual.socioId;
  document.getElementById("mi-cuenta-grupo-apellido").classList.toggle("d-none", !esSocio);
  document.getElementById("mi-cuenta-datos-socio").classList.toggle("d-none", !esSocio);
  document.getElementById("mi-cuenta-nombre-label").textContent = esSocio ? "Nombres" : "Nombre";

  apiFetch("/auth/me").then(function (u) {
    var soc = u.socio;
    miCuentaCampos.nombre.value = soc ? soc.nombre : u.nombre;
    miCuentaCampos.email.value = u.email || "";
    if (soc) {
      miCuentaCampos.apellido.value = soc.apellido && soc.apellido !== "-" ? soc.apellido : "";
      miCuentaCampos.cedula.value = String(soc.cedula || "").indexOf("PENDIENTE-") === 0 ? "" : (soc.cedula || "");
      miCuentaCampos.telefono.value = soc.telefono || "";
      miCuentaCampos.direccion.value = soc.direccion || "";
    }
  }).catch(mostrarErrorApi);

  modalMiCuenta.show();
}

document.getElementById("header-btn-mi-cuenta").addEventListener("click", function (e) {
  e.preventDefault();
  if (sesionActual) abrirMiCuenta();
});

document.getElementById("mi-cuenta-elegir-foto").addEventListener("click", function () {
  miCuentaFotoInput.click();
});

miCuentaFotoInput.addEventListener("change", function () {
  var archivo = miCuentaFotoInput.files[0];
  if (!archivo) return;
  redimensionarImagen(archivo, 256).then(function (dataUrl) {
    miCuentaFotoPendiente = dataUrl;
    pintarAvatar(miCuentaAvatar, dataUrl);
    miCuentaQuitarFoto.classList.remove("d-none");
  }).catch(function (err) { mostrarMensajeMiCuenta(err.message, true); });
  miCuentaFotoInput.value = "";
});

miCuentaQuitarFoto.addEventListener("click", function () {
  miCuentaFotoPendiente = null;
  pintarAvatar(miCuentaAvatar, null);
  miCuentaQuitarFoto.classList.add("d-none");
});

formMiCuenta.addEventListener("submit", function (e) {
  e.preventDefault();
  var esSocio = !!sesionActual.socioId;
  var c = miCuentaCampos;

  var body = { nombre: c.nombre.value.trim(), email: c.email.value.trim() };
  if (!body.nombre || !body.email) { mostrarMensajeMiCuenta("Completá nombre y correo.", true); return; }
  if (!correoValido(body.email)) { mostrarMensajeMiCuenta("El correo electrónico no es válido.", true); return; }
  if (esSocio) {
    body.apellido = c.apellido.value.trim();
    body.cedula = c.cedula.value.trim();
    body.telefono = c.telefono.value.trim() || null;
    body.direccion = c.direccion.value.trim() || null;
    if (!body.apellido || !body.cedula) { mostrarMensajeMiCuenta("Completá apellidos y cédula.", true); return; }
  }
  if (c.password.value) {
    if (!passwordValida(c.password.value)) { mostrarMensajeMiCuenta("A la nueva contraseña le falta: " + requisitosFaltantes(c.password.value).join(", ") + ".", true); return; }
    if (!c.passwordActual.value) { mostrarMensajeMiCuenta("Ingresá tu contraseña actual para cambiarla.", true); return; }
    body.password = c.password.value;
    body.password_actual = c.passwordActual.value;
  }

  conCarga(botonEnviar(formMiCuenta), apiFetch("/auth/perfil", { method: "PUT", body: body })).then(function (usuario) {
    // foto: solo local
    var fotoFallo = false;
    if (miCuentaFotoPendiente !== undefined) {
      try {
        if (miCuentaFotoPendiente) localStorage.setItem(claveFoto(), miCuentaFotoPendiente);
        else localStorage.removeItem(claveFoto());
      } catch (err) {
        fotoFallo = true;
        mostrarMensajeMiCuenta("Los datos se guardaron, pero no se pudo guardar la foto en este navegador.", true);
      }
      miCuentaFotoPendiente = undefined;
    }
    sesionActual = mapearUsuarioSesion(usuario);
    guardarSesion();
    actualizarUIAuth();
    c.password.value = "";
    c.passwordActual.value = "";
    reiniciarCamposPassword(formMiCuenta);
    if (!fotoFallo) mostrarMensajeMiCuenta("Datos actualizados.", false);
    return cargarSociosApi().then(renderizarSocios).catch(function () {});
  }).catch(function (err) {
    mostrarMensajeMiCuenta(err.message || "No se pudieron guardar los cambios.", true);
  });
});

formRegistro.addEventListener("submit", function (e) {
  e.preventDefault();

  var nombre = registroNombre.value.trim();
  var apellido = registroApellido.value.trim();
  var cedula = registroCedula.value.trim();
  var telefono = registroTelefono.value.trim();
  var email = registroEmail.value.trim();
  var password = registroPassword.value;
  var passwordConfirmar = registroPasswordConfirmar.value;

  if (!nombre || !apellido || !cedula || !email || !password) {
    mostrarErrorRegistro("Completá nombres, apellidos, cédula, correo y contraseña.");
    return;
  }

  if (!correoValido(email)) {
    mostrarErrorRegistro("El correo electrónico no es válido.");
    registroEmail.focus();
    return;
  }

  if (!passwordValida(password)) {
    mostrarErrorRegistro("A la contraseña le falta: " + requisitosFaltantes(password).join(", ") + ".");
    registroPassword.focus();
    return;
  }

  if (password !== passwordConfirmar) {
    mostrarErrorRegistro("Las contraseñas no coinciden.");
    return;
  }

  // el registro público siempre crea una cuenta con rol "socio" (ver AuthController::registro);
  // declarar "centro educativo" acá no lo verifica: un bibliotecario tiene
  // que confirmarlo a mano desde la pestaña de socios
  conCarga(botonEnviar(formRegistro), apiFetch("/auth/registro", { method: "POST", body: { nombre: nombre, apellido: apellido, cedula: cedula, telefono: telefono || null, email: email, password: password } }))
    .then(function (resp) {
      guardarToken(resp.token);
      sesionActual = mapearUsuarioSesion(resp.usuario);
      guardarSesion();
      actualizarUIAuth();
      registrarHistorial("Se registró la cuenta de " + nombre + " " + apellido + ".", "cuentas", nombre + " " + apellido);
      modalRegistro.hide();
      return cargarTodoDesdeApi();
    })
    .then(function () {
      iniciarPollingActualizaciones();
    })
    .catch(function (err) {
      mostrarErrorRegistro(err.message || "No se pudo completar el registro.");
    });
});

formLogin.addEventListener("submit", function (e) {
  e.preventDefault();

  var email = loginEmail.value.trim();
  var password = loginPassword.value;
  if (!email || !password) {
    mostrarErrorLogin("Escribí tu correo y tu contraseña.");
    return;
  }

  conCarga(botonEnviar(formLogin), apiFetch("/auth/login", { method: "POST", body: { email: email, password: password } }))
    .then(function (resp) {
      guardarToken(resp.token);
      sesionActual = mapearUsuarioSesion(resp.usuario);
      guardarSesion();
      actualizarUIAuth();
      modalLogin.hide();
      return cargarTodoDesdeApi();
    })
    .then(function () {
      iniciarPollingActualizaciones();
    })
    .catch(function (err) {
      mostrarErrorLogin(err.message || "Correo o contraseña incorrectos.");
    });
});

// limpia el estado local (usado al cerrar sesión o cuando el token quedó inválido)
function limpiarEstadoLocal() {
  libros = [];
  reservas = [];
  prestamos = [];
  socios = [];
  multas = [];
  categoriasApi = [];
  ejemplaresPorLibro = {};
  renderizarLibros();
  renderizarReservas();
  renderizarPrestamos();
  renderizarSocios();
  renderizarMultas();
}

function cerrarSesionLocal() {
  sesionActual = null;
  guardarSesion();
  guardarToken(null);
  detenerPollingActualizaciones();
  actualizarUIAuth();
  limpiarEstadoLocal();
}

function cerrarSesion() {
  apiFetch("/auth/logout", { method: "POST" }).catch(function () {}).then(function () {
    cerrarSesionLocal();
    cargarCatalogoPublico();
    abrirModalLogin();
  });
}

headerBtnLogin.addEventListener("click", function (e) { e.preventDefault(); abrirModalLogin(); });
headerBtnRegistro.addEventListener("click", function (e) { e.preventDefault(); abrirModalRegistro(); });
headerBtnLogout.addEventListener("click", function (e) { e.preventDefault(); cerrarSesion(); });

// ícono de libro del header (invitado): antes no hacía nada al hacer clic;
// ahora lleva a la pestaña Catálogo
function irAlCatalogo() {
  var pillCatalogo = document.querySelector('[data-bs-target="#tab-catalogo"]');
  if (pillCatalogo && typeof bootstrap !== "undefined") {
    bootstrap.Tab.getOrCreateInstance(pillCatalogo).show();
  }
}
if (headerBtnCatalogoInvitado) headerBtnCatalogoInvitado.addEventListener("click", irAlCatalogo);

// ícono de libro del header (con sesión iniciada): para un socio abre el
// popup con los libros que tiene prestados (en vez de mostrar esa info
// suelta en cada tarjeta del catálogo); para administrador/bibliotecario,
// que no tienen préstamos propios, simplemente va al Catálogo
if (headerBtnCatalogoSesion) {
  headerBtnCatalogoSesion.addEventListener("click", function () {
    if (permisos.esGestion) irAlCatalogo();
    else abrirModalMisPrestamos();
  });
}

linkIrARegistro.addEventListener("click", function (e) { e.preventDefault(); abrirModalRegistro(); });
linkIrALogin.addEventListener("click", function (e) { e.preventDefault(); abrirModalLogin(); });

// menú de secciones en móvil: al elegir una pestaña, se actualiza el texto
// del botón hamburguesa y se cierra el menú desplegado
var navTabsCollapseEl = document.getElementById("nav-tabs-collapse");
var navbarTogglerTexto = document.getElementById("navbar-toggler-texto");
if (navTabsCollapseEl && navbarTogglerTexto) {
  var navTabsCollapse = new bootstrap.Collapse(navTabsCollapseEl, { toggle: false });
  var botonesTab = document.querySelectorAll("#nav-tabs .nav-link");
  for (var bt = 0; bt < botonesTab.length; bt++) {
    botonesTab[bt].addEventListener("click", function () {
      navbarTogglerTexto.textContent = this.textContent.trim();
      navTabsCollapse.hide();
    });
  }
}

// Catálogo público: desde el backend, /libros, /categorias y /ejemplares
// se pueden consultar sin haber iniciado sesión (ver routes/api.php), así
// que esto no depende de que haya una sesión de administrador ni de nadie
// más activa en el dispositivo. Antes esas rutas requerían sesión, así
// que si nadie estaba logueado (se cerró sesión, venció el token, etc.)
// el catálogo quedaba completamente vacío para cualquiera que mirara la
// pantalla, como si los libros se hubieran borrado.
function cargarCatalogoPublico() {
  return Promise.all([cargarLibrosApi(), cargarCategoriasApi()])
    .then(function () {
      actualizarSelectsCategoria();
      renderizarLibros();
    })
    .catch(mostrarErrorApi);
}

// ------------------------------
// Arranque de la app
// ------------------------------

instalarCamposPassword();
instalarCalendarios();

actualizarSelectsCategoria();
renderizarLibros();
renderizarReservas();
renderizarPrestamos();
renderizarSocios();
renderizarMultas();
actualizarUIAuth();

if (sesionActual && getToken()) {
  // validamos que el token siga siendo válido y refrescamos los datos del usuario
  apiFetch("/auth/me").then(function (usuario) {
    sesionActual = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol ? usuario.rol.nombre : null,
      socioId: usuario.socio ? usuario.socio.id : null
    };
    guardarSesion();
    actualizarUIAuth();
    return cargarTodoDesdeApi();
  }).then(function () {
    iniciarPollingActualizaciones();
  }).catch(function () {
    // el token quedó inválido/vencido: limpiamos la sesión, pero el
    // catálogo lo seguimos mostrando en modo invitado (ver comentario de
    // cargarCatalogoPublico), no lo dejamos en blanco
    cerrarSesionLocal();
    cargarCatalogoPublico();
    abrirModalLogin();
  });
} else {
  cargarCatalogoPublico();
  abrirModalLogin();
}
var buscadorMultasEl = document.getElementById("buscador-multas");
if (buscadorMultasEl) {
  buscadorMultasEl.addEventListener("input", function () {
    busquedaMultas = buscadorMultasEl.value;
    renderizarMultas();
  });
}

var filtroCategoriaMultasEl = document.getElementById("filtro-categoria-multas");
if (filtroCategoriaMultasEl) {
  filtroCategoriaMultasEl.addEventListener("change", function () {
    filtroCategoriaMultas = filtroCategoriaMultasEl.value;
    renderizarMultas();
  });
}

var filtroEstadoMultasEl = document.getElementById("filtro-estado-multas");
if (filtroEstadoMultasEl) {
  filtroEstadoMultasEl.addEventListener("change", function () {
    filtroEstadoMultas = filtroEstadoMultasEl.value;
    // si se piden solo pendientes, el método de pago no aplica
    if (filtroEstadoMultas === "pendiente") {
      filtroMetodoMultas = "";
      document.getElementById("filtro-metodo-multas").value = "";
    }
    renderizarMultas();
  });
}

var filtroMetodoMultasEl = document.getElementById("filtro-metodo-multas");
if (filtroMetodoMultasEl) {
  filtroMetodoMultasEl.addEventListener("change", function () {
    filtroMetodoMultas = filtroMetodoMultasEl.value;
    // elegir un método implica ver multas pagadas
    if (filtroMetodoMultas && filtroEstadoMultas === "pendiente") {
      filtroEstadoMultas = "";
      filtroEstadoMultasEl.value = "";
    }
    renderizarMultas();
  });
}
