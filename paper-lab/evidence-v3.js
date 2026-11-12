'use strict';
/* Value Watch v3: fail-closed, sport-agnostic evidence gate. Research only. */
function capturedRacingSourceIdentity(tip){
  try{
    const host=new URL(tip.sourceUrl).hostname.replace(/^www\./,'');
    return host==='sportinglife.com'&&/^publisher:[a-z0-9]{1,100}$/.test(tip.sourceIdentity||'')?tip.sourceIdentity:host;
  }catch{return null;}
}
window.ValueWatchEvidenceV3 = Object.freeze({
  sourceIdentity:capturedRacingSourceIdentity,
  selectionAvailability(entry,event,now=Date.now()){
    const absent={preRaceAvailabilityVerified:false};
    if(entry?.extraction_method!=='RANKED_RACECARD_VERDICT_V1')return absent;
    const r=entry.selection_receipt,v=event.publisherVerdict;
    if(entry.verification!=='PUBLIC_SELECTION_OBSERVED'||!r||!v||r.status!=='EXPLICIT_FIRST_CHOICE_OBSERVED'||r.rank!==1)return absent;
    let u;try{u=new URL(entry.url);}catch{return absent;}
    if(u.protocol!=='https:'||u.host!=='www.sportinglife.com'||!u.pathname.startsWith('/racing/racecards/'+event.startUTC.slice(0,10)+'/')||!u.pathname.includes('/racecard/'+event.providerEventId+'/'))return absent;
    if(r.url!==entry.url||r.race_id!==String(event.providerEventId)||Date.parse(r.startUTC)!==Date.parse(event.startUTC)||!/^[a-f0-9]{64}$/.test(r.sha256||'')||!/^[a-f0-9]{64}$/.test(r.verdict_sha256||''))return absent;
    if(!event.choices.some(c=>c.id===r.horse_id&&c.label===r.horse&&r.horse===entry.horse))return absent;
    for(const k of ['status','rank','race_id','startUTC','horse_id','horse','url','sha256','verdict_sha256','observed_at_utc'])if(r[k]!==v[k])return absent;
    const seen=Date.parse(r.observed_at_utc),off=Date.parse(event.startUTC);
    if(!Number.isFinite(seen)||seen>now||seen>=off||Date.parse(entry.observed_at_utc)!==seen)return absent;
    return {preRaceAvailabilityVerified:true,availableAt:r.observed_at_utc,sourceSelectionObserved:true};
  },
  communityEvidence(entry,event,now=Date.now()){
    const absent={primaryPostVerified:false,explicitBetSelectionVerified:false,timestampVerified:false,valueBackingVerified:false,verifiedThreadId:null};
    const p=entry?.primary_capture,r=p?.receipt;
    const native=p?.method==='NATIVE_FORUM_FEED_V1';
    if(entry?.verification!=='PRIMARY_POST_CAPTURED'||(!native&&p?.method!=='JSONLD_DISCUSSION_POST_V1')||!r)return absent;
    if((native?r.url!==entry.source_feed:r.url!==entry.url)||!/^[a-f0-9]{64}$/.test(r.sha256||'')||!/^[a-f0-9]{64}$/.test(p.text_sha256||''))return absent;
    let u;try{u=new URL(r.url);}catch{return absent;}
    if(u.protocol!=='https:'||!['theracingforum.co.uk','fatjockey.com','theukbettingforum.co.uk','forum.punterslounge.com','community.betfair.com','reddit.com','olbg.com'].includes(u.hostname.replace(/^www\./,''))||u.pathname==='/')return absent;
    if(native){
      let post;try{post=new URL(entry.url);}catch{return absent;}
      if(post.protocol!=='https:'||post.hostname.replace(/^www\./,'')!==u.hostname.replace(/^www\./,'')||!p.feed_entry_id)return absent;
      const parts=post.pathname.split('/').filter(Boolean);
      if(p.native_platform==='REDDIT_ATOM'){
        const id=parts.length>5?'t1_'+parts[5]:'t3_'+parts[3];
        if(u.hostname.replace(/^www\./,'')!=='reddit.com'||!u.pathname.endsWith('.rss')||parts[0]!=='r'||parts[2]!=='comments'||p.feed_entry_id!==id)return absent;
      }else if(p.native_platform!=='XENFORO_RSS'||u.hostname.replace(/^www\./,'')!=='fatjockey.com'||u.pathname!=='/forum/forums/-/index.rss'||!post.pathname.startsWith('/forum/threads/')||p.feed_entry_id.replace(/\/$/,'')!==entry.url.replace(/\/$/,''))return absent;
    }
    if(p.post_url!==entry.url||p.race_id!==String(event.providerEventId)||Date.parse(p.race_start_utc)!==Date.parse(event.startUTC)||p.author!==entry.author||!p.author?.trim()||/^(unknown|missing|anonymous|deleted|\[deleted\])$/i.test(p.author.trim()))return absent;
    const choice=event.choices.find(c=>c.id===p.horse_id&&c.label.trim().toLowerCase()===String(entry.horse).trim().toLowerCase());
    const posted=Date.parse(p.published_at_utc),seen=Date.parse(r.observed_at_utc),off=Date.parse(event.startUTC);
    if(!choice||p.explicit_selection!==true||!Number.isFinite(posted)||!Number.isFinite(seen)||posted>seen||seen>=off||seen>now||Date.parse(entry.published_at_utc)!==posted)return absent;
    let thread=null;try{const t=new URL(p.thread_url);if(t.protocol==='https:'&&t.hostname===u.hostname&&t.pathname!=='/')thread=t.href;}catch{}
    return {primaryPostVerified:true,explicitBetSelectionVerified:true,timestampVerified:true,valueBackingVerified:p.explicit_value_backing===true,verifiedThreadId:thread};
  },
  evaluate(event, choice, now=Date.now()) {
    const all = Array.isArray(event?.choices) ? event.choices : [];
    const fresh=p=>p&&Number.isFinite(p.decimal)&&p.decimal>1&&Number.isFinite(Date.parse(p.observedAt))&&Date.parse(p.observedAt)<=now&&now-Date.parse(p.observedAt)<=1800000&&Date.parse(event.startUTC)>now+300000;
    // A bookmaker favourite is the shortest quote in one complete, consistent
    // observed bookmaker market; mixed, stale and user-recorded prices cannot
    // establish a comparable favourite.
    const observed=all.filter(c=>fresh(c.quote)&&
      c.quote.status==='SOURCE_OBSERVED_UNVERIFIED'&&c.quote.executable===false&&
      c.quote.bookmaker==='Sky Bet'&&typeof c.quote.source==='string'&&
      c.quote.source.startsWith('https://'));
    const forecasts=all.filter(c=>fresh(c.forecastPrice)&&c.forecastPrice.kind==='PUBLISHER_BETTING_FORECAST');
    const realMarket=all.length>=2&&observed.length===all.length&&
      new Set(observed.map(c=>c.quote.source)).size===1&&
      new Set(observed.map(c=>c.quote.observedAt)).size===1;
    const forecastMarket=!realMarket&&all.length>=2&&forecasts.length===all.length;
    const basis=realMarket?'quote':forecastMarket?'forecastPrice':null;
    const prices=basis?[...all].sort((a,b)=>a[basis].decimal-b[basis].decimal):[];
    const isUniqueFavourite = Boolean(choice&&prices.length>=2&&choice.id===prices[0].id&&prices[0][basis].decimal<prices[1][basis].decimal);
    // An observed quote is not an official SP, verified current bookmaker price, or positive EV.
    const green = isUniqueFavourite ? 'PROVISIONAL' : 'NOT_ESTABLISHED';
    if(event.sport==='racing'){
      // Experimental source support is separate from independently verified posts.
      const candidates=(event.communityTips||[]).filter(t=>{
        if(!all.some(c=>c.id===t.choiceId)||!['forum','social_forum','blog','tipster'].includes(t.type))return false;
        if(t.sourceSelectionObserved!==true&&!(t.primaryPostVerified===true&&t.explicitBetSelectionVerified===true&&t.timestampVerified===true))return false;
        try{const u=new URL(t.sourceUrl);if(u.protocol!=='https:'||u.username||u.pathname==='/'&&!u.search&&!u.hash)return false;}catch{return false;}
        const posted=Date.parse(t.preRaceAvailabilityVerified?t.availableAt:t.publishedAt),seen=Date.parse(t.observedAt||t.publishedAt),off=Date.parse(event.startUTC);
        return Number.isFinite(posted)&&Number.isFinite(seen)&&posted<=seen&&seen<=now&&posted<off&&seen<off&&off>now+300000;
      });
      const support=new Map();
      for(const tip of candidates){
        const sources=support.get(tip.choiceId)||new Set();
        // Captured Naps publications retain their attributed identity; an
        // aggregate site (including its tip counts) contributes only one vote.
        const identity=capturedRacingSourceIdentity(tip);
        sources.add(identity);support.set(tip.choiceId,sources);
      }
      const counts=[...support].map(([id,sources])=>({id,count:sources.size})).sort((a,b)=>b.count-a.count);
      const leader=counts.length&&(!counts[1]||counts[0].count>counts[1].count)?counts[0].id:null;
      const blue=Boolean(leader&&leader===choice?.id);
      const yellow=blue&&isUniqueFavourite&&leader===choice?.id;
      return {green,greenBasis:realMarket?'BOOKMAKER_SOURCE_OBSERVATION':forecastMarket?'PUBLISHER_BETTING_FORECAST':null,
        blue:blue?'EXPERIMENTAL':'NOT_AWARDED',yellow:yellow?'EXPERIMENTAL_AGREEMENT':'NOT_AWARDED',media:'SEPARATE',
        sourceTie:counts.length>1&&counts[0].count===counts[1].count,sourceSupport:support.get(choice?.id)?.size||0,
        qualifiedPosts:candidates.filter(t=>t.choiceId===choice?.id).length,verifiedAuthors:new Set(candidates.filter(t=>t.choiceId===choice?.id&&t.primaryPostVerified).map(t=>t.author)).size,
        marketBasis:forecastMarket?'Publisher forecast + experimental source support; UNVERIFIED':'Observed prices + experimental source support; UNVERIFIED'};
    }
    const tips = (Array.isArray(event?.communityTips) ? event.communityTips : []).filter(t => {
      if (!choice || t.choiceId!==choice.id || !['forum','social_forum'].includes(t.type)) return false;
      if (typeof t.sourceUrl!=='string' || !/^https:\/\//i.test(t.sourceUrl)) return false;
      try {const u=new URL(t.sourceUrl);if(!u.hostname || u.pathname==='/' && !u.search && !u.hash)return false;}catch{return false;}
      if (typeof t.author!=='string' || !t.author.trim() || /^(unknown|missing|anonymous)$/i.test(t.author.trim()))return false;
      if (typeof t.publishedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t.publishedAt))return false;
      const posted=Date.parse(t.publishedAt),off=Date.parse(event.startUTC);
      if (!Number.isFinite(posted)||!Number.isFinite(off)||posted>=off||posted>now||off<=now+300000)return false;
      // These flags come from checked primary captures, never RSS claims alone.
      return t.primaryPostVerified===true && t.explicitBetSelectionVerified===true && t.timestampVerified===true;
    });
    const uniqueAuthors = new Set(tips.map(t=>t.author.trim().toLowerCase()));
    const blue = tips.length>0;
    const threadGroups = new Map();
    for (const t of tips.filter(t=>t.valueBackingVerified===true)) {
      const thread = typeof t.verifiedThreadId==='string' && t.verifiedThreadId.trim();
      if (!thread) continue;
      const authors=threadGroups.get(thread)||new Set(); authors.add(t.author.trim().toLowerCase()); threadGroups.set(thread,authors);
    }
    const yellow = blue && realMarket && isUniqueFavourite && [...threadGroups.values()].some(authors=>authors.size>=2);
    return {green,greenBasis:realMarket?'BOOKMAKER_SOURCE_OBSERVATION':forecastMarket?'PUBLISHER_BETTING_FORECAST':null,blue:blue?'VERIFIED':'NOT_AWARDED',yellow:yellow?'MULTI_USER_CONSENSUS':'NOT_AWARDED',media:'SEPARATE',qualifiedPosts:tips.length,verifiedAuthors:uniqueAuthors.size,marketBasis:forecastMarket?'Publisher betting forecast; not bookmaker odds or official SP':'Observed source prices only; official SP not confirmed'};
  }
});
