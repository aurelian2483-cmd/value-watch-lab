import datetime as dt,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from primary_racing_posts import capture

class PrimaryPosts(unittest.TestCase):
    def setUp(self):
        self.now=dt.datetime(2026,11,8,20,tzinfo=dt.timezone.utc)
        self.race={'race_id':'1','startUTC':'2026-11-09T13:00:00Z','racecourse':'Test Course','runners':[{'horse_id':'h','name':'Test Horse','active_runner':True}]}
        self.entry={'url':'https://www.fatjockey.com/forum/topic/42#post-1','horse':'Test Horse'}
        self.post={'@type':'DiscussionForumPosting','url':self.entry['url'],'author':{'@type':'Person','name':'Test Alice'},'datePublished':'2026-11-08T19:00:00Z',
                   'text':'Test Course: I am backing Test Horse at 3/1, good value.', 'isPartOf':{'url':'https://www.fatjockey.com/forum/topic/42'}}
    def check(self,post=None):
        raw=('<script type="application/ld+json">'+json.dumps(post or self.post)+'</script>').encode()
        return capture(self.entry,self.race,self.now,lambda _:raw)
    def test_exact_primary_post_has_author_timestamp_selection_and_receipt(self):
        proof=self.check();self.assertEqual(proof['author'],'Test Alice');self.assertTrue(proof['explicit_selection']);self.assertTrue(proof['explicit_value_backing'])
        self.assertEqual(len(proof['receipt']['sha256']),64);self.assertEqual(proof['horse_id'],'h')
    def test_mentions_negations_future_timestamps_and_wrong_post_cannot_unlock_badges(self):
        for change in ({'text':'Test Horse runs at Test Course.'},{'text':'Test Course: I am not backing Test Horse at 3/1.'},
                       {'datePublished':'2026-11-09T20:00:00Z'},{'url':self.entry['url']+'-other'}, {'author':{}}, {'@type':'NewsArticle'}):
            with self.subTest(change=change),self.assertRaises(ValueError):self.check({**self.post,**change})

if __name__=='__main__':unittest.main()
