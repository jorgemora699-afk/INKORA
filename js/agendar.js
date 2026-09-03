/* =====================================================
   DANIEL TATTO INK — AGENDAR CITA
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       AGENDAR VALORACIÓN
    ===================================================== */

    const API_BASE = "https://inkora-production.up.railway.app";

    const bookingDate = document.getElementById("bookingDate");
    const bookingSlots = document.getElementById("bookingSlots");
    const bookingStep1 = document.getElementById("bookingStep1");
    const bookingStep2 = document.getElementById("bookingStep2");
    const bookingSuccess = document.getElementById("bookingSuccess");
    const bookingSelectedInfo = document.getElementById("bookingSelectedInfo");
    const bookingBack = document.getElementById("bookingBack");
    const bookingConfirm = document.getElementById("bookingConfirm");

    let horaSeleccionada = null;

    if (bookingDate) {

        const hoy = new Date().toISOString().split("T")[0];
        bookingDate.setAttribute("min", hoy);

        bookingDate.addEventListener("change", async () => {

            if (!bookingDate.value) return;

            bookingSlots.innerHTML = "<p class='booking-hint'>Cargando horarios...</p>";

            try {

                const respuesta = await fetch(
                    `${API_BASE}/api/citas/disponibilidad?fecha=${bookingDate.value}`
                );

                const data = await respuesta.json();

                if (!data.disponibilidad || data.disponibilidad.length === 0) {
                    bookingSlots.innerHTML = "<p class='booking-hint'>No hay horarios disponibles ese día. Prueba otra fecha.</p>";
                    return;
                }

                const grid = document.createElement("div");
                grid.className = "slots-grid";

                data.disponibilidad.forEach(hora => {

                    const boton = document.createElement("button");
                    boton.type = "button";
                    boton.className = "slot-button";
                    boton.textContent = hora;

                    boton.addEventListener("click", () => {
                        horaSeleccionada = hora;
                        mostrarPaso2();
                    });

                    grid.appendChild(boton);

                });

                bookingSlots.innerHTML = "";
                bookingSlots.appendChild(grid);

            } catch (error) {
                bookingSlots.innerHTML = "<p class='booking-hint'>No se pudo cargar la disponibilidad. Intenta de nuevo.</p>";
            }

        });

    }

    function mostrarPaso2() {

        const fechaFormateada = new Date(bookingDate.value + "T00:00:00")
            .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

        bookingSelectedInfo.textContent = `${fechaFormateada}, ${horaSeleccionada}`;

        bookingStep1.style.display = "none";
        bookingStep2.style.display = "block";

    }

    if (bookingBack) {

        bookingBack.addEventListener("click", () => {
            bookingStep2.style.display = "none";
            bookingStep1.style.display = "block";
        });

    }

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
            bookingConfirm.textContent = "Enviando...";

            try {

                const respuesta = await fetch(`${API_BASE}/api/citas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre_cliente: nombre,
                        telefono: telefono,
                        email: email,
                        fecha: bookingDate.value,
                        hora: horaSeleccionada,
                        idea: idea,
                        tipo_cita: tipo,
                    }),
                });

                const data = await respuesta.json();

                if (!respuesta.ok) {
                    alert(data.error || "Ese horario ya no está disponible, elige otro.");
                    bookingConfirm.disabled = false;
                    bookingConfirm.textContent = "Confirmar cita";
                    return;
                }

                const fechaFormateada = new Date(bookingDate.value + "T00:00:00")
                    .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

                document.getElementById("bookingSuccessMessage").textContent =
                    `Te esperamos el ${fechaFormateada} a las ${horaSeleccionada}. Te contactaremos por WhatsApp para confirmar.`;

                bookingStep2.style.display = "none";
                bookingSuccess.style.display = "block";

            } catch (error) {
                alert("Hubo un error al agendar. Intenta de nuevo.");
                bookingConfirm.disabled = false;
                bookingConfirm.textContent = "Confirmar cita";
            }

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