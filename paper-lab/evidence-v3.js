'use strict';
/* Value Watch v3: fail-closed, sport-agnostic evidence gate. Research only. */
window.ValueWatchEvidenceV3 = Object.freeze({
  evaluate(event, choice) {
    const all = Array.isArray(event?.choices) ? event.choices : [];
    const prices = all.filter(c => Number.isFinite(c.quote?.decimal) && c.quote.decimal > 1).sort((a,b)=>a.quote.decimal-b.quote.decimal);
    const lowest = prices[0]?.quote.decimal;
    const isUniqueFavourite = Boolean(choice && prices.length && choice.id===prices[0].id && (prices.length===1 || lowest<prices[1].quote.decimal));
    // An observed quote is not an official SP, verified current bookmaker price, or positive EV.
    const green = isUniqueFavourite ? 'PROVISIONAL' : 'NOT_ESTABLISHED';
    const tips = (Array.isArray(event?.communityTips) ? event.communityTips : []).filter(t => {
      if (!choice || t.choiceId!==choice.id || !['forum','social_forum'].includes(t.type)) return false;
      if (typeof t.sourceUrl!=='string' || !/^https:\/\//i.test(t.sourceUrl)) return false;
      try {const u=new URL(t.sourceUrl);if(!u.hostname || u.pathname==='/' && !u.search && !u.hash)return false;}catch{return false;}
      if (typeof t.author!=='string' || !t.author.trim() || /^(unknown|missing|anonymous)$/i.test(t.author.trim()))return false;
      if (typeof t.publishedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t.publishedAt))return false;
      const posted=Date.parse(t.publishedAt),off=Date.parse(event.startUTC);
      if (!Number.isFinite(posted)||!Number.isFinite(off)||posted>=off)return false;
      // A source explicitly attested by an independent verifier, not a self-declared flag.
      return t.primaryPostVerified===true && t.explicitBetSelectionVerified===true && t.timestampVerified===true;
    });
    const uniqueAuthors = new Set(tips.map(t=>t.author.trim().toLowerCase()));
    const blue = tips.length>0;
    const yellow = blue && uniqueAuthors.size>=2 && tips.filter(t=>t.valueBackingVerified===true).length>=2 && isUniqueFavourite;
    return {green,blue:blue?'VERIFIED':'NOT_AWARDED',yellow:yellow?'MULTI_USER_CONSENSUS':'NOT_AWARDED',media:'SEPARATE',qualifiedPosts:tips.length,verifiedAuthors:uniqueAuthors.size,marketBasis:'Observed source prices only; official SP not confirmed'};
  }
});
