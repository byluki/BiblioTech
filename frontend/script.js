// biblioteca central - script.js

// URL de la API (config.js). Si está vacía usa este mismo host en el puerto 8000
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
var prestarCedula = document.getElementById("prestar-cedula");
var prestarSocioEncontrado = document.getElementById("prestar-socio-encontrado");
var prestarNombreSocio = ""; // nombre del socio encontrado por la cédula
var prestarFechaHoy = document.getElementById("prestar-fecha-hoy");

var listaReservas = document.getElementById("lista-reservas");
var estadoVacioReservas = document.getElementById("estado-vacio-reservas");
// grupos que se dibujaron en Contabilidad (para "Aceptar todas")
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

// ===== Avisos =====
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

// ===== Confirmaciones =====
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

// ===== Botones =====
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

// ===== Contraseñas =====
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

var REGEX_TELEFONO = /^[0-9+\-\s()]{6,20}$/;

function telefonoValido(telefono) {
  return !telefono || REGEX_TELEFONO.test(telefono);
}

// en los campos de teléfono no se pueden escribir letras
document.addEventListener("input", function (e) {
  if (!e.target.classList || !e.target.classList.contains("campo-telefono")) return;
  var limpio = e.target.value.replace(/[^0-9+\-\s()]/g, "");
  if (limpio !== e.target.value) e.target.value = limpio;
});

function correoValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ===== Calendario (flatpickr) =====
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

// hoy en hora local (toISOString usa UTC)
function hoyIso() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// ===== API =====

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

  // si el servidor no contesta en 20 s se corta el pedido
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
        // token vencido: se cierra la sesión (en el login un 401 es solo clave mal)
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

// las respuestas paginadas traen {data: [...]}, las otras un array
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
  // las fechas sin hora se leen como fecha local (no UTC)
  var texto = String(valor);
  var soloFecha = /^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.0+)?Z)?$/.exec(texto);
  if (soloFecha) return soloFecha[3] + "/" + soloFecha[2] + "/" + soloFecha[1];
  return formatearFecha(new Date(texto));
}

// copias que cuentan (no las extraviadas ni fuera de circulación)
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

// el libro está Disponible si queda al menos una copia libre
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

function mapLibro(l) {
  return aplicarCopias({
    id: String(l.id),
    titulo: l.titulo,
    autor: l.autor,
    categoria: l.categoria ? l.categoria.nombre : "Sin categoría",
    categoriaId: l.categoria_id || (l.categoria ? l.categoria.id : null),
    portada: l.foto_portada || null,
    codigoBarras: l.isbn || null,
    descripcion: l.descripcion || "",
    creadoEn: l.created_at ? new Date(l.created_at).getTime() : 0
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
    cedula: r.socio && String(r.socio.cedula || "").indexOf("PENDIENTE-") !== 0 ? (r.socio.cedula || "") : "",
    // "pendiente_retiro": ya tiene una copia apartada; "pendiente": en espera
    estado: r.estado || "",
    ejemplarId: r.ejemplar_id ? String(r.ejemplar_id) : null,
    fechaIso: r.fecha_reserva ? String(r.fecha_reserva).slice(0, 10) : "",
    fechaLimite: fechaDesdeApi(r.fecha_limite),
    fechaLimiteIso: r.fecha_limite ? String(r.fecha_limite).slice(0, 10) : ""
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
    fechaVencimiento: fechaDesdeApi(p.fecha_vencimiento),
    observaciones: p.observaciones || ""
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
    monto: Number(m.monto) || 0,
    montoPagado: Number(m.monto_pagado) || 0,
    saldo: m.saldo !== undefined ? Number(m.saldo) : Math.max(0, (Number(m.monto) || 0) - (Number(m.monto_pagado) || 0)),
    fecha: fechaDesdeApi(m.fecha) || "",
    pagada: m.estado === "pagada",
    metodoPago: m.metodo_pago || "",
    metodoPagoTexto: METODO_PAGO_LABEL[m.metodo_pago] || "",
    fechaPago: fechaDesdeApi(m.fecha_pago) || ""
  };
}

// ===== Carga de datos desde la API =====

function cargarEjemplaresApi() {
  return apiFetch("/ejemplares?per_page=5000").then(function (resp) {
    ejemplaresPorLibro = {};
    extraerDatos(resp).forEach(function (ej) {
      var clave = String(ej.libro_id);
      (ejemplaresPorLibro[clave] = ejemplaresPorLibro[clave] || []).push({ id: ej.id, estado: ej.estado });
    });
  }).catch(function (err) {
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

// primero las listas para retirar (plazo más cercano), después las en espera
function compararReservas(a, b) {
  var la = a.estado === "pendiente_retiro" ? 0 : 1;
  var lb = b.estado === "pendiente_retiro" ? 0 : 1;
  if (la !== lb) return la - lb;
  var fa = la === 0 ? (a.fechaLimiteIso || "9999") : a.fechaIso;
  var fb = lb === 0 ? (b.fechaLimiteIso || "9999") : b.fechaIso;
  if (fa !== fb) return fa < fb ? -1 : 1;
  return Number(a.id) - Number(b.id);
}

function cargarReservasApi() {
  return apiFetch("/reservas?per_page=500").then(function (resp) {
    reservas = extraerDatos(resp)
      .filter(function (r) { return r.estado === "pendiente" || r.estado === "pendiente_retiro"; })
      .map(mapReserva)
      .sort(compararReservas);
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

// un socio no puede listar socios (403)
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
  // los pedidos no dependen entre sí: se hacen en paralelo
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

// ===== Actualización en segundo plano (polling) =====
// Mientras haya sesión, cada cierto tiempo se piden los datos de nuevo
// para ver los cambios hechos desde otras computadoras.
var INTERVALO_POLLING_MS = 30000; // 30s: antes 8s, saturaba al servidor y volvía lenta la web
var idIntervaloPolling = null;
var pollingEnCurso = false; // evita que se apilen pedidos si el servidor está lento

// firma de los datos en pantalla: si no cambió nada, no se repinta
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
  // no actualizar con un modal abierto
  if (document.querySelector(".modal.show")) return;
  // si el pedido anterior todavía no terminó, no mandamos otro encima
  if (pollingEnCurso) return;
  pollingEnCurso = true;

  var antes = firmaDatosActuales();

  // los libros no se vuelven a pedir (las portadas pesan), solo los ejemplares
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

// al volver a la pestaña se actualiza enseguida
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

// ===== Socios =====

function buscarSocioLocalPorId(id) {
  var listas = [sociosPagina, socios];
  for (var l = 0; l < listas.length; l++) {
    for (var i = 0; i < listas[l].length; i++) {
      if (listas[l][i].id === id) return listas[l][i];
    }
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

// busca un socio registrado por nombre (al reservar, prestar o multar)
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

// Socios registrados: de a 10, paginado y buscado en el servidor
var SOCIOS_POR_PAGINA = 10;
var paginaSocios = 1;
var busquedaSocios = "";
var sociosPagina = [];
var pedidoSocios = 0;

function htmlSocio(socio) {
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
  // el cambio de tipo (particular / centro educativo) es solo del administrador
  var botonCambiarTipoHtml = permisos.esAdmin
    ? '<button class="btn-accion-libro" title="' + (esCentroEducativo ? "Cambiar a particular" : "Cambiar a centro educativo") + '" data-accion="cambiar-tipo-socio" data-id="' + socio.id + '"><i class="fa-solid fa-' + (esCentroEducativo ? "user" : "school") + '"></i></button>'
    : "";
  return '<div class="flex-grow-1"><h3>' + escapeHtml(socio.apellidos ? socio.apellidos.toUpperCase() + ", " + socio.nombres : socio.nombres) + "</h3>" +
    '<div class="mb-2 small text-muted">' + datosSocioHtml(socio) + "</div>" +
    '<span class="etiqueta etiqueta-tipo me-2">' + escapeHtml(socio.tipo) + "</span>" +
    etiquetaVerificacionHtml +
    '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(socio.estado) + "</span></div>" +
    '<button class="btn-accion-libro" title="Editar datos" data-accion="editar-socio" data-id="' + socio.id + '"><i class="fa-solid fa-pen"></i></button>' +
    botonCambiarTipoHtml +
    botonVerificarHtml +
    '<button class="btn-accion-libro" title="Cambiar estado" data-accion="toggle-estado-socio" data-id="' + socio.id + '"><i class="fa-solid fa-rotate"></i></button>' +
    '<button class="btn-accion-libro" title="Eliminar socio" data-accion="eliminar-socio" data-id="' + socio.id + '"><i class="fa-solid fa-trash"></i></button>';
}

// botones de páginas: « 1 2 3 »; se usa para socios y para el catálogo
function renderizarPaginador(nav, pagina, totalPaginas, alElegir) {
  if (!nav) return;
  if (totalPaginas <= 1) { nav.innerHTML = ""; return; }
  var botones = [];
  function boton(n, texto, etiqueta, activo, deshabilitado) {
    return '<button type="button" class="paginador-btn' + (activo ? " activo" : "") + '" data-pagina="' + n + '"' +
      (deshabilitado ? " disabled" : "") + (activo ? ' aria-current="page"' : "") + ' aria-label="' + etiqueta + '">' + texto + "</button>";
  }
  botones.push(boton(pagina - 1, '<i class="fa-solid fa-chevron-left"></i>', "Página anterior", false, pagina <= 1));
  for (var n = 1; n <= totalPaginas; n++) {
    // con muchas páginas se muestran la primera, la última y las cercanas
    if (totalPaginas > 7 && n !== 1 && n !== totalPaginas && Math.abs(n - pagina) > 1) {
      if (botones[botones.length - 1].indexOf("paginador-puntos") === -1) botones.push('<span class="paginador-puntos">…</span>');
      continue;
    }
    botones.push(boton(n, n, "Página " + n, n === pagina, false));
  }
  botones.push(boton(pagina + 1, '<i class="fa-solid fa-chevron-right"></i>', "Página siguiente", false, pagina >= totalPaginas));
  nav.innerHTML = botones.join("");
  nav.onclick = function (e) {
    var b = e.target.closest(".paginador-btn");
    if (!b || b.disabled) return;
    alElegir(parseInt(b.dataset.pagina, 10));
  };
}

function cargarPaginaSocios(pagina) {
  if (!sesionActual || !permisos.esGestion) {
    sociosPagina = [];
    listaSocios.innerHTML = "";
    return Promise.resolve();
  }
  paginaSocios = pagina || 1;
  var numeroPedido = ++pedidoSocios;
  var url = "/socios?per_page=" + SOCIOS_POR_PAGINA + "&page=" + paginaSocios +
    (busquedaSocios ? "&buscar=" + encodeURIComponent(busquedaSocios) : "");
  return apiFetch(url).then(function (resp) {
    if (numeroPedido !== pedidoSocios) return; // llegó tarde: ya se pidió otra búsqueda
    sociosPagina = extraerDatos(resp).map(mapSocio);
    var ultima = resp && resp.last_page ? resp.last_page : 1;
    if (paginaSocios > ultima && ultima >= 1 && sociosPagina.length === 0 && paginaSocios !== 1) {
      return cargarPaginaSocios(ultima); // se borró el último de la página
    }
    listaSocios.innerHTML = sociosPagina.map(function (s) { return '<li class="reserva-item">' + htmlSocio(s) + "</li>"; }).join("");
    estadoVacioSocios.classList.toggle("d-none", sociosPagina.length > 0);
    document.getElementById("texto-vacio-socios").textContent = busquedaSocios
      ? "No hay socios con esa cédula o nombre."
      : "Todavía no hay socios registrados.";
    renderizarPaginador(document.getElementById("paginador-socios"), paginaSocios, ultima, function (n) {
      cargarPaginaSocios(n).then(function () { listaSocios.scrollIntoView({ behavior: "smooth", block: "start" }); });
    });
  }).catch(mostrarErrorApi);
}

function renderizarSocios() {
  actualizarDatalistSocios();
  cargarPaginaSocios(paginaSocios);
}

var temporizadorBusquedaSocios = null;
document.getElementById("buscador-socios").addEventListener("input", function (e) {
  clearTimeout(temporizadorBusquedaSocios);
  var valor = e.target.value.trim();
  temporizadorBusquedaSocios = setTimeout(function () {
    busquedaSocios = valor;
    cargarPaginaSocios(1);
  }, 300);
});

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
  if (!telefonoValido(socioTelefonoInput.value.trim())) {
    avisarError("El teléfono tiene que tener entre 6 y 20 números.");
    socioTelefonoInput.focus();
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
    var pedirConfirmacion = nuevoValorVerificado
      ? confirmarVerificacionEscolar(socio)
      : confirmar("¿Quitar la verificación de centro educativo a " + socio.nombre + "? Va a poder tener una sola reserva activa.", "Quitar verificación", true);
    pedirConfirmacion.then(function (ok) {
      if (!ok) return;
      return conCarga(boton, apiFetch("/socios/" + socio.id + "/verificar-educativo", { method: "PATCH", body: { verificado: nuevoValorVerificado } })
      .then(function () {
        registrarHistorial(
          (nuevoValorVerificado ? "Se verificó" : "Se quitó la verificación de") + " a " + socio.nombre + " como centro educativo.",
          "socios", socio.nombre
        );
        if (nuevoValorVerificado) avisarOk(socio.nombre + " ahora es una cuenta de centro educativo.");
        return cargarSociosApi();
      }))
      .then(renderizarSocios);
    }).catch(mostrarErrorApi);
  }
});

// confirmación al pasar una cuenta a centro educativo
var modalVerificarEscolarEl = document.getElementById("modal-verificar-escolar");
var modalVerificarEscolar = new bootstrap.Modal(modalVerificarEscolarEl);
var resolverVerificacionEscolar = null;

function confirmarVerificacionEscolar(socio) {
  document.getElementById("verificar-escolar-nombre").textContent = socio.nombre;
  var check = document.getElementById("verificar-escolar-check");
  check.checked = false;
  document.getElementById("verificar-escolar-confirmar").disabled = true;
  return new Promise(function (resolve) {
    resolverVerificacionEscolar = resolve;
    modalVerificarEscolar.show();
  });
}

document.getElementById("verificar-escolar-check").addEventListener("change", function (e) {
  document.getElementById("verificar-escolar-confirmar").disabled = !e.target.checked;
});
document.getElementById("verificar-escolar-confirmar").addEventListener("click", function () {
  var resolver = resolverVerificacionEscolar;
  resolverVerificacionEscolar = null;
  modalVerificarEscolar.hide();
  if (resolver) resolver(true);
});
modalVerificarEscolarEl.addEventListener("hidden.bs.modal", function () {
  if (resolverVerificacionEscolar) { resolverVerificacionEscolar(false); resolverVerificacionEscolar = null; }
});

// ===== Multas =====

function buscarMultaLocalPorId(id) {
  var listas = [multasBusqueda || [], multas];
  for (var l = 0; l < listas.length; l++) {
    for (var i = 0; i < listas[l].length; i++) {
      if (listas[l][i].id === id) return listas[l][i];
    }
  }
  return null;
}

var MONTO_MAXIMO_MULTA = 10000;
var busquedaMultas = "";
var multasBusqueda = null; // resultado del backend cuando hay algo escrito en el buscador
var pedidoMultas = 0;
var resumenMultasEl = document.getElementById("resumen-multas");
var modalPagarMulta = new bootstrap.Modal(document.getElementById("modal-pagar-multa"));
var formPagarMulta = document.getElementById("form-pagar-multa");

// el buscador consulta al backend (GET /multas?buscar=...) por nombre o cédula
function buscarMultasApi() {
  var texto = busquedaMultas.trim();
  if (!texto) {
    multasBusqueda = null;
    renderizarMultas();
    return Promise.resolve();
  }
  var numeroPedido = ++pedidoMultas;
  return apiFetch("/multas?per_page=200&buscar=" + encodeURIComponent(texto)).then(function (resp) {
    if (numeroPedido !== pedidoMultas) return;
    multasBusqueda = extraerDatos(resp).map(mapMulta);
    renderizarMultas();
  }).catch(mostrarErrorApi);
}

function renderizarResumenMultas(visibles) {
  if (!resumenMultasEl) return;
  if (!busquedaMultas.trim() || !visibles.length) {
    resumenMultasEl.classList.add("d-none");
    resumenMultasEl.innerHTML = "";
    return;
  }
  var pendiente = 0;
  var pagado = 0;
  var personas = {};
  visibles.forEach(function (m) {
    pendiente += m.saldo;
    pagado += m.montoPagado;
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
  var visibles = multasBusqueda || multas;
  estadoVacioMultas.classList.toggle("d-none", visibles.length > 0);
  var textoVacio = estadoVacioMultas.querySelector("p");
  if (textoVacio) textoVacio.textContent = multasBusqueda ? "Ese socio no tiene multas. Probá con otro nombre o cédula." : "No hay multas registradas.";
  renderizarResumenMultas(visibles);

  for (var i = 0; i < visibles.length; i++) {
    var multa = visibles[i];
    var claseEstado = multa.pagada ? "estado-disponible" : "estado-prestado";
    var textoEstado = multa.pagada ? "Pagada" : (multa.montoPagado > 0 ? "Pago parcial" : "Pendiente");
    var detallePago = "";
    if (multa.pagada) {
      detallePago = '<p class="mb-0 small detalle-pago"><i class="fa-solid fa-receipt me-1" aria-hidden="true"></i>' +
        (multa.fechaPago ? "Pagada el " + multa.fechaPago : "Pagada") +
        (multa.metodoPagoTexto ? ". Método: " + escapeHtml(multa.metodoPagoTexto) : "") + "</p>";
    } else if (multa.montoPagado > 0) {
      detallePago = '<p class="mb-0 small detalle-pago-parcial">Pagó ' + formatearMonto(multa.montoPagado) + ", falta " + formatearMonto(multa.saldo) + "</p>";
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

// después de registrar, pagar o borrar: se recarga todo y la búsqueda actual
function recargarMultas() {
  return cargarMultasApi().then(function () {
    return busquedaMultas.trim() ? buscarMultasApi() : renderizarMultas();
  });
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
  if (monto > MONTO_MAXIMO_MULTA) {
    avisarError("El monto máximo de una multa es " + formatearMonto(MONTO_MAXIMO_MULTA) + ".");
    multaMontoInput.focus();
    return;
  }

  conCarga(botonEnviar(formMulta), buscarSocioRegistrado(nombreSocio)
    .then(function (socio) {
      return apiFetch("/multas", { method: "POST", body: { socio_id: socio.id, motivo: motivoApi, monto: monto } });
    })
    .then(function () {
      registrarHistorial("Se registró una multa de " + formatearMonto(monto) + " a " + nombreSocio + " (" + motivoDisplay + ").", "facturas", nombreSocio);
      return recargarMultas();
    }))
    .then(function () {
      formMulta.reset();
      avisarOk("Multa registrada.");
    })
    .catch(mostrarErrorApi);
});

function abrirModalPagarMulta(multa) {
  document.getElementById("pagar-multa-id").value = multa.id;
  document.getElementById("pagar-multa-metodo").value = "";
  var campoMonto = document.getElementById("pagar-multa-monto");
  campoMonto.value = Math.round(multa.saldo);
  campoMonto.max = multa.saldo;
  document.getElementById("pagar-multa-ayuda").textContent = multa.montoPagado > 0
    ? "Ya pagó " + formatearMonto(multa.montoPagado) + ". Falta " + formatearMonto(multa.saldo) + ". Si paga menos, queda como pago parcial."
    : "Debe " + formatearMonto(multa.saldo) + ". Si paga menos, queda como pago parcial.";
  document.getElementById("pagar-multa-detalle").innerHTML =
    "<div><dt>Socio</dt><dd>" + escapeHtml(multa.socio) + "</dd></div>" +
    "<div><dt>Motivo</dt><dd>" + escapeHtml(multa.motivo) + "</dd></div>" +
    "<div><dt>Monto</dt><dd>" + formatearMonto(multa.monto) + "</dd></div>";
  modalPagarMulta.show();
}

document.getElementById("modal-pagar-multa").addEventListener("shown.bs.modal", function () {
  var campo = document.getElementById("pagar-multa-monto");
  campo.focus();
  campo.select();
});

formPagarMulta.addEventListener("submit", function (e) {
  e.preventDefault();
  var multa = buscarMultaLocalPorId(document.getElementById("pagar-multa-id").value);
  var metodo = document.getElementById("pagar-multa-metodo").value;
  var monto = Number(document.getElementById("pagar-multa-monto").value);
  if (!multa) return;
  if (!(monto > 0)) {
    avisarError("Ingresá el monto que se paga.");
    document.getElementById("pagar-multa-monto").focus();
    return;
  }
  if (monto > multa.saldo) {
    avisarError("El monto no puede ser mayor a lo que se debe (" + formatearMonto(multa.saldo) + ").");
    document.getElementById("pagar-multa-monto").focus();
    return;
  }
  if (!metodo) {
    avisarError("Elegí el método de pago.");
    document.getElementById("pagar-multa-metodo").focus();
    return;
  }
  var completa = monto >= multa.saldo;
  conCarga(botonEnviar(formPagarMulta), apiFetch("/multas/" + multa.id + "/pago", { method: "POST", body: { monto: monto, metodo_pago: metodo } })
    .then(function () {
      registrarHistorial("Se registró un pago de " + formatearMonto(monto) + " de la multa de " + multa.socio + " (" + METODO_PAGO_LABEL[metodo] + ").", "facturas", multa.socio);
      return recargarMultas();
    }))
    .then(function () {
      modalPagarMulta.hide();
      avisarOk(completa ? "Multa pagada." : "Pago parcial registrado. Falta " + formatearMonto(multa.saldo - monto) + ".");
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
          return recargarMultas();
        }));
    }).catch(mostrarErrorApi);
  }
});

// ===== Historial y reportes =====

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

// al elegir una sección se cierra el menú lateral
Array.prototype.forEach.call(document.querySelectorAll('#menu-nav-tabs [data-bs-toggle="pill"]'), function (boton) {
  boton.addEventListener("click", function () {
    var menu = bootstrap.Offcanvas.getInstance(document.getElementById("menu-offcanvas"));
    if (menu) menu.hide();
  });
});

var tabBtnReportes = document.getElementById("menu-tab-btn-reportes");
if (tabBtnReportes) tabBtnReportes.addEventListener("shown.bs.tab", renderizarReportes);

// ===== Categorías =====

function todasLasCategorias() {
  return categoriasApi.map(function (c) { return c.nombre; });
}

// si se eligió "Otro", crea la categoría nueva
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
    // si todavía no había categorías, no se deja "Otro" elegido
    var habiaCategorias = conf.select.options.length > (conf.incluirOtro ? 1 : 0) + (conf.incluirTodas ? 1 : 0);
    conf.select.innerHTML = construirOpcionesCategoria(conf.incluirTodas, conf.incluirOtro);
    var existeValor = Array.prototype.some.call(conf.select.options, function (o) { return o.value === valorActual; });
    if (existeValor && (valorActual !== "Otro" || habiaCategorias)) conf.select.value = valorActual;
  });

  actualizarVisibilidadNuevaCategoria(inputCategoria, grupoNuevaCategoria, inputNuevaCategoria);
  actualizarVisibilidadNuevaCategoria(editarCategoria, grupoEditarNuevaCategoria, inputEditarNuevaCategoria);
  renderizarCategoriasInicio();
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

// ===== Buscar libro por código de barras / ISBN =====

// el lector de código de barras escribe el número y manda Enter
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

var LIBROS_POR_PAGINA = 50;
var paginaCatalogo = 1;
var ultimaFirmaFiltro = "";

function renderizarLibros() {
  var todosFiltrados = librosFiltrados();
  // si cambió la búsqueda o la categoría, se vuelve a la primera página
  var firmaFiltro = filtroCategoria.value + "|" + inputBuscar.value.trim();
  if (firmaFiltro !== ultimaFirmaFiltro) { paginaCatalogo = 1; ultimaFirmaFiltro = firmaFiltro; }
  var totalPaginas = Math.max(1, Math.ceil(todosFiltrados.length / LIBROS_POR_PAGINA));
  if (paginaCatalogo > totalPaginas) paginaCatalogo = totalPaginas;
  var filtrados = todosFiltrados.slice((paginaCatalogo - 1) * LIBROS_POR_PAGINA, paginaCatalogo * LIBROS_POR_PAGINA);
  renderizarPaginador(document.getElementById("paginador-libros"), paginaCatalogo, totalPaginas, function (n) {
    paginaCatalogo = n;
    renderizarLibros();
    irAlListado();
  });
  estadoVacio.classList.toggle("d-none", filtrados.length > 0);
  var textoContador = libros.length + " " + (libros.length === 1 ? "libro" : "libros");
  if (contador.textContent !== textoContador) contador.textContent = textoContador;
  if (contadorLibrosHeader) contadorLibrosHeader.textContent = libros.length;
  actualizarContadorLibrosHeaderSesion();

  var tarjetas = [];

  for (var i = 0; i < filtrados.length; i++) {
    var libro = filtrados[i];
    // el src de la portada se pone después (puede ser un base64 enorme)
    var portadaContenidoHtml = libro.portada
      ? '<img class="libro-portada" alt="Portada de ' + escapeHtml(libro.titulo) + '" loading="lazy" decoding="async" width="200" height="300">'
      : '<div class="libro-portada libro-portada-vacia tono-' + ((parseInt(libro.id, 10) || 0) % 5) + '"><span>' + escapeHtml(libro.titulo) + '</span><small>' + escapeHtml(libro.autor) + "</small></div>";

    // menú Editar / Eliminar (solo administrador)
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
        accionesEstadoHtml = permisos.esGestion
          ? '<button class="btn-accion-libro btn-accion-libro-full" title="Prestar una copia" data-accion="prestar" data-id="' + libro.id + '"><i class="fa-solid fa-right-from-bracket"></i> Prestar</button>'
          : htmlBotonAgregar(libro);
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

    // sin botones no se muestra la barra de acciones; con 3 quedan solo íconos
    var compactas = (accionesEstadoHtml.match(/<button/g) || []).length >= 3;
    var accionesLibroHtml = accionesEstadoHtml ? '<div class="acciones-libro' + (compactas ? " acciones-compactas" : "") + '">' + accionesEstadoHtml + "</div>" : "";

    tarjetas.push({
      libro: libro,
      firmaPortada: firmaPortada(libro),
      html:
      portadaHtml +
      '<div class="libro-info flex-grow-1"><h3><button type="button" class="titulo-libro-btn" title="Ver ficha de ' + escapeHtml(libro.titulo) + '">' + escapeHtml(libro.titulo) + "</button></h3>" +
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

// actualiza la grilla tocando solo las tarjetas que cambiaron
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
    : '<div class="libro-portada libro-portada-vacia tono-' + ((parseInt(libro.id, 10) || 0) % 5) + '"><span>' + escapeHtml(libro.titulo) + '</span><small>' + escapeHtml(libro.autor) + "</small></div>";
}

// ===== Carrito =====

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
  renderizarAccionesDetalle();
}

function htmlBotonAgregar(libro) {
  if (permisos.esGestion) return ""; // la gestión presta directo, sin carrito
  if (enCarrito(libro.id)) {
    return '<button type="button" class="btn-agregar-carrito en-carrito" data-id="' + libro.id + '" title="Quitar del carrito"><i class="fa-solid fa-check"></i> <span class="texto-boton">Agregado</span></button>';
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
  var respuestasReservas = [];

  conCarga(boton, obtenerSocio.then(function (socio) {
    // de a uno: el servidor valida el límite de reservas en cada pedido
    return ids.reduce(function (cadena, id) {
      return cadena.then(function () {
        return apiFetch("/reservas", { method: "POST", body: { socio_id: socio.id, libro_id: id, fecha_deseada: fecha } })
          .then(function (r) { reservados.push(id); if (r) respuestasReservas.push(r); })
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
      var panelCarrito = bootstrap.Offcanvas.getInstance(document.getElementById("carrito-offcanvas"));
      if (panelCarrito) panelCarrito.hide();
      avisarRetiroEnLocal(respuestasReservas);
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

// ===== Novedades =====

function renderizarNovedades() {
  var contenedor = document.getElementById("lista-novedades");
  var seccion = document.getElementById("seccion-novedades");
  if (!contenedor || !seccion) return;

  var haceUnaSemana = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var recientes = permisos.esGestion ? [] : libros.filter(function (l) { return l.creadoEn >= haceUnaSemana; })
    .sort(function (a, b) { return b.creadoEn - a.creadoEn; })
    .slice(0, 10);

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
        '<p class="novedad-titulo"><button type="button" class="titulo-libro-btn" title="Ver ficha de ' + escapeHtml(libro.titulo) + '">' + escapeHtml(libro.titulo) + "</button></p>" +
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

// ===== Ficha del libro =====
var modalDetalleEl = document.getElementById("modal-detalle-libro");
var modalDetalle = new bootstrap.Modal(modalDetalleEl);
var detalleLibroId = null;
var cacheDescripciones = {}; // libroId -> Promise<{texto, fuente, enlace}>
var LARGO_DESCRIPCION = 420; // caracteres de la versión breve

// HTML a texto plano (DOMParser no ejecuta scripts)
function htmlATexto(html) {
  var doc = new DOMParser().parseFromString("<body>" + String(html || "").replace(/<br\s*\/?>|<\/p>/gi, "$& ") + "</body>", "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

// recorta en el final de una oración (o de una palabra) cerca del límite
function recortarTexto(texto, limite) {
  if (texto.length <= limite) return { breve: texto, recortado: false };
  var corte = texto.slice(0, limite);
  var finOracion = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("? "), corte.lastIndexOf("! "));
  if (finOracion > limite * 0.5) return { breve: corte.slice(0, finOracion + 1), recortado: true };
  return { breve: corte.slice(0, corte.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…", recortado: true };
}

function pedirJson(url) {
  var controlador = typeof AbortController !== "undefined" ? new AbortController() : null;
  var t = controlador ? setTimeout(function () { controlador.abort(); }, 8000) : null;
  return fetch(url, { signal: controlador ? controlador.signal : undefined })
    .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}

function normalizarComparar(t) { return normalizarBusqueda(t).replace(/[^a-z0-9 ]/g, ""); }

function descripcionGoogleBooks(libro, soloEspanol) {
  var isbn = (libro.codigoBarras || "").replace(/[^0-9Xx]/g, "");
  var consulta = isbn.length >= 10
    ? "isbn:" + isbn
    : 'intitle:"' + libro.titulo + '"' + (libro.autor ? ' inauthor:"' + libro.autor.split(",")[0].trim() + '"' : "");
  var url = "https://www.googleapis.com/books/v1/volumes?maxResults=5&printType=books&q=" + encodeURIComponent(consulta) +
    (soloEspanol ? "&langRestrict=es" : "");
  return pedirJson(url).then(function (datos) {
    var items = (datos && datos.items) || [];
    var tituloBuscado = normalizarComparar(libro.titulo);
    // el primero con descripción cuyo título se parezca al nuestro
    for (var i = 0; i < items.length; i++) {
      var info = items[i].volumeInfo || {};
      if (!info.description) continue;
      var titulo = normalizarComparar(info.title || "");
      if (isbn.length >= 10 || titulo.indexOf(tituloBuscado) !== -1 || tituloBuscado.indexOf(titulo) !== -1) {
        return { texto: htmlATexto(info.description), fuente: "Google Books", enlace: info.infoLink || null };
      }
    }
    return null;
  });
}

function descripcionOpenLibrary(libro) {
  var url = "https://openlibrary.org/search.json?limit=1&fields=key&title=" + encodeURIComponent(libro.titulo) +
    (libro.autor ? "&author=" + encodeURIComponent(libro.autor) : "");
  return pedirJson(url).then(function (datos) {
    var doc = datos && datos.docs && datos.docs[0];
    if (!doc || !doc.key) return null;
    return pedirJson("https://openlibrary.org" + doc.key + ".json").then(function (obra) {
      var d = obra && obra.description;
      var texto = typeof d === "string" ? d : (d && d.value) || "";
      // Open Library suele agregar notas de fuente o enlaces al final
      texto = texto.split(/\n-{3,}|\(\[source\]|\[source\]/i)[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      return texto ? { texto: htmlATexto(texto), fuente: "Open Library", enlace: "https://openlibrary.org" + doc.key } : null;
    });
  });
}

// Google Books (primero en español) y, si no hay, Open Library
function buscarDescripcionExterna(libro) {
  var nada = function () { return null; };
  return descripcionGoogleBooks(libro, true).catch(nada)
    .then(function (r) { return r || descripcionGoogleBooks(libro, false).catch(nada); })
    .then(function (r) { return r || descripcionOpenLibrary(libro).catch(nada); });
}

function obtenerDescripcion(libro) {
  if (libro.descripcion) {
    return Promise.resolve({ texto: htmlATexto(libro.descripcion), fuente: null, enlace: null });
  }
  if (!cacheDescripciones[libro.id]) {
    cacheDescripciones[libro.id] = buscarDescripcionExterna(libro)
      .then(function (r) {
        if (!r) delete cacheDescripciones[libro.id]; // reintentar la próxima vez
        return r;
      });
  }
  return cacheDescripciones[libro.id];
}

function renderizarAccionesDetalle() {
  if (!detalleLibroId) return; // la ficha está cerrada
  var libro = buscarLibroPorId(detalleLibroId);
  var cont = document.getElementById("detalle-acciones");
  if (!libro || !cont) return;
  var socioPropio = miSocioId();
  var miReserva = socioPropio ? reservasDeLibro(libro.id).filter(function (r) { return r.socioId === socioPropio; })[0] : null;
  if (miReserva) {
    cont.innerHTML = '<p class="mb-0 texto-reserva">' + (miReserva.estado === "pendiente" ? "Estás en espera de una copia." : "Ya lo reservaste el " + escapeHtml(miReserva.fecha) + ".") + "</p>";
  } else if (libro.disponibles > 0) {
    cont.innerHTML = htmlBotonAgregar(libro);
  } else {
    cont.innerHTML = '<p class="mb-0 texto-reserva">No hay copias libres en este momento.</p>';
  }
  if (permisos.esAdmin) {
    cont.innerHTML += '<button type="button" class="btn btn-link btn-sm btn-editar-ficha" data-id="' + libro.id + '"><i class="fa-solid fa-pen me-1"></i>' +
      (libro.descripcion ? "Editar descripción" : "Escribir descripción") + "</button>";
  }
}

// desde la ficha: se cierra y se abre "Editar libro" con el foco en la descripción
document.getElementById("detalle-acciones").addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-editar-ficha");
  if (!boton) return;
  var id = boton.dataset.id;
  modalDetalleEl.addEventListener("hidden.bs.modal", function abrir() {
    modalDetalleEl.removeEventListener("hidden.bs.modal", abrir);
    abrirModalEditar(id);
    document.getElementById("modal-editar").addEventListener("shown.bs.modal", function enfocar() {
      document.getElementById("modal-editar").removeEventListener("shown.bs.modal", enfocar);
      var campo = document.getElementById("editar-descripcion");
      campo.scrollIntoView({ block: "center" });
      campo.focus();
    });
  });
  modalDetalle.hide();
});

function abrirDetalleLibro(libroId) {
  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  detalleLibroId = libro.id;

  var portada = document.getElementById("detalle-portada");
  portada.innerHTML = htmlPortadaLibro(libro);
  var img = portada.querySelector("img");
  if (img) { img.src = libro.portada; img.loading = "eager"; }

  document.getElementById("detalle-titulo").textContent = libro.titulo;
  document.getElementById("detalle-autor").textContent = libro.autor;
  var claseEstado = libro.estado === "Disponible" ? "estado-disponible" : (libro.estado === "Reservado" ? "estado-reservado" : "estado-prestado");
  document.getElementById("detalle-datos").innerHTML =
    '<span class="etiqueta">' + escapeHtml(libro.categoria) + "</span>" +
    '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(libro.estado) + "</span>" +
    (libro.copias > 1 ? '<span class="texto-copias">' + libro.disponibles + " de " + libro.copias + " copias libres</span>" : "") +
    (libro.codigoBarras ? '<span class="texto-codigo-barras"><i class="fa-solid fa-barcode me-1"></i>' + escapeHtml(libro.codigoBarras) + "</span>" : "");

  var desc = document.getElementById("detalle-descripcion");
  var fuente = document.getElementById("detalle-fuente");
  desc.className = "detalle-descripcion cargando-texto";
  desc.innerHTML = '<span class="linea"></span><span class="linea"></span><span class="linea corta"></span><span class="visually-hidden">Buscando descripción…</span>';
  fuente.textContent = "";

  renderizarAccionesDetalle();
  modalDetalle.show();

  var idPedido = libro.id;
  obtenerDescripcion(libro).then(function (r) {
    if (detalleLibroId !== idPedido) return; // ya se abrió otro libro
    desc.className = "detalle-descripcion";
    if (!r || !r.texto) {
      desc.innerHTML = '<p class="detalle-sin-descripcion">Todavía no tenemos una descripción de este libro. Podés preguntar por él en el mostrador.</p>';
      return;
    }
    var partes = recortarTexto(r.texto, LARGO_DESCRIPCION);
    desc.innerHTML = '<p></p>' + (partes.recortado ? '<button type="button" class="btn-leer-mas" aria-expanded="false">Leer más</button>' : "");
    desc.querySelector("p").textContent = partes.breve;
    var leerMas = desc.querySelector(".btn-leer-mas");
    if (leerMas) {
      leerMas.addEventListener("click", function () {
        var abierto = leerMas.getAttribute("aria-expanded") === "true";
        desc.querySelector("p").textContent = abierto ? partes.breve : r.texto;
        leerMas.textContent = abierto ? "Leer más" : "Leer menos";
        leerMas.setAttribute("aria-expanded", String(!abierto));
      });
    }
    if (r.fuente) {
      fuente.innerHTML = "Descripción: " + (r.enlace
        ? '<a href="' + escapeHtml(r.enlace) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(r.fuente) + "</a>"
        : escapeHtml(r.fuente));
    }
  });
}

modalDetalleEl.addEventListener("hidden.bs.modal", function () { detalleLibroId = null; });

// portada o título de cualquier tarjeta (catálogo o estante) abre la ficha
document.addEventListener("click", function (e) {
  var disparador = e.target.closest(".libro-portada, .titulo-libro-btn");
  if (!disparador) return;
  var tarjeta = disparador.closest(".libro-item, .novedad-item");
  if (!tarjeta || !tarjeta.dataset.id) return;
  abrirDetalleLibro(tarjeta.dataset.id);
});

// ===== Descripción del libro =====
function actualizarContadoresDescripcion() {
  Array.prototype.forEach.call(document.querySelectorAll(".contador-descripcion"), function (c) {
    var campo = document.getElementById(c.dataset.para);
    if (campo) c.textContent = campo.value.length + " / " + campo.maxLength;
  });
}

Array.prototype.forEach.call(document.querySelectorAll(".campo-descripcion"), function (campo) {
  campo.addEventListener("input", actualizarContadoresDescripcion);
});

// botón "Traer de internet"
document.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-traer-descripcion");
  if (!boton) return;
  var campo = document.getElementById(boton.dataset.para);
  var enEdicion = boton.dataset.para === "editar-descripcion";
  var titulo = (enEdicion ? editarTitulo : inputTitulo).value.trim();
  var autor = (enEdicion ? editarAutor : document.getElementById("autor")).value.trim();
  var isbn = (enEdicion ? editarCodigoBarras : inputCodigoBarras).value.trim();
  if (!titulo) {
    avisarError("Escribí el título del libro antes de buscar la descripción.");
    return;
  }
  if (campo.value.trim()) {
    avisarError("El campo ya tiene una descripción. Borrala si querés reemplazarla por una de internet.");
    return;
  }
  conCarga(boton, buscarDescripcionExterna({ titulo: titulo, autor: autor, codigoBarras: isbn })).then(function (r) {
    if (!r || !r.texto) {
      avisarError("No se encontró una descripción para \"" + titulo + "\". Podés escribirla a mano.");
      return;
    }
    campo.value = r.texto.slice(0, campo.maxLength);
    actualizarContadoresDescripcion();
    campo.focus();
    avisarOk("Descripción traída de " + r.fuente + ". Revisala antes de guardar.");
  });
});

// ===== Avisos al socio =====
var modalAvisoLocal = new bootstrap.Modal(document.getElementById("modal-aviso-local"));

function mostrarAvisoLocal(icono, titulo, html) {
  document.getElementById("aviso-local-icono").innerHTML = '<i class="fa-solid ' + icono + '"></i>';
  document.getElementById("aviso-local-titulo").textContent = titulo;
  document.getElementById("aviso-local-texto").innerHTML = html;
  modalAvisoLocal.show();
}

// al entrar, si el socio debe multas, se le avisa una vez por sesión
function avisarMultasPendientes() {
  if (!sesionActual || permisos.esGestion || !sesionActual.socioId) return;
  var clave = "biblioteca-aviso-multas-" + sesionActual.id;
  try { if (sessionStorage.getItem(clave)) return; } catch (e) { /* sin storage */ }
  apiFetch("/mis-multas").then(function (r) {
    if (!r || !(Number(r.total) > 0)) return;
    try { sessionStorage.setItem(clave, "1"); } catch (e) { /* sin storage */ }
    var detalle = (r.multas || []).map(function (m) {
      return "<li>" + escapeHtml(MOTIVO_MULTA_LABEL[m.motivo] || m.motivo) + ": " + formatearMonto(m.saldo !== undefined ? m.saldo : m.monto) + "</li>";
    }).join("");
    mostrarAvisoLocal("fa-receipt", "Tenés multas por " + formatearMonto(r.total),
      '<p>Pasá a pagarlas por el mostrador de la Biblioteca Central. Podés pagar en efectivo, con tarjeta o por transferencia.</p>' +
      (detalle ? '<ul class="aviso-local-lista">' + detalle + "</ul>" : ""));
  }).catch(function () { /* el aviso no es imprescindible */ });
}

// después de reservar: recordar que el libro se retira en el local
function avisarRetiroEnLocal(reservasHechas) {
  if (permisos.esGestion || !reservasHechas.length) return;
  var listas = reservasHechas.filter(function (r) { return r.estado === "pendiente_retiro"; });
  var enEspera = reservasHechas.length - listas.length;
  var items = reservasHechas.map(function (r) {
    var libro = buscarLibroPorId(String(r.libro_id));
    var titulo = libro ? libro.titulo : (r.libro ? r.libro.titulo : "Libro");
    var limite = fechaDesdeApi(r.fecha_limite);
    return "<li><strong>" + escapeHtml(titulo) + "</strong>" +
      (r.estado === "pendiente_retiro" ? (limite ? ": retiralo hasta el " + limite : "") : ": en espera de una copia") + "</li>";
  }).join("");
  mostrarAvisoLocal("fa-book-open-reader",
    listas.length ? "Pasá a retirarlo por el local" : "Quedaste en espera",
    '<p>' + (listas.length
      ? "Tu reserva está lista. Retirá el libro en el mostrador de la Biblioteca Central y llevá tu cédula."
      : "Te vamos a guardar la próxima copia que se devuelva.") +
    (enEspera && listas.length ? " Los que están en espera te los guardamos cuando se devuelva una copia." : "") + "</p>" +
    '<ul class="aviso-local-lista">' + items + "</ul>");
}

function irAlInicio() {
  var pestana = document.querySelector('[data-bs-target="#tab-catalogo"]');
  if (pestana) bootstrap.Tab.getOrCreateInstance(pestana).show();
  window.scrollTo(0, 0);
}

function alIniciarSesion() {
  if (!perfilUsuario) cargarPerfil();
  // gestión: el inicio ya muestra las reservas arriba
  if (permisos.esGestion) irAlInicio();
  else avisarMultasPendientes();
}

// ===== Inicio =====

function irAlListado() {
  var destino = document.getElementById("col-listado-libros");
  if (destino) destino.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderizarCategoriasInicio() {
  var cont = document.getElementById("inicio-categorias");
  if (!cont) return;
  var actual = filtroCategoria.value;
  var html = todasLasCategorias().map(function (nombre) {
    var activa = actual === nombre;
    return '<button type="button" class="inicio-categoria' + (activa ? " activa" : "") + '" data-categoria="' + escapeHtml(nombre) + '" aria-pressed="' + activa + '">' + escapeHtml(nombre) + "</button>";
  }).join("");
  if (cont._html !== html) { cont._html = html; cont.innerHTML = html; }
}

document.getElementById("form-buscar-inicio").addEventListener("submit", function (e) {
  e.preventDefault();
  inputBuscar.value = document.getElementById("buscar-inicio").value.trim();
  filtroCategoria.value = "Todas";
  renderizarLibros();
  renderizarCategoriasInicio();
  irAlListado();
});

document.getElementById("inicio-categorias").addEventListener("click", function (e) {
  var boton = e.target.closest(".inicio-categoria");
  if (!boton) return;
  // tocar la categoría ya elegida la quita
  filtroCategoria.value = filtroCategoria.value === boton.dataset.categoria ? "Todas" : boton.dataset.categoria;
  inputBuscar.value = "";
  renderizarLibros();
  renderizarCategoriasInicio();
  if (filtroCategoria.value !== "Todas") irAlListado();
});

filtroCategoria.addEventListener("change", renderizarCategoriasInicio);

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
      body: { titulo: titulo, autor: autor, isbn: codigoBarras, categoria_id: categoriaId, foto_portada: portadaEncontrada, cantidad: cantidadCopias, descripcion: document.getElementById("descripcion").value.trim() || null }
    });
  }).then(function () {
    registrarHistorial("Se agregó el libro \"" + titulo + "\" (" + cantidadCopias + (cantidadCopias === 1 ? " copia" : " copias") + ").", "libros");
    return cargarLibrosApi();
  })).then(function () {
    avisarOk("Libro agregado al catálogo.");
    form.reset();
    actualizarContadoresDescripcion();
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
  document.getElementById("editar-descripcion").value = libro.descripcion || "";
  actualizarContadoresDescripcion();
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
        foto_portada: portadaEditando,
        descripcion: document.getElementById("editar-descripcion").value.trim() || null
      }
    });
  }).then(function () {
    delete cacheDescripciones[id]; // la ficha vuelve a leer la descripción nueva
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

// ===== Reservas =====

function abrirModalReservar(libroId) {
  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  reservarLibroId.value = libro.id;
  reservarLibroTitulo.textContent = libro.titulo;
  reservarNombre.value = "";
  reservarTipo.value = "Particular";

  var hoy = hoyIso();
  fijarFecha("reservar-fecha", hoy, hoy);

  // el socio reserva con su propia cuenta: no se pide nombre ni tipo
  var esAutoservicio = !permisos.esGestion;
  grupoReservarNombre.classList.toggle("d-none", esAutoservicio);
  // el tipo de usuario ya viene del socio registrado: no se pide
  grupoReservarTipo.classList.add("d-none");
  reservarComoSocioInfo.classList.toggle("d-none", !esAutoservicio);

  modalReservar.show();
}

// particular o centro educativo sin verificar: 1 reserva activa (lo valida el backend)
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
    var reservaHecha = null;
    conCarga(botonReservar, apiFetch("/reservas", { method: "POST", body: { socio_id: socioIdPropio, libro_id: libroId, fecha_deseada: fechaDeseada } })
      .then(function (r) {
        reservaHecha = r;
        registrarHistorial("Se reservó \"" + (libroReservadoAuto ? libroReservadoAuto.titulo : "un libro") + "\" a nombre de " + (sesionActual.nombre || "un socio") + ".", "reservas", sesionActual.nombre);
        return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
      })).then(function () {
        renderizarLibros();
        renderizarReservas();
        modalReservar.hide();
        if (reservaHecha) avisarRetiroEnLocal([reservaHecha]);
      }).catch(mostrarErrorApi);
    return;
  }

  // gestión: reserva a nombre de un socio
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

// agrupa las reservas por socio
function agruparReservasPorSocio(listaDeReservas) {
  var grupos = [];
  var indicePorClave = {};

  for (var i = 0; i < listaDeReservas.length; i++) {
    var reserva = listaDeReservas[i];
    var libro = buscarLibroPorId(reserva.libroId);
    if (!libro) continue;

    var clave = reserva.socioId || ("nombre:" + reserva.nombre);

    if (!(clave in indicePorClave)) {
      indicePorClave[clave] = grupos.length;
      grupos.push({ socioId: reserva.socioId, nombre: reserva.nombre, tipo: reserva.tipo, items: [] });
    }
    grupos[indicePorClave[clave]].items.push({ reserva: reserva, libro: libro });
  }

  return grupos;
}

// lista de reservas que ven administrador y bibliotecario en el inicio
function renderizarReservasInicio() {
  var cont = document.getElementById("lista-reservas-inicio");
  if (!cont) return;
  var hoy = hoyIso();
  var listas = 0, vencidas = 0, enEspera = 0;
  var filas = reservas.map(function (r) {
    var libro = buscarLibroPorId(r.libroId);
    var titulo = libro ? libro.titulo : "(libro eliminado)";
    var lista = r.estado === "pendiente_retiro";
    var vencida = lista && r.fechaLimiteIso && r.fechaLimiteIso < hoy;
    if (vencida) vencidas++; else if (lista) listas++; else enEspera++;
    var estado = vencida
      ? '<span class="etiqueta-estado estado-prestado">Venció el plazo</span>'
      : (lista ? '<span class="etiqueta-estado estado-disponible">Para retirar</span>' : '<span class="etiqueta-estado estado-reservado">En espera</span>');
    var hasta = lista && r.fechaLimite
      ? (r.fechaLimiteIso === hoy ? "Hoy" : r.fechaLimite)
      : "—";
    return '<div class="tabla-reservas-fila' + (vencida ? " vencida" : "") + '" role="row">' +
      '<span role="cell" class="celda-socio"><strong>' + escapeHtml(r.nombre || "—") + "</strong>" +
        (r.tipo === "Centro educativo" ? '<span class="etiqueta etiqueta-tipo ms-2">Centro educativo</span>' : "") + "</span>" +
      '<span role="cell" class="celda-libro">' + escapeHtml(titulo) + "</span>" +
      '<span role="cell" class="celda-fecha" data-etiqueta="Reservado">' + escapeHtml(r.fecha) + "</span>" +
      '<span role="cell" class="celda-fecha" data-etiqueta="Retirar hasta">' + escapeHtml(hasta) + "</span>" +
      '<span role="cell">' + estado + "</span>" +
      '<span role="cell" class="celda-acciones">' +
        (lista ? '<button class="btn-accion-libro" title="Entregar (prestar)" data-accion="prestar" data-id="' + r.libroId + '" data-reserva-id="' + r.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' : "") +
        '<button class="btn-accion-libro" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + r.libroId + '" data-reserva-id="' + r.id + '"><i class="fa-solid fa-ban"></i></button>' +
      "</span></div>";
  }).join("");
  if (cont._html !== filas) { cont._html = filas; cont.innerHTML = filas; }
  document.getElementById("vacio-reservas-inicio").classList.toggle("d-none", reservas.length > 0);
  document.querySelector("#panel-reservas-inicio .tabla-reservas").classList.toggle("d-none", reservas.length === 0);
  document.getElementById("contador-reservas-inicio").textContent = reservas.length ? reservas.length : "";
  var partes = [];
  if (vencidas) partes.push(vencidas + (vencidas === 1 ? " con el plazo vencido" : " con el plazo vencido"));
  if (listas) partes.push(listas + (listas === 1 ? " para retirar" : " para retirar"));
  if (enEspera) partes.push(enEspera + " en espera");
  document.getElementById("resumen-reservas-inicio").textContent = partes.join(", ");
}

document.getElementById("lista-reservas-inicio").addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  if (boton.dataset.accion === "prestar") abrirModalPrestar(boton.dataset.id, boton.dataset.reservaId);
  else if (boton.dataset.accion === "cancelar-reserva") cancelarReserva(boton.dataset.reservaId, boton);
});

function renderizarReservas() {
  renderizarReservasInicio();
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

// libros que el socio tiene prestados (activos o vencidos)
function misPrestamosActivosSocio() {
  var socioIdPropio = sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;
  if (!socioIdPropio) return [];
  return prestamos.filter(function (p) {
    return p.socioId === socioIdPropio && (p.estado === "activo" || p.estado === "vencido");
  });
}

// contador del ícono de libro: préstamos propios (socio) o total del catálogo (gestión)
function actualizarContadorLibrosHeaderSesion() {
  if (!contadorLibrosHeaderSesion) return;
  var valor = permisos.esGestion ? libros.length : misPrestamosActivosSocio().length;
  contadorLibrosHeaderSesion.textContent = valor;
}

// ===== Mis reservas (socio) =====
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

  actualizarContadorLibrosHeaderSesion();

  // limpiamos todo salvo el encabezado y el mensaje de "vacío"
  var items = listaMisReservasDropdown.querySelectorAll(".mis-reservas-item");
  for (var k = 0; k < items.length; k++) items[k].remove();

  if (misReservasVacio) misReservasVacio.classList.toggle("d-none", total > 0);

  // primero los préstamos, después las reservas
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

// ===== Mis libros prestados (socio) =====
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

// "Aceptar todas": presta todos los libros reservados por un socio
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
      // si uno falla igual se recarga lo que sí se prestó
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

// ===== Préstamos y devoluciones =====

// con reservaId se entrega la copia apartada; sin él, una copia libre
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
  prestarSocioId.value = "";
  prestarNombreSocio = "";
  prestarCedula.value = "";
  prestarCedula.readOnly = false;
  mostrarSocioPrestamo(null, "");
  if (reserva) {
    // con reserva el socio ya está definido: se muestra su cédula y nombre
    prestarSocioId.value = String(reserva.socioId || "");
    prestarNombreSocio = reserva.nombre;
    prestarCedula.value = reserva.cedula;
    prestarCedula.readOnly = true;
    mostrarSocioPrestamo({ nombre: reserva.nombre, tipo: reserva.tipo, estado: "Activo" }, "reserva");
  }
  prestarFechaHoy.textContent = fechaHoy();
  modalPrestar.show();
}

document.getElementById("modal-prestar").addEventListener("shown.bs.modal", function () {
  if (!prestarCedula.readOnly) prestarCedula.focus();
});

// cédula sin puntos ni guiones, para comparar "4.123.456-7" con "41234567"
function soloDigitos(texto) {
  return String(texto || "").replace(/\D/g, "");
}

function mostrarSocioPrestamo(socio, modo) {
  var el = prestarSocioEncontrado;
  if (modo === "buscando") {
    el.className = "socio-encontrado buscando";
    el.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Buscando socio…';
  } else if (modo === "no-existe") {
    el.className = "socio-encontrado error";
    el.innerHTML = '<i class="fa-solid fa-circle-xmark me-2"></i>No hay ningún socio con esa cédula. Registralo primero en la pestaña Socios.';
  } else if (socio) {
    var suspendido = socio.estado !== "Activo";
    el.className = "socio-encontrado " + (suspendido ? "error" : "ok");
    el.innerHTML = '<i class="fa-solid ' + (suspendido ? "fa-circle-exclamation" : "fa-circle-check") + ' me-2"></i>' +
      "<strong>" + escapeHtml(socio.nombre) + "</strong>" +
      '<span class="socio-encontrado-detalle">' + escapeHtml(socio.tipo) +
      (suspendido ? ". Está " + escapeHtml(socio.estado.toLowerCase()) + ": no puede retirar libros." : (modo === "reserva" ? ". Es quien hizo la reserva." : "")) + "</span>";
  } else {
    el.className = "socio-encontrado";
    el.innerHTML = "";
  }
}

// busca el socio por cédula mientras se escribe
var temporizadorCedula = null;
var pedidoCedula = 0;
prestarCedula.addEventListener("input", function () {
  if (prestarCedula.readOnly) return;
  prestarCedula.value = prestarCedula.value.replace(/[^0-9.\-\s]/g, "");
  prestarSocioId.value = "";
  prestarNombreSocio = "";
  clearTimeout(temporizadorCedula);
  var digitos = soloDigitos(prestarCedula.value);
  if (digitos.length < 6) { mostrarSocioPrestamo(null, ""); return; }
  mostrarSocioPrestamo(null, "buscando");
  var numero = ++pedidoCedula;
  temporizadorCedula = setTimeout(function () {
    buscarSocioPorCedula(digitos).then(function (socio) {
      if (numero !== pedidoCedula) return;
      if (!socio) { mostrarSocioPrestamo(null, "no-existe"); return; }
      var s = mapSocio(socio);
      prestarSocioId.value = s.estado === "Activo" ? s.id : "";
      prestarNombreSocio = s.nombre;
      mostrarSocioPrestamo(s, "");
    }).catch(function (err) {
      if (numero !== pedidoCedula) return;
      mostrarSocioPrestamo(null, "");
      mostrarErrorApi(err);
    });
  }, 300);
});

function buscarSocioPorCedula(digitos) {
  return apiFetch("/socios?per_page=10&buscar=" + encodeURIComponent(digitos)).then(function (resp) {
    var lista = extraerDatos(resp);
    for (var i = 0; i < lista.length; i++) {
      if (soloDigitos(lista[i].cedula) === digitos) return lista[i];
    }
    return null;
  });
}

formPrestar.addEventListener("submit", function (e) {
  e.preventDefault();
  var libroId = prestarLibroId.value;
  if (!soloDigitos(prestarCedula.value)) {
    avisarError("Escribí la cédula de quien retira el libro.");
    prestarCedula.focus();
    return;
  }
  if (!prestarSocioId.value) {
    avisarError(prestarSocioEncontrado.classList.contains("error")
      ? "Ese socio no puede retirar libros. Revisá la cédula o su estado en la pestaña Socios."
      : "Esperá a que aparezca el socio de esa cédula, o revisá que esté bien escrita.");
    prestarCedula.focus();
    return;
  }
  var nombre = prestarNombreSocio || "un socio";

  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  var ejemplarId = prestarEjemplarId.value;
  if (!ejemplarId) {
    avisarError("No quedan copias libres de este libro.");
    return;
  }

  conCarga(botonEnviar(formPrestar), apiFetch("/prestamos", { method: "POST", body: { socio_id: prestarSocioId.value, ejemplar_id: ejemplarId } })
  .then(function () {
    registrarHistorial("Se prestó \"" + libro.titulo + "\" a " + nombre + ".", "prestamos", nombre);
    return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]);
  })).then(function () {
    renderizarLibros();
    renderizarReservas();
    renderizarPrestamos();
    modalPrestar.hide();
    avisarOk("Préstamo registrado a " + nombre + ".");
  }).catch(mostrarErrorApi);
});

// con varias copias prestadas se elige cuál vuelve
var modalDevolver = new bootstrap.Modal(document.getElementById("modal-devolver"));
var listaDevolver = document.getElementById("lista-devolver");

function devolverLibro(libroId, boton) {
  var activos = prestamosActivosDeLibro(libroId);
  if (!activos.length) return;
  if (activos.length === 1) {
    devolverPrestamo(activos[0]);
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
  if (!prestamo) return;
  var elegido = document.getElementById("modal-devolver");
  elegido.addEventListener("hidden.bs.modal", function abrir() {
    elegido.removeEventListener("hidden.bs.modal", abrir);
    devolverPrestamo(prestamo);
  });
  modalDevolver.hide();
});

// devolución con observación
var modalDevolucion = new bootstrap.Modal(document.getElementById("modal-devolucion"));
var formDevolucion = document.getElementById("form-devolucion");

function devolverPrestamo(prestamo) {
  var libro = buscarLibroPorId(prestamo.libroId);
  document.getElementById("devolucion-prestamo-id").value = prestamo.id;
  document.getElementById("devolucion-observacion").value = "";
  var vencido = prestamo.fechaVencimiento && fechaVencida(prestamo.fechaVencimiento);
  document.getElementById("devolucion-detalle").innerHTML =
    "<div><dt>Libro</dt><dd>" + escapeHtml(libro ? libro.titulo : "Libro") + "</dd></div>" +
    "<div><dt>Socio</dt><dd>" + escapeHtml(prestamo.nombre || "—") + "</dd></div>" +
    "<div><dt>Vencía</dt><dd" + (vencido ? ' class="text-danger"' : "") + ">" + escapeHtml(prestamo.fechaVencimiento || "—") + (vencido ? " (atrasado)" : "") + "</dd></div>";
  modalDevolucion.show();
}

document.getElementById("modal-devolucion").addEventListener("shown.bs.modal", function () {
  document.getElementById("devolucion-observacion").focus();
});

formDevolucion.addEventListener("submit", function (e) {
  e.preventDefault();
  var prestamo = buscarPrestamoPorId(document.getElementById("devolucion-prestamo-id").value);
  if (!prestamo) return;
  var observacion = document.getElementById("devolucion-observacion").value.trim();
  var libroDevuelto = buscarLibroPorId(prestamo.libroId);
  var titulo = libroDevuelto ? libroDevuelto.titulo : "un libro";
  conCarga(botonEnviar(formDevolucion), apiFetch("/prestamos/" + prestamo.id + "/devolver", { method: "PATCH", body: { observaciones: observacion || null } })
    .then(function () {
      registrarHistorial("Se registró la devolución de \"" + titulo + "\" de " + (prestamo.nombre || "un socio") + "." + (observacion ? " Observación: " + observacion : ""), "prestamos", prestamo.nombre);
      return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]);
    }))
    .then(function () {
      renderizarLibros();
      renderizarReservas();
      renderizarPrestamos();
      modalDevolucion.hide();
      avisarOk("Devolución registrada.");
    })
    .catch(mostrarErrorApi);
});

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
      '<p class="mb-0 text-muted small">Prestado el ' + prestamo.fechaPrestamo + "</p>" +
      (prestamo.observaciones ? '<p class="mb-0 small observacion-devolucion"><i class="fa-regular fa-comment me-1" aria-hidden="true"></i>' + escapeHtml(prestamo.observaciones) + "</p>" : "") + "</div>" +
      '<span class="etiqueta-estado ' + claseEstado + '">' + estadoTexto + "</span>" +
      (prestamoEstaActivo(prestamo) ? '<button class="btn-accion-libro" title="Registrar devolución" data-accion="devolver-prestamo" data-prestamo-id="' + prestamo.id + '"><i class="fa-solid fa-rotate-left"></i></button>' : "");
    listaPrestamos.appendChild(li);
  }

  // también dependen de los préstamos
  renderizarMisReservas();
  renderizarModalMisPrestamos();
}

filtroPrestamos.addEventListener("change", renderizarPrestamos);

listaPrestamos.addEventListener("click", function (e) {
  var boton = e.target.closest('[data-accion="devolver-prestamo"]');
  if (!boton) return;
  var prestamo = buscarPrestamoPorId(boton.dataset.prestamoId);
  if (prestamo) devolverPrestamo(prestamo);
});

// ===== Autenticación =====

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
    pintarAvatar(document.getElementById("header-avatar"));
    document.getElementById("menu-usuario-nombre").textContent = sesionActual.nombre || "";
    document.getElementById("menu-usuario-email").textContent = sesionActual.email || "";
  }

  aplicarPermisosUI();
}

// ===== Permisos por rol =====
// solo esconde lo que el backend igual rechazaría
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

  var nodosSocio = document.querySelectorAll('[data-requiere-rol="socio"]');
  for (var s = 0; s < nodosSocio.length; s++) {
    nodosSocio[s].classList.toggle("d-none", permisos.esGestion);
  }

  // si la pestaña activa quedó oculta, volver al catálogo
  var panelActivo = document.querySelector(".tab-pane.active");
  if (panelActivo && panelActivo.hasAttribute("data-requiere-rol") && panelActivo.classList.contains("d-none")) {
    var pillCatalogo = document.querySelector('[data-bs-target="#tab-catalogo"]');
    if (pillCatalogo && typeof bootstrap !== "undefined") {
      bootstrap.Tab.getOrCreateInstance(pillCatalogo).show();
    }
  }

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

// ===== Mi cuenta =====
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

// perfil del usuario, se pide al iniciar sesión para que "Mi cuenta" abra completo
var perfilUsuario = null;
var pedidoPerfil = null;

function cargarPerfil() {
  if (!sesionActual || !getToken()) return Promise.resolve(null);
  pedidoPerfil = apiFetch("/auth/me").then(function (u) {
    perfilUsuario = u;
    return u;
  }).catch(function () { return perfilUsuario; }).then(function (u) {
    pedidoPerfil = null;
    return u;
  });
  return pedidoPerfil;
}

function llenarFormularioPerfil(u) {
  var soc = u.socio;
  miCuentaCampos.nombre.value = soc ? soc.nombre : u.nombre;
  miCuentaCampos.email.value = u.email || "";
  if (soc) {
    miCuentaCampos.apellido.value = soc.apellido && soc.apellido !== "-" ? soc.apellido : "";
    miCuentaCampos.cedula.value = String(soc.cedula || "").indexOf("PENDIENTE-") === 0 ? "" : (soc.cedula || "");
    miCuentaCampos.telefono.value = soc.telefono || "";
    miCuentaCampos.direccion.value = soc.direccion || "";
  }
}

function prepararYMostrarMiCuenta(u) {
  miCuentaFotoPendiente = undefined;
  formMiCuenta.reset();
  reiniciarCamposPassword(formMiCuenta);
  pintarAvatar(miCuentaAvatar);
  miCuentaQuitarFoto.classList.toggle("d-none", !obtenerFotoLocal());

  var esSocio = !!sesionActual.socioId;
  document.getElementById("mi-cuenta-grupo-apellido").classList.toggle("d-none", !esSocio);
  document.getElementById("mi-cuenta-datos-socio").classList.toggle("d-none", !esSocio);
  document.getElementById("mi-cuenta-nombre-label").textContent = esSocio ? "Nombres" : "Nombre";

  if (u) llenarFormularioPerfil(u);
  modalMiCuenta.show();
}

function abrirMiCuenta(boton) {
  if (perfilUsuario) {
    prepararYMostrarMiCuenta(perfilUsuario);
    return;
  }
  // si todavía no llegó, se espera
  conCarga(boton && boton.nodeType === 1 ? boton : null, pedidoPerfil || cargarPerfil()).then(function (u) {
    if (!u) {
      avisarError("No se pudieron cargar tus datos. Probá de nuevo en un momento.");
      return;
    }
    prepararYMostrarMiCuenta(u);
  });
}

document.getElementById("header-btn-mi-cuenta").addEventListener("click", function (e) {
  e.preventDefault();
  if (sesionActual) abrirMiCuenta(e.currentTarget);
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
    if (!telefonoValido(body.telefono || "")) { mostrarMensajeMiCuenta("El teléfono tiene que tener entre 6 y 20 números.", true); return; }
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
    cargarPerfil();
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

  if (!telefonoValido(telefono)) {
    mostrarErrorRegistro("El teléfono tiene que tener entre 6 y 20 números.");
    registroTelefono.focus();
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

  if (!document.getElementById("registro-terminos").checked) {
    mostrarErrorRegistro("Para crear la cuenta tenés que aceptar los Términos y Condiciones y la Política de Privacidad.");
    document.getElementById("registro-terminos").focus();
    return;
  }

  conCarga(botonEnviar(formRegistro), apiFetch("/auth/registro", { method: "POST", body: { nombre: nombre, apellido: apellido, cedula: cedula, telefono: telefono || null, email: email, password: password, acepta_terminos: true } }))
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
      alIniciarSesion();
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
      alIniciarSesion();
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
  perfilUsuario = null;
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
document.getElementById("menu-usuario-cuenta").addEventListener("click", function (e) { if (sesionActual) abrirMiCuenta(e.currentTarget); });
document.getElementById("menu-usuario-prestamos").addEventListener("click", abrirModalMisPrestamos);
document.getElementById("menu-usuario-salir").addEventListener("click", cerrarSesion);

// ícono de libro del invitado: va al catálogo
function irAlCatalogo() {
  var pillCatalogo = document.querySelector('[data-bs-target="#tab-catalogo"]');
  if (pillCatalogo && typeof bootstrap !== "undefined") {
    bootstrap.Tab.getOrCreateInstance(pillCatalogo).show();
  }
}
if (headerBtnCatalogoInvitado) headerBtnCatalogoInvitado.addEventListener("click", irAlCatalogo);

// ícono de libro con sesión: lleva al catálogo
if (headerBtnCatalogoSesion) {
  headerBtnCatalogoSesion.addEventListener("click", function () {
    if (permisos.esGestion) irAlCatalogo();
    else abrirModalMisPrestamos();
  });
}

linkIrARegistro.addEventListener("click", function (e) { e.preventDefault(); abrirModalRegistro(); });
linkIrALogin.addEventListener("click", function (e) { e.preventDefault(); abrirModalLogin(); });

// términos: al cerrarlos se vuelve al registro
var modalTerminosEl = document.getElementById("modal-terminos");
var volverAlRegistro = false;
document.getElementById("link-terminos").addEventListener("click", function (e) {
  e.preventDefault();
  volverAlRegistro = true;
  document.getElementById("modal-registro").addEventListener("hidden.bs.modal", function mostrar() {
    document.getElementById("modal-registro").removeEventListener("hidden.bs.modal", mostrar);
    bootstrap.Modal.getOrCreateInstance(modalTerminosEl).show();
  });
  modalRegistro.hide();
});
modalTerminosEl.addEventListener("hidden.bs.modal", function () {
  if (volverAlRegistro) { volverAlRegistro = false; modalRegistro.show(); }
});

// catálogo público: se puede ver sin iniciar sesión
function cargarCatalogoPublico() {
  return Promise.all([cargarLibrosApi(), cargarCategoriasApi()])
    .then(function () {
      actualizarSelectsCategoria();
      renderizarLibros();
    })
    .catch(mostrarErrorApi);
}

// ===== Arranque =====

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
    perfilUsuario = usuario; // ya sirve para "Mi cuenta"
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
    alIniciarSesion();
  }).catch(function () {
    // token vencido: queda en modo invitado
    cerrarSesionLocal();
    cargarCatalogoPublico();
    abrirModalLogin();
  });
} else {
  cargarCatalogoPublico();
  abrirModalLogin();
}
var buscadorMultasEl = document.getElementById("buscador-multas");
var temporizadorBusquedaMultas = null;
if (buscadorMultasEl) {
  buscadorMultasEl.addEventListener("input", function () {
    clearTimeout(temporizadorBusquedaMultas);
    temporizadorBusquedaMultas = setTimeout(function () {
      busquedaMultas = buscadorMultasEl.value;
      buscarMultasApi();
    }, 300);
  });
}
