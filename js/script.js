/* =====================================================
   DANIEL TATTO INK — SCRIPT PRINCIPAL
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

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


    /* =====================================================
    FONDO DIFUMINADO PARA IMÁGENES
    ===================================================== */

    document.querySelectorAll(".image-blur-bg img").forEach(img => {

        const container = img.parentElement;

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

    navMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            menuButton.classList.remove("active");
            navMenu.classList.remove("mobile-active");
            document.body.classList.remove("menu-open");

        });

    });

});