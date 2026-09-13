document.addEventListener("DOMContentLoaded", () => {
  /* Puhelimen valikko. */

  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuClose = document.getElementById("menuClose");
  const menuOverlay = document.getElementById("menuOverlay");

  function openMenu() {
    if (!mobileMenu || !menuOverlay) return;

    mobileMenu.inert = false;
    mobileMenu.setAttribute("aria-hidden", "false");
    mobileMenu.classList.add("is-open");
    menuOverlay.classList.add("is-open");

    document.body.classList.add("menu-open");
    menuBackground(true);

    menuClose?.focus({ preventScroll: true });

    if (burger) {
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Sulje valikko");
    }
  }

  function closeMenu() {
    if (!mobileMenu?.classList.contains("is-open")) return;
    if (!mobileMenu || !menuOverlay) return;

    mobileMenu.classList.remove("is-open");
    mobileMenu.inert = true;
    mobileMenu.setAttribute("aria-hidden", "true");
    menuOverlay.classList.remove("is-open");

    document.body.classList.remove("menu-open");
    menuBackground(false);

    if (burger) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Avaa valikko");
      burger.focus({ preventScroll: true });
    }
  }

  if (burger) {
    burger.addEventListener("click", () => {
      mobileMenu?.classList.contains("is-open") ? closeMenu() : openMenu();
    });
  }

  if (menuClose) {
    menuClose.addEventListener("click", closeMenu);
  }

  if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  function menuBackground(locked) {
    document
      .querySelectorAll(
        "main, .footer, .cookieBanner, .siteHeader .logo, .desktopNav, .headerCTA",
      )
      .forEach((el) => {
        el.inert = locked;
      });
  }

  window
    .matchMedia("(min-width: 1101px)")
    .addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });

  function trapFocus(event, container) {
    if (event.key !== "Tab") return;

    const controls = [
      ...container.querySelectorAll("a[href], button:not(:disabled)"),
    ].filter((el) => el.getClientRects().length);

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (!first) return;

    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !container.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !container.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (mobileMenu?.classList.contains("is-open")) {
      trapFocus(event, mobileMenu);
    }
  });

  /* Sivun sisäiset linkit liikkuvat pehmeästi. */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") return;

      const target = document.querySelector(href);

      if (!target) return;

      event.preventDefault();

      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }

      target.focus({
        preventScroll: true,
      });

      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  });

  /* Yhteydenottolomake ja kuvat. */

  const form = document.getElementById("contactForm");
  const submitButton = document.getElementById("submitBtn");
  const formStatus = document.getElementById("formStatus");

  /* Tämä on Google Apps Scriptin osoite. Älä muuta sitä ilman uutta julkaisua. */
  const FORM_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbwJn8UpU-k6zuEpr5CPItNg7mH8eqU3vNaWvW_peY5LGvxAQkc76CeFPk4JVkEfYpmyhw/exec";

  const MAX_PHOTOS = 5;

  /* Suurin sallittu kuvan koko on 8 Mt. */
  const MAX_SOURCE_SIZE = 8 * 1024 * 1024;

  /* Suuret kuvat pienennetään ennen lähetystä. */
  const MAX_IMAGE_SIDE = 1600;

  /* Kuvan laatu lähetyksessä. */
  const JPEG_QUALITY = 0.8;

  const selectedPhotos = [];
  const photoUrls = new Map();

  const photoInput = document.getElementById("photoInput");
  const photoAdd = document.getElementById("photoAdd");
  const photoPreviews = document.getElementById("photoPreviews");
  const photoCounter = document.getElementById("photoCounter");
  const photoStatus = document.getElementById("photoStatus");

  let photoGeneration = 0;

  /* Kuvien esikatselu ja poistaminen. */

  function setPhotoStatus(message = "") {
    if (photoStatus) {
      photoStatus.textContent = message;
    }
  }

  function renderPhotos() {
    if (!photoPreviews || !photoCounter) return;

    photoPreviews.replaceChildren();

    photoCounter.textContent = `${selectedPhotos.length} / ${MAX_PHOTOS} kuvaa`;

    selectedPhotos.forEach((file, index) => {
      const item = document.createElement("li");

      const preview = document.createElement("img");

      preview.src = photoUrls.get(file);
      preview.alt = `Esikatselu: ${file.name}`;

      const remove = document.createElement("button");

      remove.type = "button";
      remove.className = "photoUpload__remove";
      remove.textContent = "×";

      remove.setAttribute("aria-label", `Poista kuva: ${file.name}`);

      remove.addEventListener("click", () => {
        const currentIndex = selectedPhotos.indexOf(file);

        if (currentIndex !== -1) {
          selectedPhotos.splice(currentIndex, 1);
        }

        const url = photoUrls.get(file);

        if (url) {
          URL.revokeObjectURL(url);
        }

        photoUrls.delete(file);

        setPhotoStatus();
        renderPhotos();

        const buttons = photoPreviews.querySelectorAll("button");

        (buttons[Math.min(index, buttons.length - 1)] || photoAdd)?.focus({
          preventScroll: true,
        });
      });

      item.append(preview, remove);

      photoPreviews.append(item);
    });
  }

  function clearSelectedPhotos() {
    photoGeneration += 1;

    photoUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    photoUrls.clear();

    selectedPhotos.length = 0;

    if (photoInput) {
      photoInput.value = "";
    }

    setPhotoStatus();
    renderPhotos();
  }

  /* Kuvan käsittely ennen lähetystä. */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("IMAGE_DECODE_FAILED"));
      };

      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("IMAGE_COMPRESSION_FAILED"));
          }
        },
        type,
        quality,
      );
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("FILE_READ_FAILED"));
      };

      reader.readAsDataURL(blob);
    });
  }

  /* Yhden kuvan valmistelu. */

  async function preparePhoto(file, index) {
    const image = await loadImage(file);

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("INVALID_IMAGE_SIZE");
    }

    /* Kuvan mittasuhteet säilyvät. */
    const scale = Math.min(
      1,
      MAX_IMAGE_SIDE / Math.max(sourceWidth, sourceHeight),
    );

    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error("CANVAS_NOT_AVAILABLE");
    }

    /* Valkoinen tausta lisätään ennen JPEG-muotoa. */
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    context.drawImage(image, 0, 0, width, height);

    /* Kuvat muutetaan JPEG-muotoon. */
    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

    const data = await blobToDataUrl(blob);

    /* Tehdään turvallinen tiedostonimi Google Driveen. */
    const baseName =
      file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^\p{L}\p{N}_-]+/gu, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 70) || `kuva_${index + 1}`;

    return {
      name: `${baseName}.jpg`,
      type: "image/jpeg",
      data,
    };
  }

  /* Kaikkien kuvien valmistelu. */

  async function preparePhotosForUpload() {
    const photos = [];

    for (let index = 0; index < selectedPhotos.length; index += 1) {
      setPhotoStatus(
        `Valmistellaan kuvia ${index + 1} / ${selectedPhotos.length}...`,
      );

      const preparedPhoto = await preparePhoto(selectedPhotos[index], index);

      photos.push(preparedPhoto);
    }

    return photos;
  }

  /* Kuvien valinta. */

  if (photoInput && photoAdd && photoPreviews && photoCounter) {
    photoAdd.addEventListener("click", () => {
      photoInput.click();
    });

    photoInput.addEventListener("change", async () => {
      const files = [...(photoInput.files || [])];

      /* Sama kuva voidaan valita myöhemmin uudelleen. */
      photoInput.value = "";

      const generation = photoGeneration;
      const errors = new Set();

      for (const file of files) {
        if (generation !== photoGeneration) {
          return;
        }

        if (selectedPhotos.length >= MAX_PHOTOS) {
          errors.add(
            "Voit valita enintään 5 kuvaa. Poista kuva ennen uuden lisäämistä.",
          );

          break;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
          errors.add("Valitse JPG-, PNG- tai WebP-kuva.");
          continue;
        }

        if (file.size > MAX_SOURCE_SIZE) {
          errors.add("Yhden kuvan enimmäiskoko on 8 Mt.");
          continue;
        }

        /* Tarkistetaan, että kuva voidaan avata. */
        const url = URL.createObjectURL(file);

        const image = new Image();
        image.src = url;

        try {
          await image.decode();

          if (
            generation !== photoGeneration ||
            selectedPhotos.length >= MAX_PHOTOS
          ) {
            URL.revokeObjectURL(url);

            if (generation !== photoGeneration) {
              return;
            }

            errors.add("Voit valita enintään 5 kuvaa.");
            continue;
          }

          selectedPhotos.push(file);
          photoUrls.set(file, url);
        } catch {
          URL.revokeObjectURL(url);

          errors.add(
            "Kuvaa ei voitu avata. Valitse toimiva JPG-, PNG- tai WebP-kuva.",
          );
        }
      }

      if (generation !== photoGeneration) {
        return;
      }

      renderPhotos();
      setPhotoStatus([...errors].join(" "));
    });
  }

  /* Lomakkeen tyhjennys. */

  if (form) {
    form.addEventListener("reset", () => {
      /* Myös valitut kuvat poistetaan. */
      window.setTimeout(clearSelectedPhotos, 0);
    });

    /* Lomakkeen lähetys. */

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (submitButton?.disabled) {
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const formData = new FormData(form);

      const payload = {
        form_type: "contact",
        source: "website",

        name: formData.get("name")?.toString().trim() || "",
        phone: formData.get("phone")?.toString().trim() || "",
        email: formData.get("email")?.toString().trim() || "",
        message: formData.get("message")?.toString().trim() || "",
        services: formData.getAll("services"),
        gdpr: formData.get("gdpr") ? "yes" : "no",

        /* Jos kuvia ei ole, lista on tyhjä. */
        photos: [],
      };

      /* Pakolliset tiedot tarkistetaan. */

      if (!payload.name || !payload.phone || payload.gdpr !== "yes") {
        if (formStatus) {
          formStatus.textContent =
            "Täytä nimi ja puhelin sekä hyväksy tietojen käsittely.";
        }

        return;
      }

      /* Lähetyspainike poistetaan hetkeksi käytöstä. */

      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent = selectedPhotos.length
          ? "Kuvia valmistellaan..."
          : "Lähetetään...";
      }

      if (formStatus) {
        formStatus.textContent = "";
      }

      try {
        /* Valmistellaan kuvat vain, jos asiakas valitsi kuvia. */

        if (selectedPhotos.length) {
          payload.photos = await preparePhotosForUpload();

          if (submitButton) {
            submitButton.textContent = "Lähetetään...";
          }
        }

        /* Lähetetään tiedot Google Apps Scriptiin. */

        await fetch(FORM_ENDPOINT, {
          method: "POST",

          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },

          body: JSON.stringify(payload),

          /* no-cors tarvitaan nykyisessä Apps Script -ratkaisussa. */
          mode: "no-cors",
        });

        /* Lähetys tarkistetaan Google Sheetsistä, Telegramista ja Drivestä. */

        /* Lähetys onnistui. */

        form.reset();

        openSuccessModal();

        if (formStatus) {
          formStatus.textContent = "Kiitos! Viestisi on lähetetty.";
        }
      } catch (error) {
        /* Virhe lähetyksessä. */

        console.error("Contact form error:", error);

        if (selectedPhotos.length) {
          setPhotoStatus(
            "Kuvien käsittely tai lähetys epäonnistui. Kokeile uudelleen.",
          );
        } else {
          setPhotoStatus("");
        }

        if (formStatus) {
          formStatus.textContent =
            "Viestin lähetys epäonnistui. Yritä uudelleen tai ota yhteyttä puhelimitse.";
        }
      } finally {
        /* Palautetaan lähetyspainike normaaliksi. */

        if (submitButton) {
          submitButton.disabled = false;

          submitButton.innerHTML =
            'Lähetä viesti <span aria-hidden="true">→</span>';
        }
      }
    });
  }

  /* Kiitos-ikkuna. */

  const successModal = document.getElementById("successModal");

  let returnFocus = null;

  function openSuccessModal() {
    if (!successModal) return;

    closeMenu();

    returnFocus = submitButton || document.activeElement;

    successModal.classList.add("is-open");
    successModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    document
      .querySelectorAll(".siteHeader, main, .footer, .cookieBanner")
      .forEach((el) => {
        el.inert = true;
      });

    successModal.querySelector("button")?.focus();
  }

  function closeSuccessModal() {
    if (!successModal?.classList.contains("is-open")) {
      return;
    }

    successModal.classList.remove("is-open");
    successModal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    document
      .querySelectorAll(".siteHeader, main, .footer, .cookieBanner")
      .forEach((el) => {
        el.inert = false;
      });

    returnFocus?.focus();
  }

  successModal?.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeSuccessModal);
  });

  document.addEventListener("keydown", (event) => {
    if (!successModal?.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      closeSuccessModal();
    }

    trapFocus(event, successModal);
  });

  /* Evästevalinta. */

  const cookieBanner = document.getElementById("cookieBanner");

  let consent = null;

  try {
    consent = localStorage.getItem("cookieConsent");
  } catch {
    /* localStorage ei aina ole käytettävissä. */
  }

  if (!consent) {
    cookieBanner?.classList.add("is-visible");
  }

  for (const [id, value] of [
    ["cookieAccept", "accepted"],
    ["cookieDecline", "declined"],
  ]) {
    document.getElementById(id)?.addEventListener("click", () => {
      try {
        localStorage.setItem("cookieConsent", value);
      } catch {
        /* Jos tallennus ei toimi, banneri suljetaan vain tältä käynniltä. */
      }

      cookieBanner?.classList.remove("is-visible");
    });
  }
});