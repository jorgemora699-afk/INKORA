/* =====================================================
   DANIEL TATTO INK — SOLICITAR COTIZACIÓN
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       ELEMENTOS
    ================================================= */

    const form = document.getElementById("quoteForm");

    const steps = document.querySelectorAll(".quote-step");

    const progressSteps = document.querySelectorAll(".progress-step");

    const nextButtons = document.querySelectorAll(".quote-next");

    const backButtons = document.querySelectorAll(".quote-back");

    const reviewButton = document.querySelector(".quote-review");

    const confirmation = document.getElementById("quoteConfirmation");

    const editButton = document.getElementById("editQuote");

    const sendButton = document.getElementById("sendQuote");

    const referenceImage = document.getElementById("referenceImage");

    const imagePreview = document.getElementById("imagePreview");

    const quoteSummary = document.getElementById("quoteSummary");


    let currentStep = 1;

    let selectedImage = null;


    /* =================================================
       MOSTRAR PASO
    ================================================= */

    function showStep(stepNumber) {

        steps.forEach(step => {

            const stepValue = Number(step.dataset.step);

            step.classList.toggle("active", stepValue === stepNumber);

        });


        progressSteps.forEach(step => {

            const stepValue = Number(step.dataset.step);

            step.classList.toggle("active", stepValue <= stepNumber);

        });


        currentStep = stepNumber;

    }


    /* =================================================
       VALIDAR PASO
    ================================================= */

    function validateCurrentStep() {

        const current =
            document.querySelector(`.quote-step[data-step="${currentStep}"]`);

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

    referenceImage.addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            alert("Por favor selecciona una imagen válida.");

            referenceImage.value = "";

            return;

        }

        selectedImage = file;

        const reader = new FileReader();

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

            imagePreview.classList.add("active");

        };

        reader.readAsDataURL(file);

    });


    /* =================================================
       CREAR RESUMEN
    ================================================= */

    function createSummary() {

        const name = document.getElementById("name").value.trim();

        const phone = document.getElementById("phone").value.trim();

        const email = document.getElementById("email").value.trim();

        const idea = document.getElementById("idea").value.trim();

        const style = document.getElementById("style").value;

        const bodyArea = document.getElementById("bodyArea").value;

        const size =
            document.querySelector('input[name="size"]:checked')?.value || "";

        const budget = document.getElementById("budget").value;

        const additionalInfo =
            document.getElementById("additionalInfo").value.trim();


        let html = "";

        html += createSummaryRow("Nombre", name);

        html += createSummaryRow("WhatsApp", phone);

        if (email) {
            html += createSummaryRow("Correo", email);
        }

        html += createSummaryRow("Idea", idea);

        html += createSummaryRow("Estilo", style);

        html += createSummaryRow("Zona", bodyArea);

        html += createSummaryRow("Tamaño", size);

        if (budget) {
            html += createSummaryRow("Presupuesto", budget);
        }

        if (additionalInfo) {
            html += createSummaryRow("Información adicional", additionalInfo);
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

    function createSummaryRow(label, value) {

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

    reviewButton.addEventListener("click", () => {

        if (!validateCurrentStep()) {
            return;
        }

        createSummary();

        form.style.display = "none";

        confirmation.classList.add("active");

        document.querySelector(".quote-progress").style.display = "none";

    });


    /* =================================================
       EDITAR
    ================================================= */

    editButton.addEventListener("click", () => {

        confirmation.classList.remove("active");

        form.style.display = "block";

        document.querySelector(".quote-progress").style.display = "flex";

        showStep(4);

    });


    /* =================================================
       ENVIAR A WHATSAPP
    ================================================= */

    sendButton.addEventListener("click", () => {

        const name = document.getElementById("name").value.trim();

        const phone = document.getElementById("phone").value.trim();

        const email = document.getElementById("email").value.trim();

        const idea = document.getElementById("idea").value.trim();

        const style = document.getElementById("style").value;

        const bodyArea = document.getElementById("bodyArea").value;

        const size =
            document.querySelector('input[name="size"]:checked')?.value || "";

        const budget = document.getElementById("budget").value;

        const additionalInfo =
            document.getElementById("additionalInfo").value.trim();


        let message =
            "Hola, Daniel Tatto Ink. Quiero solicitar una cotización para un tatuaje.%0A%0A";

        message += "*DATOS DEL CLIENTE*%0A";

        message += `Nombre: ${encodeURIComponent(name)}%0A`;

        message += `WhatsApp: ${encodeURIComponent(phone)}%0A`;

        if (email) {
            message += `Correo: ${encodeURIComponent(email)}%0A`;
        }

        message += "%0A*DETALLES DEL TATUAJE*%0A";

        message += `Idea: ${encodeURIComponent(idea)}%0A`;

        message += `Estilo: ${encodeURIComponent(style)}%0A`;

        message += `Zona: ${encodeURIComponent(bodyArea)}%0A`;

        message += `Tamaño: ${encodeURIComponent(size)}%0A`;

        if (budget) {
            message += `Presupuesto: ${encodeURIComponent(budget)}%0A`;
        }

        if (additionalInfo) {
            message += `%0AInformación adicional:%0A${encodeURIComponent(additionalInfo)}%0A`;
        }

        if (selectedImage) {
            message += "%0ATengo una imagen de referencia y la adjuntaré en este chat.%0A";
        }

        message += "%0AGracias.";


        /*
         * Número de WhatsApp de Daniel Tatto Ink
         * Formato internacional: Colombia = 57 + número
         */

        const tattooArtistWhatsApp = "573002389080";

        const whatsappURL = `https://wa.me/${tattooArtistWhatsApp}?text=${message}`;

        window.open(whatsappURL, "_blank");

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