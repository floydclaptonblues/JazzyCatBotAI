#!/usr/bin/env python3
"""Validate the complete canonical schedule within the declared coverage window."""
import argparse
from collections import Counter
from datetime import date, datetime
import json
import re
import sys
import urllib.request
from zoneinfo import ZoneInfo

AUTHORITY_URL = 'https://raw.githubusercontent.com/floydclaptonblues/UpcomingShows/main/shows.json'
TIMEZONE = 'America/Chicago'
MONTHS = {m.upper(): i for i, m in enumerate([
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'
], start=1)}
WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def require(condition, message):
    if not condition:
        raise ValueError(message)


def iso_date(value):
    require(isinstance(value, str) and re.fullmatch(r'20\d{2}-\d{2}-\d{2}', value),
            f'invalid ISO date: {value!r}')
    return date.fromisoformat(value)


def nonempty_list(value, label):
    require(isinstance(value, list) and bool(value), f'{label} must be a nonempty list')
    return value


def object_value(value, label):
    require(isinstance(value, dict), f'{label} must be an object')
    return value


def clock(value):
    require(isinstance(value, str) and re.fullmatch(r'(?:[1-9]|1[0-2]):[0-5]\d (?:AM|PM)', value),
            f'invalid clock time: {value!r}')
    parsed = datetime.strptime(value, '%I:%M %p')
    return parsed.hour * 60 + parsed.minute


def check_rows(rows):
    require(bool(rows), 'schedule must contain acts')
    previous_date, previous_end = '', -1
    for iso, start, end, artist in rows:
        iso_date(iso)
        require(iso >= previous_date, 'dates must be chronological')
        start_minute, end_minute = clock(start), clock(end)
        require(end_minute > start_minute, f'{iso}: end must follow start (same-day schedule)')
        require(isinstance(artist, str) and artist.strip() == artist and bool(artist),
                f'{iso}: artist must be a nonempty trimmed string')
        if iso == previous_date:
            require(start_minute >= previous_end, f'{iso}: overlapping or unordered acts')
        previous_date, previous_end = iso, end_minute
    return rows


def load_json(source):
    if re.match(r'^https?://', source):
        req = urllib.request.Request(source, headers={'User-Agent': 'JazzyCat schedule validator'})
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    with open(source, encoding='utf-8') as handle:
        return json.load(handle)


def canonical_rows(data):
    object_value(data, 'canonical schedule')
    years = set(re.findall(r'\b(20\d{2})\b', str(data.get('month') or data.get('subtitle') or '')))
    require(len(years) == 1, 'canonical schedule must declare one unambiguous year')
    year = int(next(iter(years)))
    rows, seen = [], set()
    for day in nonempty_list(data.get('shows'), 'canonical shows'):
        object_value(day, 'canonical day')
        match = re.fullmatch(r'(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*[•-]\s*([A-Za-z]+)\s+(\d{1,2})', str(day.get('date', '')))
        require(match is not None, f"unparseable canonical date: {day.get('date')!r}")
        month = MONTHS.get(match[2].upper())
        require(month is not None, f'unknown month: {match[2]}')
        actual = date(year, month, int(match[3]))
        iso = actual.isoformat()
        require(WEEKDAYS[actual.weekday()] == match[1], f'{iso}: incorrect weekday')
        require(iso not in seen, f'{iso}: duplicate day')
        seen.add(iso)
        for show in nonempty_list(day.get('shows'), f'{iso} shows'):
            object_value(show, 'canonical act')
            parts = re.split(r'\s*[–—-]\s*', str(show.get('time', '')))
            require(len(parts) == 2, f"unparseable canonical time: {show.get('time')!r}")
            rows.append((iso, parts[0], parts[1], show.get('artist')))
    return check_rows(rows)


def local_rows(data):
    object_value(data, 'local schedule')
    rows, seen = [], set()
    for day in nonempty_list(data.get('schedule'), 'local schedule'):
        object_value(day, 'local day')
        iso = day.get('date')
        actual = iso_date(iso)
        require(day.get('day') == WEEKDAYS[actual.weekday()], f'{iso}: incorrect local weekday')
        require(iso not in seen, f'{iso}: duplicate local day')
        seen.add(iso)
        for act in nonempty_list(day.get('acts'), f'{iso} acts'):
            object_value(act, 'local act')
            require(isinstance(act.get('artist_id'), str) and bool(act['artist_id'].strip()),
                    f'{iso}: missing artist_id')
            rows.append((iso, act.get('start_time'), act.get('end_time'), act.get('artist_name')))
    return check_rows(rows)


def validate(canonical_data, local_data, today=None):
    canonical, local = canonical_rows(canonical_data), local_rows(local_data)
    today = today or datetime.now(ZoneInfo(TIMEZONE)).date()
    for label, data in [('canonical', canonical_data), ('local', local_data)]:
        updated = iso_date(data.get('last_updated'))
        require(updated <= today, f'{label}: last_updated is in the future')
    require(local_data['last_updated'] == canonical_data['last_updated'],
            'local last_updated differs from canonical last_updated')
    require(local_data.get('timezone') == TIMEZONE, 'local timezone must be America/Chicago')
    require(local_data.get('authority_url') == AUTHORITY_URL, 'local authority_url is incorrect')
    require(any(iso_date(row[0]) >= today for row in canonical),
            f'canonical schedule has no dates on or after {today}; refresh the source')
    coverage_start = iso_date(local_data.get('coverage_start'))
    require(coverage_start.day == 1 and coverage_start <= today.replace(day=1),
            'coverage_start must be a month boundary no later than the current month')
    canonical = [row for row in canonical if iso_date(row[0]) >= coverage_start]
    require(bool(canonical), 'no canonical acts within the coverage window')
    if canonical != local:
        missing = Counter(canonical) - Counter(local)
        stale = Counter(local) - Counter(canonical)
        detail = '\n'.join([f'  missing local ({n}): {row}' for row, n in sorted(missing.items())] +
                           [f'  stale local ({n}): {row}' for row, n in sorted(stale.items())])
        raise ValueError('JazzyCat schedule fallback is out of sync with UpcomingShows.\n' + detail)
    return local


def main():
    parser = argparse.ArgumentParser(description='Validate JazzyCat fallback against UpcomingShows.')
    parser.add_argument('--canonical', default=AUTHORITY_URL)
    parser.add_argument('--local', default='data/jazzycat-current-schedule.json')
    parser.add_argument('--today', type=iso_date, help='Explicit venue date for reproducible historical validation; default: today in America/Chicago')
    args = parser.parse_args()
    try:
        local = validate(load_json(args.canonical), load_json(args.local), args.today)
    except (ValueError, OSError) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        return 1
    print(f'PASS: {len(local)} acts across {len({r[0] for r in local})} dates match UpcomingShows exactly; metadata and coverage are current.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
