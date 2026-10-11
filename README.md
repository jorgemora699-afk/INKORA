# Inkora · Daniel Tatto Ink 🖋️

Sitio web y panel de administración de citas para un estudio de tatuajes. Los clientes pueden conocer el estudio y solicitar una cita, y el tatuador gestiona su agenda desde un calendario, con filtros, recordatorios por WhatsApp y bloqueo de horarios.


## Problema

El tatuador coordinaba citas por chat, sin una vista clara de la agenda. Era fácil olvidar contactar a un cliente, cruzar horarios o no recordarle la cita el día anterior.

## Funcionalidades

**Sitio público**
- `[secciones reales: inicio, galería de trabajos, sobre el estudio, contacto...]`
- `[formulario de solicitud de cita, si existe]`
- Diseño oscuro y dorado, pensado para celular.

**Panel de administración**
- Calendario interactivo (FullCalendar 6) con todas las citas.
- Vista de **lista / agenda** como alternativa al calendario.
- Tarjetas de resumen clicables que funcionan como filtro.
- **Badge de citas pendientes** sin contactar.
- Estados de seguimiento de cada cita (contactada, vista, recordada), guardados en la base de datos.
- **Recordatorio por WhatsApp** el día anterior a la cita.
- **Bloqueo de horarios** para días u horas no disponibles.
- **Duración editable** de cada cita.

## Modelo de datos

- `Cita`: datos del cliente, fecha, hora, duración y estado de seguimiento (contactada, vista, recordada).
- `Bloqueo`: rangos de fecha y hora no disponibles para agendar.
- Los estados de seguimiento pasaron de `localStorage` a PostgreSQL, para que no se pierdan al cambiar de dispositivo o navegador.


## Stack

| Capa | Tecnología |
|---|---|
| Backend | Flask, SQLAlchemy |
| Plantillas | Jinja2 |
| Frontend | HTML, CSS propio, JavaScript, FullCalendar 6 |
| Base de datos | PostgreSQL |
| Despliegue | Railway |

## Estructura del proyecto

```
[ajusta a tu estructura real]
inkora/
├── app/
│   ├── models/          # Cita, Bloqueo
│   ├── routes/
│   ├── services/
│   ├── templates/       # Plantillas Jinja
│   └── static/          # CSS y JS
├── migrations/
├── .env.example
└── requirements.txt
```

## Instalación local

**Requisitos:** Python 3.10+ y PostgreSQL.

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
flask db upgrade
flask run
```


## Autor

**Jorge Alejandro Mora**
