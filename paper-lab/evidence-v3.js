'use strict';
/* Value Watch v3: fail-closed, sport-agnostic evidence gate. Research only. */
window.ValueWatchEvidenceV3 = Object.freeze({
  communityEvidence(entry,event,now=Date.now()){
    const absent={primaryPostVerified:false,explicitBetSelectionVerified:false,timestampVerified:false,valueBackingVerified:false,verifiedThreadId:null};
    const p=entry?.primary_capture,r=p?.receipt;
    if(entry?.verification!=='PRIMARY_POST_CAPTURED'||p?.method!=='JSONLD_DISCUSSION_POST_V1'||!r)return absent;
    if(r.url!==entry.url||!/^[a-f0-9]{64}$/.test(r.sha256||'')||!/^[a-f0-9]{64}$/.test(p.text_sha256||''))return absent;
    let u;try{u=new URL(r.url);}catch{return absent;}
    if(u.protocol!=='https:'||!['theracingforum.co.uk','fatjockey.com','theukbettingforum.co.uk','forum.punterslounge.com','community.betfair.com','reddit.com','olbg.com'].includes(u.hostname.replace(/^www\./,''))||u.pathname==='/')return absent;
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
    const observed=all.filter(c=>fresh(c.quote)&&c.quote.status!=='STALE_SOURCE_OBSERVATION');
    const forecasts=all.filter(c=>fresh(c.forecastPrice)&&c.forecastPrice.kind==='PUBLISHER_BETTING_FORECAST');
    const realMarket=all.length>=2&&observed.length===all.length;
    const forecastMarket=!realMarket&&all.length>=2&&forecasts.length===all.length;
    const basis=realMarket?'quote':forecastMarket?'forecastPrice':null;
    const prices=basis?[...all].sort((a,b)=>a[basis].decimal-b[basis].decimal):[];
    const isUniqueFavourite = Boolean(choice&&prices.length>=2&&choice.id===prices[0].id&&prices[0][basis].decimal<prices[1][basis].decimal);
    // An observed quote is not an official SP, verified current bookmaker price, or positive EV.
    const green = isUniqueFavourite ? 'PROVISIONAL' : 'NOT_ESTABLISHED';
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
