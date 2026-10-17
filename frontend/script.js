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
var ejemplaresPorLibro = {}; // libroId(string) -> {id, estado} (usamos 1 ejemplar por libro)

var historial = cargarHistorial();
var sesionActual = cargarSesion();
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
var loginError = document.getElementById("login-error");

var modalRegistro = new bootstrap.Modal(document.getElementById("modal-registro"));
var formRegistro = document.getElementById("form-registro");
var registroNombre = document.getElementById("registro-nombre");
var registroEmail = document.getElementById("registro-email");
var registroPassword = document.getElementById("registro-password");
var registroPasswordConfirmar = document.getElementById("registro-password-confirmar");
var registroError = document.getElementById("registro-error");

var headerBtnLogin = document.getElementById("header-btn-login");
var headerBtnRegistro = document.getElementById("header-btn-registro");
var headerBtnLogout = document.getElementById("header-btn-logout");
var headerAuthInvitado = document.getElementById("header-auth-invitado");
var headerAuthSesion = document.getElementById("header-auth-sesion");
var headerUsuarioNombre = document.getElementById("header-usuario-nombre");
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
        if (r.status === 401) cerrarSesionLocal();
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
  alert(err && err.message ? err.message : "Ocurrió un error al comunicarse con el servidor.");
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

function nombreCompletoSocio(s) {
  if (!s) return "";
  return s.nombre + (s.apellido && s.apellido !== "-" ? " " + s.apellido : "");
}

function fechaDesdeApi(valor) {
  return valor ? formatearFecha(new Date(valor)) : null;
}

// mapea un Libro de la API + su ejemplar (copia física) al objeto que ya
// esperan las funciones de renderizado existentes ({id, titulo, autor, categoria, estado...})
function mapLibro(l) {
  var info = ejemplaresPorLibro[String(l.id)];
  return {
    id: String(l.id),
    titulo: l.titulo,
    autor: l.autor,
    categoria: l.categoria ? l.categoria.nombre : "Sin categoría",
    categoriaId: l.categoria_id || (l.categoria ? l.categoria.id : null),
    portada: l.foto_portada || null,
    codigoBarras: l.isbn || null,
    estado: info ? (ESTADO_EJEMPLAR_LABEL[info.estado] || "Disponible") : "Disponible",
    ejemplarId: info ? String(info.id) : null
  };
}

function mapSocio(s) {
  return {
    id: String(s.id),
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
    fecha: fechaDesdeApi(r.fecha_reserva) || ""
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
    monto: m.monto,
    fecha: fechaDesdeApi(m.fecha) || "",
    pagada: m.estado === "pagada"
  };
}

// ------------------------------
// Carga de datos desde la API
// ------------------------------

function cargarEjemplaresApi() {
  return apiFetch("/ejemplares?per_page=500").then(function (resp) {
    ejemplaresPorLibro = {};
    extraerDatos(resp).forEach(function (ej) {
      ejemplaresPorLibro[String(ej.libro_id)] = { id: ej.id, estado: ej.estado };
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

function pollActualizacionesApi() {
  // pestaña en segundo plano: no tiene sentido gastar pedidos
  if (document.hidden) return;
  // si hay un modal abierto (editando, prestando, etc.) no lo pisamos a
  // mitad de uso; se actualiza solo en el próximo tick, cuando se cierre
  if (document.querySelector(".modal.show")) return;
  // si el pedido anterior todavía no terminó, no mandamos otro encima
  if (pollingEnCurso) return;
  pollingEnCurso = true;

  // los libros (con portadas en base64, muy pesados) no se vuelven a bajar:
  // solo refrescamos el estado de los ejemplares y lo aplicamos a los ya cargados
  Promise.all([
    cargarEjemplaresApi().then(function () {
      libros.forEach(function (l) {
        var info = ejemplaresPorLibro[l.id];
        l.estado = info ? (ESTADO_EJEMPLAR_LABEL[info.estado] || "Disponible") : "Disponible";
        l.ejemplarId = info ? String(info.id) : null;
      });
    }),
    cargarReservasApi(),
    cargarPrestamosApi(),
    cargarSociosApi(),
    cargarMultasApi()
  ]).then(function () {
    renderizarLibros();
    renderizarReservas();
    renderizarPrestamos();
    renderizarSocios();
    renderizarMultas();
    var tabReportes = document.getElementById("tab-reportes");
    if (tabReportes && tabReportes.classList.contains("active") && typeof renderizarReportes === "function") {
      renderizarReportes();
    }
  }).catch(function (err) {
    // fallo silencioso: un error de red pasajero durante el polling no
    // debería interrumpir a quien esté trabajando con un alert()
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

// busca un socio por nombre en la API; si no existe lo crea (por ejemplo,
// cuando se reserva o presta un libro a nombre de alguien que todavía no está
// en la lista). Requiere estar logueado como administrador o bibliotecario.
function buscarOCrearSocio(nombre, tipo) {
  nombre = nombre.trim();
  var tipoApi = tipo === "Centro educativo" ? "centro_educativo" : "particular";

  return buscarSocioApiPorNombre(nombre).then(function (existente) {
    if (existente) return existente;
    return apiFetch("/socios", { method: "POST", body: { nombre: nombre, tipo: tipoApi } });
  }).then(function (socio) {
    return cargarSociosApi().then(function () {
      renderizarSocios();
      return socio;
    });
  });
}

function actualizarDatalistSocios() {
  datalistSocios.innerHTML = socios.map(function (s) {
    return '<option value="' + escapeHtml(s.nombre) + '"></option>';
  }).join("");
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
      '<div class="flex-grow-1"><h3>' + escapeHtml(socio.nombre) + "</h3>" +
      '<span class="etiqueta etiqueta-tipo me-2">' + escapeHtml(socio.tipo) + "</span>" +
      etiquetaVerificacionHtml +
      '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(socio.estado) + "</span></div>" +
      botonCambiarTipoHtml +
      botonVerificarHtml +
      '<button class="btn-accion-libro" title="Cambiar estado" data-accion="toggle-estado-socio" data-id="' + socio.id + '"><i class="fa-solid fa-rotate"></i></button>' +
      '<button class="btn-accion-libro" title="Eliminar socio" data-accion="eliminar-socio" data-id="' + socio.id + '"><i class="fa-solid fa-trash"></i></button>';
    listaSocios.appendChild(li);
  }
}

formSocio.addEventListener("submit", function (e) {
  e.preventDefault();
  var nombre = socioNombreInput.value.trim();
  if (!nombre) return;
  if (buscarSocioPorNombre(nombre)) {
    alert("Ya existe un socio registrado con ese nombre.");
    return;
  }

  var tipoApi = socioTipoInput.value === "Centro educativo" ? "centro_educativo" : "particular";

  apiFetch("/socios", { method: "POST", body: { nombre: nombre, tipo: tipoApi } })
    .then(function () {
      registrarHistorial("Se registró al socio " + nombre + ".");
      return cargarSociosApi();
    })
    .then(function () {
      renderizarSocios();
      formSocio.reset();
      socioNombreInput.focus();
    })
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

  if (boton.dataset.accion === "toggle-estado-socio") {
    var nuevoEstado = socio.estado === "Suspendido" ? "activo" : "suspendido";
    apiFetch("/socios/" + socio.id + "/estado", { method: "PATCH", body: { estado: nuevoEstado } })
      .then(function () {
        registrarHistorial("El socio " + socio.nombre + " cambió de estado.");
        return cargarSociosApi();
      })
      .then(renderizarSocios)
      .catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "eliminar-socio") {
    if (!confirm("¿Eliminar a este socio?")) return;
    apiFetch("/socios/" + socio.id, { method: "DELETE" })
      .then(function () { return cargarSociosApi(); })
      .then(renderizarSocios)
      .catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "cambiar-tipo-socio") {
    if (!permisos.esAdmin) return; // el backend igual lo rechazaría (403), esto es solo defensa en el cliente
    var esCentroEducativoActual = socio.tipo === "Centro educativo";
    var nuevoTipoApi = esCentroEducativoActual ? "particular" : "centro_educativo";
    var mensajeConfirmacion = esCentroEducativoActual
      ? "¿Cambiar a " + socio.nombre + " de centro educativo a particular?"
      : "¿Cambiar a " + socio.nombre + " a centro educativo?";
    if (!confirm(mensajeConfirmacion)) return;
    apiFetch("/socios/" + socio.id, { method: "PUT", body: { tipo: nuevoTipoApi } })
      .then(function () {
        registrarHistorial(
          "Se cambió el tipo de socio de " + socio.nombre + " a " +
          (nuevoTipoApi === "centro_educativo" ? "centro educativo" : "particular") + "."
        );
        return cargarSociosApi();
      })
      .then(renderizarSocios)
      .catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "verificar-educativo") {
    var nuevoValorVerificado = !socio.verificado;
    apiFetch("/socios/" + socio.id + "/verificar-educativo", { method: "PATCH", body: { verificado: nuevoValorVerificado } })
      .then(function () {
        registrarHistorial(
          (nuevoValorVerificado ? "Se verificó" : "Se quitó la verificación de") + " a " + socio.nombre + " como centro educativo."
        );
        return cargarSociosApi();
      })
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

function renderizarMultas() {
  listaMultas.innerHTML = "";
  estadoVacioMultas.classList.toggle("d-none", multas.length > 0);

  for (var i = 0; i < multas.length; i++) {
    var multa = multas[i];
    var claseEstado = multa.pagada ? "estado-disponible" : "estado-prestado";
    var textoEstado = multa.pagada ? "Pagada" : "Pendiente";
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><h3>' + escapeHtml(multa.socio) + "</h3>" +
      '<p class="mb-1">' + escapeHtml(multa.motivo) + " · $" + escapeHtml(String(multa.monto)) + '<span class="etiqueta-estado ' + claseEstado + ' ms-2">' + textoEstado + "</span></p>" +
      '<p class="mb-0 text-muted small">Registrada el ' + multa.fecha + "</p></div>" +
      (multa.pagada ? "" : '<button class="btn-accion-libro" title="Marcar como pagada" data-accion="pagar-multa" data-id="' + multa.id + '"><i class="fa-solid fa-check"></i></button>') +
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
  if (!nombreSocio || !monto) return;

  buscarOCrearSocio(nombreSocio, "Particular")
    .then(function (socio) {
      return apiFetch("/multas", { method: "POST", body: { socio_id: socio.id, motivo: motivoApi, monto: monto } });
    })
    .then(function () {
      registrarHistorial("Se registró una multa de $" + monto + " a " + nombreSocio + " (" + motivoDisplay + ").");
      return cargarMultasApi();
    })
    .then(function () {
      renderizarMultas();
      formMulta.reset();
    })
    .catch(mostrarErrorApi);
});

listaMultas.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  var multa = buscarMultaLocalPorId(boton.dataset.id);
  if (!multa) return;

  if (boton.dataset.accion === "pagar-multa") {
    apiFetch("/multas/" + multa.id, { method: "PUT", body: { estado: "pagada" } })
      .then(function () {
        registrarHistorial("Se registró el pago de la multa de " + multa.socio + ".");
        return cargarMultasApi();
      })
      .then(renderizarMultas)
      .catch(mostrarErrorApi);
  } else if (boton.dataset.accion === "eliminar-multa") {
    if (!confirm("¿Eliminar esta multa?")) return;
    apiFetch("/multas/" + multa.id, { method: "DELETE" })
      .then(function () { return cargarMultasApi(); })
      .then(renderizarMultas)
      .catch(mostrarErrorApi);
  }
});

// ------------------------------
// Historial de actividad (RF16) y reportes (RF14) / notificaciones (RF13)
// ------------------------------

function cargarHistorial() {
  var guardado = localStorage.getItem(STORAGE_KEY_HISTORIAL);
  return guardado ? JSON.parse(guardado) : [];
}

function guardarHistorial() {
  // se conservan solo las últimas 50 entradas para no llenar el localStorage
  if (historial.length > 50) historial = historial.slice(historial.length - 50);
  localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(historial));
}

function registrarHistorial(texto) {
  historial.push({ id: crearId(), texto: texto, fecha: fechaHoy() });
  guardarHistorial();
  renderizarHistorial();
}

function renderizarHistorial() {
  if (!listaHistorial) return;
  var recientes = historial.slice().reverse().slice(0, 15);
  listaHistorial.innerHTML = "";
  estadoVacioHistorial.classList.toggle("d-none", recientes.length > 0);

  for (var i = 0; i < recientes.length; i++) {
    var entrada = recientes[i];
    var li = document.createElement("li");
    li.className = "reserva-item";
    li.innerHTML =
      '<div class="flex-grow-1"><p class="mb-0">' + escapeHtml(entrada.texto) + '</p>' +
      '<p class="mb-0 text-muted small">' + entrada.fecha + "</p></div>";
    listaHistorial.appendChild(li);
  }
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
  var disponibles = libros.filter(function (l) { return l.estado === "Disponible"; }).length;
  var prestadosAhora = libros.filter(function (l) { return l.estado === "Prestado"; }).length;
  var reservadosAhora = libros.filter(function (l) { return l.estado === "Reservado"; }).length;
  var atrasados = prestamosVencidos().length;

  var stats = [
    { numero: libros.length, etiqueta: "Libros en catálogo" },
    { numero: disponibles, etiqueta: "Disponibles" },
    { numero: prestadosAhora, etiqueta: "Prestados" },
    { numero: reservadosAhora, etiqueta: "Reservados" },
    { numero: atrasados, etiqueta: "Préstamos atrasados" }
  ];

  reportesStats.innerHTML = stats.map(function (s) {
    return '<div class="col-6 col-md-4 col-lg"><div class="stat-card"><div class="stat-numero">' + s.numero + '</div><div class="stat-etiqueta">' + s.etiqueta + "</div></div></div>";
  }).join("");

  renderizarTopLibros();
  renderizarNotificaciones();
  renderizarHistorial();
}

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
    conf.select.innerHTML = construirOpcionesCategoria(conf.incluirTodas, conf.incluirOtro);
    var existeValor = Array.prototype.some.call(conf.select.options, function (o) { return o.value === valorActual; });
    if (existeValor) conf.select.value = valorActual;
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
  if (!isbn) return;
  buscarLibroPorIsbn(isbn);
}
function buscarLibroPorIsbn(isbn) {
  var url = "https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn;

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (datos) {
      if (!datos.items || datos.items.length === 0) {
        alert("No se encontró ningún libro con ese código de barras.");
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
      alert("Hubo un error buscando el libro. Probá de nuevo.");
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
  contador.textContent = libros.length + " " + (libros.length === 1 ? "libro" : "libros");
  // el ícono de libro del header (invitado y con sesión) mostraba siempre
  // "0" porque nunca se actualizaba; lo sincronizamos con el catálogo real
  if (contadorLibrosHeader) contadorLibrosHeader.textContent = libros.length;
  actualizarContadorLibrosHeaderSesion();

  // armamos el HTML de todas las tarjetas en un array y lo pintamos de una
  // sola vez al final (una sola escritura al DOM) en vez de ir agregando
  // tarjeta por tarjeta con appendChild, que fuerza un reflow por cada una
  var htmlTarjetas = [];

  for (var i = 0; i < filtrados.length; i++) {
    var libro = filtrados[i];
    var portadaContenidoHtml = libro.portada
      ? '<img class="libro-portada" src="' + libro.portada + '" alt="Portada" loading="lazy">'
      : '<div class="libro-portada"><i class="fa-solid fa-book"></i></div>';

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

    var claseEstado = libro.estado === "Prestado" ? "estado-prestado" : (libro.estado === "Reservado" ? "estado-reservado" : "estado-disponible");
    var estadoHtml = '<span class="etiqueta-estado ' + claseEstado + '">' + escapeHtml(libro.estado) + "</span>";
    var codigoBarrasHtml = libro.codigoBarras
      ? '<p class="mb-1 texto-codigo-barras"><i class="fa-solid fa-barcode me-1"></i>' + escapeHtml(libro.codigoBarras) + "</p>"
      : "";

    var extraInfoHtml = "";
    var accionesEstadoHtml = "";

    if (libro.estado === "Reservado") {
      var reserva = buscarReservaPorLibro(libro.id);
      if (reserva) {
        var esMiReserva = !permisos.esGestion && sesionActual && sesionActual.socioId && reserva.socioId === String(sesionActual.socioId);
        extraInfoHtml = esMiReserva
          ? '<p class="mb-0 texto-reserva">🔖 Reservado por vos el ' + escapeHtml(reserva.fecha) + "</p>"
          : '<p class="mb-0 texto-reserva">Reservado por: ' + escapeHtml(reserva.nombre) + " (" + escapeHtml(reserva.tipo) + ")</p>";
      }
      // "Prestar" requiere rol administrador o bibliotecario (ver routes/api.php, POST /prestamos).
      // "Cancelar reserva" solo se muestra si es una reserva propia del socio
      // (la API ya solo devuelve las suyas) o si es personal de gestión,
      // que puede cancelar cualquiera.
      // Se marcan "grande" cuando las ve alguien de gestión, ya que en ese
      // caso son las únicas acciones de la fila (sin Editar/Eliminar de por medio).
      accionesEstadoHtml =
        (permisos.esGestion ? '<button class="btn-accion-libro btn-accion-libro-grande" title="Prestar" data-accion="prestar" data-id="' + libro.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' : "") +
        (permisos.esGestion || reserva ? '<button class="btn-accion-libro' + (permisos.esGestion ? " btn-accion-libro-grande" : "") + '" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + libro.id + '"><i class="fa-solid fa-ban"></i></button>' : "");
    } else if (libro.estado === "Prestado") {
      var prestamo = buscarPrestamoActivoPorLibro(libro.id);
      if (prestamo) {
        var esMiPrestamo = !permisos.esGestion && sesionActual && sesionActual.socioId && prestamo.socioId === String(sesionActual.socioId);
        // si es el propio socio quien lo tiene, no repetimos esa info acá:
        // ahora se ve en el popup "Mis libros prestados" (ícono de libro
        // del header), no suelta en cada tarjeta del catálogo
        if (!esMiPrestamo) {
          extraInfoHtml = '<p class="mb-0 texto-reserva">Prestado a: ' + escapeHtml(prestamo.nombre) + " · vence el " + prestamo.fechaVencimiento + "</p>";
        }
      }
      // "Devolver" requiere rol administrador o bibliotecario (ver routes/api.php, PATCH /prestamos/{id}/devolver)
      // como queda solo en la fila, se estira a todo el ancho
      accionesEstadoHtml = permisos.esGestion
        ? '<button class="btn-accion-libro btn-accion-libro-full" title="Devolver" data-accion="devolver" data-id="' + libro.id + '"><i class="fa-solid fa-rotate-left"></i> Devolver</button>'
        : "";
    } else {
      // si nadie con permisos de gestión mira la tarjeta, "Reservar" es el
      // único botón posible: lo estiramos a todo el ancho y le agregamos
      // el texto en vez de dejarlo como ícono solo. Si es gestión, en
      // cambio, tiene a "Prestar" al lado: ambos quedan grandes, mitad y
      // mitad, en vez del ícono chiquito de antes.
      var reservarSolo = !permisos.esGestion;
      accionesEstadoHtml =
        '<button class="btn-accion-libro' + (reservarSolo ? " btn-accion-libro-full" : " btn-accion-libro-grande") + '" title="Reservar" data-accion="reservar" data-id="' + libro.id + '"><i class="fa-solid fa-bookmark"></i>' +
        (reservarSolo ? " Reservar" : "") + "</button>" +
        (permisos.esGestion ? '<button class="btn-accion-libro btn-accion-libro-grande" title="Prestar" data-accion="prestar" data-id="' + libro.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' : "");
    }

    // si el libro está prestado (o cualquier otro estado) y la persona no
    // tiene ningún botón disponible, no mostramos la barra de acciones:
    // así evitamos la línea/separador vacío al pie de la tarjeta
    // (Editar/Eliminar ya no van acá, se movieron al menú sobre la portada)
    var accionesLibroHtml = accionesEstadoHtml ? '<div class="acciones-libro">' + accionesEstadoHtml + "</div>" : "";

    htmlTarjetas.push(
      '<li class="libro-item">' +
      portadaHtml +
      '<div class="libro-info flex-grow-1"><h3>' + escapeHtml(libro.titulo) + "</h3>" +
      "<p>Autor: " + escapeHtml(libro.autor) + "</p>" +
      codigoBarrasHtml +
      '<span class="etiqueta">' + escapeHtml(libro.categoria) + "</span> " + estadoHtml +
      extraInfoHtml + "</div>" +
      accionesLibroHtml +
      "</li>"
    );
  }

  lista.innerHTML = htmlTarjetas.join("");
}

function buscarReservaPorLibro(libroId) {
  for (var i = 0; i < reservas.length; i++) {
    if (reservas[i].libroId === libroId) return reservas[i];
  }
  return null;
}

function buscarPrestamoActivoPorLibro(libroId) {
  for (var i = 0; i < prestamos.length; i++) {
    if (prestamos[i].libroId === libroId && !prestamos[i].fechaDevolucion) return prestamos[i];
  }
  return null;
}

function escapeHtml(texto) {
  var div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function generarCodigoInterno() {
  return "EJ-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  var titulo = document.getElementById("titulo").value.trim();
  var autor = document.getElementById("autor").value.trim();
  var codigoBarras = inputCodigoBarras.value.trim() || null;
  if (!titulo || !autor) return;

  if (inputCategoria.value === "Otro" && !inputNuevaCategoria.value.trim()) {
    inputNuevaCategoria.focus();
    return;
  }

  resolverCategoriaId(inputCategoria, inputNuevaCategoria).then(function (categoriaId) {
    return apiFetch("/libros", {
      method: "POST",
      body: { titulo: titulo, autor: autor, isbn: codigoBarras, categoria_id: categoriaId, foto_portada: portadaEncontrada }
    });
  }).then(function (nuevoLibro) {
    // creamos un único ejemplar (copia física) para que el libro se pueda prestar/reservar
    return apiFetch("/ejemplares", {
      method: "POST",
      body: { codigo_interno: generarCodigoInterno(), libro_id: nuevoLibro.id }
    });
  }).then(function () {
    registrarHistorial("Se agregó el libro \"" + titulo + "\".");
    return cargarLibrosApi();
  }).then(function () {
    form.reset();
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
    if (!confirm("¿Eliminar este libro del catálogo?")) return;
    apiFetch("/libros/" + id, { method: "DELETE" })
      .then(function () { return Promise.all([cargarLibrosApi(), cargarReservasApi()]); })
      .then(function () {
        renderizarLibros();
        renderizarReservas();
      })
      .catch(mostrarErrorApi);
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
  else if (accion === "prestar") abrirModalPrestar(libroId);
  else if (accion === "devolver") devolverLibro(libroId);
  else if (accion === "cancelar-reserva") cancelarReserva(libroId);
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
  if (!titulo || !autor) return;

  var id = editarId.value;
  if (editarCategoria.value === "Otro" && !inputEditarNuevaCategoria.value.trim()) {
    inputEditarNuevaCategoria.focus();
    return;
  }

  resolverCategoriaId(editarCategoria, inputEditarNuevaCategoria).then(function (categoriaId) {
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
    return cargarLibrosApi();
  }).then(function () {
    renderizarLibros();
    modalEditar.hide();
  }).catch(mostrarErrorApi);
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

  var hoyISO = new Date().toISOString().slice(0, 10);
  reservarFecha.min = hoyISO;
  reservarFecha.value = hoyISO;

  // un socio autenticado (autoservicio) reserva con su propia cuenta:
  // no puede buscar/crear socios (GET/POST /socios requiere rol
  // administrador o bibliotecario), así que en ese caso no le pedimos
  // nombre/tipo y usamos directamente su socioId
  var esAutoservicio = !permisos.esGestion;
  grupoReservarNombre.classList.toggle("d-none", esAutoservicio);
  grupoReservarTipo.classList.toggle("d-none", esAutoservicio);
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
  if (!fechaDeseada) return;

  // autoservicio: el propio socio reserva con su cuenta, sin pasar por /socios
  if (!permisos.esGestion) {
    var socioIdPropio = sesionActual && sesionActual.socioId ? String(sesionActual.socioId) : null;
    if (!socioIdPropio) {
      alert("Tu cuenta no tiene un socio asociado; no podés reservar. Contactá a un bibliotecario.");
      return;
    }
    apiFetch("/reservas", { method: "POST", body: { socio_id: socioIdPropio, libro_id: libroId, fecha_deseada: fechaDeseada } })
      .then(function () {
        return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
      }).then(function () {
        renderizarLibros();
        renderizarReservas();
        modalReservar.hide();
      }).catch(mostrarErrorApi);
    return;
  }

  // administrador/bibliotecario: reservan a nombre de un socio, buscándolo
  // o creándolo por nombre (ver buscarOCrearSocio)
  var nombre = reservarNombre.value.trim();
  var tipo = reservarTipo.value;
  if (!nombre) return;

  var socioExistente = buscarSocioPorNombre(nombre);
  if (socioExistente && socioTieneReservaActivaBloqueante(socioExistente)) {
    alert("Este socio ya tiene una reserva activa. Solo puede tener más de una si está verificado como centro educativo (ver pestaña Socios).");
    return;
  }

  buscarOCrearSocio(nombre, tipo).then(function (socio) {
    return apiFetch("/reservas", { method: "POST", body: { socio_id: socio.id, libro_id: libroId, fecha_deseada: fechaDeseada } });
  }).then(function () {
    return Promise.all([cargarLibrosApi(), cargarReservasApi()]);
  }).then(function () {
    renderizarLibros();
    renderizarReservas();
    modalReservar.hide();
  }).catch(mostrarErrorApi);
});

function cancelarReserva(libroId) {
  if (!confirm("¿Cancelar la reserva de este libro?")) return;
  var reserva = buscarReservaPorLibro(libroId);
  if (!reserva) return;

  apiFetch("/reservas/" + reserva.id + "/cancelar", { method: "PATCH" })
    .then(function () { return Promise.all([cargarLibrosApi(), cargarReservasApi()]); })
    .then(function () {
      renderizarLibros();
      renderizarReservas();
    })
    .catch(mostrarErrorApi);
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
            '<p class="mb-0 text-muted small">Reservado el ' + item.reserva.fecha + "</p>" +
          "</div>" +
          '<button class="btn-accion-libro" title="Prestar" data-accion="prestar" data-id="' + item.libro.id + '"><i class="fa-solid fa-right-from-bracket"></i></button>' +
          '<button class="btn-accion-libro" title="Cancelar reserva" data-accion="cancelar-reserva" data-id="' + item.libro.id + '"><i class="fa-solid fa-ban"></i></button>' +
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
    var estadoTexto = libro && libro.estado === "Reservado" ? "Listo para retirar" : "En espera";

    var li = document.createElement("li");
    li.className = "mis-reservas-item";
    li.innerHTML =
      '<div class="mis-reservas-info">' +
      "<h4>" + escapeHtml(tituloLibro) + "</h4>" +
      "<p>" + estadoTexto + " · Reservado el " + reserva.fecha + "</p></div>" +
      '<button type="button" class="btn-cancelar-mi-reserva" title="Cancelar reserva" data-libro-id="' + reserva.libroId + '"><i class="fa-solid fa-ban"></i></button>';
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
    e.stopPropagation(); // no cerrar el dropdown antes del confirm()
    cancelarReserva(boton.dataset.libroId);
  });
}

listaReservas.addEventListener("click", function (e) {
  var boton = e.target.closest(".btn-accion-libro");
  if (!boton) return;
  var accion = boton.dataset.accion;
  var libroId = boton.dataset.id;
  if (accion === "prestar") abrirModalPrestar(libroId);
  else if (accion === "cancelar-reserva") cancelarReserva(libroId);
  else if (accion === "prestar-todas") prestarTodasReservasDelGrupo(boton.dataset.grupoIndex);
});

// Presta de una sola vez todos los libros que un mismo socio tiene
// reservados (botón "Aceptar todas" de la tarjeta agrupada). Cada libro
// ya tiene ejemplar propio asignado por la reserva, así que no hace
// falta abrir el modal por cada uno: se manda un POST /prestamos por
// libro y se refresca todo al final.
function prestarTodasReservasDelGrupo(indiceGrupo) {
  var grupo = ultimosGruposReservas[indiceGrupo];
  if (!grupo || !grupo.items.length) return;

  var itemsPrestables = grupo.items.filter(function (item) { return !!item.libro.ejemplarId; });

  if (!itemsPrestables.length) {
    alert("Ninguno de estos libros tiene un ejemplar cargado, no se pueden prestar.");
    return;
  }

  if (!confirm("¿Prestar los " + itemsPrestables.length + " libro(s) reservados por " + grupo.nombre + "?")) return;

  var socioId = grupo.socioId;

  var cadenaDePromesas = itemsPrestables.reduce(function (promesaPrevia, item) {
    return promesaPrevia.then(function () {
      return apiFetch("/prestamos", { method: "POST", body: { socio_id: socioId, ejemplar_id: item.libro.ejemplarId } });
    });
  }, Promise.resolve());

  cadenaDePromesas
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

function abrirModalPrestar(libroId) {
  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  prestarLibroId.value = libro.id;
  prestarLibroTitulo.textContent = libro.titulo;
  var reserva = buscarReservaPorLibro(libroId);
  prestarSocioId.value = reserva && reserva.socioId ? String(reserva.socioId) : "";
  prestarNombre.value = reserva ? reserva.nombre : "";
  prestarFechaHoy.textContent = fechaHoy();
  modalPrestar.show();
}

formPrestar.addEventListener("submit", function (e) {
  e.preventDefault();
  var libroId = prestarLibroId.value;
  var nombre = prestarNombre.value.trim();
  if (!nombre) return;

  var libro = buscarLibroPorId(libroId);
  if (!libro) return;
  if (!libro.ejemplarId) {
    alert("Este libro no tiene un ejemplar cargado, no se puede prestar.");
    return;
  }

  var socioPromise;
  if (prestarSocioId.value) {
    // Si el libro estaba reservado, la reserva ya identifica al socio.
    // No volvemos a buscar/crear otro socio por nombre.
    socioPromise = Promise.resolve({ id: prestarSocioId.value });
  } else {
    socioPromise = buscarOCrearSocio(nombre, "Particular");
  }

  socioPromise.then(function (socio) {
    return apiFetch("/prestamos", { method: "POST", body: { socio_id: socio.id, ejemplar_id: libro.ejemplarId } });
  }).then(function () {
    return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]);
  }).then(function () {
    renderizarLibros();
    renderizarReservas();
    renderizarPrestamos();
    modalPrestar.hide();
  }).catch(mostrarErrorApi);
});

function devolverLibro(libroId) {
  if (!confirm("¿Registrar la devolución de este libro?")) return;
  var prestamo = buscarPrestamoActivoPorLibro(libroId);
  if (!prestamo) return;

  apiFetch("/prestamos/" + prestamo.id + "/devolver", { method: "PATCH" })
    .then(function () { return Promise.all([cargarLibrosApi(), cargarReservasApi(), cargarPrestamosApi()]); })
    .then(function () {
      renderizarLibros();
      renderizarReservas();
      renderizarPrestamos();
    })
    .catch(mostrarErrorApi);

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
      '<span class="etiqueta-estado ' + claseEstado + '">' + estadoTexto + "</span>";
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
  loginError.textContent = mensaje;
  loginError.classList.remove("d-none");
}

function mostrarErrorRegistro(mensaje) {
  registroError.textContent = mensaje;
  registroError.classList.remove("d-none");
}

function abrirModalLogin() {
  formLogin.reset();
  loginError.classList.add("d-none");
  modalRegistro.hide();
  modalLogin.show();
}

function abrirModalRegistro() {
  formRegistro.reset();
  registroError.classList.add("d-none");
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

  // al ocultarse el panel "Agregar libro" (col-lg-4), el listado (col-lg-8)
  // queda solo y descentrado en la fila; lo expandimos para que ocupe todo
  // el ancho disponible en vez de dejarlo pegado a la izquierda
  var colListado = document.getElementById("col-listado-libros");
  if (colListado) {
    colListado.classList.toggle("col-lg-8", permisos.esAdmin);
    colListado.classList.toggle("col-lg-12", !permisos.esAdmin);
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

formRegistro.addEventListener("submit", function (e) {
  e.preventDefault();
  registroError.classList.add("d-none");

  var nombre = registroNombre.value.trim();
  var email = registroEmail.value.trim();
  var password = registroPassword.value;
  var passwordConfirmar = registroPasswordConfirmar.value;

  if (!nombre || !email || !password) return;

  if (password.length < 6) {
    mostrarErrorRegistro("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  if (password !== passwordConfirmar) {
    mostrarErrorRegistro("Las contraseñas no coinciden.");
    return;
  }

  // el registro público siempre crea una cuenta con rol "socio" (ver AuthController::registro);
  // declarar "centro educativo" acá no lo verifica: un bibliotecario tiene
  // que confirmarlo a mano desde la pestaña de socios
  apiFetch("/auth/registro", { method: "POST", body: { nombre: nombre, email: email, password: password } })
    .then(function (resp) {
      guardarToken(resp.token);
      sesionActual = mapearUsuarioSesion(resp.usuario);
      guardarSesion();
      actualizarUIAuth();
      registrarHistorial("Se registró la cuenta de " + nombre + ".");
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
  loginError.classList.add("d-none");

  var email = loginEmail.value.trim();
  var password = loginPassword.value;
  if (!email || !password) return;

  apiFetch("/auth/login", { method: "POST", body: { email: email, password: password } })
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