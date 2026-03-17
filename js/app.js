(function () {
  // Sivuston JavaScript-logiikka
  // - Mobiilivalikko (hampurilaisnappi)
  // - Hero-kuvakaruselli
  // - Modaalit (soittopyyntö, kiitos-ikkuna)
  // - Lomakkeiden lähetys Google Apps Scriptiin
  // - Evästebanneri

  const body = document.body;

  /* ================================================
     MOBIILIVALIKKO
     Hampurilaisnappi avaa ja sulkee sivupaneelin
  ================================================ */
  const burger = document.querySelector("[data-burger]");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuCloseElements = mobileMenu
    ? mobileMenu.querySelectorAll("[data-menu-close]")
    : [];

  // Avaa mobiilivalikko
  function openMenu() {
    if (!mobileMenu || !burger) return;
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    body.classList.add("no-scroll");
    burger.setAttribute("aria-expanded", "true");
  }

  // Sulje mobiilivalikko
  function closeMenu() {
    if (!mobileMenu || !burger) return;
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    body.classList.remove("no-scroll");
    burger.setAttribute("aria-expanded", "false");
  }

  if (burger && mobileMenu) {
    // Vaihda valikon tila nappia painettaessa
    burger.addEventListener("click", () => {
      const expanded = burger.getAttribute("aria-expanded") === "true";
      expanded ? closeMenu() : openMenu();
    });

    // Sulje valikko kun klikataan sulkemislinkkiä tai -nappia
    menuCloseElements.forEach((el) => {
      el.addEventListener("click", closeMenu);
    });

    // Sulje valikko Escape-näppäimellä
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mobileMenu.classList.contains("is-open")) {
        closeMenu();
      }
    });
  }

  /* ================================================
     HERO-KUVAKARUSELLI
     Vaihtaa automaattisesti kuvaa 5 sekunnin välein
     Tukee laiskaa latausta (lazy loading) data-bg-attribuutilla
  ================================================ */
  const slides = document.querySelectorAll(".hero__slide");
  const images = document.querySelectorAll(".hero__img");
  const dots = document.querySelectorAll(".hero__dot");

  let currentIndex = 0;
  let sliderInterval = null;

  // Näytä tietty slide ja lataa kuva tarvittaessa
  function showSlide(index) {
    const lazyImg = images[index];
    if (lazyImg && lazyImg.dataset.bg && !lazyImg.style.backgroundImage) {
      lazyImg.style.backgroundImage = "url('" + lazyImg.dataset.bg + "')";
    }
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    images.forEach((img, i) => img.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    currentIndex = index;
  }

  // Siirry seuraavaan slideen
  function nextSlide() {
    if (!slides.length) return;
    showSlide((currentIndex + 1) % slides.length);
  }

  // Pysäytä automaattinen pyöritys
  function stopSlider() {
    if (sliderInterval) {
      clearInterval(sliderInterval);
      sliderInterval = null;
    }
  }

  // Käynnistä automaattinen pyöritys (5 sekunnin välein)
  function startSlider() {
    if (slides.length < 2) return;
    stopSlider();
    sliderInterval = window.setInterval(nextSlide, 5000);
  }

  if (slides.length && images.length && dots.length) {
    // Pisteet: klikkaus vaihtaa sliden manuaalisesti
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        showSlide(Number(dot.dataset.index));
        startSlider();
      });
    });

    showSlide(0);
    startSlider();
  }

  /* ================================================
     MODAALIT
     - Soittopyyntömodaali: avautuu "Soittopyyntö"-napista
     - Kiitos-modaali: avautuu onnistuneen lähetyksen jälkeen
  ================================================ */
  const callbackModal = document.getElementById("callbackModal");
  const callbackOpenButtons = document.querySelectorAll("[data-callback-open]");
  const callbackCloseButtons = callbackModal
    ? callbackModal.querySelectorAll("[data-callback-close]")
    : [];

  const successModal = document.getElementById("successModal");
  const successCloseButtons = successModal
    ? successModal.querySelectorAll("[data-close]")
    : [];

  // Avaa soittopyyntömodaali
  function openCallbackModal() {
    if (!callbackModal) return;
    callbackModal.classList.add("is-open");
    callbackModal.setAttribute("aria-hidden", "false");
    body.classList.add("no-scroll");
  }

  // Sulje soittopyyntömodaali
  function closeCallbackModal() {
    if (!callbackModal) return;
    callbackModal.classList.remove("is-open");
    callbackModal.setAttribute("aria-hidden", "true");
    body.classList.remove("no-scroll");
  }

  // Avaa kiitos-modaali onnistuneen lähetyksen jälkeen
  function openSuccessModal() {
    if (!successModal) return;
    successModal.classList.add("is-open");
    successModal.setAttribute("aria-hidden", "false");
    body.classList.add("no-scroll");
  }

  // Sulje kiitos-modaali
  function closeSuccessModal() {
    if (!successModal) return;
    successModal.classList.remove("is-open");
    successModal.setAttribute("aria-hidden", "true");
    body.classList.remove("no-scroll");
  }

  // Avaa soittopyyntömodaali napeista
  callbackOpenButtons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openCallbackModal();
      closeMenu();
    });
  });

  // Sulje soittopyyntömodaali
  callbackCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeCallbackModal);
  });

  // Sulje kiitos-modaali
  successCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeSuccessModal);
  });

  // Sulje modaalit Escape-näppäimellä
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (callbackModal && callbackModal.classList.contains("is-open")) {
        closeCallbackModal();
      }
      if (successModal && successModal.classList.contains("is-open")) {
        closeSuccessModal();
      }
    }
  });

  /* ================================================
     LOMAKKEIDEN LÄHETYS → GOOGLE APPS SCRIPT
     Lähettää lomakkeen tiedot JSON-muodossa
     Google Apps Script tallentaa ne Sheetsiin ja
     lähettää ilmoituksen Telegramiin
  ================================================ */

  // Google Apps Script -verkkosovellusURL
  // TÄRKEÄÄ: Päivitä tämä URL aina kun teet uuden Redeployn
  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbz4jBmNRdjGSvbQ9MolojjNQq5sW9UZvScqLTj5_J0SENErjyF7X5Sq5FThpYdiqLIl/exec";

  // Lähetä lomakkeen tiedot palvelimelle
  async function sendForm(payload) {
    if (!WEB_APP_URL || WEB_APP_URL.includes("PASTE_YOUR")) {
      throw new Error("WEB_APP_URL puuttuu");
    }
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { ok: true };
  }

  // Hae valittujen checkboxien arvot
  function checkedValues(form, name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(
      (input) => input.value
    );
  }

  /* ------------------------------------------------
     SOITTOPYYNTÖLOMAKE
     Pakolliset kentät: nimi, puhelin
     Valinnaiset: paras aika soittaa, viesti
  ------------------------------------------------ */
  const callbackForm = document.getElementById("callbackForm");
  const callbackFormStatus = document.getElementById("callbackFormStatus");
  const callbackSubmitBtn = document.getElementById("callbackSubmitBtn");

  if (callbackForm) {
    callbackForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(callbackForm);
      const payload = {
        form_type: "callback",
        source: "website",
        name: formData.get("name")?.toString().trim() || "",
        phone: formData.get("phone")?.toString().trim() || "",
        call_time: formData.get("call_time")?.toString().trim() || "",
        message: formData.get("message")?.toString().trim() || "",
      };

      // Tarkista pakolliset kentät: nimi ja puhelin
      if (!payload.name || !payload.phone) {
        if (callbackFormStatus) {
          callbackFormStatus.textContent = "Täytä nimi ja puhelin.";
        }
        return;
      }

      if (callbackSubmitBtn) callbackSubmitBtn.disabled = true;
      if (callbackFormStatus) callbackFormStatus.textContent = "Lähetetään...";

      try {
        await sendForm(payload);
        callbackForm.reset();
        if (callbackFormStatus) callbackFormStatus.textContent = "Kiitos! Pyyntö lähetettiin.";
        setTimeout(() => {
          closeCallbackModal();
          if (callbackFormStatus) callbackFormStatus.textContent = "";
          openSuccessModal();
        }, 800);
      } catch (error) {
        console.error("Soittopyyntölomakkeen lähetysvirhe:", error);
        if (callbackFormStatus) {
          callbackFormStatus.textContent = "Virhe lähetyksessä. Yritä uudelleen.";
        }
      } finally {
        if (callbackSubmitBtn) callbackSubmitBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------
     YHTEYDENOTTOLOMAKE
     Pakolliset kentät: nimi, puhelin, GDPR-hyväksyntä
     Valinnaiset: sähköposti, viesti, palvelut
  ------------------------------------------------ */
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const payload = {
        form_type: "contact",
        source: "website",
        name: formData.get("name")?.toString().trim() || "",
        phone: formData.get("phone")?.toString().trim() || "",
        email: formData.get("email")?.toString().trim() || "",
        message: formData.get("message")?.toString().trim() || "",
        services: checkedValues(contactForm, "services"),
        gdpr: formData.get("gdpr") ? "yes" : "no",
      };

      // Tarkista pakolliset kentät: nimi ja puhelin
      // Viesti on vapaaehtoinen
      if (!payload.name || !payload.phone) {
        if (formStatus) formStatus.textContent = "Täytä nimi ja puhelin.";
        return;
      }

      // Tarkista GDPR-hyväksyntä
      if (payload.gdpr !== "yes") {
        if (formStatus) formStatus.textContent = "Hyväksy tietojen käsittely.";
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (formStatus) formStatus.textContent = "Lähetetään...";

      try {
        await sendForm(payload);
        contactForm.reset();
        if (formStatus) formStatus.textContent = "Kiitos! Viesti lähetettiin.";
        setTimeout(() => {
          if (formStatus) formStatus.textContent = "";
          openSuccessModal();
        }, 800);
      } catch (error) {
        console.error("Yhteydenottolomakkeen lähetysvirhe:", error);
        if (formStatus) formStatus.textContent = "Virhe lähetyksessä. Yritä uudelleen.";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ================================================
     EVÄSTEBANNERI
     Näytetään kerran jos käyttäjä ei ole vielä
     hyväksynyt tai hylännyt evästeitä
  ================================================ */
  const cookieBanner = document.getElementById("cookieBanner");
  const cookieAccept = document.getElementById("cookieAccept");
  const cookieDecline = document.getElementById("cookieDecline");

  // Piilota evästebanneri
  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.classList.remove("is-visible");
  }

  if (cookieBanner) {
    // Näytä banneri jos suostumus puuttuu
    if (!localStorage.getItem("cookieConsent")) {
      setTimeout(() => cookieBanner.classList.add("is-visible"), 800);
    }

    // Käyttäjä hyväksyy evästeet
    if (cookieAccept) {
      cookieAccept.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "accepted");
        hideCookieBanner();
      });
    }

    // Käyttäjä hylkää evästeet
    if (cookieDecline) {
      cookieDecline.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "declined");
        hideCookieBanner();
      });
    }
  }

})();
