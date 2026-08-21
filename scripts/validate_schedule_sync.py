#!/usr/bin/env python3
import argparse
import json
import re
import sys
import urllib.request
from datetime import datetime

MONTHS = {m.upper(): i for i, m in enumerate([
    'January','February','March','April','May','June','July','August','September','October','November','December'
], start=1)}


def load_json(source):
    if re.match(r'^https?://', source):
        req = urllib.request.Request(source, headers={'User-Agent': 'JazzyCat schedule validator'})
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    with open(source, encoding='utf-8') as handle:
        return json.load(handle)


def canonical_rows(data):
    match = re.search(r'\b(20\d{2})\b', str(data.get('month') or data.get('subtitle') or ''))
    if not match:
        raise ValueError('canonical schedule does not declare a year')
    year = int(match.group(1))
    rows = []
    for day in data.get('shows', []):
        date_match = re.match(r'^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*[•-]\s*([A-Za-z]+)\s+(\d{1,2})$', str(day.get('date','')))
        if not date_match:
            raise ValueError(f"unparseable canonical date: {day.get('date')!r}")
        month = MONTHS[date_match.group(2).upper()]
        iso = f'{year:04d}-{month:02d}-{int(date_match.group(3)):02d}'
        for show in day.get('shows', []):
            time_parts = re.split(r'\s*[–—-]\s*', str(show.get('time','')), maxsplit=1)
            if len(time_parts) != 2:
                raise ValueError(f"unparseable canonical time: {show.get('time')!r}")
            rows.append((iso, time_parts[0], time_parts[1], str(show.get('artist','')).strip()))
    return rows


def local_rows(data):
    rows = []
    for day in data.get('schedule', []):
        iso = day.get('date')
        try:
            datetime.strptime(iso, '%Y-%m-%d')
        except Exception as exc:
            raise ValueError(f'invalid local date {iso!r}') from exc
        for act in day.get('acts', []):
            rows.append((iso, act.get('start_time',''), act.get('end_time',''), act.get('artist_name','')))
    return rows


def main():
    parser = argparse.ArgumentParser(description='Validate JazzyCat local fallback against the canonical UpcomingShows schedule.')
    parser.add_argument('--canonical', default='https://raw.githubusercontent.com/floydclaptonblues/UpcomingShows/main/shows.json')
    parser.add_argument('--local', default='data/jazzycat-current-schedule.json')
    args = parser.parse_args()

    canonical = canonical_rows(load_json(args.canonical))
    local = local_rows(load_json(args.local))

    if canonical != local:
        print('FAIL: JazzyCat schedule fallback is out of sync with UpcomingShows.', file=sys.stderr)
        canonical_set = set(canonical)
        local_set = set(local)
        for row in sorted(canonical_set - local_set):
            print('  missing local:', row, file=sys.stderr)
        for row in sorted(local_set - canonical_set):
            print('  stale local:', row, file=sys.stderr)
        return 1

    print(f'PASS: {len(local)} acts across {len({r[0] for r in local})} dates match UpcomingShows exactly.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
