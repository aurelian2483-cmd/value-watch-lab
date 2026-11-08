import datetime as dt,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from primary_racing_posts import capture,capture_native_feed

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

    def native_item(self):
        return {'id':'t1_abc123','link':'https://www.reddit.com/r/HorseRacingUK/comments/def456/mondays_tips/abc123/',
                'author':'/u/TestAlice','title':"TestAlice on Monday's Tips Thread",'published':'2026-11-08T19:00:00Z',
                'description':'<p>Test Course: NAP: Test Horse, backing at 3/1, good value.</p>','full_content':True,
                'feed_receipt':{'url':'https://www.reddit.com/r/HorseRacingUK/comments/def456/mondays_tips/.rss','sha256':'a'*64,'observed_at_utc':'2026-11-08T19:59:00Z'}}

    def test_primary_native_comment_has_original_author_content_and_thread(self):
        item=self.native_item();proof=capture_native_feed(item,self.race,{'horse':'Test Horse'},self.now)
        self.assertEqual(proof['author'],'TestAlice');self.assertEqual(proof['method'],'NATIVE_FORUM_FEED_V1')
        self.assertEqual(proof['thread_url'],'https://www.reddit.com/r/HorseRacingUK/comments/def456/mondays_tips/')
        self.assertEqual(proof['receipt']['url'],item['feed_receipt']['url'])

    def test_feed_summary_missing_author_wrong_comment_and_quotes_are_not_primary_selections(self):
        for changes in ({'full_content':False},{'author':''},{'id':'t1_wrong'},
                        {'description':'<blockquote>Test Course: NAP: Test Horse</blockquote>I disagree.'},
                        {'description':'Test Course: I am not backing Test Horse.'}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):
                capture_native_feed({**self.native_item(),**changes},self.race,{'horse':'Test Horse'},self.now)

if __name__=='__main__':unittest.main()
