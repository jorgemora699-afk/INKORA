import os
from datetime import datetime, date, time, timedelta

from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_login import (
    LoginManager, login_user, logout_user, login_required, current_user
)
from flask_cors import CORS

from models import db, Usuario, Cita


# =============================================================
# CONFIGURACIÓN DEL HORARIO DE ATENCIÓN
# Cambia estos valores si Daniel ajusta sus horarios más adelante.
# =============================================================

HORA_APERTURA = time(10, 0)
HORA_CIERRE = time(19, 0)
DURACION_CITA_MINUTOS = 30
TIPOS_CITA_VALIDOS = {"valoracion", "tatuaje"}


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

        if fecha_obj < date.today():
            return jsonify({"disponibilidad": []})

        # Genera todos los horarios posibles del día según apertura/cierre
        slots = []
        actual = datetime.combine(fecha_obj, HORA_APERTURA)
        cierre = datetime.combine(fecha_obj, HORA_CIERRE)

        while actual + timedelta(minutes=DURACION_CITA_MINUTOS) <= cierre:
            slots.append(actual.time())
            actual += timedelta(minutes=DURACION_CITA_MINUTOS)

        # Si es hoy, quita los horarios que ya pasaron
        if fecha_obj == date.today():
            ahora = datetime.now().time()
            slots = [s for s in slots if s > ahora]

        # Quita los horarios que chocan con alguna cita existente,
        # comparando el rango completo (no solo la hora exacta)
        disponibles = [
            s for s in slots
            if not hay_solape(fecha_obj, s, DURACION_CITA_MINUTOS)
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
        if "duracion_minutos" in data:
            try:
                cita.duracion_minutos = int(data["duracion_minutos"])
            except (TypeError, ValueError):
                pass
        if "fecha" in data:
            cita.fecha = date.fromisoformat(data["fecha"])
        if "hora" in data:
            cita.hora = time.fromisoformat(data["hora"])

        db.session.commit()

        return jsonify({"ok": True, "cita": cita.to_dict()})

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