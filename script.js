(() => {
  const header = document.querySelector('[data-scroll-header]');
  const toast = document.querySelector('[data-toast]');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  const showToast = (text) => {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2200);
  };

  document.querySelectorAll('[data-share]').forEach((button) => {
    button.addEventListener('click', async () => {
      const shareData = {
        title: 'Fearless: The Altar of Light and Darkness',
        text: 'Download the free illustrated ebook by RollinD.',
        url: window.location.href.split('#')[0]
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(shareData.url);
          showToast('Link copied.');
        }
      } catch (_) {
        showToast('Share canceled.');
      }
    });
  });

  const lightbox = document.querySelector('[data-art-lightbox]');
  const galleryLinks = [...document.querySelectorAll('.book-art-card a')];
  if (lightbox && galleryLinks.length) {
    const lightboxImage = lightbox.querySelector('[data-lightbox-image]');
    const lightboxCaption = lightbox.querySelector('[data-lightbox-caption]');
    const lightboxCount = lightbox.querySelector('[data-lightbox-count]');
    const closeLightboxButton = lightbox.querySelector('[data-lightbox-close]');
    const previousLightboxButton = lightbox.querySelector('[data-lightbox-prev]');
    const nextLightboxButton = lightbox.querySelector('[data-lightbox-next]');
    let activeArtworkIndex = 0;

    const showArtwork = (index) => {
      activeArtworkIndex = (index + galleryLinks.length) % galleryLinks.length;
      const link = galleryLinks[activeArtworkIndex];
      const image = link.querySelector('img');
      const caption = link.querySelector('figcaption')?.textContent?.trim() || image?.alt || 'Fearless artwork';

      lightboxImage.src = link.href;
      lightboxImage.alt = image?.alt || caption;
      lightboxCaption.textContent = caption;
      lightboxCount.textContent = `${activeArtworkIndex + 1} / ${galleryLinks.length}`;
    };

    const openLightbox = (index) => {
      showArtwork(index);
      lightbox.hidden = false;
      document.body.classList.add('lightbox-open');
      closeLightboxButton.focus({ preventScroll: true });
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.classList.remove('lightbox-open');
    };

    galleryLinks.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openLightbox(index);
      });
    });

    closeLightboxButton.addEventListener('click', closeLightbox);
    previousLightboxButton.addEventListener('click', () => showArtwork(activeArtworkIndex - 1));
    nextLightboxButton.addEventListener('click', () => showArtwork(activeArtworkIndex + 1));
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    window.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showArtwork(activeArtworkIndex - 1);
      if (event.key === 'ArrowRight') showArtwork(activeArtworkIndex + 1);
    });
  }

  const pdfReader = document.querySelector('[data-pdf-reader]');
  if (pdfReader) {
    const frame = pdfReader.querySelector('[data-reader-frame]');
    const pageInput = pdfReader.querySelector('[data-reader-page]');
    const goButton = pdfReader.querySelector('[data-reader-go]');
    const saveButton = pdfReader.querySelector('[data-reader-save]');
    const resumeButton = pdfReader.querySelector('[data-reader-resume]');
    const openLink = pdfReader.querySelector('[data-reader-open]');
    const status = pdfReader.querySelector('[data-reader-status]');
    const pdfSrc = pdfReader.dataset.pdfSrc || '/downloads/Fearless_Book1_RollinD_Free_Ebook.pdf';
    const totalPages = Number(pdfReader.dataset.totalPages || pageInput?.max || 295);
    const storageKey = 'fearlessPdfSavedPage';

    const clampPage = (value) => {
      const page = Number.parseInt(value, 10);
      if (!Number.isFinite(page)) return 1;
      return Math.min(Math.max(page, 1), totalPages);
    };

    const pdfUrl = (page) => `${pdfSrc}#page=${page}&view=FitH`;

    const getSavedPage = () => {
      try {
        return clampPage(window.localStorage.getItem(storageKey) || 1);
      } catch (_) {
        return 1;
      }
    };

    const setSavedPage = (page) => {
      try {
        window.localStorage.setItem(storageKey, String(page));
        status.textContent = `Saved page ${page} on this device.`;
        showToast(`Saved page ${page}.`);
      } catch (_) {
        status.textContent = `Page ${page} is ready.`;
      }
    };

    const loadPage = (page, shouldSave = false) => {
      const nextPage = clampPage(page);
      const nextUrl = pdfUrl(nextPage);
      pageInput.value = String(nextPage);
      frame.src = nextUrl;
      openLink.href = nextUrl;
      status.textContent = `Viewing page ${nextPage} of ${totalPages}.`;
      if (shouldSave) setSavedPage(nextPage);
    };

    const savedPage = getSavedPage();
    loadPage(savedPage);

    goButton.addEventListener('click', () => loadPage(pageInput.value));
    saveButton.addEventListener('click', () => setSavedPage(clampPage(pageInput.value)));
    resumeButton.addEventListener('click', () => loadPage(getSavedPage()));
    pageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadPage(pageInput.value);
    });
  }

  const albumPlayer = document.querySelector('[data-album-player]');
  if (!albumPlayer) return;

  const albumVideo = albumPlayer.querySelector('[data-album-video]');
  const albumFallback = albumPlayer.querySelector('[data-album-fallback]');
  const albumCover = albumPlayer.querySelector('[data-album-cover]');
  const albumAudio = albumPlayer.querySelector('[data-album-audio]');
  const albumTitle = albumPlayer.querySelector('[data-album-title]');
  const albumCaption = albumPlayer.querySelector('[data-album-caption]');
  const albumPanelTitle = albumPlayer.querySelector('[data-album-panel-title]');
  const albumPanelCaption = albumPlayer.querySelector('[data-album-panel-caption]');
  const albumTags = albumPlayer.querySelector('[data-album-tags]');
  const albumList = albumPlayer.querySelector('[data-album-list]');
  const albumMp3 = albumPlayer.querySelector('[data-album-mp3]');
  const albumSuno = albumPlayer.querySelector('[data-album-suno]');

  const shorten = (text, limit = 220) => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
  };

  const renderTags = (tags) => {
    albumTags.replaceChildren();
    String(tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 4)
      .forEach((tag) => {
        const chip = document.createElement('span');
        chip.textContent = tag;
        albumTags.append(chip);
      });
  };

  const setActiveTrack = (track, shouldPlayAudio = false) => {
    albumTitle.textContent = track.title;
    albumCaption.textContent = shorten(track.caption || track.tags || 'Cinematic companion track.');
    albumPanelTitle.textContent = track.title;
    albumPanelCaption.textContent = shorten(track.caption || track.tags || 'Cinematic companion track.', 180);
    renderTags(track.tags);

    albumFallback.src = track.imageUrl;
    albumFallback.alt = '';
    albumCover.src = track.imageUrl;
    albumCover.alt = `${track.title} artwork`;
    albumMp3.href = track.audioUrl;
    albumSuno.href = track.sunoUrl;

    albumAudio.src = track.audioUrl;
    albumVideo.poster = track.imageUrl;
    albumVideo.src = track.videoUrl;
    albumVideo.load();
    albumVideo.play().catch(() => {});

    albumList.querySelectorAll('.track-button').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.trackNumber) === track.number));
    });

    if (shouldPlayAudio) {
      albumAudio.play().catch(() => showToast('Press play to start audio.'));
    }
  };

  const buildTrackButton = (track) => {
    const button = document.createElement('button');
    button.className = 'track-button';
    button.type = 'button';
    button.dataset.trackNumber = String(track.number);
    button.setAttribute('aria-pressed', 'false');

    const number = document.createElement('span');
    number.className = 'track-number';
    number.textContent = String(track.number).padStart(2, '0');

    const copy = document.createElement('span');
    copy.className = 'track-copy';

    const title = document.createElement('strong');
    title.textContent = track.title;

    const tags = document.createElement('span');
    tags.textContent = String(track.tags || 'Cinematic').split(',').slice(0, 2).join(' / ');

    const duration = document.createElement('span');
    duration.className = 'track-duration';
    duration.textContent = track.duration;

    copy.append(title, tags);
    button.append(number, copy, duration);
    button.addEventListener('click', () => setActiveTrack(track, true));
    return button;
  };

  fetch('/assets/music/playlist.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Playlist failed: ${response.status}`);
      return response.json();
    })
    .then((playlist) => {
      albumList.replaceChildren();
      playlist.tracks.forEach((track) => albumList.append(buildTrackButton(track)));
      setActiveTrack(playlist.tracks[0]);
    })
    .catch(() => {
      albumTitle.textContent = 'Album unavailable';
      albumCaption.textContent = 'The playlist could not be loaded.';
      albumPanelTitle.textContent = 'Album unavailable';
      albumPanelCaption.textContent = 'The playlist could not be loaded.';
      albumList.textContent = '';
      const fallbackLink = document.createElement('a');
      fallbackLink.className = 'inline-link';
      fallbackLink.href = 'https://suno.com/playlist/88bd44ac-eb0c-4751-a865-f2a4597dc5bb';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener';
      fallbackLink.textContent = 'Open the Suno playlist';
      albumList.append(fallbackLink);
    });
})();
