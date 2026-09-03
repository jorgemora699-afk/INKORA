from datetime import datetime, timedelta

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class Usuario(db.Model, UserMixin):
    """
    Usuario admin del panel (el tatuador).
    Solo se crea manualmente vía comando CLI, no hay registro público.
    """

    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Cita(db.Model):
    """
    Una cita/valoración agendada por un cliente.
    """

    __tablename__ = "citas"

    id = db.Column(db.Integer, primary_key=True)

    nombre_cliente = db.Column(db.String(120), nullable=False)
    telefono = db.Column(db.String(30), nullable=False)
    email = db.Column(db.String(120), nullable=True)

    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)

    idea = db.Column(db.Text, nullable=True)
    notas = db.Column(db.Text, nullable=True)

    # valoracion | tatuaje
    tipo_cita = db.Column(db.String(20), nullable=False, default="valoracion")

    # Cuánto tiempo ocupa esta cita en el calendario, en minutos.
    # Las que agenda el cliente desde la web usan la duración estándar (30 min).
    # Las manuales las define el tatuador (ej. una sesión de tatuaje de varias horas).
    duracion_minutos = db.Column(db.Integer, nullable=False, default=30)

    # pendiente | confirmada | cancelada
    estado = db.Column(db.String(20), nullable=False, default="pendiente")

    # False = agendada manualmente por el tatuador, True = agendada por el cliente desde la web
    creada_por_cliente = db.Column(db.Boolean, default=True)

    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Formato que consume FullCalendar en el panel admin."""
        inicio = datetime.combine(self.fecha, self.hora)
        fin = inicio + timedelta(minutes=self.duracion_minutos)

        return {
            "id": self.id,
            "title": self.nombre_cliente,
            "start": inicio.isoformat(),
            "end": fin.isoformat(),
            "extendedProps": {
                "telefono": self.telefono,
                "email": self.email,
                "idea": self.idea,
                "notas": self.notas,
                "estado": self.estado,
                "tipo_cita": self.tipo_cita,
                "duracion_minutos": self.duracion_minutos,
                "creada_por_cliente": self.creada_por_cliente,
            },
        }