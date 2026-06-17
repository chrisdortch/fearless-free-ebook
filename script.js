(() => {
  const DEFAULT_BOOK_URL = '/downloads/Fearless_Book1_RollinD_Free_Ebook.pdf';
  const DEFAULT_PLAYLIST_JSON_URL = '/assets/music/playlist.json';
  const DEFAULT_SUNO_PLAYLIST_URL = 'https://suno.com/playlist/88bd44ac-eb0c-4751-a865-f2a4597dc5bb';
  const ADMIN_PIN = '7900';
  const BOOK_URL_KEY = 'fearlessBookUrl';
  const PLAYLIST_URL_KEY = 'fearlessPlaylistUrl';
  const PLAYLIST_JSON_KEY = 'fearlessPlaylistJson';
  const BOOK_UPDATED_KEY = 'fearlessBookUpdatedAt';
  const PLAYLIST_UPDATED_KEY = 'fearlessPlaylistUpdatedAt';
  const ADMIN_UNLOCKED_KEY = 'fearlessAdminUnlocked';
  const UPDATE_CHANNEL_NAME = 'fearlessSiteUpdates';

  let updateChannel = null;
  try {
    updateChannel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
  } catch (_) {}

  const readStorage = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  };

  const removeStorage = (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {}
  };

  const getBookUrl = () => readStorage(BOOK_URL_KEY) || DEFAULT_BOOK_URL;

  const applyBookLinks = () => {
    const bookUrl = getBookUrl();
    document.querySelectorAll('[data-book-link], [data-book-download]').forEach((link) => {
      link.href = bookUrl;
    });
  };

  applyBookLinks();

  const notifySiteUpdate = (type) => {
    const key = type === 'book' ? BOOK_UPDATED_KEY : PLAYLIST_UPDATED_KEY;
    writeStorage(key, String(Date.now()));
    updateChannel?.postMessage({ type });
  };

  const header = document.querySelector('[data-scroll-header]');
  const toast = document.querySelector('[data-toast]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuPanel = document.querySelector('[data-menu-panel]');

  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const setMenuOpen = (isOpen) => {
    if (!menuToggle || !menuPanel) return;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    menuPanel.hidden = !isOpen;
  };

  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });

  menuPanel?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (!menuPanel || menuPanel.hidden || !header) return;
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
  });

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
        text: 'Read the free illustrated ebook by RollinD.',
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

  const adminRoot = document.querySelector('[data-admin]');
  if (adminRoot) {
    const lock = adminRoot.querySelector('[data-admin-lock]');
    const panel = adminRoot.querySelector('[data-admin-panel]');
    const pinInput = adminRoot.querySelector('[data-admin-pin]');
    const unlockButton = adminRoot.querySelector('[data-admin-unlock]');
    const lockStatus = adminRoot.querySelector('[data-admin-lock-status]');
    const status = adminRoot.querySelector('[data-admin-status]');
    const bookInput = adminRoot.querySelector('[data-admin-book-url]');
    const playlistInput = adminRoot.querySelector('[data-admin-playlist-url]');
    const saveBookButton = adminRoot.querySelector('[data-admin-save-book]');
    const resetBookButton = adminRoot.querySelector('[data-admin-reset-book]');
    const refreshPlaylistButton = adminRoot.querySelector('[data-admin-refresh-playlist]');
    const resetPlaylistButton = adminRoot.querySelector('[data-admin-reset-playlist]');

    const validatePlaylist = (playlist) => {
      if (!playlist || !Array.isArray(playlist.tracks) || !playlist.tracks.length) {
        throw new Error('No tracks found.');
      }
      const missingVideo = playlist.tracks.filter((track) => !track.videoUrl);
      if (missingVideo.length) {
        throw new Error('Every track needs a video URL.');
      }
      return playlist;
    };

    const fillAdminInputs = () => {
      bookInput.value = getBookUrl();
      playlistInput.value = readStorage(PLAYLIST_URL_KEY) || DEFAULT_SUNO_PLAYLIST_URL;
    };

    const showPanel = () => {
      lock.hidden = true;
      panel.hidden = false;
      fillAdminInputs();
    };

    if (window.sessionStorage?.getItem(ADMIN_UNLOCKED_KEY) === 'true') showPanel();

    const unlock = () => {
      if (pinInput.value.trim() !== ADMIN_PIN) {
        lockStatus.textContent = 'Wrong PIN.';
        return;
      }
      try {
        window.sessionStorage.setItem(ADMIN_UNLOCKED_KEY, 'true');
      } catch (_) {}
      lockStatus.textContent = '';
      showPanel();
    };

    unlockButton.addEventListener('click', unlock);
    pinInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') unlock();
    });

    saveBookButton.addEventListener('click', () => {
      const nextUrl = bookInput.value.trim() || DEFAULT_BOOK_URL;
      writeStorage(BOOK_URL_KEY, nextUrl);
      applyBookLinks();
      notifySiteUpdate('book');
      status.textContent = 'Book link saved for this browser. Full URLs work.';
      showToast('Book link saved.');
    });

    resetBookButton.addEventListener('click', () => {
      removeStorage(BOOK_URL_KEY);
      fillAdminInputs();
      applyBookLinks();
      notifySiteUpdate('book');
      status.textContent = 'Book link reset.';
      showToast('Book link reset.');
    });

    refreshPlaylistButton.addEventListener('click', async () => {
      const source = playlistInput.value.trim() || DEFAULT_SUNO_PLAYLIST_URL;
      writeStorage(PLAYLIST_URL_KEY, source);
      refreshPlaylistButton.disabled = true;
      status.textContent = 'Refreshing playlist...';
      try {
        if (source.includes('suno.com/playlist/')) {
          const playlist = validatePlaylist(await fetch(DEFAULT_PLAYLIST_JSON_URL, { cache: 'no-store' }).then((response) => response.json()));
          writeStorage(PLAYLIST_JSON_KEY, JSON.stringify(playlist));
          status.textContent = `Suno playlist URL saved. Static playlist loaded with ${playlist.tracks.length} tracks for this browser.`;
        } else {
          const response = await fetch(source, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Playlist failed: ${response.status}`);
          const playlist = validatePlaylist(await response.json());
          writeStorage(PLAYLIST_JSON_KEY, JSON.stringify(playlist));
          status.textContent = `Loaded ${playlist.tracks.length} tracks for this browser.`;
        }
        notifySiteUpdate('playlist');
        showToast('Playlist refreshed.');
      } catch (error) {
        status.textContent = error.message || 'Playlist refresh failed.';
      } finally {
        refreshPlaylistButton.disabled = false;
      }
    });

    resetPlaylistButton.addEventListener('click', () => {
      removeStorage(PLAYLIST_URL_KEY);
      removeStorage(PLAYLIST_JSON_KEY);
      fillAdminInputs();
      notifySiteUpdate('playlist');
      status.textContent = 'Playlist reset.';
      showToast('Playlist reset.');
    });
  }

  const albumPlayer = document.querySelector('[data-album-player]');
  if (!albumPlayer) return;

  const albumStage = albumPlayer.querySelector('[data-album-stage]');
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
  const albumPrev = albumPlayer.querySelector('[data-album-prev]');
  const albumNext = albumPlayer.querySelector('[data-album-next]');
  const albumToggle = albumPlayer.querySelector('[data-album-toggle]');
  const albumState = albumPlayer.querySelector('[data-album-state]');
  const albumInfo = albumPlayer.querySelector('[data-album-info]');
  const albumLyricsPanel = albumPlayer.querySelector('[data-album-lyrics-panel]');
  const albumLyricsClose = albumPlayer.querySelector('[data-album-lyrics-close]');
  const albumLyricsTitle = albumPlayer.querySelector('[data-album-lyrics-title]');
  const albumLyricsText = albumPlayer.querySelector('[data-album-lyrics-text]');
  const startAlbumButtons = document.querySelectorAll('[data-start-album]');
  let playlistTracks = [];
  let activeTrackIndex = 0;
  let pendingStartAlbum = false;

  albumVideo.muted = true;
  albumVideo.loop = true;
  albumVideo.playsInline = true;
  albumVideo.setAttribute('playsinline', '');
  albumVideo.setAttribute('webkit-playsinline', '');

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

  const getTrackText = (track) => (
    track.lyrics ||
    track.words ||
    track.caption ||
    track.tags ||
    'Lyrics were not included in the playlist data for this track.'
  );

  const setLyricsOpen = (isOpen) => {
    if (!albumLyricsPanel || !albumInfo) return;
    albumLyricsPanel.hidden = !isOpen;
    albumInfo.setAttribute('aria-expanded', String(isOpen));
  };

  const syncPlaybackUi = () => {
    if (!albumToggle || !albumState) return;
    const isPlaying = !albumAudio.paused && !albumAudio.ended;
    albumToggle.textContent = isPlaying ? 'Pause' : 'Play';
    albumToggle.setAttribute('aria-pressed', String(isPlaying));
    albumState.hidden = !isPlaying;
    albumState.textContent = 'Now Playing';
  };

  const isMobileViewport = () => window.matchMedia('(max-width: 920px)').matches;

  const scrollToAlbumStage = () => {
    albumStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const playStageVideo = () => {
    const play = () => albumVideo.play().catch(() => {});
    if (albumVideo.readyState >= 2) {
      play();
    } else {
      albumVideo.addEventListener('loadeddata', play, { once: true });
    }
  };

  const setActiveTrack = (trackOrIndex, options = {}) => {
    if (!playlistTracks.length) return;
    const index = typeof trackOrIndex === 'number'
      ? ((trackOrIndex % playlistTracks.length) + playlistTracks.length) % playlistTracks.length
      : playlistTracks.findIndex((track) => track.number === trackOrIndex.number);
    activeTrackIndex = index < 0 ? 0 : index;
    const track = playlistTracks[activeTrackIndex];

    albumTitle.textContent = track.title;
    albumCaption.textContent = shorten(track.caption || track.tags || 'Cinematic companion track.');
    albumPanelTitle.textContent = track.title;
    albumPanelCaption.textContent = shorten(track.caption || track.tags || 'Cinematic companion track.', 180);
    renderTags(track.tags);

    albumMp3.href = track.audioUrl;
    albumSuno.href = track.sunoUrl;

    if (albumAudio.getAttribute('src') !== track.audioUrl) {
      albumAudio.src = track.audioUrl;
      albumAudio.load();
    }

    albumFallback.src = track.imageUrl;
    albumFallback.alt = '';
    albumCover.src = track.imageUrl;
    albumCover.alt = `${track.title} artwork`;
    albumLyricsTitle.textContent = track.title;
    albumLyricsText.textContent = getTrackText(track);

    albumVideo.poster = track.imageUrl;
    if (track.videoUrl) {
      albumVideo.src = track.videoUrl;
      albumVideo.load();
      playStageVideo();
    }

    albumList.querySelectorAll('.track-button').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.trackNumber) === track.number));
    });

    if (options.scroll) window.setTimeout(scrollToAlbumStage, 80);
    if (options.playAudio) {
      albumAudio.play()
        .then(playStageVideo)
        .catch(() => {
          playStageVideo();
          syncPlaybackUi();
          showToast('Press play to start audio.');
        });
    }
    syncPlaybackUi();
  };

  const playRelativeTrack = (offset, shouldScroll = false) => {
    setActiveTrack(activeTrackIndex + offset, { playAudio: true, scroll: shouldScroll });
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
    button.addEventListener('click', () => setActiveTrack(track, { playAudio: true, scroll: isMobileViewport() }));
    return button;
  };

  const loadPlaylist = async () => {
    const storedJson = readStorage(PLAYLIST_JSON_KEY);
    if (storedJson) {
      try {
        return JSON.parse(storedJson);
      } catch (_) {
        removeStorage(PLAYLIST_JSON_KEY);
      }
    }

    const storedUrl = readStorage(PLAYLIST_URL_KEY);
    if (storedUrl && !storedUrl.includes('suno.com/playlist/')) {
      const response = await fetch(storedUrl, { cache: 'no-store' });
      if (response.ok) return response.json();
    }

    const response = await fetch(DEFAULT_PLAYLIST_JSON_URL);
    if (!response.ok) throw new Error(`Playlist failed: ${response.status}`);
    return response.json();
  };

  albumAudio.addEventListener('play', () => {
    playStageVideo();
    syncPlaybackUi();
  });
  albumAudio.addEventListener('pause', () => {
    if (!albumAudio.ended) albumVideo.pause();
    syncPlaybackUi();
  });
  albumAudio.addEventListener('ended', () => {
    syncPlaybackUi();
    playRelativeTrack(1);
  });
  albumPrev.addEventListener('click', () => playRelativeTrack(-1));
  albumNext.addEventListener('click', () => playRelativeTrack(1));
  albumToggle?.addEventListener('click', () => {
    if (!playlistTracks.length) return;
    if (!albumAudio.paused && !albumAudio.ended) {
      albumAudio.pause();
      return;
    }
    setActiveTrack(activeTrackIndex, { playAudio: true });
  });
  albumInfo?.addEventListener('click', () => setLyricsOpen(albumLyricsPanel.hidden));
  albumLyricsClose?.addEventListener('click', () => setLyricsOpen(false));

  startAlbumButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (playlistTracks.length) {
        setActiveTrack(0, { playAudio: true, scroll: true });
      } else {
        pendingStartAlbum = true;
        document.querySelector('#album')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const initializePlaylist = (options = {}) => {
    loadPlaylist()
    .then((playlist) => {
      const shouldResume = options.resumePlayback && !albumAudio.paused;
      playlistTracks = playlist.tracks.filter((track) => track.audioUrl && track.videoUrl);
      albumList.replaceChildren();
      playlistTracks.forEach((track) => albumList.append(buildTrackButton(track)));
      setActiveTrack(Math.min(activeTrackIndex, playlistTracks.length - 1));
      if (pendingStartAlbum) setActiveTrack(0, { playAudio: true, scroll: true });
      if (shouldResume) setActiveTrack(activeTrackIndex, { playAudio: true });
    })
    .catch(() => {
      albumTitle.textContent = 'Album unavailable';
      albumCaption.textContent = 'The playlist could not be loaded.';
      albumPanelTitle.textContent = 'Album unavailable';
      albumPanelCaption.textContent = 'The playlist could not be loaded.';
      albumList.textContent = '';
      const fallbackLink = document.createElement('a');
      fallbackLink.className = 'inline-link';
      fallbackLink.href = DEFAULT_SUNO_PLAYLIST_URL;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener';
      fallbackLink.textContent = 'Open the Suno playlist';
      albumList.append(fallbackLink);
    });
  };

  initializePlaylist();

  window.addEventListener('storage', (event) => {
    if (event.key === BOOK_URL_KEY || event.key === BOOK_UPDATED_KEY) applyBookLinks();
    if (event.key === PLAYLIST_JSON_KEY || event.key === PLAYLIST_URL_KEY || event.key === PLAYLIST_UPDATED_KEY) {
      initializePlaylist({ resumePlayback: true });
    }
  });

  updateChannel?.addEventListener('message', (event) => {
    if (event.data?.type === 'book') applyBookLinks();
    if (event.data?.type === 'playlist') initializePlaylist({ resumePlayback: true });
  });
})();
