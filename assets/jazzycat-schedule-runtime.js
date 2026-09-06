(function () {
  'use strict';

  const AUTHORITY_URL = 'https://raw.githubusercontent.com/floydclaptonblues/UpcomingShows/main/shows.json';
  const VENUE_TIME_ZONE = 'America/Chicago';
  const MONTHS = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
    oct: 10, nov: 11, dec: 12
  };
  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const STOP_WORDS = new Set(['and', 'the', 'band', 'feat', 'featuring', 'with', 'experience', 'music']);

  const frame = document.getElementById('jazzycat-frame');
  if (!frame) return;

  let scheduleState = { schedule: [], source: 'loading' };
  let scheduleReady = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function norm(value) {
    return String(value || '')
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slug(value) {
    return norm(value).replace(/'/g, '').replace(/\band\b/g, 'and').replace(/\s+/g, '_');
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function isoFromParts(year, month, day) {
    return String(year) + '-' + pad2(month) + '-' + pad2(day);
  }

  function isoAddDays(iso, days) {
    const parts = iso.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days, 12));
    return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function weekdayIndex(iso) {
    const parts = iso.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).getUTCDay();
  }

  function venueParts(now) {
    const out = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: VENUE_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(now || new Date()).forEach(function (part) {
      if (part.type !== 'literal') out[part.type] = part.value;
    });
    return out;
  }

  function venueToday(now) {
    const p = venueParts(now);
    return p.year + '-' + p.month + '-' + p.day;
  }

  function venueMinutes(now) {
    const p = venueParts(now);
    return Number(p.hour) * 60 + Number(p.minute);
  }

  function parseClock(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function parseAuthority(data) {
    const yearMatch = String(data.month || data.subtitle || '').match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : Number(venueParts().year);
    const result = [];

    (data.shows || []).forEach(function (day) {
      const dateMatch = String(day.date || '').match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*[•-]\s*([A-Za-z]+)\s+(\d{1,2})$/i);
      if (!dateMatch) return;
      const month = MONTHS[dateMatch[2].toLowerCase()];
      if (!month) return;

      const acts = (day.shows || []).map(function (show) {
        const timeParts = String(show.time || '').split(/\s*[–—-]\s*/);
        return {
          start_time: timeParts[0] || '',
          end_time: timeParts[1] || '',
          artist_name: String(show.artist || '').trim(),
          artist_id: slug(show.artist)
        };
      }).filter(function (act) { return act.artist_name; });

      result.push({
        day: dateMatch[1],
        date: isoFromParts(year, month, Number(dateMatch[3])),
        acts: acts
      });
    });

    return {
      version: 'authority-live',
      last_updated: data.last_updated || null,
      timezone: VENUE_TIME_ZONE,
      source: AUTHORITY_URL,
      schedule: result
    };
  }

  function isValidSchedule(data) {
    return !!(data && Array.isArray(data.schedule) && data.schedule.length && data.schedule.every(function (day) {
      return /^20\d{2}-\d{2}-\d{2}$/.test(day.date || '') && Array.isArray(day.acts);
    }));
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('schedule fetch returned ' + response.status);
    return response.json();
  }

  async function loadSchedule() {
    try {
      const authority = parseAuthority(await loadJson(AUTHORITY_URL));
      if (!isValidSchedule(authority)) throw new Error('invalid authority schedule');
      scheduleState = Object.assign({}, authority, { source: 'UpcomingShows' });
      return scheduleState;
    } catch (authorityError) {
      try {
        const frameUrl = frame.contentWindow && frame.contentWindow.location ? frame.contentWindow.location.href : frame.src;
        const fallbackUrl = new URL('./data/jazzycat-current-schedule.json', frameUrl).href;
        const fallback = await loadJson(fallbackUrl);
        if (!isValidSchedule(fallback)) throw new Error('invalid fallback schedule');
        scheduleState = Object.assign({}, fallback, { source: 'local fallback' });
        return scheduleState;
      } catch (fallbackError) {
        scheduleState = { schedule: [], source: 'unavailable' };
        return scheduleState;
      }
    }
  }

  function prettyDate(iso) {
    const parts = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric'
    }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)));
  }

  function formatDay(day) {
    return '<strong>' + esc(prettyDate(day.date)) + '</strong>: ' + (day.acts || []).map(function (act) {
      return esc(act.start_time + '–' + act.end_time + ' ' + act.artist_name);
    }).join(' • ');
  }

  function dayByDate(iso) {
    return (scheduleState.schedule || []).find(function (day) { return day.date === iso; });
  }

  function upcomingDays(fromIso) {
    return (scheduleState.schedule || []).filter(function (day) { return day.date >= fromIso; });
  }

  function resolveExplicitDate(query, todayIso) {
    const text = norm(query);
    const dateText = String(query || '').trim();
    let match = dateText.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (match) return isoFromParts(Number(match[1]), Number(match[2]), Number(match[3]));

    match = dateText.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?\b/);
    if (match) {
      let year = match[3] ? Number(match[3]) : Number(todayIso.slice(0, 4));
      if (year < 100) year += 2000;
      return isoFromParts(year, Number(match[1]), Number(match[2]));
    }

    const monthPattern = Object.keys(MONTHS).sort(function (a, b) { return b.length - a.length; }).join('|');
    match = text.match(new RegExp('\\b(' + monthPattern + ')\\s+(\\d{1,2})(?:\\s*,?\\s*(20\\d{2}))?\\b'));
    if (match) {
      const month = MONTHS[match[1]];
      const year = match[3] ? Number(match[3]) : Number(todayIso.slice(0, 4));
      return isoFromParts(year, month, Number(match[2]));
    }

    if (/\btomorrow\b/.test(text)) return isoAddDays(todayIso, 1);
    if (/\b(today|tonight)\b/.test(text)) return todayIso;

    for (let i = 0; i < WEEKDAYS.length; i += 1) {
      const weekday = WEEKDAYS[i];
      if (new RegExp('\\b' + weekday + '\\b').test(text)) {
        let delta = (i - weekdayIndex(todayIso) + 7) % 7;
        if (new RegExp('\\bnext\\s+' + weekday + '\\b').test(text) && delta === 0) delta = 7;
        return isoAddDays(todayIso, delta);
      }
    }

    return null;
  }

  function weekendDays(todayIso) {
    const todayDow = weekdayIndex(todayIso);
    if (todayDow === 0) return [dayByDate(todayIso)].filter(Boolean);
    const toSaturday = (6 - todayDow + 7) % 7;
    const saturday = isoAddDays(todayIso, toSaturday);
    const sunday = isoAddDays(saturday, 1);
    return [saturday, sunday].map(dayByDate).filter(Boolean);
  }

  function weekDays(todayIso, nextWeek) {
    const dow = weekdayIndex(todayIso);
    const daysSinceMonday = (dow + 6) % 7;
    let start = isoAddDays(todayIso, -daysSinceMonday + (nextWeek ? 7 : 0));
    let end = isoAddDays(start, 6);
    return (scheduleState.schedule || []).filter(function (day) {
      return day.date >= start && day.date <= end && (nextWeek || day.date >= todayIso);
    });
  }

  function significantArtistTokens(artist) {
    return norm(artist).split(' ').filter(function (token) {
      return token.length >= 4 && !STOP_WORDS.has(token);
    });
  }

  function artistFromQuery(query) {
    const q = norm(query);
    const artists = [];
    (scheduleState.schedule || []).forEach(function (day) {
      (day.acts || []).forEach(function (act) {
        if (!artists.includes(act.artist_name)) artists.push(act.artist_name);
      });
    });

    let best = null;
    let bestScore = 0;
    artists.forEach(function (artist) {
      const a = norm(artist);
      if (a && q.includes(a)) {
        if (100 + a.length > bestScore) { best = artist; bestScore = 100 + a.length; }
        return;
      }
      const tokens = significantArtistTokens(artist);
      const matched = tokens.filter(function (token) { return q.includes(token); });
      const score = matched.reduce(function (sum, token) { return sum + token.length; }, 0);
      if (matched.length && score > bestScore) { best = artist; bestScore = score; }
    });
    return best;
  }

  function artistDates(artist, todayIso) {
    // Management may vary '&'/'AND' and the optional article between months.
    // Keep the published display names; compare only this conservative alias key.
    function artistKey(value) {
      return norm(value).replace(/\bthe\b/g, '').replace(/\s+/g, ' ').trim();
    }
    return (scheduleState.schedule || []).filter(function (day) {
      return day.date >= todayIso && (day.acts || []).some(function (act) { return artistKey(act.artist_name) === artistKey(artist); });
    });
  }

  function currentActAnswer(day, now) {
    if (!day) return null;
    const minute = venueMinutes(now);
    let current = null;
    let next = null;

    (day.acts || []).forEach(function (act) {
      const start = parseClock(act.start_time);
      const end = parseClock(act.end_time);
      if (start == null || end == null) return;
      if (minute >= start && minute < end) current = act;
      if (minute < start && !next) next = act;
    });

    if (current) {
      return '<strong>Right now:</strong> ' + esc(current.artist_name) + ', ' + esc(current.start_time + '–' + current.end_time) + '.';
    }
    if (next) {
      return '<strong>Next up:</strong> ' + esc(next.artist_name) + ' at ' + esc(next.start_time) + '.<br>' + formatDay(day);
    }
    if ((day.acts || []).length) {
      return 'Tonight\'s listed music has wrapped. ' + formatDay(day);
    }
    return null;
  }

  function scheduleIntent(query) {
    const text = norm(query);
    return /\b(who|play|plays|playing|schedule|show|shows|lineup|music|tonight|today|tomorrow|weekend|week|month|when|now)\b/.test(text) ||
      WEEKDAYS.some(function (day) { return new RegExp('\\b' + day + '\\b').test(text); }) ||
      /\b(20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})\b/.test(String(query || ''));
  }

  function scheduleAnswer(query, now) {
    const text = norm(query);
    const todayIso = venueToday(now);
    const allDays = scheduleState.schedule || [];
    if (!allDays.length) {
      return 'I can\'t reach the current schedule right now. Check the <a href="https://shows.balconymusicclub.com/" target="_blank" rel="noopener noreferrer">Shows page</a> or the <a href="https://app.balconymusicclub.com/" target="_blank" rel="noopener noreferrer">BMC app</a>.';
    }

    if (/\b(now|right now|currently|current act|on stage)\b/.test(text)) {
      return currentActAnswer(dayByDate(todayIso), now) || 'I don\'t have a current act listed right now.';
    }

    if (/\b(this )?weekend\b/.test(text)) {
      const days = weekendDays(todayIso);
      return days.length ? days.map(formatDay).join('<br>') : 'I don\'t have a lineup loaded for this weekend yet.';
    }

    if (/\bnext week\b/.test(text)) {
      const days = weekDays(todayIso, true);
      return days.length ? days.map(formatDay).join('<br>') : 'I don\'t have next week\'s lineup loaded yet.';
    }

    if (/\bthis week\b/.test(text)) {
      const days = weekDays(todayIso, false);
      return days.length ? days.map(formatDay).join('<br>') : 'I don\'t have more shows loaded for this week.';
    }

    const artist = artistFromQuery(query);
    if (artist && /\b(when|play|plays|playing|schedule|show|shows|see|hear|month)\b/.test(text)) {
      const dates = artistDates(artist, todayIso);
      if (dates.length) return '<strong>' + esc(artist) + '</strong> is listed on:<br>' + dates.map(formatDay).join('<br>');
      return 'I don\'t see another loaded date for <strong>' + esc(artist) + '</strong> on the current schedule.';
    }

    const targetDate = resolveExplicitDate(query, todayIso);
    if (targetDate) {
      const day = dayByDate(targetDate);
      if (!day) return 'I don\'t have a show list loaded for <strong>' + esc(prettyDate(targetDate)) + '</strong> yet. Check the <a href="https://shows.balconymusicclub.com/" target="_blank" rel="noopener noreferrer">Shows page</a> for the newest posting.';
      if (targetDate === todayIso && /\b(now|who.*playing|playing now)\b/.test(text)) {
        return currentActAnswer(day, now) || formatDay(day);
      }
      return formatDay(day);
    }

    if (/\b(this month|month)\b/.test(text)) {
      const month = todayIso.slice(0, 7);
      const days = upcomingDays(todayIso).filter(function (day) { return day.date.slice(0, 7) === month; });
      return days.length ? days.map(formatDay).join('<br>') : 'I don\'t have more dates loaded for this month.';
    }

    const upcoming = upcomingDays(todayIso).slice(0, 4);
    return upcoming.length ? '<strong>Next loaded shows:</strong><br>' + upcoming.map(formatDay).join('<br>') : 'I don\'t have any later dates loaded yet.';
  }

  function install() {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win || win.__BMC_JAZZYCAT_SCHEDULE_AUTHORITY__) return;

    const input = doc.getElementById('q');
    const send = doc.getElementById('send');
    const log = doc.getElementById('log');
    if (!input || !send || !log) return;

    win.__BMC_JAZZYCAT_SCHEDULE_AUTHORITY__ = true;
    if (!scheduleReady) scheduleReady = loadSchedule();

    const originalSend = send.onclick;
    const originalKeydown = input.onkeydown;

    function add(role, html) {
      const node = doc.createElement('div');
      node.className = 'msg ' + role;
      node.innerHTML = html;
      log.appendChild(node);
      log.scrollTop = log.scrollHeight;
    }

    function bubble() {
      const bubbleNode = doc.getElementById('bubble');
      const pet = doc.getElementById('pet');
      if (!bubbleNode || !pet) return;
      const rect = pet.getBoundingClientRect();
      bubbleNode.textContent = 'There we go.';
      bubbleNode.style.left = Math.min(win.innerWidth - 300, rect.right + 10) + 'px';
      bubbleNode.style.top = rect.top + 'px';
      bubbleNode.classList.add('show');
      win.setTimeout(function () { bubbleNode.classList.remove('show'); }, 3500);
    }

    async function askSchedule(raw) {
      const query = String(raw || '').trim();
      if (!query) return;
      add('user', '<strong>You:</strong> ' + esc(query));
      input.value = '';
      await scheduleReady;
      add('bot', '<strong>JazzyCat:</strong> ' + scheduleAnswer(query, new Date()));
      bubble();
    }

    send.onclick = function (event) {
      if (scheduleIntent(input.value)) {
        if (event) event.preventDefault();
        askSchedule(input.value);
        return false;
      }
      return originalSend ? originalSend.call(this, event) : undefined;
    };

    input.onkeydown = function (event) {
      if (event && event.key === 'Enter' && scheduleIntent(input.value)) {
        event.preventDefault();
        askSchedule(input.value);
        return false;
      }
      return originalKeydown ? originalKeydown.call(this, event) : undefined;
    };

    doc.querySelectorAll('#quick button,.corner-cat').forEach(function (button) {
      const originalClick = button.onclick;
      const prompt = button.dataset.prompt || button.textContent || '';
      button.onclick = function (event) {
        const currentPrompt = button.dataset.prompt || button.textContent || prompt;
        if (scheduleIntent(currentPrompt)) {
          if (event) event.preventDefault();
          askSchedule(currentPrompt);
          return false;
        }
        return originalClick ? originalClick.call(this, event) : undefined;
      };
    });
  }

  frame.addEventListener('load', install);
  install();
  window.setTimeout(install, 500);
  window.setTimeout(install, 1400);
})();
