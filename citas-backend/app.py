import os
from datetime import datetime, date, time, timedelta

from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_login import (
    LoginManager, login_user, logout_user, login_required, current_user
)
from flask_cors import CORS

from sqlalchemy import or_

from models import db, Usuario, Cita, Bloqueo

from zoneinfo import ZoneInfo



# =============================================================
# CONFIGURACIÓN DEL HORARIO DE ATENCIÓN
# Cambia estos valores si Daniel ajusta sus horarios más adelante.
# =============================================================

HORA_APERTURA = time(10, 0)
HORA_CIERRE = time(19, 0)
DURACION_CITA_MINUTOS = 30
TIPOS_CITA_VALIDOS = {"valoracion", "tatuaje"}

TZ = ZoneInfo("America/Bogota")


def ahora_local():
    """Hora actual en Colombia (el servidor de Railway corre en UTC)."""
    return datetime.now(TZ).replace(tzinfo=None)


def hoy_local():
    return ahora_local().date()


def hay_solape(fecha_obj, hora_inicio, duracion_minutos, excluir_id=None):
    """
    Revisa si un horario propuesto choca con alguna cita ya existente
    ese día, comparando RANGOS completos (inicio-fin), no solo la hora
    exacta de inicio. Así una cita larga (ej. una sesión de tatuaje de
    5 horas) bloquea correctamente todos los espacios que ocupa.
    """
    nuevo_inicio = datetime.combine(fecha_obj, hora_inicio)
    nuevo_fin = nuevo_inicio + timedelta(minutes=duracion_minutos)

    query = Cita.query.filter_by(fecha=fecha_obj).filter(Cita.estado != "cancelada")

    if excluir_id:
        query = query.filter(Cita.id != excluir_id)

    for cita in query.all():
        existente_inicio = datetime.combine(fecha_obj, cita.hora)
        existente_fin = existente_inicio + timedelta(minutes=cita.duracion_minutos)

        if nuevo_inicio < existente_fin and existente_inicio < nuevo_fin:
            return True

    return False

def bloqueo_choca(bloqueo, fecha_obj, hora_inicio, duracion_minutos):
    """¿Esta cita propuesta cae (aunque sea en parte) dentro del bloqueo?"""
    if not bloqueo.aplica_en(fecha_obj):
        return False

    # Sin horas = bloquea el día completo
    if bloqueo.hora_inicio is None:
        return True

    nuevo_inicio = datetime.combine(fecha_obj, hora_inicio)
    nuevo_fin = nuevo_inicio + timedelta(minutes=duracion_minutos)
    b_inicio = datetime.combine(fecha_obj, bloqueo.hora_inicio)
    b_fin = datetime.combine(fecha_obj, bloqueo.hora_fin)

    return nuevo_inicio < b_fin and b_inicio < nuevo_fin


def bloqueos_del_dia(fecha_obj):
    """Los bloqueos que aplican a un día (una sola consulta a la base)."""
    candidatos = Bloqueo.query.filter(
        Bloqueo.fecha_inicio <= fecha_obj,
        or_(Bloqueo.fecha_fin.is_(None), Bloqueo.fecha_fin >= fecha_obj),
    ).all()

    return [b for b in candidatos if b.aplica_en(fecha_obj)]


def hay_bloqueo(bloqueos, fecha_obj, hora_inicio, duracion_minutos):
    return any(
        bloqueo_choca(b, fecha_obj, hora_inicio, duracion_minutos)
        for b in bloqueos
    )


def citas_afectadas_por(bloqueo):
    """Citas activas y futuras que quedan dentro de un bloqueo (para avisar a Daniel)."""
    query = Cita.query.filter(
        Cita.estado != "cancelada",
        Cita.fecha >= max(bloqueo.fecha_inicio, hoy_local()),
    )

    if bloqueo.fecha_fin:
        query = query.filter(Cita.fecha <= bloqueo.fecha_fin)

    return [
        c for c in query.all()
        if bloqueo_choca(bloqueo, c.fecha, c.hora, c.duracion_minutos)
    ]


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "cambia-esto-en-produccion")

    # Habilita CORS solo para las rutas /api/* (el panel admin no lo necesita,
    # se visita directo en el dominio de Railway, no vía fetch cross-origin)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    database_url = os.environ.get("DATABASE_URL", "sqlite:///citas.db")
    # Railway a veces da la URL como postgres:// en vez de postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    # Forzamos el driver psycopg2 explícitamente, porque SQLAlchemy 2.1+
    # intenta usar psycopg (v3) por defecto y no lo tenemos instalado.
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = "login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(Usuario, int(user_id))

    # =========================================================
    # LOGIN / LOGOUT
    # =========================================================

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for("admin_panel"))

        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")

            user = Usuario.query.filter_by(username=username).first()

            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for("admin_panel"))

            flash("Usuario o contraseña incorrectos.")

        return render_template("login.html")

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect(url_for("login"))

    # =========================================================
    # PANEL ADMIN (protegido)
    # =========================================================

    @app.route("/admin")
    @login_required
    def admin_panel():
        return render_template("admin.html", usuario=current_user.username)

    # =========================================================
    # API — CITAS
    # =========================================================

    @app.route("/api/citas/disponibilidad", methods=["GET"])
    def disponibilidad():
        """
        Endpoint público: devuelve los horarios libres para una fecha dada.
        Uso: GET /api/citas/disponibilidad?fecha=2026-09-15
        """
        fecha_str = request.args.get("fecha")

        if not fecha_str:
            return jsonify({"error": "Falta el parámetro 'fecha'."}), 400

        try:
            fecha_obj = date.fromisoformat(fecha_str)
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido, usa YYYY-MM-DD."}), 400

        if fecha_obj < hoy_local():
            return jsonify({"disponibilidad": []})

        # Genera todos los horarios posibles del día según apertura/cierre
        slots = []
        actual = datetime.combine(fecha_obj, HORA_APERTURA)
        cierre = datetime.combine(fecha_obj, HORA_CIERRE)

        while actual + timedelta(minutes=DURACION_CITA_MINUTOS) <= cierre:
            slots.append(actual.time())
            actual += timedelta(minutes=DURACION_CITA_MINUTOS)

        # Si es hoy, quita los horarios que ya pasaron
        if fecha_obj == hoy_local():
            ahora = ahora_local().time()
            slots = [s for s in slots if s > ahora]

        # Quita los horarios que chocan con alguna cita existente,
        # comparando el rango completo (no solo la hora exacta)
        bloqueos = bloqueos_del_dia(fecha_obj)

        disponibles = [
            s for s in slots
            if not hay_bloqueo(bloqueos, fecha_obj, s, DURACION_CITA_MINUTOS)
            and not hay_solape(fecha_obj, s, DURACION_CITA_MINUTOS)
        ]

        return jsonify({
            "disponibilidad": [s.strftime("%H:%M") for s in disponibles]
        })

    @app.route("/api/citas", methods=["POST"])
    def crear_cita_publica():
        """
        Endpoint público: el formulario del sitio web llama aquí
        para que un cliente agende una valoración.
        """
        data = request.get_json(silent=True) or {}

        required = ["nombre_cliente", "telefono", "fecha", "hora"]
        faltantes = [campo for campo in required if not data.get(campo)]

        if faltantes:
            return jsonify({
                "error": f"Faltan campos requeridos: {', '.join(faltantes)}"
            }), 400

        try:
            fecha_obj = date.fromisoformat(data["fecha"])
            hora_obj = time.fromisoformat(data["hora"])
        except ValueError:
            return jsonify({"error": "Formato de fecha u hora inválido."}), 400

        tipo_cita = data.get("tipo_cita", "valoracion")
        if tipo_cita not in TIPOS_CITA_VALIDOS:
            return jsonify({"error": "Tipo de cita inválido."}), 400

        # Aunque el cliente no vea el horario, el backend lo valida igual
        if hay_bloqueo(bloqueos_del_dia(fecha_obj), fecha_obj, hora_obj, DURACION_CITA_MINUTOS):
            return jsonify({"error": "Ese horario no está disponible."}), 409

        # Evita que choque con cualquier cita existente (por rango completo)
        if hay_solape(fecha_obj, hora_obj, DURACION_CITA_MINUTOS):
            return jsonify({"error": "Ese horario ya no está disponible."}), 409

        nueva_cita = Cita(
            nombre_cliente=data["nombre_cliente"],
            telefono=data["telefono"],
            email=data.get("email"),
            fecha=fecha_obj,
            hora=hora_obj,
            idea=data.get("idea"),
            tipo_cita=tipo_cita,
            duracion_minutos=DURACION_CITA_MINUTOS,
            creada_por_cliente=True,
        )

        db.session.add(nueva_cita)
        db.session.commit()

        return jsonify({"ok": True, "cita": nueva_cita.to_dict()}), 201

    @app.route("/api/admin/citas", methods=["GET"])
    @login_required
    def listar_citas():
        """Todas las citas, en el formato que espera FullCalendar."""
        citas = Cita.query.order_by(Cita.fecha, Cita.hora).all()
        return jsonify([c.to_dict() for c in citas])

    @app.route("/api/admin/citas", methods=["POST"])
    @login_required
    def crear_cita_manual():
        """El tatuador crea una cita manual desde el panel (ej. alguien que agendó por WhatsApp)."""
        data = request.get_json(silent=True) or {}

        try:
            fecha_obj = date.fromisoformat(data["fecha"])
            hora_obj = time.fromisoformat(data["hora"])
        except (KeyError, ValueError):
            return jsonify({"error": "Fecha u hora inválida o faltante."}), 400

        try:
            duracion = int(data.get("duracion_minutos", DURACION_CITA_MINUTOS))
        except (TypeError, ValueError):
            duracion = DURACION_CITA_MINUTOS

        if duracion <= 0:
            duracion = DURACION_CITA_MINUTOS

        tipo_cita = data.get("tipo_cita", "valoracion")
        if tipo_cita not in TIPOS_CITA_VALIDOS:
            tipo_cita = "valoracion"

        if hay_solape(fecha_obj, hora_obj, duracion):
            return jsonify({"error": "Ese horario choca con otra cita existente."}), 409

        nueva_cita = Cita(
            nombre_cliente=data.get("nombre_cliente", "Sin nombre"),
            telefono=data.get("telefono", ""),
            email=data.get("email"),
            fecha=fecha_obj,
            hora=hora_obj,
            idea=data.get("idea"),
            notas=data.get("notas"),
            tipo_cita=tipo_cita,
            duracion_minutos=duracion,
            creada_por_cliente=False,
            contactada=True,
            vista=True,
        )

        db.session.add(nueva_cita)
        db.session.commit()

        return jsonify({"ok": True, "cita": nueva_cita.to_dict()}), 201

    @app.route("/api/admin/citas/<int:cita_id>", methods=["PUT"])
    @login_required
    def actualizar_cita(cita_id):
        cita = db.session.get(Cita, cita_id)

        if not cita:
            return jsonify({"error": "Cita no encontrada."}), 404

        data = request.get_json(silent=True) or {}
        estado_anterior = cita.estado

        if "contactada" in data:
            cita.contactada = bool(data["contactada"])
        if "vista" in data:
            cita.vista = bool(data["vista"])
        if "recordada" in data:
            cita.recordada = bool(data["recordada"])

        # Regla de negocio: no se pasa a "confirmada" sin haber contactado al cliente.
        # Solo aplica al cambio de estado, para no bloquear el re-guardado de
        # una cita que ya estaba confirmada.
        if (
            data.get("estado") == "confirmada"
            and cita.estado != "confirmada"
            and not cita.contactada
        ):
            db.session.rollback()
            return jsonify({
                "error": "Contacta al cliente por WhatsApp antes de confirmar."
            }), 400

        if "estado" in data:
            cita.estado = data["estado"]
        if "notas" in data:
            cita.notas = data["notas"]
        if "nombre_cliente" in data:
            cita.nombre_cliente = data["nombre_cliente"]
        if "telefono" in data:
            cita.telefono = data["telefono"]
        if "email" in data:
            cita.email = data["email"]
        if "idea" in data:
            cita.idea = data["idea"]
        if "tipo_cita" in data and data["tipo_cita"] in TIPOS_CITA_VALIDOS:
            cita.tipo_cita = data["tipo_cita"]

        cambio_agenda = False

        if "duracion_minutos" in data:
            try:
                nueva_duracion = int(data["duracion_minutos"])
            except (TypeError, ValueError):
                nueva_duracion = None

            if nueva_duracion and nueva_duracion > 0 and nueva_duracion != cita.duracion_minutos:
                cita.duracion_minutos = nueva_duracion
                cambio_agenda = True

        if "fecha" in data:
            nueva_fecha = date.fromisoformat(data["fecha"])
            if nueva_fecha != cita.fecha:
                cita.recordada = False
                cambio_agenda = True
            cita.fecha = nueva_fecha

        if "hora" in data:
            nueva_hora = time.fromisoformat(data["hora"])
            if nueva_hora != cita.hora:
                cita.recordada = False
                cambio_agenda = True
            cita.hora = nueva_hora

        # Si cambió el horario, la duración, o se reactivó una cita cancelada,
        # revisamos que no choque con otra cita (excluyéndose a sí misma).
        reactivada = estado_anterior == "cancelada" and cita.estado != "cancelada"

        if (
            cita.estado != "cancelada"
            and (cambio_agenda or reactivada)
            and hay_solape(cita.fecha, cita.hora, cita.duracion_minutos, excluir_id=cita.id)
        ):
            db.session.rollback()
            return jsonify({"error": "Ese horario choca con otra cita existente."}), 409

        db.session.commit()

        return jsonify({"ok": True, "cita": cita.to_dict()})

    # =========================================================
    # API — BLOQUEOS DE HORARIO
    # =========================================================

    @app.route("/api/admin/bloqueos", methods=["GET"])
    @login_required
    def listar_bloqueos():
        bloqueos = Bloqueo.query.order_by(Bloqueo.fecha_inicio, Bloqueo.hora_inicio).all()
        return jsonify([b.to_dict() for b in bloqueos])

    @app.route("/api/admin/bloqueos", methods=["POST"])
    @login_required
    def crear_bloqueo():
        data = request.get_json(silent=True) or {}

        try:
            fecha_inicio = date.fromisoformat(data["fecha_inicio"])
            fecha_fin = date.fromisoformat(data["fecha_fin"]) if data.get("fecha_fin") else None
            hora_inicio = time.fromisoformat(data["hora_inicio"]) if data.get("hora_inicio") else None
            hora_fin = time.fromisoformat(data["hora_fin"]) if data.get("hora_fin") else None
        except (KeyError, ValueError, TypeError):
            return jsonify({"error": "Fecha u hora inválida o faltante."}), 400

        if fecha_fin and fecha_fin < fecha_inicio:
            return jsonify({"error": "La fecha final no puede ser anterior a la inicial."}), 400

        if (hora_inicio is None) != (hora_fin is None):
            return jsonify({"error": "Indica hora de inicio y de fin, o ninguna (día completo)."}), 400

        if hora_inicio and hora_fin <= hora_inicio:
            return jsonify({"error": "La hora final debe ser posterior a la inicial."}), 400

        dias_raw = data.get("dias_semana") or []
        if isinstance(dias_raw, str):
            dias_raw = [d for d in dias_raw.split(",") if d.strip()]

        try:
            dias = sorted({int(d) for d in dias_raw})
        except (TypeError, ValueError):
            return jsonify({"error": "Días de la semana inválidos."}), 400

        if any(d < 0 or d > 6 for d in dias):
            return jsonify({"error": "Los días van de 0 (lunes) a 6 (domingo)."}), 400

        # Vacío o los 7 días = todos los días
        dias_semana = None if len(dias) in (0, 7) else ",".join(str(d) for d in dias)
        motivo = (data.get("motivo") or "").strip()[:120] or None

        nuevo = Bloqueo(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            dias_semana=dias_semana,
            motivo=motivo,
        )

        db.session.add(nuevo)
        db.session.commit()

        afectadas = citas_afectadas_por(nuevo)

        return jsonify({
            "ok": True,
            "bloqueo": nuevo.to_dict(),
            "citas_afectadas": [
                {
                    "id": c.id,
                    "nombre_cliente": c.nombre_cliente,
                    "fecha": c.fecha.isoformat(),
                    "hora": c.hora.strftime("%H:%M"),
                }
                for c in afectadas
            ],
        }), 201

    @app.route("/api/admin/bloqueos/<int:bloqueo_id>", methods=["DELETE"])
    @login_required
    def eliminar_bloqueo(bloqueo_id):
        bloqueo = db.session.get(Bloqueo, bloqueo_id)

        if not bloqueo:
            return jsonify({"error": "Bloqueo no encontrado."}), 404

        db.session.delete(bloqueo)
        db.session.commit()

        return jsonify({"ok": True})

    @app.route("/api/admin/citas/<int:cita_id>", methods=["DELETE"])
    @login_required
    def eliminar_cita(cita_id):
        cita = db.session.get(Cita, cita_id)

        if not cita:
            return jsonify({"error": "Cita no encontrada."}), 404

        db.session.delete(cita)
        db.session.commit()

        return jsonify({"ok": True})

    # =========================================================
    # COMANDO CLI: crear el usuario admin (el tatuador)
    # Se corre UNA vez desde la terminal de Railway:
    #   flask create-admin
    # =========================================================

    @app.cli.command("create-admin")
    def create_admin():
        import getpass

        username = input("Usuario para el panel admin: ").strip()
        password = getpass.getpass("Contraseña: ")

        if Usuario.query.filter_by(username=username).first():
            print("Ese usuario ya existe.")
            return

        nuevo = Usuario(username=username)
        nuevo.set_password(password)

        db.session.add(nuevo)
        db.session.commit()

        print(f"Usuario admin '{username}' creado correctamente.")

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)