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

  const albumPlayer = document.querySelector('[data-album-player]');
  if (!albumPlayer) return;

  const albumVideo = albumPlayer.querySelector('[data-album-video]');
  const albumFallback = albumPlayer.querySelector('[data-album-fallback]');
  const albumCover = albumPlayer.querySelector('[data-album-cover]');
  const albumAudio = albumPlayer.querySelector('[data-album-audio]');
  const albumTitle = albumPlayer.querySelector('[data-album-title]');
  const albumCaption = albumPlayer.querySelector('[data-album-caption]');
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
