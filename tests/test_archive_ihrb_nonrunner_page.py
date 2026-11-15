"""IHRB source markup tests: reject reserve entries, bad rows, future logged claims."""
import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from archive_ihrb_nonrunner_page import parse

NOW=dt.datetime(2026,11,15,12,0,tzinfo=dt.timezone.utc)
def page(when="15/11/2026 08:33:53",horse="8: Holly's Thunder John Shinnick"):
    return ("""<html><h2>Non Runners</h2><table>
<tr><th>Track</th><th>race</th><th>Horse</th><th>excuse</th><th>logged</th></tr>
<tr><td>15/11/2026 Navan</td><td>2</td><td>"""+horse+"""</td><td>Coughing</td><td>"""+when+"""</td></tr></table>
<h2>Reserves and Further Information</h2><table>
<tr><td>15/11/2026 Navan</td><td>3</td><td>27: Llem's Reserve</td><td>Nomination</td><td>15/11/2026 08:40:00</td></tr>
</table></html>""").encode()
class IHRB(unittest.TestCase):
    def test_only_official_nonrunner_rows(self):
        obj=parse(page(),NOW)
        self.assertEqual(len(obj["rows"]),1)
        self.assertEqual(obj["rows"][0]["course"],"Navan")
        self.assertEqual(obj["rows"][0]["race_number"],2)
        self.assertEqual(obj["rows"][0]["reported_logged_at_utc"],"2026-11-15T08:33:53+00:00")
        self.assertFalse(obj["official_logged_time_is_verified_publication_time"])
    def test_bad_timestamp_rejected(self):
        with self.assertRaises(ValueError):parse(page("sometime"),NOW)
    def test_future_claim_rejected(self):
        with self.assertRaises(ValueError):parse(page("15/11/2026 14:00:00"),NOW)
    def test_empty_page_fails_closed(self):
        with self.assertRaises(ValueError):parse(b"<html><h2>Non Runners</h2></html>",NOW)
    def test_wrong_schema_fails_closed(self):
        with self.assertRaises(ValueError):parse(page(horse="Unstructured horse"),NOW)
    def test_source_sha_stable(self):
        a=parse(page(),NOW);b=parse(page(),NOW)
        self.assertEqual(a["record_sha256"],b["record_sha256"])
if __name__=="__main__":unittest.main()
