/* Kelonio — Muro de acceso por suscripción a YouTube
 *
 * Modelo para una web estática:
 *   1) Google Identity Services autoriza la cuenta.
 *   2) YouTube Data API comprueba la suscripción real a CHANNEL_ID.
 *   3) Tras una comprobación correcta, se guarda una caché local temporal
 *      para no repetir la comprobación cada vez que se abre o recarga una guía.
 *
 * IMPORTANTE:
 * La caché local es una optimización de UX, no una frontera de seguridad.
 * En una web estática de GitHub Pages, quien controle el navegador puede
 * modificar el JavaScript o el almacenamiento local. Para proteger realmente
 * un recurso privado hace falta una validación adicional en servidor.
 * Este script NO suscribe automáticamente al usuario.
 */
(function () {
  'use strict';

  if (window.__kelonioYoutubeWallLoaded) return;
  window.__kelonioYoutubeWallLoaded = true;

  const C = window.KELONIO_YOUTUBE_CONFIG || {};
  const CLIENT_ID = String(C.clientId || '').trim();
  const CHANNEL_ID = String(C.channelId || '').trim();
  const CHANNEL_URL = String(C.channelUrl || 'https://www.youtube.com/').trim();
  const SUBSCRIBE_URL = String(
    C.subscribeUrl || (CHANNEL_URL.replace(/\/$/, '') + '?sub_confirmation=1')
  ).trim();
  const YT_SCOPE = String(
    C.scope || 'https://www.googleapis.com/auth/youtube.readonly'
  ).trim();
  const API = 'https://www.googleapis.com/youtube/v3';
  const GIS_URL = 'https://accounts.google.com/gsi/client';

  const CONFIG_OK =
    /^\d[\w-]*\.apps\.googleusercontent\.com$/.test(CLIENT_ID) &&
    !CLIENT_ID.startsWith('PON_AQUI') &&
    /^[A-Za-z0-9_-]{10,}$/.test(CHANNEL_ID) &&
    /^https:\/\/.+/.test(CHANNEL_URL) &&
    /^https:\/\/.+/.test(SUBSCRIBE_URL);

  const ORIGIN_OK = !Array.isArray(C.allowedOrigins) || C.allowedOrigins.length === 0 ||
    C.allowedOrigins.map(String).includes(window.location.origin);

  const REQUEST_TIMEOUT_MS = Number(C.requestTimeoutMs || 20000);

  // Caché temporal para evitar pedir autorización/verificación en cada
  // apertura o recarga. Se invalida al cambiar de versión, canal, origen
  // o cuando pasan 24 horas. No debe considerarse una prueba criptográfica.
  const CACHE_KEY = 'kelonio.youtube.access.v12';
  const CACHE_VERSION = 12;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  const DICT = {
    es: {
      title: 'Acceso a la guía',
      lead: 'Para continuar, suscríbete al canal de Kelonio en YouTube.',
      detail: 'Usa el botón superior para suscribirte en YouTube y, después, el botón de verificación para comprobar tu suscripción.',
      subscribe: 'Suscribirme en YouTube',
      verify: 'Verificar mi suscripción',
      checking: 'Comprobando tu suscripción…',
      authorizing: 'Autorizando el acceso a YouTube…',
      verified: 'Suscripción verificada ✓',
      success: 'Suscripción verificada. Abriendo la guía…',
      auth: 'Necesitamos autorización de YouTube para comprobar tu suscripción.',
      needConfig: 'El acceso por suscripción no está configurado correctamente.',
      originError: 'Esta página no está configurada como origen autorizado en Google Cloud.',
      notSubscribed: 'No aparece una suscripción activa al canal de Kelonio con esta cuenta.',
      apiError: 'YouTube no ha podido completar la comprobación. Inténtalo de nuevo.',
      rateLimit: 'Se ha alcanzado temporalmente el límite de solicitudes de YouTube. Inténtalo de nuevo más tarde.',
      owner: 'Propietario de Kelonio detectado ✓',
      ownerDetail: 'Esta cuenta administra el canal de Kelonio. La guía se desbloquea automáticamente.',
      subscribeAria: 'Abrir YouTube para suscribirme al canal de Kelonio',
      verifyAria: 'Verificar si mi cuenta está suscrita al canal de Kelonio',
    },
    en: {
      title: 'Guide access',
      lead: 'To continue, subscribe to the Kelonio channel on YouTube.',
      detail: 'Use the top button to subscribe on YouTube, then return and use the verification button.',
      subscribe: 'Subscribe on YouTube',
      verify: 'Verify my subscription',
      checking: 'Checking your subscription…',
      authorizing: 'Authorizing YouTube access…',
      verified: 'Subscription verified ✓',
      success: 'Subscription verified. Opening the guide…',
      auth: 'YouTube authorization is needed to verify your subscription.',
      needConfig: 'Subscription access is not configured correctly.',
      originError: 'This page is not configured as an authorized origin in Google Cloud.',
      notSubscribed: 'This account does not appear to have an active subscription to the Kelonio channel.',
      apiError: 'YouTube could not complete the verification. Please try again.',
      rateLimit: 'YouTube request limits have been reached temporarily. Please try again later.',
      owner: 'Kelonio owner detected ✓',
      ownerDetail: 'This account manages the Kelonio channel. The guide is unlocked automatically.',
      subscribeAria: 'Open YouTube to subscribe to the Kelonio channel',
      verifyAria: 'Verify whether my account is subscribed to the Kelonio channel',
    },
    fr: {
      title: 'Accès au guide',
      lead: 'Pour continuer, abonnez-vous à la chaîne Kelonio sur YouTube.',
      detail: 'Utilisez le bouton supérieur pour vous abonner sur YouTube, puis revenez ici et utilisez le bouton de vérification.',
      subscribe: "M’abonner sur YouTube",
      verify: 'Vérifier mon abonnement',
      checking: 'Vérification de votre abonnement…',
      authorizing: 'Autorisation de l’accès à YouTube…',
      verified: 'Abonnement vérifié ✓',
      success: 'Abonnement vérifié. Ouverture du guide…',
      auth: 'Une autorisation YouTube est nécessaire pour vérifier votre abonnement.',
      needConfig: 'L’accès par abonnement n’est pas correctement configuré.',
      originError: 'Cette page n’est pas configurée comme origine autorisée dans Google Cloud.',
      notSubscribed: 'Aucun abonnement actif à la chaîne Kelonio n’est associé à ce compte.',
      apiError: 'YouTube n’a pas pu terminer la vérification. Réessayez.',
      rateLimit: 'La limite temporaire de requêtes YouTube a été atteinte. Réessayez plus tard.',
      owner: 'Propriétaire de Kelonio détecté ✓',
      ownerDetail: 'Ce compte gère la chaîne Kelonio. Le guide est automatiquement déverrouillé.',
      subscribeAria: 'Ouvrir YouTube pour m’abonner à la chaîne Kelonio',
      verifyAria: 'Vérifier si mon compte est abonné à la chaîne Kelonio',
    },
    de: {
      title: 'Zugriff auf die Anleitung',
      lead: 'Um fortzufahren, abonniere den Kelonio-Kanal auf YouTube.',
      detail: 'Verwende den oberen Button, um den Kanal auf YouTube zu abonnieren. Kehre danach zurück und nutze den Prüf-Button.',
      subscribe: 'Auf YouTube abonnieren',
      verify: 'Mein Abonnement prüfen',
      checking: 'Abonnement wird geprüft…',
      authorizing: 'YouTube-Zugriff wird autorisiert…',
      verified: 'Abonnement bestätigt ✓',
      success: 'Abonnement bestätigt. Anleitung wird geöffnet…',
      auth: 'Zur Prüfung deines Abonnements ist eine YouTube-Autorisierung erforderlich.',
      needConfig: 'Der Zugriff per Abonnement ist nicht korrekt konfiguriert.',
      originError: 'Diese Seite ist in Google Cloud nicht als autorisierte Quelle eingerichtet.',
      notSubscribed: 'Für dieses Konto wurde kein aktives Abonnement des Kelonio-Kanals gefunden.',
      apiError: 'YouTube konnte die Prüfung nicht abschließen. Bitte erneut versuchen.',
      rateLimit: 'Das YouTube-Anfragelimit wurde vorübergehend erreicht. Bitte später erneut versuchen.',
      owner: 'Kelonio-Inhaber erkannt ✓',
      ownerDetail: 'Dieses Konto verwaltet den Kelonio-Kanal. Die Anleitung wird automatisch freigeschaltet.',
      subscribeAria: 'YouTube öffnen, um den Kelonio-Kanal zu abonnieren',
      verifyAria: 'Prüfen, ob mein Konto den Kelonio-Kanal abonniert hat',
    },
    it: {
      title: 'Accesso alla guida',
      lead: 'Per continuare, iscriviti al canale Kelonio su YouTube.',
      detail: 'Usa il pulsante superiore per iscriverti su YouTube, poi torna qui e usa il pulsante di verifica.',
      subscribe: 'Iscriviti su YouTube',
      verify: 'Verifica la mia iscrizione',
      checking: 'Controllo dell’iscrizione…',
      authorizing: 'Autorizzazione dell’accesso a YouTube…',
      verified: 'Iscrizione verificata ✓',
      success: 'Iscrizione verificata. Apertura della guida…',
      auth: 'È necessaria l’autorizzazione di YouTube per verificare la tua iscrizione.',
      needConfig: 'L’accesso tramite iscrizione non è configurato correttamente.',
      originError: 'Questa pagina non è configurata come origine autorizzata in Google Cloud.',
      notSubscribed: 'Con questo account non risulta un’iscrizione attiva al canale Kelonio.',
      apiError: 'YouTube non ha potuto completare la verifica. Riprova.',
      rateLimit: 'È stato raggiunto temporaneamente il limite di richieste di YouTube. Riprova più tardi.',
      owner: 'Proprietario Kelonio rilevato ✓',
      ownerDetail: 'Questo account gestisce il canale Kelonio. La guida viene sbloccata automaticamente.',
      subscribeAria: 'Apri YouTube per iscriverti al canale Kelonio',
      verifyAria: 'Verifica se il mio account è iscritto al canale Kelonio',
    },
    pt: {
      title: 'Acesso ao guia',
      lead: 'Para continuar, subscreva o canal Kelonio no YouTube.',
      detail: 'Use o botão superior para subscrever no YouTube e depois volte aqui para usar o botão de verificação.',
      subscribe: 'Subscrever no YouTube',
      verify: 'Verificar a minha subscrição',
      checking: 'A verificar a subscrição…',
      authorizing: 'A autorizar o acesso ao YouTube…',
      verified: 'Subscrição verificada ✓',
      success: 'Subscrição verificada. A abrir o guia…',
      auth: 'É necessária autorização do YouTube para verificar a sua subscrição.',
      needConfig: 'O acesso por subscrição não está configurado corretamente.',
      originError: 'Esta página não está configurada como origem autorizada no Google Cloud.',
      notSubscribed: 'Esta conta não parece ter uma subscrição ativa do canal Kelonio.',
      apiError: 'O YouTube não conseguiu concluir a verificação. Tente novamente.',
      rateLimit: 'O limite temporário de pedidos do YouTube foi atingido. Tente novamente mais tarde.',
      owner: 'Proprietário da Kelonio detetado ✓',
      ownerDetail: 'Esta conta gere o canal Kelonio. O guia é desbloqueado automaticamente.',
      subscribeAria: 'Abrir o YouTube para subscrever o canal Kelonio',
      verifyAria: 'Verificar se a minha conta subscreveu o canal Kelonio',
    },
    ja: {
      title: 'ガイドへのアクセス',
      lead: '続行するには、YouTube の Kelonio チャンネルに登録してください。',
      detail: '上のボタンで YouTube にチャンネル登録し、その後ここに戻って確認ボタンを使用してください。',
      subscribe: 'YouTube で登録する',
      verify: '登録状況を確認',
      checking: '登録状況を確認中…',
      authorizing: 'YouTube へのアクセスを承認中…',
      verified: '登録を確認しました ✓',
      success: '登録を確認しました。ガイドを開きます…',
      auth: '登録状況を確認するには YouTube の認証が必要です。',
      needConfig: '登録によるアクセスが正しく設定されていません。',
      originError: 'このページは Google Cloud で承認済みのオリジンとして設定されていません。',
      notSubscribed: 'このアカウントでは Kelonio チャンネルへの有効な登録が確認できませんでした。',
      apiError: 'YouTube で確認を完了できませんでした。もう一度お試しください。',
      rateLimit: 'YouTube の一時的なリクエスト上限に達しました。後でもう一度お試しください。',
      owner: 'Kelonio オーナーを確認しました ✓',
      ownerDetail: 'このアカウントは Kelonio チャンネルを管理しています。ガイドを自動的に開きます。',
      subscribeAria: 'YouTube を開いて Kelonio チャンネルを登録',
      verifyAria: '自分のアカウントが Kelonio チャンネルを登録しているか確認',
    },
    ko: {
      title: '가이드 이용',
      lead: '계속하려면 YouTube에서 Kelonio 채널을 구독하세요.',
      detail: '위 버튼으로 YouTube 채널을 구독한 다음 여기로 돌아와 확인 버튼을 사용하세요.',
      subscribe: 'YouTube에서 구독하기',
      verify: '내 구독 확인',
      checking: '구독 확인 중…',
      authorizing: 'YouTube 액세스 승인 중…',
      verified: '구독 확인 완료 ✓',
      success: '구독이 확인되었습니다. 가이드를 엽니다…',
      auth: '구독 여부를 확인하려면 YouTube 인증이 필요합니다.',
      needConfig: '구독을 통한 접근이 올바르게 구성되지 않았습니다.',
      originError: '이 페이지가 Google Cloud에서 승인된 출처로 구성되어 있지 않습니다.',
      notSubscribed: '이 계정에서는 Kelonio 채널의 활성 구독이 확인되지 않았습니다.',
      apiError: 'YouTube에서 확인을 완료할 수 없습니다. 다시 시도해 주세요.',
      rateLimit: 'YouTube 요청 한도에 일시적으로 도달했습니다. 나중에 다시 시도해 주세요.',
      owner: 'Kelonio 소유자 확인 ✓',
      ownerDetail: '이 계정은 Kelonio 채널을 관리합니다. 가이드가 자동으로 잠금 해제됩니다.',
      subscribeAria: 'YouTube를 열어 Kelonio 채널 구독',
      verifyAria: '내 계정이 Kelonio 채널을 구독했는지 확인',
    }
  };

  let tokenClient = null;
  let accessToken = null;
  let gisReady = false;
  let busy = false;
  let unlocked = false;
  let ownerDetected = false;
  let wall = null;
  let gisLoadPromise = null;
  let tokenRequestInFlight = null;

  function clearAccessCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (_) {}
  }

  function readAccessCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;

      const verifiedAt = Number(data.verifiedAt || 0);
      const age = Date.now() - verifiedAt;
      const compatible =
        Number(data.version) === CACHE_VERSION &&
        String(data.channelId || '') === CHANNEL_ID &&
        String(data.origin || '') === window.location.origin &&
        Boolean(data.verified);

      if (!compatible || !verifiedAt || age < 0 || age >= CACHE_TTL_MS) {
        clearAccessCache();
        return null;
      }

      return {
        owner: data.owner === true,
        verifiedAt
      };
    } catch (_) {
      clearAccessCache();
      return null;
    }
  }

  function writeAccessCache(kind) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        verified: true,
        owner: kind === 'owner',
        channelId: CHANNEL_ID,
        origin: window.location.origin,
        verifiedAt: Date.now()
      }));
    } catch (_) {}
  }

  function cacheForcedOff() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('youtube-recheck') === '1';
    } catch (_) {
      return false;
    }
  }

  function lang() {
    try {
      const l = typeof window.idiomaActual === 'string' ? window.idiomaActual : '';
      if (l && DICT[l]) return l;
    } catch (_) {}
    const raw = String(document.documentElement.lang || navigator.language || 'es').toLowerCase();
    const k = raw.split('-')[0];
    return DICT[k] ? k : 'es';
  }

  function t() {
    return DICT[lang()] || DICT.es;
  }

  function buildWall() {
    removeLegacyMemberCta();
    wall = document.getElementById('accessWallOverlay');
    if (!wall) {
      wall = document.createElement('div');
      wall.id = 'accessWallOverlay';
      wall.setAttribute('role', 'dialog');
      wall.setAttribute('aria-modal', 'true');
      wall.setAttribute('aria-labelledby', 'youtubeAccessTitle');
      document.body.prepend(wall);
    }

    wall.innerHTML = `
      <div class="youtube-access-card" role="document">
        <div class="youtube-access-icon" aria-hidden="true">▶</div>
        <h1 id="youtubeAccessTitle"></h1>
        <p class="youtube-access-lead" id="youtubeAccessLead"></p>
        <p class="youtube-access-detail" id="youtubeAccessDetail"></p>
        <div class="youtube-access-status" id="youtubeAccessStatus" role="status" aria-live="polite"></div>
        <div class="youtube-access-actions">
          <a class="youtube-access-btn youtube-access-subscribe" id="youtubeAccessSubscribe" target="_blank" rel="noopener noreferrer"></a>
          <button type="button" class="youtube-access-btn youtube-access-verify" id="youtubeAccessVerify"></button>
        </div>
        <div class="youtube-access-brand">YouTube · Kelonio</div>
      </div>`;

    injectStyles();
    refreshTexts();
    return wall;
  }

  function injectStyles() {
    if (document.getElementById('kelonio-youtube-wall-style')) return;

    const style = document.createElement('style');
    style.id = 'kelonio-youtube-wall-style';
    style.textContent = `
      html.youtube-wall-locked, body.youtube-wall-locked{overflow:hidden!important}
      #accessWallOverlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,9,12,.97);backdrop-filter:blur(12px);color:#fff;opacity:1;visibility:visible;pointer-events:auto;transition:opacity .28s ease,visibility .28s ease}
      #accessWallOverlay.youtube-wall-hidden{opacity:0;visibility:hidden;pointer-events:none}
      .youtube-access-card{width:min(92vw,560px);padding:42px 34px 32px;text-align:center;border-radius:24px;background:linear-gradient(180deg,rgba(28,31,39,.99),rgba(18,20,26,.99));border:1px solid rgba(255,255,255,.12);box-shadow:0 25px 80px rgba(0,0,0,.5),0 0 0 1px rgba(229,9,20,.06)}
      .youtube-access-icon{width:62px;height:44px;margin:0 auto 22px;border-radius:12px;background:#e50914;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;box-shadow:0 10px 30px rgba(229,9,20,.3)}
      .youtube-access-card h1{margin:0 0 12px;font-size:clamp(1.65rem,4vw,2.2rem);font-weight:900;letter-spacing:-.4px;color:#fff}
      .youtube-access-lead{margin:0 auto 12px;max-width:470px;font-size:1.05rem;line-height:1.55;color:#f2f2f2}
      .youtube-access-detail{margin:0 auto 22px;max-width:470px;font-size:.92rem;line-height:1.5;color:#aeb3bd}
      .youtube-access-status{min-height:22px;margin:0 0 13px;color:#d7dbe2;font-weight:700;font-size:.84rem}
      .youtube-access-actions{display:grid;gap:10px}
      .youtube-access-btn{display:flex;align-items:center;justify-content:center;width:100%;box-sizing:border-box;border:0;border-radius:12px;padding:14px 20px;color:#fff;font:900 1rem/1.2 'Segoe UI',system-ui,sans-serif;text-decoration:none;cursor:pointer;transition:transform .18s ease,filter .18s ease,box-shadow .18s ease,opacity .18s ease}
      .youtube-access-subscribe{background:#e50914;box-shadow:0 10px 26px rgba(229,9,20,.25)}
      .youtube-access-verify{background:#2e333d;box-shadow:0 8px 20px rgba(0,0,0,.18)}
      .youtube-access-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.08)}
      .youtube-access-subscribe:hover{box-shadow:0 14px 32px rgba(229,9,20,.34)}
      .youtube-access-verify:hover{box-shadow:0 12px 26px rgba(0,0,0,.3)}
      .youtube-access-btn:disabled{opacity:.65;cursor:wait;transform:none!important}
      .youtube-access-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
      .youtube-access-brand{margin-top:24px;color:#686e79;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      @media(max-width:600px){#accessWallOverlay{padding:16px}.youtube-access-card{padding:34px 22px 25px;border-radius:20px}.youtube-access-lead{font-size:.98rem}.youtube-access-detail{font-size:.86rem}}
    `;
    document.head.appendChild(style);
  }

  function refreshTexts() {
    if (!wall) return;
    const d = t();
    const q = (id) => wall.querySelector('#' + id);

    if (q('youtubeAccessTitle')) q('youtubeAccessTitle').textContent = d.title;
    if (q('youtubeAccessLead')) q('youtubeAccessLead').textContent = d.lead;
    if (q('youtubeAccessDetail')) q('youtubeAccessDetail').textContent = d.detail;

    const subscribe = q('youtubeAccessSubscribe');
    if (subscribe) {
      subscribe.textContent = d.subscribe;
      subscribe.href = SUBSCRIBE_URL;
      subscribe.setAttribute('aria-label', d.subscribeAria);
      subscribe.setAttribute('title', d.subscribeAria);
    }

    const verify = q('youtubeAccessVerify');
    if (verify) {
      verify.textContent = busy ? d.checking : d.verify;
      verify.disabled = busy || unlocked || ownerDetected;
      verify.setAttribute('aria-disabled', String(verify.disabled));
      verify.setAttribute('aria-label', d.verifyAria);
    }

  }

  function setStatus(key, custom) {
    const el = wall && wall.querySelector('#youtubeAccessStatus');
    if (el) el.textContent = custom || t()[key] || '';
  }

  function removeLegacyMemberCta() {
    document.querySelectorAll('#youtube-cta-box, .youtube-cta-box').forEach((el) => el.remove());
    document.querySelectorAll('.youtube-cta-member').forEach((el) => {
      const box = el.closest('#youtube-cta-box, .youtube-cta-box');
      if (box) box.remove();
    });
  }

  function lockPage() {
    document.documentElement.classList.add('youtube-wall-locked');
    document.body.classList.add('youtube-wall-locked');
  }

  function unlockPage() {
    document.documentElement.classList.remove('youtube-wall-locked');
    document.body.classList.remove('youtube-wall-locked');
  }

  function hideWall(kind) {
    unlocked = true;
    writeAccessCache(kind);
    lockPage();

    if (wall) {
      refreshTexts();
      setStatus('success', kind === 'owner' ? t().ownerDetail : t().success);
      window.setTimeout(() => {
        unlockPage();
        wall.classList.add('youtube-wall-hidden');
        window.setTimeout(() => {
          if (wall) wall.remove();
          wall = null;
        }, 280);
      }, 120);
    } else {
      unlockPage();
    }

    document.dispatchEvent(new CustomEvent('kelonio:youtubeAccessGranted', {
      detail: { source: kind === 'owner' ? 'youtube-owner-check' : 'youtube-subscription-check' }
    }));
  }

  function showWall() {
    if (!wall) buildWall();
    wall.classList.remove('youtube-wall-hidden');
    lockPage();
    refreshTexts();
  }

  function loadGIS() {
    if (!CONFIG_OK || !ORIGIN_OK) {
      return Promise.reject(new Error(!ORIGIN_OK ? 'origin_not_allowed' : 'not_configured'));
    }

    if (window.google && google.accounts && google.accounts.oauth2) {
      return Promise.resolve();
    }

    if (gisLoadPromise) return gisLoadPromise;

    gisLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kelonio-gis]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('gis_load_failed')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GIS_URL;
      script.async = true;
      script.defer = true;
      script.dataset.kelonioGis = '1';
      script.onload = resolve;
      script.onerror = () => reject(new Error('gis_load_failed'));
      document.head.appendChild(script);
    }).finally(() => {
      gisLoadPromise = null;
    });

    return gisLoadPromise;
  }

  function initGIS() {
    if (gisReady) return true;
    if (!(window.google && google.accounts && google.accounts.oauth2)) return false;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: YT_SCOPE,
      include_granted_scopes: true,
      callback: () => {},
      error_callback: () => {}
    });

    gisReady = true;
    refreshTexts();
    return true;
  }

  function normalizeGoogleError(err) {
    return String((err && (err.type || err.error || err.message || err.error_description)) || 'oauth_error');
  }

  function tokenRequest(promptValue) {
    if (tokenRequestInFlight) return tokenRequestInFlight;

    tokenRequestInFlight = new Promise((resolve, reject) => {
      if (!gisReady || !tokenClient) {
        reject(new Error('gis_not_ready'));
        return;
      }

      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      tokenClient.callback = (resp) => {
        if (!resp || !resp.access_token) {
          finish(reject, new Error(normalizeGoogleError(resp) || 'no_token'));
          return;
        }

        const grantedScope = String(resp.scope || '').split(/\s+/).filter(Boolean);
        let scopeOk = grantedScope.includes(YT_SCOPE);
        try {
          if (typeof google.accounts.oauth2.hasGrantedAllScopes === 'function') {
            scopeOk = google.accounts.oauth2.hasGrantedAllScopes(resp, YT_SCOPE);
          }
        } catch (_) {}

        if (!scopeOk) {
          finish(reject, new Error('scope_not_granted'));
          return;
        }

        accessToken = resp.access_token;
        finish(resolve, resp);
      };

      tokenClient.error_callback = (err) => {
        finish(reject, new Error(normalizeGoogleError(err)));
      };

      try {
        const request = promptValue ? { prompt: promptValue } : {};
        tokenClient.requestAccessToken(request);
      } catch (err) {
        finish(reject, err instanceof Error ? err : new Error('oauth_error'));
      }
    }).finally(() => {
      tokenRequestInFlight = null;
    });

    return tokenRequestInFlight;
  }

  async function apiFetch(url, options) {
    if (!accessToken) throw new Error('unauthorized');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers = Object.assign({}, (options && options.headers) || {}, {
        Authorization: 'Bearer ' + accessToken
      });
      const response = await fetch(url, Object.assign({}, options || {}, {
        headers,
        signal: controller.signal,
        cache: 'no-store'
      }));
      if (response.status === 401) accessToken = null;
      return response;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('request_timeout');
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function checkOwnerChannel() {
    if (!accessToken || !CHANNEL_ID) return false;

    const params = new URLSearchParams({
      part: 'id',
      mine: 'true',
      maxResults: '50'
    });

    const response = await apiFetch(API + '/channels?' + params.toString());
    if (response.status === 401) throw new Error('unauthorized');
    if (response.status === 403) throw new Error('forbidden');
    if (!response.ok) throw new Error('owner_check_failed_' + response.status);

    const data = await response.json();
    return Array.isArray(data.items) && data.items.some(
      (item) => String(item && item.id || '') === CHANNEL_ID
    );
  }

  async function checkSubscription() {
    if (!accessToken) return false;

    const params = new URLSearchParams({
      part: 'id',
      mine: 'true',
      forChannelId: CHANNEL_ID,
      maxResults: '1'
    });

    const response = await apiFetch(API + '/subscriptions?' + params.toString());
    if (response.status === 401) throw new Error('unauthorized');
    if (response.status === 403) throw new Error('forbidden');
    if (response.status === 429) throw new Error('rate_limit');
    if (!response.ok) throw new Error('subscription_check_failed_' + response.status);

    const data = await response.json();
    return Array.isArray(data.items) && data.items.length > 0;
  }

  async function verifyCurrentAccount(promptValue) {
    if (busy || unlocked) return;
    if (!gisReady) {
      setStatus('auth');
      return;
    }

    busy = true;
    accessToken = null;
    ownerDetected = false;
    refreshTexts();
    setStatus('authorizing');

    try {
      await tokenRequest(promptValue || '');
      setStatus('checking');

      if (await checkOwnerChannel()) {
        ownerDetected = true;
        refreshTexts();
        hideWall('owner');
        return;
      }

      const subscribed = await checkSubscription();
      if (!subscribed) {
        clearAccessCache();
        setStatus('notSubscribed');
        return;
      }

      hideWall('subscription');
    } catch (error) {
      accessToken = null;
      clearAccessCache();
      const message = String(error && error.message || '');

      if (message === 'origin_not_allowed') {
        setStatus('originError');
      } else if (message === 'not_configured' || message === 'gis_not_ready') {
        setStatus('needConfig');
      } else if (message === 'scope_not_granted' ||
                 message === 'interaction_required' ||
                 message === 'consent_required' ||
                 message === 'login_required' ||
                 message === 'access_denied') {
        setStatus('auth');
      } else if (message === 'rate_limit') {
        setStatus('rateLimit');
      } else {
        setStatus('apiError');
      }
    } finally {
      busy = false;
      if (wall && !unlocked) refreshTexts();
    }
  }

  function unlockFromCache(cached) {
    unlocked = true;
    ownerDetected = cached && cached.owner === true;
    unlockPage();

    const staticWall = document.getElementById('accessWallOverlay');
    if (staticWall) {
      staticWall.classList.add('youtube-wall-hidden');
      window.setTimeout(() => {
        if (staticWall && staticWall.parentNode) staticWall.remove();
        if (wall === staticWall) wall = null;
      }, 280);
    }

    document.dispatchEvent(new CustomEvent('kelonio:youtubeAccessGranted', {
      detail: {
        source: cached && cached.owner ? 'local-cache-owner-24h' : 'local-cache-24h',
        verifiedAt: cached ? cached.verifiedAt : 0
      }
    }));
  }

  function prepareStaticWall() {
    const staticWall = document.getElementById('accessWallOverlay');
    if (staticWall) {
      wall = staticWall;
      injectStyles();
      lockPage();
    }
  }

  async function bootstrap() {
    const videos = document.querySelectorAll('.guide-content .video-container');
    if (!videos.length) {
      unlockPage();
      const legacyWall = document.getElementById('accessWallOverlay');
      if (legacyWall) legacyWall.remove();
      return;
    }

    // Normal reload/open path: a recent successful verification avoids any
    // new Google prompt or YouTube API check. Use ?youtube-recheck=1 to force
    // a fresh verification from the current Google account.
    if (!cacheForcedOff()) {
      const cached = readAccessCache();
      if (cached) {
        unlockFromCache(cached);
        return;
      }
    } else {
      clearAccessCache();
    }

    prepareStaticWall();

    buildWall();
    showWall();

    const verify = wall.querySelector('#youtubeAccessVerify');
    const subscribe = wall.querySelector('#youtubeAccessSubscribe');
    if (verify) verify.addEventListener('click', () => verifyCurrentAccount(''));

    // The subscribe link is intentionally just a navigation action. It never
    // grants access by itself; only a subsequent API verification can unlock.
    if (subscribe) subscribe.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!unlocked) setStatus('checking');
      }, 0);
    });

    if (!CONFIG_OK || !ORIGIN_OK) {
      setStatus(!ORIGIN_OK ? 'originError' : 'needConfig');
      refreshTexts();
      return;
    }

    try {
      setStatus('authorizing');
      await loadGIS();
      if (!initGIS()) throw new Error('gis_not_ready');

      // Silent attempt only reuses a grant already made to this browser/app.
      // If Google requires interaction, no access is granted and the button
      // remains available for the user to authorize explicitly.
      try {
        await tokenRequest('none');
        setStatus('checking');

        if (await checkOwnerChannel()) {
          ownerDetected = true;
          refreshTexts();
          hideWall('owner');
          return;
        }

        if (await checkSubscription()) {
          hideWall('subscription');
          return;
        }

        accessToken = null;
        setStatus('notSubscribed');
      } catch (_) {
        accessToken = null;
        setStatus('auth');
      }
    } catch (error) {
      accessToken = null;
      const message = String(error && error.message || '');
      setStatus(message === 'origin_not_allowed' ? 'originError' : 'needConfig');
    } finally {
      if (!unlocked) refreshTexts();
    }
  }

  document.addEventListener('kelonio:languageChanged', () => {
    refreshTexts();
  });

  document.addEventListener('DOMContentLoaded', () => {
    removeLegacyMemberCta();
    bootstrap();
  }, { once: true });
})();
