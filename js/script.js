/* =====================================================
   INKORA — FORMULARIO DE COTIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       ELEMENTOS
    ================================================= */

    const modal = document.getElementById("quoteModal");

    const closeButton = document.getElementById("quoteClose");

    const overlay = document.querySelector(".quote-overlay");

    const openButtons = document.querySelectorAll(".js-open-quote");

    const form = document.getElementById("quoteForm");

    const steps = document.querySelectorAll(".quote-step");

    const progressSteps = document.querySelectorAll(".progress-step");

    const nextButtons = document.querySelectorAll(".quote-next");

    const backButtons = document.querySelectorAll(".quote-back");

    const reviewButton = document.querySelector(".quote-review");

    const confirmation = document.getElementById(
        "quoteConfirmation"
    );

    const editButton = document.getElementById("editQuote");

    const sendButton = document.getElementById("sendQuote");

    const referenceImage = document.getElementById(
        "referenceImage"
    );

    const imagePreview = document.getElementById(
        "imagePreview"
    );

    const quoteSummary = document.getElementById(
        "quoteSummary"
    );


    let currentStep = 1;

    let selectedImage = null;


    /* =================================================
       ABRIR MODAL
    ================================================= */

    function openModal() {

        modal.classList.add("active");

        document.body.style.overflow = "hidden";

        currentStep = 1;

        showStep(currentStep);

        form.style.display = "block";

        confirmation.classList.remove("active");

        window.scrollTo(0, 0);
    }


    /* =================================================
       CERRAR MODAL
    ================================================= */

    function closeModal() {

        modal.classList.remove("active");

        document.body.style.overflow = "";

    }


    openButtons.forEach(button => {

        button.addEventListener("click", openModal);

    });


    closeButton.addEventListener(
        "click",
        closeModal
    );


    overlay.addEventListener(
        "click",
        closeModal
    );


    /* =================================================
       ESC PARA CERRAR
    ================================================= */

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            modal.classList.contains("active")
        ) {
            closeModal();
        }

    });


    /* =================================================
       MOSTRAR PASO
    ================================================= */

    function showStep(stepNumber) {

        steps.forEach(step => {

            const stepValue =
                Number(step.dataset.step);

            step.classList.toggle(
                "active",
                stepValue === stepNumber
            );

        });


        progressSteps.forEach(step => {

            const stepValue =
                Number(step.dataset.step);

            step.classList.toggle(
                "active",
                stepValue <= stepNumber
            );

        });


        currentStep = stepNumber;

    }


    /* =================================================
       VALIDAR PASO
    ================================================= */

    function validateCurrentStep() {

        const current =
            document.querySelector(
                `.quote-step[data-step="${currentStep}"]`
            );

        const fields =
            current.querySelectorAll(
                "input[required], select[required], textarea[required]"
            );


        for (const field of fields) {

            if (!field.checkValidity()) {

                field.reportValidity();

                return false;

            }

        }


        return true;

    }


    /* =================================================
       SIGUIENTE
    ================================================= */

    nextButtons.forEach(button => {

        button.addEventListener("click", () => {

            if (!validateCurrentStep()) {

                return;

            }


            if (currentStep < 4) {

                showStep(currentStep + 1);

            }

        });

    });


    /* =================================================
       ATRÁS
    ================================================= */

    backButtons.forEach(button => {

        button.addEventListener("click", () => {

            if (currentStep > 1) {

                showStep(currentStep - 1);

            }

        });

    });


    /* =================================================
       IMAGEN DE REFERENCIA
    ================================================= */

    referenceImage.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) {

                return;

            }


            if (!file.type.startsWith("image/")) {

                alert(
                    "Por favor selecciona una imagen válida."
                );

                referenceImage.value = "";

                return;

            }


            selectedImage = file;


            const reader =
                new FileReader();


            reader.onload = event => {

                const imageURL = event.target.result;

                imagePreview.innerHTML = `
                    <img
                        src="${imageURL}"
                        alt="Imagen de referencia"
                    >
                `;

                imagePreview.style.setProperty(
                    "--preview-image",
                    `url("${imageURL}")`
                );

                imagePreview.classList.add(
                    "active"
                );

            };


            reader.readAsDataURL(file);

        }
    );


    /* =================================================
       CREAR RESUMEN
    ================================================= */

    function createSummary() {

        const name =
            document.getElementById("name").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const idea =
            document.getElementById("idea").value.trim();

        const style =
            document.getElementById("style").value;

        const bodyArea =
            document.getElementById("bodyArea").value;

        const size =
            document.querySelector(
                'input[name="size"]:checked'
            )?.value || "";

        const budget =
            document.getElementById("budget").value;

        const additionalInfo =
            document
                .getElementById("additionalInfo")
                .value
                .trim();


        let html = "";


        html += createSummaryRow(
            "Nombre",
            name
        );


        html += createSummaryRow(
            "WhatsApp",
            phone
        );


        if (email) {

            html += createSummaryRow(
                "Correo",
                email
            );

        }


        html += createSummaryRow(
            "Idea",
            idea
        );


        html += createSummaryRow(
            "Estilo",
            style
        );


        html += createSummaryRow(
            "Zona",
            bodyArea
        );


        html += createSummaryRow(
            "Tamaño",
            size
        );


        if (budget) {

            html += createSummaryRow(
                "Presupuesto",
                budget
            );

        }


        if (additionalInfo) {

            html += createSummaryRow(
                "Información adicional",
                additionalInfo
            );

        }


        if (selectedImage) {

            html += `
                <div class="summary-row">

                    <div class="summary-label">
                        Referencia
                    </div>

                    <div class="summary-value">

                        <span>
                            Imagen seleccionada
                        </span>

                        <img
                            class="summary-image"
                            src="${imagePreview.querySelector("img").src}"
                            alt="Referencia"
                        >

                    </div>

                </div>
            `;

        }


        quoteSummary.innerHTML = html;

    }


    /* =================================================
       FILA DEL RESUMEN
    ================================================= */

    function createSummaryRow(
        label,
        value
    ) {

        return `
            <div class="summary-row">

                <div class="summary-label">
                    ${escapeHTML(label)}
                </div>

                <div class="summary-value">
                    ${escapeHTML(value)}
                </div>

            </div>
        `;

    }

    /* =====================================================
    CUIDADOS — PESTAÑAS
    ===================================================== */

    const careTabs = document.querySelectorAll(".care-tab");
    const carePanels = document.querySelectorAll(".care-panel");

    careTabs.forEach(tab => {

        tab.addEventListener("click", () => {

            const phase = tab.dataset.phase;

            careTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            carePanels.forEach(panel => {

                panel.classList.toggle(
                    "active",
                    panel.dataset.phase === phase
                );

            });

        });

    });


    /* =================================================
       PROTECCIÓN HTML
    ================================================= */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =================================================
       REVISAR SOLICITUD
    ================================================= */

    reviewButton.addEventListener(
        "click",
        () => {

            if (!validateCurrentStep()) {

                return;

            }


            createSummary();


            form.style.display = "none";

            confirmation.classList.add(
                "active"
            );


            document
                .querySelector(".quote-progress")
                .style.display = "none";

        }
    );


    /* =================================================
       EDITAR
    ================================================= */

    editButton.addEventListener(
        "click",
        () => {

            confirmation.classList.remove(
                "active"
            );

            form.style.display = "block";

            document
                .querySelector(".quote-progress")
                .style.display = "flex";


            showStep(4);

        }
    );


    /* =================================================
       ENVIAR A WHATSAPP
    ================================================= */

    sendButton.addEventListener(
        "click",
        () => {

            const name =
                document.getElementById("name").value.trim();

            const phone =
                document.getElementById("phone").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const idea =
                document.getElementById("idea").value.trim();

            const style =
                document.getElementById("style").value;

            const bodyArea =
                document.getElementById("bodyArea").value;

            const size =
                document.querySelector(
                    'input[name="size"]:checked'
                )?.value || "";

            const budget =
                document.getElementById("budget").value;

            const additionalInfo =
                document
                    .getElementById("additionalInfo")
                    .value
                    .trim();


            let message =
                "Hola, INKORA. Quiero solicitar una cotización para un tatuaje.%0A%0A";


            message +=
                "*DATOS DEL CLIENTE*%0A";

            message +=
                `Nombre: ${encodeURIComponent(name)}%0A`;

            message +=
                `WhatsApp: ${encodeURIComponent(phone)}%0A`;


            if (email) {

                message +=
                    `Correo: ${encodeURIComponent(email)}%0A`;

            }


            message +=
                "%0A*DETALLES DEL TATUAJE*%0A";


            message +=
                `Idea: ${encodeURIComponent(idea)}%0A`;

            message +=
                `Estilo: ${encodeURIComponent(style)}%0A`;

            message +=
                `Zona: ${encodeURIComponent(bodyArea)}%0A`;

            message +=
                `Tamaño: ${encodeURIComponent(size)}%0A`;


            if (budget) {

                message +=
                    `Presupuesto: ${encodeURIComponent(budget)}%0A`;

            }


            if (additionalInfo) {

                message +=
                    `%0AInformación adicional:%0A${encodeURIComponent(additionalInfo)}%0A`;

            }


            if (selectedImage) {

                message +=
                    "%0 Tengo una imagen de referencia y la adjuntaré en este chat.%0A";

            }


            message +=
                "%0AGracias.";


            /*
             * IMPORTANTE:
             * Reemplazar este número por el WhatsApp
             * real del tatuador.
             *
             * Formato internacional:
             * Colombia = 57 + número
             */

            const tattooArtistWhatsApp =
                "573127189560";


            const whatsappURL =
                `https://wa.me/${tattooArtistWhatsApp}?text=${message}`;


            window.open(
                whatsappURL,
                "_blank"
            );

        }
    );

    /* =====================================================
    FONDO DIFUMINADO PARA IMÁGENES
    ===================================================== */

    document.querySelectorAll(".image-blur-bg img").forEach(img => {

        const container = img.parentElement;

        // Convierte la ruta relativa en una URL absoluta
        // para que no dependa de dónde vive style.css
        const imageUrl = new URL(
            img.getAttribute("src"),
            document.baseURI
        ).href;

        container.style.setProperty(
            "--image-bg",
            `url("${imageUrl}")`
        );

    });

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

            const nombre = document.getElementById("bookingName").value.trim();
            const telefono = document.getElementById("bookingPhone").value.trim();
            const email = document.getElementById("bookingEmail").value.trim();
            const idea = document.getElementById("bookingIdea").value.trim();

            if (!nombre || !telefono) {
                alert("Por favor completa tu nombre y WhatsApp.");
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
                        tipo_cita: document.getElementById("bookingTipo").value,
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
    CONTADOR ANIMADO
    ===================================================== */

    const counters = document.querySelectorAll("[data-count]");

    const counterObserver = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    animateCounter(entry.target);

                    counterObserver.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.5
        }
    );


    function animateCounter(element) {

        const target = Number(element.dataset.count);

        const duration = 3500;

        const startTime = performance.now();


        function update(currentTime) {

            const elapsed = currentTime - startTime;

            const progress = Math.min(elapsed / duration, 1);

            const value = Math.floor(progress * target);

            element.textContent = value;


            if (progress < 1) {

                requestAnimationFrame(update);

            } else {

                element.textContent = target;

            }

        }


        requestAnimationFrame(update);

    }


    counters.forEach(counter => {

        counterObserver.observe(counter);

    });

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
    BOTÓN MAGNÉTICO
    ===================================================== */

    document.querySelectorAll(".magnetic").forEach(button => {

        button.addEventListener("mousemove", event => {

            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;

        });

        button.addEventListener("mouseleave", () => {

            button.style.transform = "translate(0, 0)";

        });

    });

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

    // Cierra el menú al hacer clic en un enlace
    navMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            menuButton.classList.remove("active");
            navMenu.classList.remove("mobile-active");
            document.body.classList.remove("menu-open");

        });

    });

});