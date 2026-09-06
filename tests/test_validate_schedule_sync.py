import copy
from datetime import date
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('validator', ROOT / 'scripts/validate_schedule_sync.py')
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


class ValidatorTests(unittest.TestCase):
    def setUp(self):
        self.c = json.loads((ROOT / 'tests/fixtures/upcoming-shows-2026-08-27.json').read_text())
        self.l = json.loads((ROOT / 'data/jazzycat-current-schedule.json').read_text())
        self.today = date(2026, 9, 6)

    def validate(self):
        return v.validate(self.c, self.l, self.today)

    def test_full_handoff_matches(self):
        rows = self.validate()
        self.assertEqual(len(rows), 40)
        self.assertEqual(len({r[0] for r in rows}), 16)

    def test_missing_september_fails(self):
        self.l['schedule'] = self.l['schedule'][:4]
        with self.assertRaisesRegex(ValueError, 'out of sync'):
            self.validate()

    def test_august_rejected(self):
        day = copy.deepcopy(self.l['schedule'][0])
        day.update(date='2026-08-06', day='Thursday')
        self.l['schedule'].insert(0, day)
        with self.assertRaisesRegex(ValueError, 'out of sync'):
            self.validate()

    def test_future_coverage_rejected(self):
        self.l['coverage_start'] = '2026-10-01'
        with self.assertRaisesRegex(ValueError, 'coverage_start'):
            self.validate()

    def test_metadata(self):
        for key, value, message in [
            ('last_updated', '2026-08-17', 'differs'),
            ('last_updated', '2026-09-07', 'future'),
            ('last_updated', None, 'ISO date'),
            ('timezone', 'UTC', 'timezone'),
            ('authority_url', 'https://example.com', 'authority_url'),
        ]:
            with self.subTest(key=key, value=value):
                original = self.l[key]
                self.l[key] = value
                with self.assertRaisesRegex(ValueError, message):
                    self.validate()
                self.l[key] = original

    def test_expired_source_fails_even_when_in_sync(self):
        self.today = date(2026, 9, 28)
        with self.assertRaisesRegex(ValueError, 'no dates on or after'):
            self.validate()

    def test_empty_and_wrong_shapes(self):
        for value in [None, {}, [], 'bad']:
            with self.subTest(value=value):
                self.c['shows'] = value
                self.l['schedule'] = value
                with self.assertRaises(ValueError):
                    self.validate()

    def test_malformed_local(self):
        original = copy.deepcopy(self.l)
        mutations = [
            lambda d: d['schedule'][0].update(date='2026-02-30'),
            lambda d: d['schedule'][0].update(day='Monday'),
            lambda d: d['schedule'][0].update(acts=[]),
            lambda d: d['schedule'][0]['acts'][0].update(start_time='13:00 PM'),
            lambda d: d['schedule'][0]['acts'][0].update(end_time='2:00 PM'),
            lambda d: d['schedule'][0]['acts'][0].update(artist_name=''),
            lambda d: d['schedule'][0]['acts'][0].update(artist_id=None),
            lambda d: d['schedule'].append(copy.deepcopy(d['schedule'][0])),
            lambda d: d['schedule'][0]['acts'].append(copy.deepcopy(d['schedule'][0]['acts'][0])),
            lambda d: d['schedule'].reverse(),
        ]
        for i, mutate in enumerate(mutations):
            with self.subTest(case=i):
                self.l = copy.deepcopy(original)
                mutate(self.l)
                with self.assertRaises(ValueError):
                    self.validate()

    def test_malformed_canonical(self):
        original = copy.deepcopy(self.c)
        mutations = [
            lambda d: d.update(month='August 2026–January 2027'),
            lambda d: d['shows'][0].update(date='Monday • August 1'),
            lambda d: d['shows'][0].update(date='Sunday • February 30'),
            lambda d: d['shows'][0].update(shows=[]),
            lambda d: d['shows'][0]['shows'][0].update(time='3 PM'),
            lambda d: d['shows'][0]['shows'][0].update(artist=None),
            lambda d: d['shows'].append(copy.deepcopy(d['shows'][0])),
        ]
        for i, mutate in enumerate(mutations):
            with self.subTest(case=i):
                self.c = copy.deepcopy(original)
                mutate(self.c)
                with self.assertRaises(ValueError):
                    self.validate()


if __name__ == '__main__':
    unittest.main()
