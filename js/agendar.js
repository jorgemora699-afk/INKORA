/* =====================================================
   DANIEL TATTO INK — AGENDAR CITA
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       AGENDAR VALORACIÓN
    ===================================================== */

    const API_BASE = "https://inkora-production.up.railway.app";

    const bookingSlots = document.getElementById("bookingSlots");
    const bookingStep1 = document.getElementById("bookingStep1");
    const bookingStep2 = document.getElementById("bookingStep2");
    const bookingSuccess = document.getElementById("bookingSuccess");
    const bookingSelectedInfo = document.getElementById("bookingSelectedInfo");
    const bookingBack = document.getElementById("bookingBack");
    const bookingConfirm = document.getElementById("bookingConfirm");
    const bookingAnother = document.getElementById("bookingAnother");
    const bookingSummary = document.getElementById("bookingSummary");
    const bookingSummaryText = document.getElementById("bookingSummaryText");
    const progressSteps = document.querySelectorAll(".booking-progress-step");

    let fechaSeleccionada = null;   // "YYYY-MM-DD"
    let horaSeleccionada = null;

    /* =====================================================
       PROGRESO
    ===================================================== */

    function setProgress(step) {
        progressSteps.forEach(el => {
            const n = Number(el.dataset.step);
            el.classList.remove("active", "done");
            if (n < step) el.classList.add("done");
            if (n === step) el.classList.add("active");
        });
    }

    /* =====================================================
       CALENDARIO PERSONALIZADO
    ===================================================== */

    const calTitle = document.getElementById("calTitle");
    const calGrid = document.getElementById("calGrid");
    const calPrev = document.getElementById("calPrev");
    const calNext = document.getElementById("calNext");

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let mesVista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const MESES = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    function toISODate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function renderCalendar() {

        calTitle.textContent = `${MESES[mesVista.getMonth()]} ${mesVista.getFullYear()}`;

        const esMesActual = mesVista.getFullYear() === hoy.getFullYear() &&
                             mesVista.getMonth() === hoy.getMonth();

        calPrev.disabled = esMesActual;

        const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
        const ultimoDia = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0);
        const offset = primerDia.getDay(); // 0 = domingo

        calGrid.innerHTML = "";

        for (let i = 0; i < offset; i++) {
            const vacio = document.createElement("span");
            vacio.className = "cal-day cal-day-empty";
            calGrid.appendChild(vacio);
        }

        for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {

            const fecha = new Date(mesVista.getFullYear(), mesVista.getMonth(), dia);
            const iso = toISODate(fecha);

            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "cal-day";
            boton.textContent = dia;

            if (fecha.getTime() === hoy.getTime()) {
                boton.classList.add("cal-day-today");
            }

            if (fecha < hoy) {
                boton.disabled = true;
            }

            if (iso === fechaSeleccionada) {
                boton.classList.add("selected");
            }

            boton.addEventListener("click", () => {
                fechaSeleccionada = iso;
                renderCalendar();
                cargarDisponibilidad(iso);
            });

            calGrid.appendChild(boton);

        }

    }

    calPrev.addEventListener("click", () => {
        mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1);
        renderCalendar();
    });

    calNext.addEventListener("click", () => {
        mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1);
        renderCalendar();
    });

    renderCalendar();

    /* =====================================================
       DISPONIBILIDAD DE HORARIOS
    ===================================================== */

    function mostrarSkeleton() {
        const wrap = document.createElement("div");
        wrap.className = "skeleton-grid";
        for (let i = 0; i < 8; i++) {
            const s = document.createElement("div");
            s.className = "skeleton-slot";
            wrap.appendChild(s);
        }
        bookingSlots.innerHTML = "";
        bookingSlots.appendChild(wrap);
    }

    function agruparPorFranja(horas) {
        const manana = horas.filter(h => h < "12:00");
        const tarde = horas.filter(h => h >= "12:00");
        return { manana, tarde };
    }

    function renderSlots(horas) {

        if (horas.length === 0) {
            bookingSlots.innerHTML = "<p class='booking-hint'>No hay horarios disponibles ese día. Prueba otra fecha.</p>";
            return;
        }

        const { manana, tarde } = agruparPorFranja(horas);
        bookingSlots.innerHTML = "";

        const franjas = [
            { label: "Mañana", horas: manana },
            { label: "Tarde", horas: tarde },
        ];

        franjas.forEach(franja => {

            if (franja.horas.length === 0) return;

            const grupo = document.createElement("div");
            grupo.className = "slots-group";

            const etiqueta = document.createElement("span");
            etiqueta.className = "slots-group-label";
            etiqueta.textContent = franja.label;

            if (franja.horas.length <= 2) {
                const escasez = document.createElement("span");
                escasez.className = "slots-scarcity";
                escasez.textContent = franja.horas.length === 1
                    ? "· solo 1 disponible"
                    : `· solo ${franja.horas.length} disponibles`;
                etiqueta.appendChild(escasez);
            }

            grupo.appendChild(etiqueta);

            const grid = document.createElement("div");
            grid.className = "slots-grid";

            franja.horas.forEach((hora, i) => {

                const boton = document.createElement("button");
                boton.type = "button";
                boton.className = "slot-button";
                boton.textContent = hora;
                boton.style.animationDelay = `${i * 0.04}s`;

                boton.addEventListener("click", () => {
                    horaSeleccionada = hora;
                    mostrarPaso2();
                });

                grid.appendChild(boton);

            });

            grupo.appendChild(grid);
            bookingSlots.appendChild(grupo);

        });

    }

    async function cargarDisponibilidad(fechaISO) {

        mostrarSkeleton();

        try {

            const respuesta = await fetch(
                `${API_BASE}/api/citas/disponibilidad?fecha=${fechaISO}`
            );

            const data = await respuesta.json();

            renderSlots(data.disponibilidad || []);

        } catch (error) {
            bookingSlots.innerHTML = "<p class='booking-hint'>No se pudo cargar la disponibilidad. Intenta de nuevo.</p>";
        }

    }

    /* =====================================================
       PASO 2 — DATOS DEL CLIENTE
    ===================================================== */

    function fechaLegible(fechaISO) {
        return new Date(fechaISO + "T00:00:00")
            .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    }

    function mostrarPaso2() {

        bookingSelectedInfo.textContent = `${fechaLegible(fechaSeleccionada)}, ${horaSeleccionada}`;

        bookingStep1.style.display = "none";
        bookingStep2.style.display = "block";

        setProgress(2);
        actualizarResumen();

    }

    // Permite volver al paso 1 tocando la fecha/hora seleccionada
    bookingSelectedInfo.addEventListener("click", () => {
        bookingStep2.style.display = "none";
        bookingStep1.style.display = "block";
        setProgress(1);
    });

    if (bookingBack) {

        bookingBack.addEventListener("click", () => {
            bookingStep2.style.display = "none";
            bookingStep1.style.display = "block";
            setProgress(1);
        });

    }

    /* =====================================================
       RESUMEN EN VIVO
    ===================================================== */

    const camposResumen = ["bookingTipo", "bookingName", "bookingIdea"];

    function actualizarResumen() {

        const nombre = document.getElementById("bookingName").value.trim();
        const tipo = document.getElementById("bookingTipo");
        const tipoTexto = tipo.value ? tipo.options[tipo.selectedIndex].text : "";

        if (!nombre && !tipoTexto) {
            bookingSummary.style.display = "none";
            return;
        }

        const partes = [];
        partes.push(`📅 ${fechaLegible(fechaSeleccionada)} — 🕐 ${horaSeleccionada}`);
        if (tipoTexto) partes.push(`✦ ${tipoTexto}`);
        if (nombre) partes.push(`para ${nombre}`);

        bookingSummaryText.textContent = partes.join("  ·  ");
        bookingSummary.style.display = "block";

    }

    camposResumen.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", actualizarResumen);
    });

    /* =====================================================
       VALIDACIÓN EN TIEMPO REAL — TELÉFONO
    ===================================================== */

    const bookingPhone = document.getElementById("bookingPhone");
    const bookingPhoneHint = document.getElementById("bookingPhoneHint");

    if (bookingPhone) {

        bookingPhone.addEventListener("input", () => {

            const digitos = bookingPhone.value.replace(/\D/g, "");

            bookingPhone.classList.remove("valid", "invalid");

            if (digitos.length === 0) {
                bookingPhoneHint.textContent = "";
                bookingPhoneHint.classList.remove("invalid");
                return;
            }

            if (digitos.length < 7) {
                bookingPhone.classList.add("invalid");
                bookingPhoneHint.textContent = "Falta el número completo.";
                bookingPhoneHint.classList.add("invalid");
            } else {
                bookingPhone.classList.add("valid");
                bookingPhoneHint.textContent = "Se ve bien.";
                bookingPhoneHint.classList.remove("invalid");
            }

        });

    }

    /* =====================================================
       ENVIAR SOLICITUD
    ===================================================== */

    if (bookingConfirm) {

        bookingConfirm.addEventListener("click", async () => {

            const tipo = document.getElementById("bookingTipo").value;
            const nombre = document.getElementById("bookingName").value.trim();
            const telefono = obtenerTelefonoCompleto();
            const email = document.getElementById("bookingEmail").value.trim();
            const idea = document.getElementById("bookingIdea").value.trim();

            if (!tipo || !nombre || !telefono) {
                alert("Por favor completa el tipo de cita, tu nombre y tu WhatsApp.");
                return;
            }

            if (telefono.length < 8) {
                alert("Revisa tu número de WhatsApp, parece incompleto.");
                return;
            }

            bookingConfirm.disabled = true;
            bookingConfirm.classList.add("loading");

            try {

                const respuesta = await fetch(`${API_BASE}/api/citas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre_cliente: nombre,
                        telefono: telefono,
                        email: email,
                        fecha: fechaSeleccionada,
                        hora: horaSeleccionada,
                        idea: idea,
                        tipo_cita: tipo,
                    }),
                });

                const data = await respuesta.json();

                if (!respuesta.ok) {
                    alert(data.error || "Ese horario ya no está disponible, elige otro.");
                    bookingConfirm.disabled = false;
                    bookingConfirm.classList.remove("loading");
                    return;
                }

                document.getElementById("bookingSuccessMessage").textContent =
                    `Tu horario tentativo es el ${fechaLegible(fechaSeleccionada)} a las ${horaSeleccionada}. ` +
                    `El tatuador se comunicará contigo por WhatsApp para confirmar la cita.`;

                bookingStep2.style.display = "none";
                bookingSuccess.style.display = "block";
                setProgress(3);

            } catch (error) {
                alert("Hubo un error al agendar. Intenta de nuevo.");
                bookingConfirm.disabled = false;
                bookingConfirm.classList.remove("loading");
            }

        });

    }

    if (bookingAnother) {

        bookingAnother.addEventListener("click", () => {

            fechaSeleccionada = null;
            horaSeleccionada = null;

            document.getElementById("bookingTipo").value = "";
            document.getElementById("bookingName").value = "";
            document.getElementById("bookingPhone").value = "";
            document.getElementById("bookingEmail").value = "";
            document.getElementById("bookingIdea").value = "";
            bookingPhoneHint.textContent = "";
            bookingPhone.classList.remove("valid", "invalid");

            bookingConfirm.disabled = false;
            bookingConfirm.classList.remove("loading");

            bookingSlots.innerHTML = "<p class='booking-hint'>Selecciona una fecha para ver horarios disponibles.</p>";

            bookingSuccess.style.display = "none";
            bookingStep1.style.display = "block";

            renderCalendar();
            setProgress(1);

        });

    }

    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements = document.querySelectorAll(".reveal");

    const revealObserver = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    entry.target.classList.add("reveal-active");
                    revealObserver.unobserve(entry.target);
                }

            });

        },
        {
            threshold: 0.15
        }
    );

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    /* =====================================================
    CÓDIGO DE PAÍS
    ===================================================== */

    const bookingCountryCode = document.getElementById("bookingCountryCode");
    const bookingCountryCodeManual = document.getElementById("bookingCountryCodeManual");

    if (bookingCountryCode) {

        bookingCountryCode.addEventListener("change", () => {

            bookingCountryCodeManual.style.display =
                bookingCountryCode.value === "otro" ? "block" : "none";

        });

    }

    function obtenerTelefonoCompleto() {

        const numero = document.getElementById("bookingPhone").value.replace(/\D/g, "");

        let codigoPais = bookingCountryCode.value;

        if (codigoPais === "otro") {
            codigoPais = bookingCountryCodeManual.value.replace(/\D/g, "");
        }

        return codigoPais + numero;

    }

    /* =====================================================
       MENÚ MÓVIL
    ===================================================== */

    const menuButton = document.querySelector(".menu-button");
    const navMenu = document.querySelector(".nav-menu");

    menuButton.addEventListener("click", () => {
        menuButton.classList.toggle("active");
        navMenu.classList.toggle("mobile-active");
        document.body.classList.toggle("menu-open");
    });

    const menuCloseButton = document.querySelector(".menu-close");

    if (menuCloseButton) {

        menuCloseButton.addEventListener("click", () => {
            menuButton.classList.remove("active");
            navMenu.classList.remove("mobile-active");
            document.body.classList.remove("menu-open");
        });

    }

    navMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {
            menuButton.classList.remove("active");
            navMenu.classList.remove("mobile-active");
            document.body.classList.remove("menu-open");
        });

    });

});