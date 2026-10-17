// api.js — capa de conexión con el backend (Laravel + MySQL).
//
// URL base de la API de Laravel. Se define en config.js (APP_CONFIG.API_URL);
// si está vacío, se usa el mismo host de esta página en el puerto 8000.
var API_BASE_URL =
  (window.APP_CONFIG && window.APP_CONFIG.API_URL) ||
  window.location.protocol + "//" + window.location.hostname + ":8000/api";

var TOKEN_STORAGE_KEY = "biblioteca-token";

function guardarToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

function obtenerToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Wrapper de fetch() que:
 *  - arma la URL completa contra el backend
 *  - agrega el header de autenticación si hay sesión
 *  - parsea la respuesta como JSON
 *  - convierte respuestas con error (4xx/5xx) en una excepción con mensaje legible
 */
function apiFetch(path, opciones) {
  opciones = opciones || {};
  var headers = Object.assign(
    {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    opciones.headers || {}
  );

  var token = obtenerToken();
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  return fetch(API_BASE_URL + path, {
    method: opciones.method || "GET",
    headers: headers,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  })
    .then(function (respuesta) {
      // 204 No Content no trae body
      if (respuesta.status === 204) return null;

      return respuesta.text().then(function (texto) {
        var datos = null;
        try {
          datos = texto ? JSON.parse(texto) : null;
        } catch (e) {
          datos = null;
        }

        if (!respuesta.ok) {
          var mensaje =
            (datos && (datos.message || primerErrorDeValidacion(datos))) ||
            "Error de conexión con el servidor (" + respuesta.status + ").";
          var error = new Error(mensaje);
          error.status = respuesta.status;
          error.datos = datos;
          throw error;
        }

        return datos;
      });
    })
    .catch(function (error) {
      // Error de red (backend apagado, CORS, sin conexión, etc.)
      if (error instanceof TypeError) {
        throw new Error(
          "No se pudo conectar con el servidor. Verificá que el backend esté" +
            " corriendo en " + API_BASE_URL + " y que CORS lo permita."
        );
      }
      throw error;
    });
}

// Laravel devuelve errores de validación como { message, errors: { campo: [...] } }
function primerErrorDeValidacion(datos) {
  if (!datos || !datos.errors) return null;
  var primeraClave = Object.keys(datos.errors)[0];
  if (!primeraClave) return null;
  return datos.errors[primeraClave][0];
}

var Api = {
  // ---------- Autenticación ----------
  login: function (email, password) {
    return apiFetch("/auth/login", {
      method: "POST",
      body: { email: email, password: password },
    });
  },

  registro: function (nombre, email, password) {
    return apiFetch("/auth/registro", {
      method: "POST",
      body: { nombre: nombre, email: email, password: password },
    });
  },

  logout: function () {
    return apiFetch("/auth/logout", { method: "POST" }).catch(function () {
      // si el token ya venció o el backend no responde, igual limpiamos la sesión local
    });
  },

  me: function () {
    return apiFetch("/auth/me");
  },

  // ---------- Socios ----------
  listarSocios: function (buscar) {
    var query = buscar ? "?buscar=" + encodeURIComponent(buscar) : "";
    return apiFetch("/socios" + query);
  },

  crearSocio: function (datos) {
    return apiFetch("/socios", { method: "POST", body: datos });
  },

  cambiarEstadoSocio: function (id, estado) {
    return apiFetch("/socios/" + id + "/estado", {
      method: "PATCH",
      body: { estado: estado },
    });
  },

  eliminarSocio: function (id) {
    return apiFetch("/socios/" + id, { method: "DELETE" });
  },

  // ---------- Multas ----------
  listarMultas: function () {
    return apiFetch("/multas");
  },

  crearMulta: function (datos) {
    return apiFetch("/multas", { method: "POST", body: datos });
  },

  pagarMulta: function (id) {
    return apiFetch("/multas/" + id, {
      method: "PUT",
      body: { estado: "pagada" },
    });
  },

  eliminarMulta: function (id) {
    return apiFetch("/multas/" + id, { method: "DELETE" });
  },
};
