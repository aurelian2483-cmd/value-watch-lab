"""Observed Sky Bet win quotes via the racecard publisher; never verified executable prices."""
import math,re

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
