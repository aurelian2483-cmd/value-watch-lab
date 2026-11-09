"""Observed Sky Bet win quotes via the racecard publisher; never verified executable prices."""
import math,re,unicodedata


def publisher_forecast(card,observed,source,digest,pre_event,field_confirmed):
 """A publisher's explicitly labelled betting forecast is not a bookmaker quote."""
 base={'status':'UNAVAILABLE','basis':'PUBLISHER_BETTING_FORECAST_NOT_BOOKMAKER_QUOTES',
       'publisher':'Sporting Life','bookmaker':None,'executable_verified':False,
       'observed_at_utc':observed.isoformat(),'source':source,'source_sha256':digest,'prices':[]}
 if not pre_event or not field_confirmed:return {**base,'status':'FIELD_UNCONFIRMED'}
 text=card.get('betting_forecast')
 if not isinstance(text,str) or not text.strip() or len(text)>10000:return base
 if re.fullmatch(r'\s*No Forecast Available\.?\s*',text,re.I):return {**base,'reason':'FORECAST_NOT_PUBLISHED'}
 def name(value):
  value=re.sub(r'\s*\((?:GB|IRE|FR|USA|GER|AUS|NZ)\)\s*$','',value,flags=re.I)
  return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().casefold())
 runners=card.get('rides',[])
 active={str(r['horse']['horse_reference']['id']):r for r in runners if r.get('ride_status')=='RUNNER'}
 lookup={name(r['horse']['name']):str(r['horse']['horse_reference']['id']) for r in runners}
 if len(active)<2 or len(lookup)!=len(runners):return {**base,'status':'AMBIGUOUS_FIELD'}
 prices=[];seen=set()
 for part in text.split(','):
  match=re.fullmatch(r'\s*(.+?)\s+\((\d+(?:\.\d+)?/\d+(?:\.\d+)?|EVS|EVENS)\)\s*',part,re.I)
  if not match or name(match[1]) not in lookup:return {**base,'status':'UNPARSED_FORECAST'}
  hid=lookup[name(match[1])]
  if hid in seen:return {**base,'status':'AMBIGUOUS_FORECAST'}
  seen.add(hid)
  fraction='1/1' if match[2].upper() in ('EVS','EVENS') else match[2]
  a,b=map(float,fraction.split('/'))
  if b<=0 or a<=0:return {**base,'status':'INVALID_FORECAST'}
  decimal=1+a/b
  if not math.isfinite(decimal) or not 1<decimal<=10000:return {**base,'status':'INVALID_FORECAST'}
  if hid in active:prices.append({'horse_id':hid,'decimal':decimal,'fractional':fraction})
 if set(active)!={p['horse_id'] for p in prices}:return {**base,'status':'INCOMPLETE_FORECAST','priced_active_count':len(prices),'active_runner_count':len(active)}
 return {**base,'status':'COMPLETE_PUBLISHER_FORECAST','prices':prices}

def quoted_market(rides,observed,source,digest,pre_event,field_confirmed):
 base={'bookmaker':'Sky Bet','publisher':'Sporting Life','verification':'SOURCE_OBSERVED_UNVERIFIED',
  'observed_at_utc':observed.isoformat(),'source':source,'source_sha256':digest,'quotes':[],
  'favourite_horse_ids':[],'status':'UNAVAILABLE','executable_verified':False}
 if not pre_event or not field_confirmed:return {**base,'status':'NOT_CURRENT_PRE_EVENT_FIELD'}
 active=[r for r in rides if r.get('ride_status')=='RUNNER']
 if len(active)<2:return base
 quotes=[];markets=set();seen=set()
 for ride in active:
  hid=str(ride['horse']['horse_reference']['id'])
  if hid in seen:return {**base,'status':'AMBIGUOUS_FIELD'}
  seen.add(hid)
  candidates=[q for q in ride.get('bookmakerOdds',[]) if q.get('bookmakerId')==17 and re.sub(r'[^a-z]','',str(q.get('bookmakerName','')).lower()).startswith('skybet') and q.get('outcome')=='Win']
  if len(candidates)!=1:return {**base,'status':'INCOMPLETE_OR_AMBIGUOUS_QUOTES'}
  q=candidates[0];decimal=q.get('decimalOdds');fraction=str(q.get('fractionalOdds',''));fraction='1/1' if fraction.upper() in ('EVS','EVENS','EVEN') else fraction;m=re.fullmatch(r'(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)',fraction)
  if type(decimal) not in (int,float) or not math.isfinite(decimal) or not 1<decimal<=10000 or not m or float(m[2])<=0 or abs(decimal-(1+float(m[1])/float(m[2])))>0.00500001:return {**base,'status':'INVALID_QUOTE'}
  market=(str(q.get('bookmakerRaceid','')),str(q.get('bookmakerMarketId','')))
  if not all(market) or not q.get('selectionId'):return {**base,'status':'MISSING_MARKET_ID'}
  markets.add(market)
  quotes.append({'horse_id':hid,'decimal':1+float(m[1])/float(m[2]),'source_decimal':decimal,'fractional':fraction,'selection_id':str(q['selectionId'])})
 if len(markets)!=1 or len({q['selection_id'] for q in quotes})!=len(quotes):return {**base,'status':'MIXED_OR_AMBIGUOUS_MARKETS'}
 low=min(q['decimal'] for q in quotes);race_id,market_id=next(iter(markets))
 return {**base,'status':'COMPLETE_SOURCE_OBSERVATION','bookmaker_race_id':race_id,'bookmaker_market_id':market_id,
  'quotes':quotes,'favourite_horse_ids':[q['horse_id'] for q in quotes if q['decimal']==low],
  'limitation':'Third-party displayed prices captured together. No bookmaker-side timestamp, availability or executable-price verification.'}
